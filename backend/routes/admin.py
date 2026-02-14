"""Admin routes using Supabase."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from database import get_supabase
from middleware.auth import require_admin, AuthenticatedUser
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/users")
async def get_all_users(
    current_user: AuthenticatedUser = Depends(require_admin),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
):
    """Get all users (admin only)."""
    supabase = get_supabase()

    resp = supabase.table("profiles").select("*", count="exact").order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    users = []
    for profile in resp.data or []:
        users.append({
            "id": profile["id"],
            "email": profile["email"],
            "name": profile["name"],
            "role": profile["role"],
            "is_active": profile.get("is_active", True),
            "avatar_url": profile.get("avatar_url"),
            "created_at": profile.get("created_at"),
        })

    return {
        "users": users,
        "total": resp.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str = Query(..., regex="^(user|investigator|admin)$"),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    """Update a user's role (admin only)."""
    supabase = get_supabase()

    resp = supabase.table("profiles").update({"role": role}).eq("id", user_id).execute()

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Log activity
    _log_activity(supabase, current_user.id, "role_changed", "user", user_id, {"new_role": role})

    return {"message": "Role updated", "user_id": user_id, "role": role}


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool = Query(...),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    """Toggle user active status (admin only)."""
    supabase = get_supabase()

    resp = supabase.table("profiles").update({"is_active": is_active}).eq("id", user_id).execute()

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _log_activity(supabase, current_user.id, "status_changed", "user", user_id, {"is_active": is_active})

    return {"message": "Status updated", "user_id": user_id, "is_active": is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    """Delete a user (admin only). Removes profile and auth user."""
    supabase = get_supabase()

    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    # Delete profile (cascade will handle detections/reports)
    supabase.table("profiles").delete().eq("id", user_id).execute()

    # Delete auth user
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.warning(f"Could not delete auth user {user_id}: {e}")

    _log_activity(supabase, current_user.id, "user_deleted", "user", user_id)

    return {"message": "User deleted", "user_id": user_id}


@router.get("/stats")
async def get_stats(current_user: AuthenticatedUser = Depends(require_admin)):
    """Get system statistics (admin only)."""
    supabase = get_supabase()

    # Count users
    users_resp = supabase.table("profiles").select("id", count="exact").execute()
    total_users = users_resp.count or 0

    # Count detections
    det_resp = supabase.table("detections").select("id", count="exact").execute()
    total_detections = det_resp.count or 0

    # Count reports
    rep_resp = supabase.table("reports").select("id", count="exact").execute()
    total_reports = rep_resp.count or 0

    # Count by media type
    image_resp = supabase.table("detections").select("id", count="exact").eq("media_type", "image").execute()
    video_resp = supabase.table("detections").select("id", count="exact").eq("media_type", "video").execute()
    audio_resp = supabase.table("detections").select("id", count="exact").eq("media_type", "audio").execute()

    # Count by label
    auth_resp = supabase.table("detections").select("id", count="exact").eq("label", "Authentic").execute()
    susp_resp = supabase.table("detections").select("id", count="exact").eq("label", "Suspicious").execute()
    deep_resp = supabase.table("detections").select("id", count="exact").eq("label", "Deepfake").execute()

    # Compute average trust score
    avg_trust_score = None
    if total_detections > 0:
        try:
            all_scores = supabase.table("detections").select("trust_score").execute()
            scores = [d["trust_score"] for d in (all_scores.data or []) if d.get("trust_score") is not None]
            if scores:
                avg_trust_score = round(sum(scores) / len(scores), 1)
        except Exception:
            pass

    return {
        "users": {"total": total_users},
        "detections": {
            "total": total_detections,
            "byType": {
                "image": image_resp.count or 0,
                "video": video_resp.count or 0,
                "audio": audio_resp.count or 0,
            },
            "byLabel": {
                "authentic": auth_resp.count or 0,
                "suspicious": susp_resp.count or 0,
                "deepfake": deep_resp.count or 0,
            },
        },
        "reports": {"total": total_reports},
        "avgTrustScore": avg_trust_score,
    }


@router.get("/activity-logs")
async def get_activity_logs(
    current_user: AuthenticatedUser = Depends(require_admin),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """Get activity logs (admin only)."""
    supabase = get_supabase()

    resp = supabase.table("activity_logs").select("*", count="exact").order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    logs = []
    for log in resp.data or []:
        # Get user email for display
        user_email = "System"
        if log.get("user_id"):
            try:
                profile_resp = supabase.table("profiles").select("email").eq("id", log["user_id"]).single().execute()
                if profile_resp.data:
                    user_email = profile_resp.data["email"]
            except Exception:
                pass

        logs.append({
            "id": log["id"],
            "action": log.get("action", ""),
            "userEmail": user_email,
            "timestamp": log.get("created_at", ""),
            "resource": log.get("resource_type", ""),
            "details": str(log.get("details", "")) if log.get("details") else None,
        })

    return {
        "logs": logs,
        "total": resp.count or 0,
        "limit": limit,
        "offset": offset,
    }


def _log_activity(supabase, user_id: str, action: str, resource_type: str, resource_id: str, details: dict = None):
    """Log activity."""
    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.error(f"Error logging activity: {e}")
