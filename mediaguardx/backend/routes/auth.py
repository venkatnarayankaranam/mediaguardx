"""Authentication routes."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timedelta
from database import get_database
from models.user import User, UserCreate, UserLogin, TokenResponse, UserResponse, ForgotPasswordRequest
from utils.auth import verify_password, get_password_hash, create_access_token
from middleware.auth import get_current_user
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request):
    """Register a new user."""
    db = get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = get_password_hash(user_data.password)

    # Create user document — force role to "user" to prevent privilege escalation
    user_dict = {
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": password_hash,
        "role": "user",
        "is_active": True,
        "is_locked": False,
        "failed_login_attempts": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    
    user = User(**user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    # Log activity
    await _log_activity(None, "user_registered", "user", str(user.id), request)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, request: Request):
    """Login user."""
    db = get_database()
    
    # Find user
    user_dict = await db.users.find_one({"email": user_data.email})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Convert ObjectId to string for Pydantic model
    if "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    
    user = User(**user_dict)
    
    # Check if account is locked
    if user.is_locked:
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is locked. Please try again later."
            )
        else:
            # Lock expired, unlock the account
            from bson import ObjectId
            await db.users.update_one(
                {"_id": ObjectId(user.id)},
                {"$set": {"is_locked": False, "failed_login_attempts": 0, "locked_until": None}}
            )
            user.is_locked = False
            user.failed_login_attempts = 0
    
    # Verify password
    if not verify_password(user_data.password, user.password_hash):
        # Increment failed attempts
        failed_attempts = user.failed_login_attempts + 1
        is_locked = False
        locked_until = None
        
        if failed_attempts >= settings.max_failed_login_attempts:
            is_locked = True
            locked_until = datetime.utcnow() + timedelta(minutes=settings.account_lockout_minutes)
        
        from bson import ObjectId
        await db.users.update_one(
            {"_id": ObjectId(user.id)},
            {"$set": {
                "failed_login_attempts": failed_attempts,
                "is_locked": is_locked,
                "locked_until": locked_until,
                "updated_at": datetime.utcnow()
            }}
        )
        
        await _log_activity(user.id, "login_failed", "user", str(user.id), request)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Reset failed attempts on successful login
    if user.failed_login_attempts > 0:
        from bson import ObjectId
        await db.users.update_one(
            {"_id": ObjectId(user.id)},
            {"$set": {"failed_login_attempts": 0, "updated_at": datetime.utcnow()}}
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    # Log activity
    await _log_activity(user.id, "login_success", "user", str(user.id), request)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest, request: Request):
    """Forgot password endpoint (placeholder for email functionality)."""
    db = get_database()
    
    user_dict = await db.users.find_one({"email": request_data.email})
    if not user_dict:
        # Don't reveal if user exists for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # TODO: Implement email sending functionality
    # For now, just log the request
    logger.info(f"Password reset requested for email: {request_data.email}")
    
    await _log_activity(None, "password_reset_requested", "user", str(user_dict["_id"]), request)
    
    return {"message": "If the email exists, a password reset link has been sent"}


async def _log_activity(user_id, action: str, resource_type: str, resource_id: str, request: Request):
    """Log user activity."""
    try:
        from bson import ObjectId
        db = get_database()
        
        log_entry = {
            "user_id": ObjectId(user_id) if user_id else None,
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

