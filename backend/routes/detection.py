"""Detection routes for media analysis using Sightengine + heuristic analyzers."""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Request, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Literal, Optional
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser

security = HTTPBearer(auto_error=False)
from utils.file_handler import save_uploaded_file, get_file_path_for_detection
from services.sightengine_client import analyze_deepfake
from services.audio_analyzer import analyze_audio
from services.metadata_analyzer import analyze_metadata
from services.emotion_analyzer import analyze_emotion_mismatch
from services.sync_analyzer import analyze_sync
from services.compression_analyzer import analyze_compression
from services.fingerprint_analyzer import analyze_fingerprint
from services import model_engine
from services.model_engine import _generate_heatmap_placeholder, _generate_gradcam
from config import settings
from datetime import datetime
import asyncio
import logging
import os
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

# Weights for composite scoring — retrained ML model is primary detector
# After retraining on 200 images: 81% discrimination gap, 95% val accuracy
WEIGHTS = {
    "ml_model": 0.40,
    "sightengine": 0.20,
    "fingerprint": 0.12,
    "metadata": 0.08,
    "compression": 0.08,
    "audio": 0.04,
    "emotion": 0.04,
    "sync": 0.04,
}


def _extract_score(result: dict, analyzer_name: str = "", default: float = 85.0) -> float:
    """Extract a trust-like score (0-100, higher=more authentic) from an analyzer result."""
    if not isinstance(result, dict):
        return default

    # Audio analyzer: "score" = clone likelihood (higher = more suspicious), invert it
    if "cloned" in result and "score" in result:
        return 100.0 - float(result["score"])

    # Emotion analyzer: "score" = mismatch percentage (higher = more suspicious), invert it
    if "faceEmotion" in result and "score" in result:
        return 100.0 - float(result["score"])

    # Sync analyzer: "mismatchScore" = mismatch (higher = more suspicious), invert it
    if "mismatchScore" in result:
        return 100.0 - float(result["mismatchScore"])

    # Metadata analyzer: compute trust from flags
    # Note: missing EXIF is common for ALL web images (Unsplash, social media, etc.)
    # so the penalty is moderate — it's suggestive but not conclusive
    if "missingCamera" in result:
        score = 100.0
        if result.get("missingCamera"):
            score -= 20  # mild penalty (web images routinely lack EXIF)
        if result.get("irregularTimestamps"):
            score -= 30
        if result.get("suspiciousCompression"):
            score -= 25
        # Extra penalty if multiple flags are set
        flags_set = sum([
            bool(result.get("missingCamera")),
            bool(result.get("irregularTimestamps")),
            bool(result.get("suspiciousCompression")),
        ])
        if flags_set >= 2:
            score -= 10  # multi-flag penalty
        return max(0, score)

    # Fingerprint analyzer: lower trust if deepfake source detected
    if "probability" in result and "source" in result:
        prob = float(result.get("probability", 0))
        if result.get("source"):
            return max(0, 100.0 - prob * 1.5)  # amplify fingerprint detection
        # Even without a specific source, frequency-domain anomalies reduce trust
        if prob > 0:
            return max(50, 85.0 - prob * 0.5)
        return 80.0

    # Compression analyzer: derive from compression ratio
    if "compressionRatio" in result:
        if result.get("platform"):
            return 60.0  # social media compressed = less trustworthy
        evidence = result.get("evidence", [])
        # Check for blocking artifacts or heavy compression in evidence
        has_blocking = any("blocking" in str(e).lower() for e in evidence)
        has_heavy = any("heavy" in str(e).lower() or "very low" in str(e).lower() for e in evidence)
        if has_blocking and has_heavy:
            return 50.0
        if has_blocking or has_heavy:
            return 65.0
        return 80.0

    # Generic fallback
    if "score" in result:
        return float(result["score"])

    return default


