"""Detection routes for media analysis using Sightengine + heuristic analyzers."""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Request
from fastapi.responses import FileResponse
from typing import Literal
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
from utils.file_handler import save_uploaded_file, get_file_path_for_detection
from services.sightengine_client import analyze_deepfake
from services.audio_analyzer import analyze_audio
from services.metadata_analyzer import analyze_metadata
from services.emotion_analyzer import analyze_emotion_mismatch
from services.sync_analyzer import analyze_sync
from services.compression_analyzer import analyze_compression
from services.fingerprint_analyzer import analyze_fingerprint
from config import settings
from datetime import datetime
import asyncio
import logging
import os
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

# Weights for composite scoring
WEIGHTS = {
    "sightengine": 0.55,
    "metadata": 0.10,
    "fingerprint": 0.10,
    "compression": 0.08,
    "audio": 0.07,
    "emotion": 0.05,
    "sync": 0.05,
}


def _extract_score(result: dict, default: float = 85.0) -> float:
    """Extract a trust-like score from an analyzer result."""
    if isinstance(result, dict):
        # audio_analyzer returns {"cloned": bool, "score": float}
        if "score" in result:
            return float(result["score"])
        # emotion returns {"score": float}
        if "mismatch_score" in result:
            return 100.0 - float(result["mismatch_score"])
        # sync returns {"mismatchScore": float}
        if "mismatchScore" in result:
            return 100.0 - float(result["mismatchScore"])
    return default


def _compute_composite_score(
    sightengine_score: float | None,
    metadata_result: dict,
    fingerprint_result: dict,
    compression_result: dict,
    audio_result: dict,
    emotion_result: dict,
    sync_result: dict,
) -> float:
    """Compute weighted composite trust score from all analyzers."""
    scores = {}
    total_weight = 0.0

    # Sightengine
    if sightengine_score is not None:
        scores["sightengine"] = sightengine_score
        total_weight += WEIGHTS["sightengine"]

    # Heuristic analyzers
    for name, result in [
        ("metadata", metadata_result),
        ("fingerprint", fingerprint_result),
        ("compression", compression_result),
        ("audio", audio_result),
        ("emotion", emotion_result),
        ("sync", sync_result),
    ]:
        s = _extract_score(result)
        scores[name] = s
        total_weight += WEIGHTS[name]

    if total_weight == 0:
        return 75.0  # Fallback

    composite = sum(scores.get(k, 0) * WEIGHTS.get(k, 0) for k in scores) / total_weight
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

    # Sightengine deepfake probability
    if sightengine_result.get("api_available") and sightengine_result.get("deepfake_probability", 0) > 0.3:
        prob = sightengine_result["deepfake_probability"]
        severity = "high" if prob > 0.7 else "medium" if prob > 0.5 else "low"
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
                "severity": "medium",
                "description": "Camera information missing from metadata",
                "confidence": 70,
            })
        if metadata_result.get("suspiciousCompression"):
            anomalies.append({
                "type": "compression",
                "severity": "low",
                "description": "Suspicious compression patterns detected",
                "confidence": 60,
            })

    # Fingerprint anomalies
    if isinstance(fingerprint_result, dict) and fingerprint_result.get("source"):
        anomalies.append({
            "type": "general",
            "severity": "high",
            "description": f"Deepfake tool signature detected: {fingerprint_result['source']}",
            "confidence": round(fingerprint_result.get("probability", 0.5) * 100, 1),
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
        tasks.append(_safe_analyze(analyze_fingerprint, file_path))
        tasks.append(_safe_analyze(analyze_compression, file_path))

        # Audio analysis for audio/video
        if media_type in ("audio", "video"):
            tasks.append(_safe_analyze(analyze_audio, file_path))
        else:
            tasks.append(_default_result({"cloned": False, "score": 90, "details": []}))

        # Emotion/sync for video
        if media_type == "video":
            tasks.append(_safe_analyze(analyze_emotion_mismatch, file_path))
            tasks.append(_safe_analyze(analyze_sync, file_path))
        else:
            tasks.append(_default_result({"faceEmotion": None, "audioEmotion": None, "score": 5}))
            tasks.append(_default_result({"lipSyncMismatch": False, "mismatchScore": 5, "details": []}))

        results = await asyncio.gather(*tasks)

        sightengine_result = results[0]
        metadata_result = results[1]
        fingerprint_result = results[2]
        compression_result = results[3]
        audio_result = results[4]
        emotion_result = results[5]
        sync_result = results[6]

        # Compute composite trust score
        trust_score = _compute_composite_score(
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
            "heatmap_url": None,
        }

        supabase.table("detections").insert(detection_record).execute()

        # Log activity
        _log_activity(supabase, current_user.id, "detection_created", "detection", detection_id)

        # Build response
        base_url = str(request.base_url).rstrip("/") if request else "http://localhost:8000"
        file_url = f"{base_url}/api/detect/{detection_id}/file"

        return {
            "status": "success",
            "mediaType": media_type,
            "trustScore": trust_score,
            "label": label,
            "anomalies": anomalies,
            "heatmapUrl": None,
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
            detail=f"Error: {str(e)}",
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


@router.get("/{detection_id}")
async def get_detection(
    detection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
):
    """Get detection result by ID."""
    supabase = get_supabase()

    resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
    detection = resp.data

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
    }

    return {k: v for k, v in response.items() if v is not None}


@router.get("/{detection_id}/file")
async def get_detection_file(
    detection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get the uploaded file for a detection."""
    supabase = get_supabase()

    resp = supabase.table("detections").select("*").eq("id", detection_id).single().execute()
    detection = resp.data

    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")

    if detection["user_id"] != current_user.id and current_user.role not in ("investigator", "admin"):
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
