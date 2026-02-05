"""Admin routes."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from database import get_database
from models.user import User, UserResponse
from middleware.auth import require_admin
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/users")
async def get_all_users(
    current_user: User = Depends(require_admin),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0)
):
    """Get all users (admin only)."""
    db = get_database()
    
    cursor = db.users.find().sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    
    total = await db.users.count_documents({})
    
    user_list = []
    for user_dict in users:
        user_list.append(UserResponse(
            id=str(user_dict["_id"]),
            email=user_dict["email"],
            name=user_dict["name"],
            role=user_dict["role"],
            is_active=user_dict.get("is_active", True),
            created_at=user_dict.get("created_at")
        ))
    
    return {
        "users": user_list,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/stats")
async def get_stats(current_user: User = Depends(require_admin)):
    """Get system statistics (admin only)."""
    db = get_database()
    
    total_users = await db.users.count_documents({})
    total_detections = await db.detections.count_documents({})
    total_reports = await db.reports.count_documents({})
    
    # Count by media type
    image_count = await db.detections.count_documents({"media_type": "image"})
    video_count = await db.detections.count_documents({"media_type": "video"})
    audio_count = await db.detections.count_documents({"media_type": "audio"})
    
    # Count by label
    authentic_count = await db.detections.count_documents({"label": "Authentic"})
    suspicious_count = await db.detections.count_documents({"label": "Suspicious"})
    deepfake_count = await db.detections.count_documents({"label": "Deepfake"})
    
    return {
        "users": {
            "total": total_users
        },
        "detections": {
            "total": total_detections,
            "byType": {
                "image": image_count,
                "video": video_count,
                "audio": audio_count
            },
            "byLabel": {
                "authentic": authentic_count,
                "suspicious": suspicious_count,
                "deepfake": deepfake_count
            }
        },
        "reports": {
            "total": total_reports
        }
    }

