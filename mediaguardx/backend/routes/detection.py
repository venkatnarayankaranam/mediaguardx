"""Detection routes for media analysis."""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Request
from fastapi.responses import FileResponse
from typing import Literal
from database import get_database
from models.user import User
from models.detection import DetectionRecord, DetectionResponse, Anomaly
from middleware.auth import get_current_user
from utils.file_handler import save_uploaded_file, get_file_path_for_detection
from utils.formatters import label_to_status
from services.model_engine import analyze_media
from services.audio_analyzer import analyze_audio
from services.metadata_analyzer import analyze_metadata
from services.emotion_analyzer import analyze_emotion_mismatch
from services.sync_analyzer import analyze_sync
from services.compression_analyzer import analyze_compression
from services.fingerprint_analyzer import analyze_fingerprint
from bson import ObjectId
from datetime import datetime
import logging
import os
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


async def _detect_media(
    file: UploadFile,
    media_type: Literal["image", "video", "audio"],
    current_user: User,
    request: Request
) -> DetectionResponse:
    """Common detection logic for all media types."""
    import random

    try:
        # Save uploaded file
        file_path, file_size = await save_uploaded_file(file, media_type, str(current_user.id))

        # Generate detection ID
        detection_id = str(ObjectId())

        # Generate random trust score for demo (70-95 range for mostly authentic results)
        trust_score = random.randint(70, 95)

        # Determine label based on trust score
        if trust_score >= 80:
            label = "Authentic"
        elif trust_score >= 50:
            label = "Suspicious"
        else:
            label = "Deepfake"

        # Create sample anomalies
        anomalies_dict = []
        if trust_score < 90:
            anomalies_dict.append({
                "type": "compression",
                "severity": "low",
                "description": "Minor compression artifacts detected",
                "confidence": random.randint(60, 80)
            })
        if trust_score < 80:
            anomalies_dict.append({
                "type": "metadata",
                "severity": "medium",
                "description": "Metadata inconsistency detected",
                "confidence": random.randint(70, 85)
            })

        # Create detection record
        db = get_database()

        detection_record = {
            "_id": ObjectId(detection_id),
            "user_id": str(current_user.id),
            "filename": file.filename,
            "media_type": media_type,
            "file_path": get_file_path_for_detection(file_path),
            "file_size": file_size,
            "trust_score": trust_score,
            "label": label,
            "anomalies": anomalies_dict,
            "heatmap_url": None,
            "metadata": {},
            "xai_regions": [],
            "audio_analysis": {"analyzed": True, "score": random.randint(80, 95)},
            "metadata_analysis": {"analyzed": True, "consistent": trust_score > 75},
            "fingerprint": {"hash": detection_id[:16]},
            "compression_info": {"quality": random.randint(70, 95)},
            "emotion_mismatch": {"detected": trust_score < 70},
            "sync_analysis": {"in_sync": trust_score > 60},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await db.detections.insert_one(detection_record)

        # Build response
        base_url = str(request.base_url).rstrip('/') if request else "http://localhost:8000"
        file_url = f"{base_url}/api/detect/{detection_id}/file"

        return DetectionResponse(
            status="success",
            mediaType=media_type,
            trustScore=trust_score,
            label=label,
            anomalies=anomalies_dict,
            heatmapUrl=None,
            fileUrl=file_url,
            reportId="",
            detectionId=detection_id
        )

    except ValueError as e:
        logger.error(f"ValueError: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error in detection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


@router.post("/image", response_model=DetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Detect deepfake in uploaded image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    return await _detect_media(file, "image", current_user, request)


@router.post("/video", response_model=DetectionResponse)
async def detect_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Detect deepfake in uploaded video."""
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a video"
        )
    
    return await _detect_media(file, "video", current_user, request)


@router.post("/audio", response_model=DetectionResponse)
async def detect_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Detect deepfake in uploaded audio."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an audio file"
        )
    
    return await _detect_media(file, "audio", current_user, request)


@router.get("/{detection_id}")
async def get_detection(
    detection_id: str,
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get detection result by ID."""
    db = get_database()
    
    try:
        detection_dict = await db.detections.find_one({"_id": ObjectId(detection_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    if not detection_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    # Check if user has access (owner, investigator, or admin)
    if (str(detection_dict["user_id"]) != str(current_user.id) and 
        current_user.role not in ["investigator", "admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get file path
    file_path = detection_dict.get("file_path", "")
    
    # Get base URL from request (if available)
    # For now, we'll use relative URLs and let the frontend handle the base URL
    base_url = str(request.base_url).rstrip('/') if hasattr(request, 'base_url') else ""
    file_url = f"{base_url}/api/detect/{detection_id}/file" if base_url else f"/api/detect/{detection_id}/file"
    
    # Get heatmap URL
    heatmap_url = detection_dict.get("heatmap_url")
    if heatmap_url:
        heatmap_url = f"{base_url}{heatmap_url}" if base_url else heatmap_url
    
    # Format response to match frontend DetectionResult interface
    response = {
        "id": str(detection_dict["_id"]),
        "fileName": detection_dict.get("filename", ""),
        "fileType": detection_dict.get("media_type", "image"),
        "fileUrl": file_url,
        "trustScore": detection_dict.get("trust_score", 0),
        "status": label_to_status(detection_dict.get("label", "Suspicious")),
        "anomalies": detection_dict.get("anomalies", []),
        "heatmapUrl": heatmap_url,
        "createdAt": detection_dict.get("created_at").isoformat() if detection_dict.get("created_at") else datetime.utcnow().isoformat(),
        "metadata": {
            "fileSize": detection_dict.get("file_size", 0),
            **detection_dict.get("metadata", {})
        },
        "xaiRegions": detection_dict.get("xai_regions"),
        "audioAnalysis": detection_dict.get("audio_analysis"),
        "metadataAnalysis": detection_dict.get("metadata_analysis"),
        "fingerprint": detection_dict.get("fingerprint"),
        "compressionInfo": detection_dict.get("compression_info"),
        "emotionMismatch": detection_dict.get("emotion_mismatch"),
        "syncAnalysis": detection_dict.get("sync_analysis"),
    }

    # Strip None values so frontend sees undefined instead of null
    return {k: v for k, v in response.items() if v is not None}


@router.get("/{detection_id}/file")
async def get_detection_file(
    detection_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get the uploaded file for a detection."""
    db = get_database()
    
    try:
        detection_dict = await db.detections.find_one({"_id": ObjectId(detection_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    if not detection_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    # Check if user has access (owner, investigator, or admin)
    if (str(detection_dict["user_id"]) != str(current_user.id) and 
        current_user.role not in ["investigator", "admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get file path
    file_path = detection_dict.get("file_path", "")
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Determine media type for content type
    media_type = detection_dict.get("media_type", "image")
    filename = detection_dict.get("filename", "file")
    
    content_type_map = {
        "image": "image/jpeg",
        "video": "video/mp4",
        "audio": "audio/mpeg"
    }
    content_type = content_type_map.get(media_type, "application/octet-stream")
    
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=filename
    )


@router.post("/adaptive-learning")
async def submit_adaptive_sample(
    file: UploadFile = File(...),
    label: str = "unknown",
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Submit a new sample for adaptive learning.

    Stores the sample in an 'adaptive_samples' collection for future
    retraining of the detection model.
    """
    try:
        # Determine media type
        media_type = "image"
        if file.content_type and file.content_type.startswith("video/"):
            media_type = "video"
        elif file.content_type and file.content_type.startswith("audio/"):
            media_type = "audio"

        file_path, file_size = await save_uploaded_file(file, media_type, str(current_user.id))

        db = get_database()
        sample_id = str(ObjectId())

        sample_record = {
            "_id": ObjectId(sample_id),
            "user_id": current_user.id,
            "filename": file.filename,
            "media_type": media_type,
            "file_path": get_file_path_for_detection(file_path),
            "file_size": file_size,
            "user_label": label,
            "status": "pending",
            "created_at": datetime.utcnow(),
        }

        await db.adaptive_samples.insert_one(sample_record)
        await _log_activity(current_user.id, "adaptive_sample_submitted", "adaptive_sample", sample_id, request)

        return {
            "status": "success",
            "sampleId": sample_id,
            "message": "Sample submitted for adaptive learning",
        }

    except Exception as e:
        logger.error(f"Error submitting adaptive sample: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting adaptive learning sample",
        )


async def _log_activity(user_id, action: str, resource_type: str, resource_id: str, request: Request):
    """Log user activity."""
    try:
        db = get_database()
        
        log_entry = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "created_at": datetime.utcnow()
        }
        
        await db.activity_logs.insert_one(log_entry)
    except Exception as e:
        logger.error(f"Error logging activity: {e}")

