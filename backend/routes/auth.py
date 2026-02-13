"""Authentication routes - simplified for Supabase Auth."""
from fastapi import APIRouter, Depends
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me")
async def get_current_user_info(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Get current user profile from Supabase."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "avatar_url": current_user.avatar_url,
    }


@router.post("/admin/verify")
async def verify_admin(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Check if the authenticated user has admin role."""
    return {
        "is_admin": current_user.role == "admin",
        "role": current_user.role,
    }