def _compute_composite_score(
    ml_model_score: float | None,
    sightengine_score: float | None,
    metadata_result: dict,
    fingerprint_result: dict,
    compression_result: dict,
    audio_result: dict,
    emotion_result: dict,
    sync_result: dict,
) -> float:
    """Compute weighted composite trust score from all available detectors.

    The retrained ML model (EfficientNet-B0, 95% val accuracy) is the primary
    signal (40%). Sightengine provides a secondary signal (20%).
    Heuristic analyzers provide supporting signals (40%).
    """
    scores = {}
    total_weight = 0.0

    # ML model — primary detector (40% weight, 95% val accuracy)
    if ml_model_score is not None:
        scores["ml_model"] = ml_model_score
        total_weight += WEIGHTS["ml_model"]
        logger.info("ML model trust score: %.1f", ml_model_score)

    # Sightengine — secondary detector
    if sightengine_score is not None:
        scores["sightengine"] = sightengine_score
        total_weight += WEIGHTS["sightengine"]

    # Heuristic analyzers — supporting signals
    for name, result in [
        ("metadata", metadata_result),
        ("fingerprint", fingerprint_result),
        ("compression", compression_result),
        ("audio", audio_result),
        ("emotion", emotion_result),
        ("sync", sync_result),
    ]:
        s = _extract_score(result, analyzer_name=name)
        scores[name] = s
        total_weight += WEIGHTS[name]

    if total_weight == 0:
        return 50.0  # Fallback — uncertain

    composite = sum(scores.get(k, 0) * WEIGHTS.get(k, 0) for k in scores) / total_weight

    # --- Multi-flag penalty ---
    suspicious_threshold = 70.0
    suspicious_analyzers = [
        name for name in ("metadata", "fingerprint", "compression", "audio", "emotion", "sync")
        if scores.get(name, 100) < suspicious_threshold
    ]
    num_suspicious = len(suspicious_analyzers)

    if num_suspicious >= 3:
        composite -= 15
        logger.info("Multi-flag penalty: 3+ analyzers suspicious (%s), -15 points", suspicious_analyzers)
    elif num_suspicious >= 2:
        composite -= 8
        logger.info("Multi-flag penalty: 2 analyzers suspicious (%s), -8 points", suspicious_analyzers)

    # --- No primary detector penalty ---
    if ml_model_score is None and sightengine_score is None:
        composite = min(composite, 65.0)
        logger.info("No primary detector available — capping score at 65")

    return round(min(100, max(0, composite)), 2)


def _get_label(score: float) -> str:
    if score >= 70:
        return "Authentic"
    elif score >= 40:
        return "Suspicious"
    return "Deepfake"


def _label_to_status(label: str) -> str:
    if label == "Authentic":
        return "authentic"
    elif label == "Deepfake":
        return "deepfake"
    return "suspected"


def _build_anomalies(
    sightengine_result: dict,
    metadata_result: dict,
    fingerprint_result: dict,
    compression_result: dict,
    trust_score: float,
) -> list[dict]:
    """Build anomaly list from analyzer results."""
    anomalies = []

    # Sightengine deepfake probability — lower threshold to 0.05 so even mild signals show
    if sightengine_result.get("api_available") and sightengine_result.get("deepfake_probability", 0) > 0.05:
        prob = sightengine_result["deepfake_probability"]
        severity = "high" if prob > 0.7 else "medium" if prob > 0.4 else "low"
        anomalies.append({
            "type": "model_prediction",
            "severity": severity,
            "description": f"Sightengine deepfake probability: {prob:.1%}",
            "confidence": round(prob * 100, 1),
        })

    # Metadata anomalies
    if isinstance(metadata_result, dict):
        details = metadata_result.get("details", [])
        if metadata_result.get("missingCamera"):
            anomalies.append({
                "type": "metadata_tampering",
                "severity": "high",
                "description": "No camera/EXIF metadata — typical of AI-generated or heavily edited images",
                "confidence": 85,
            })
        if metadata_result.get("irregularTimestamps"):
            anomalies.append({
                "type": "metadata_tampering",
                "severity": "medium",
                "description": "Timestamp inconsistencies detected in metadata",
                "confidence": 70,
            })
        if metadata_result.get("suspiciousCompression"):
            anomalies.append({
                "type": "compression",
                "severity": "medium",
                "description": "Suspicious compression patterns detected",
                "confidence": 65,
            })

    # Fingerprint anomalies — also show when probability > 0 even without named source
    if isinstance(fingerprint_result, dict):
        if fingerprint_result.get("source"):
            anomalies.append({
                "type": "general",
                "severity": "high",
                "description": f"Deepfake tool signature detected: {fingerprint_result['source']}",
                "confidence": round(min(99, fingerprint_result.get("probability", 50)), 1),
            })
        elif fingerprint_result.get("probability", 0) > 20:
            anomalies.append({
                "type": "general",
                "severity": "medium",
                "description": f"Frequency-domain anomalies detected (score: {fingerprint_result['probability']:.0f})",
                "confidence": round(fingerprint_result.get("probability", 0), 1),
            })

    # Compression anomalies
    if isinstance(compression_result, dict):
        evidence = compression_result.get("evidence", [])
        if compression_result.get("platform"):
            anomalies.append({
                "type": "compression",
                "severity": "low",
                "description": f"Compression consistent with {compression_result['platform']} sharing",
                "confidence": 55,
            })
        has_blocking = any("blocking" in str(e).lower() for e in evidence)
        if has_blocking:
            anomalies.append({
                "type": "texture_artifacts",
                "severity": "medium",
                "description": "JPEG blocking artifacts detected — possible re-encoding or manipulation",
                "confidence": 60,
            })

    return anomalies


