"""Authentication middleware using Supabase Auth."""
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from database import get_supabase
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents an authenticated user with profile data."""

    def __init__(self, id: str, email: str, name: str, role: str, is_active: bool = True, avatar_url: str | None = None):
        self.id = id
        self.email = email
        self.name = name
        self.role = role
        self.is_active = is_active
        self.avatar_url = avatar_url


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """Verify Supabase JWT and return authenticated user with profile."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    supabase = get_supabase()

    try:
        # Verify the JWT token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        user_id = user_response.user.id

        # Fetch profile with role info
        try:
            profile_resp = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            profile = profile_resp.data
        except Exception:
            profile = None

        # Auto-create profile if it doesn't exist (handles users who registered without trigger)
        if not profile:
            try:
                auth_user = user_response.user
                new_profile = {
                    "id": user_id,
                    "email": auth_user.email or "",
                    "name": (auth_user.user_metadata or {}).get("name") or (auth_user.email or "").split("@")[0],
                    "role": "user",
                    "is_active": True,
                }
                supabase.table("profiles").insert(new_profile).execute()
                profile = new_profile
                logger.info(f"Auto-created profile for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to auto-create profile: {e}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found",
                )

        if not profile.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return AuthenticatedUser(
            id=profile["id"],
            email=profile["email"],
            name=profile["name"],
            role=profile["role"],
            is_active=profile.get("is_active", True),
            avatar_url=profile.get("avatar_url"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )


async def get_current_active_user(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Get current active user."""
    return current_user


def require_role(allowed_roles: list[str]):
    """Dependency factory for role-based access control."""

    async def role_checker(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


# Convenience dependencies
require_admin = require_role(["admin"])
require_investigator = require_role(["investigator", "admin"])
require_user = require_role(["user", "investigator", "admin"])
