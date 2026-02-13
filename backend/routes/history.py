"""Detection history routes using Supabase."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from database import get_supabase
from middleware.auth import get_current_user, require_investigator, AuthenticatedUser
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user")
async def get_user_history(
    current_user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
):
    """Get detection history for current user."""
    supabase = get_supabase()

    resp = (
        supabase.table("detections")
        .select("*", count="exact")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    results = []
    for det in resp.data or []:
        results.append({
            "id": det["id"],
            "filename": det.get("filename"),
            "mediaType": det.get("media_type"),
            "trustScore": det.get("trust_score"),
            "label": det.get("label"),
            "timestamp": det.get("created_at"),
            "userId": det.get("user_id"),
        })

    return {
        "detections": results,
        "total": resp.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/admin")
async def get_admin_history(
    current_user: AuthenticatedUser = Depends(require_investigator),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[str] = Query(None),
):
    """Get all detection history (admin/investigator only)."""
    supabase = get_supabase()

    query = supabase.table("detections").select("*", count="exact")

    if user_id:
        query = query.eq("user_id", user_id)

    resp = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    results = []
    for det in resp.data or []:
        # Get user email
        user_email = "Unknown"
        try:
            profile_resp = supabase.table("profiles").select("email").eq("id", det["user_id"]).single().execute()
            if profile_resp.data:
                user_email = profile_resp.data["email"]
        except Exception:
            pass

        results.append({
            "id": det["id"],
            "filename": det.get("filename"),
            "mediaType": det.get("media_type"),
            "trustScore": det.get("trust_score"),
            "label": det.get("label"),
            "timestamp": det.get("created_at"),
            "userId": det.get("user_id"),
            "userEmail": user_email,
        })

    return {
        "detections": results,
        "total": resp.count or 0,
        "limit": limit,
        "offset": offset,
    }