async def _detect_media(
    file: UploadFile,
    media_type: Literal["image", "video", "audio"],
    current_user: AuthenticatedUser,
    request: Request,
) -> dict:
    """Common detection logic for all media types."""
    try:
        # Save uploaded file locally
        file_path, file_size = await save_uploaded_file(file, media_type, current_user.id)
        detection_id = str(uuid.uuid4())

        # Run Sightengine + all heuristic analyzers concurrently
        tasks = [
            analyze_deepfake(file_path, settings.sightengine_api_user, settings.sightengine_api_secret),
        ]

        # Always run metadata, fingerprint, compression
        tasks.append(_safe_analyze(analyze_metadata, file_path, media_type))
        tasks.append(_safe_analyze(analyze_fingerprint, file_path, media_type))
        tasks.append(_safe_analyze(analyze_compression, file_path, media_type))

        # Audio analysis for audio/video
        if media_type in ("audio", "video"):
            tasks.append(_safe_analyze(analyze_audio, file_path, media_type))
        else:
            # score=0 means 0% clone likelihood → 100% trust after inversion
            tasks.append(_default_result({"cloned": False, "score": 0, "details": ["Not applicable for images"]}))

        # Emotion/sync for video
        if media_type == "video":
            tasks.append(_safe_analyze(analyze_emotion_mismatch, file_path, media_type))
            tasks.append(_safe_analyze(analyze_sync, file_path, media_type))
        else:
            # score=0 means 0% mismatch → 100% trust after inversion
            tasks.append(_default_result({"faceEmotion": None, "audioEmotion": None, "score": 0}))
            tasks.append(_default_result({"lipSyncMismatch": False, "mismatchScore": 0, "details": []}))

        results = await asyncio.gather(*tasks)

        sightengine_result = results[0]
        metadata_result = results[1]
        fingerprint_result = results[2]
        compression_result = results[3]
        audio_result = results[4]
        emotion_result = results[5]
        sync_result = results[6]

        # Run ML model prediction (primary detector)
        ml_model_score = None
        if model_engine.ML_AVAILABLE and model_engine._MODEL is not None:
            try:
                if media_type == "image":
                    prob_real = model_engine._predict_image_prob_real(file_path)
                elif media_type == "video":
                    prob_real = model_engine._predict_video_prob_real(file_path)
                else:
                    prob_real = None

                if prob_real is not None:
                    ml_model_score = round(prob_real * 100, 2)
                    logger.info("ML model prediction: %.1f%% real", ml_model_score)
            except Exception as e:
                logger.warning("ML model prediction failed: %s", e)

        # Compute composite trust score
        trust_score = _compute_composite_score(
            ml_model_score,
            sightengine_result.get("trust_score"),
            metadata_result,
            fingerprint_result,
            compression_result,
            audio_result,
            emotion_result,
            sync_result,
        )

        label = _get_label(trust_score)
        anomalies = _build_anomalies(sightengine_result, metadata_result, fingerprint_result, compression_result, trust_score)

        # Warn if no primary detectors were available
        if ml_model_score is None and not sightengine_result.get("api_available"):
            anomalies.insert(0, {
                "type": "warning",
                "message": "No primary detectors available — results are based on heuristic analysis only and may be less accurate.",
            })

        # Generate heatmap (Grad-CAM if ML model is available, otherwise placeholder)
        heatmap_url = None
        xai_regions = []
        try:
            if media_type == "image" and model_engine.ML_AVAILABLE and model_engine._MODEL is not None:
                heatmap_url, xai_regions = _generate_gradcam(file_path, detection_id)
            else:
                heatmap_url = _generate_heatmap_placeholder(file_path, detection_id)
            logger.info("Heatmap generated: %s", heatmap_url)
        except Exception as e:
            logger.warning("Heatmap generation failed: %s", e)

        # Store in Supabase
        supabase = get_supabase()
        detection_record = {
            "id": detection_id,
            "user_id": current_user.id,
            "filename": file.filename,
            "media_type": media_type,
            "file_path": get_file_path_for_detection(file_path),
            "file_size": file_size,
            "trust_score": trust_score,
            "label": label,
            "anomalies": anomalies,
            "sightengine_result": sightengine_result.get("raw_response"),
            "audio_analysis": audio_result if isinstance(audio_result, dict) else None,
            "metadata_analysis": metadata_result if isinstance(metadata_result, dict) else None,
            "fingerprint": fingerprint_result if isinstance(fingerprint_result, dict) else None,
            "compression_info": compression_result if isinstance(compression_result, dict) else None,
            "emotion_mismatch": emotion_result if isinstance(emotion_result, dict) else None,
            "sync_analysis": sync_result if isinstance(sync_result, dict) else None,
            "heatmap_url": heatmap_url,
        }

        supabase.table("detections").insert(detection_record).execute()

        # Log activity
        _log_activity(supabase, current_user.id, "detection_created", "detection", detection_id)

        # Build response
        base_url = str(request.base_url).rstrip("/") if request else "http://localhost:8000"
        file_url = f"{base_url}/api/detect/{detection_id}/file"
        full_heatmap_url = f"{base_url}{heatmap_url}" if heatmap_url else None

        return {
            "status": "success",
            "mediaType": media_type,
            "trustScore": trust_score,
            "label": label,
            "anomalies": anomalies,
            "heatmapUrl": full_heatmap_url,
            "xaiRegions": xai_regions if xai_regions else [],
            "fileUrl": file_url,
            "reportId": "",
            "detectionId": detection_id,
        }

    except ValueError as e:
        logger.error(f"ValueError: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error in detection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during analysis",
        )


