"""Detection history routes."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from database import get_database
from models.user import User
from middleware.auth import get_current_user, require_investigator
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user")
async def get_user_history(
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0)
):
    """Get detection history for current user."""
    db = get_database()
    
    # Find user's detections
    cursor = db.detections.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    detections = await cursor.to_list(length=limit)
    
    # Format response
    results = []
    for detection in detections:
        results.append({
            "id": str(detection["_id"]),
            "filename": detection.get("filename"),
            "mediaType": detection.get("media_type"),
            "trustScore": detection.get("trust_score"),
            "label": detection.get("label"),
            "timestamp": detection.get("created_at"),
            "userId": str(detection.get("user_id")),
            "decisionNotes": detection.get("decision_notes")
        })
    
    # Get total count
    total = await db.detections.count_documents({"user_id": current_user.id})
    
    return {
        "detections": results,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/admin")
async def get_admin_history(
    current_user: User = Depends(require_investigator),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    user_id: Optional[str] = Query(None)
):
    """Get all detection history (admin/investigator only)."""
    db = get_database()
    
    # Build query
    query = {}
    if user_id and current_user.role == "admin":
        try:
            query["user_id"] = ObjectId(user_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id"
            )
    
    # Find detections
    cursor = db.detections.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    detections = await cursor.to_list(length=limit)
    
    # Format response
    results = []
    for detection in detections:
        # Get user info
        user_dict = await db.users.find_one({"_id": detection.get("user_id")})
        user_email = user_dict.get("email") if user_dict else "Unknown"
        
        results.append({
            "id": str(detection["_id"]),
            "filename": detection.get("filename"),
            "mediaType": detection.get("media_type"),
            "trustScore": detection.get("trust_score"),
            "label": detection.get("label"),
            "timestamp": detection.get("created_at"),
            "userId": str(detection.get("user_id")),
            "userEmail": user_email,
            "decisionNotes": detection.get("decision_notes")
        })
    
    # Get total count
    total = await db.detections.count_documents(query)
    
    return {
        "detections": results,
        "total": total,
        "limit": limit,
        "skip": skip
    }

