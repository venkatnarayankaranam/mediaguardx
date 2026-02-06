"""Authentication middleware."""
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from database import get_database
from models.user import User
from utils.auth import decode_access_token
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


# Guest user for unauthenticated access
def get_guest_user() -> User:
    """Return a guest user for unauthenticated requests."""
    return User(
        _id="guest",
        email="guest@mediaguardx.local",
        name="Guest User",
        password_hash="",
        role="admin",  # Give full access
        is_active=True,
        is_locked=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """Get current authenticated user from JWT token, or guest user if not authenticated."""
    # If no credentials provided, return guest user
    if credentials is None:
        return get_guest_user()

    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        # Return guest user if token is invalid
        return get_guest_user()
    
    user_id: str = payload.get("sub")
    if user_id is None:
        return get_guest_user()
    
    db = get_database()
    from bson import ObjectId
    try:
        user_obj_id = ObjectId(user_id)
    except:
        return get_guest_user()

    user_dict = await db.users.find_one({"_id": user_obj_id})

    if user_dict is None:
        return get_guest_user()
    
    # Convert ObjectId to string for Pydantic model
    if "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    
    user = User(**user_dict)
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if account is locked
    if user.is_locked:
        from datetime import datetime
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is locked. Please try again later."
            )
        else:
            # Lock expired, unlock the account
            await db.users.update_one(
                {"_id": ObjectId(user.id)},
                {"$set": {"is_locked": False, "failed_login_attempts": 0, "locked_until": None}}
            )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    return current_user


def require_role(allowed_roles: list[str]):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# Convenience dependencies
require_admin = require_role(["admin"])
require_investigator = require_role(["investigator", "admin"])
require_user = require_role(["user", "investigator", "admin"])