async def _safe_analyze(func, *args):
    """Safely run an analyzer, returning empty dict on failure."""
    try:
        result = func(*args)
        if asyncio.iscoroutine(result):
            return await result
        return result
    except Exception as e:
        logger.warning(f"Analyzer {func.__name__} failed: {e}")
        return {}


async def _default_result(default: dict) -> dict:
    return default


@router.post("/image")
async def detect_image(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
):
    """Detect deepfake in uploaded image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    return await _detect_media(file, "image", current_user, request)


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
):
    """Detect deepfake in uploaded video."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a video")
    return await _detect_media(file, "video", current_user, request)


@router.post("/audio")
async def detect_audio(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
):
    """Detect deepfake in uploaded audio."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an audio file")
    return await _detect_media(file, "audio", current_user, request)


@router.post("/url")
async def detect_from_url(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Download media from a URL and run deepfake detection."""
    import httpx
    import ipaddress
    import socket
    from io import BytesIO
    from urllib.parse import urlparse

    body = await request.json()
    url = body.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required")

    # SSRF protection: validate URL scheme and reject private/internal IPs
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only HTTP and HTTPS URLs are supported")
        if not parsed.hostname:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid URL: no hostname")
        resolved_ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
        if resolved_ip.is_private or resolved_ip.is_loopback or resolved_ip.is_link_local or resolved_ip.is_reserved:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Internal or private network URLs are not allowed")
    except (socket.gaierror, ValueError) as e:
        if isinstance(e, socket.gaierror):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not resolve hostname")
        raise

    # Download the file
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=30.0) as client:
            resp = await client.get(url)
            # Handle redirects manually to prevent SSRF via redirect to internal IP
            redirect_count = 0
            while resp.is_redirect and redirect_count < 5:
                redirect_url = str(resp.next_request.url) if resp.next_request else None
                if not redirect_url:
                    break
                rp = urlparse(redirect_url)
                if rp.hostname:
                    rip = ipaddress.ip_address(socket.gethostbyname(rp.hostname))
                    if rip.is_private or rip.is_loopback or rip.is_link_local or rip.is_reserved:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redirect to internal network is not allowed")
                resp = await client.get(redirect_url)
                redirect_count += 1
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to download: HTTP {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to download URL: {str(e)}")

    content_type = resp.headers.get("content-type", "")
    content = resp.content

    if not content or len(content) < 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Downloaded file is too small or empty")

    # Determine media type
    if "image" in content_type or url.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")):
        media_type = "image"
    elif "video" in content_type or url.lower().endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
        media_type = "video"
    elif "audio" in content_type or url.lower().endswith((".mp3", ".wav", ".ogg", ".flac", ".m4a")):
        media_type = "audio"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine media type from URL. Supported: image, video, audio")

    # Derive filename from URL
    from urllib.parse import urlparse
    parsed = urlparse(url)
    filename = os.path.basename(parsed.path) or f"download.{media_type}"

    # Create a fake UploadFile-like object
    file_obj = UploadFile(filename=filename, file=BytesIO(content), headers={"content-type": content_type})

    return await _detect_media(file_obj, media_type, current_user, request)


@router.get("/{detection_id}")
async def get_detection(
    detection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
):
    """Get detection result by ID."""
    supabase = get_supabase()

    try:
        resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
        detection = resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    # Check access: owner, investigator, or admin
    if detection["user_id"] != current_user.id and current_user.role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    base_url = str(request.base_url).rstrip("/") if request else ""
    file_url = f"{base_url}/api/detect/{detection_id}/file" if base_url else f"/api/detect/{detection_id}/file"

    heatmap_url = detection.get("heatmap_url")
    if heatmap_url and base_url:
        heatmap_url = f"{base_url}{heatmap_url}"

    response = {
        "id": detection["id"],
        "fileName": detection.get("filename", ""),
        "fileType": detection.get("media_type", "image"),
        "fileUrl": file_url,
        "trustScore": detection.get("trust_score", 0),
        "status": _label_to_status(detection.get("label", "Suspicious")),
        "anomalies": detection.get("anomalies", []),
        "heatmapUrl": heatmap_url,
        "createdAt": detection.get("created_at", datetime.utcnow().isoformat()),
        "metadata": {"fileSize": detection.get("file_size", 0)},
        "audioAnalysis": detection.get("audio_analysis"),
        "metadataAnalysis": detection.get("metadata_analysis"),
        "fingerprint": detection.get("fingerprint"),
        "compressionInfo": detection.get("compression_info"),
        "emotionMismatch": detection.get("emotion_mismatch"),
        "syncAnalysis": detection.get("sync_analysis"),
        "sightengineResult": detection.get("sightengine_result"),
        "xaiRegions": detection.get("xai_regions", []),
    }

    return {k: v for k, v in response.items() if v is not None}


@router.get("/{detection_id}/file")
async def get_detection_file(
    detection_id: str,
    token: str = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Get the uploaded file for a detection.

    Supports auth via:
    - Authorization: Bearer header (normal API calls)
    - ?token= query param (browser <img>/<video>/<audio> src)
    """
    supabase = get_supabase()

    # Resolve the auth token from header or query param
    auth_token = None
    if credentials and credentials.credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        user_response = supabase.auth.get_user(auth_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = user_response.user.id
        try:
            profile_resp = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
            user_role = profile_resp.data.get("role", "user") if profile_resp.data else "user"
        except Exception:
            user_role = "user"
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")

    try:
        resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
        detection = resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if detection["user_id"] != user_id and user_role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = detection.get("file_path", "")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    media_type = detection.get("media_type", "image")
    content_type_map = {"image": "image/jpeg", "video": "video/mp4", "audio": "audio/mpeg"}

    return FileResponse(
        file_path,
        media_type=content_type_map.get(media_type, "application/octet-stream"),
        filename=detection.get("filename", "file"),
    )


@router.post("/{detection_id}/feedback")
async def submit_detection_feedback(
    detection_id: str,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Submit user feedback for a detection (adaptive learning).

    Body: { "true_label": "fake" | "real" }
    """
    from services.model_engine import submit_feedback

    body = await request.json()
    true_label = body.get("true_label", "").strip().lower()
    if true_label not in ("fake", "real"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="true_label must be 'fake' or 'real'",
        )

    # Get the detection to find the file path
    supabase = get_supabase()
    try:
        resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
        detection = resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    # Authorization: only owner, investigator, or admin can submit feedback
    if detection["user_id"] != current_user.id and current_user.role not in ("investigator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = detection.get("file_path", "")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection file not found on disk")

    # Validate file path is within the upload directory
    from pathlib import Path as _Path
    real_path = _Path(file_path).resolve()
    allowed_root = _Path(settings.upload_dir).resolve()
    if not str(real_path).startswith(str(allowed_root)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = submit_feedback(file_path, true_label, detection_id)

    # Log activity
    _log_activity(supabase, current_user.id, "feedback_submitted", "detection", detection_id)

    return result


@router.get("/adaptive/stats")
async def get_adaptive_stats(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get adaptive learning statistics."""
    from services.model_engine import get_feedback_stats
    return get_feedback_stats()


@router.post("/adaptive/retrain")
async def trigger_retrain(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Trigger adaptive model retraining (admin/investigator only)."""
    if current_user.role not in ("admin", "investigator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and investigators can trigger retraining",
        )

    from services.model_engine import trigger_adaptive_retrain
    return trigger_adaptive_retrain()


def _log_activity(supabase, user_id: str, action: str, resource_type: str, resource_id: str):
    """Log user activity to Supabase."""
    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
        }).execute()
    except Exception as e:
        logger.error(f"Error logging activity: {e}")
