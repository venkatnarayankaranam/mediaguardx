"""User model schema."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId


# For Pydantic v2, we'll use str for IDs and convert when needed
# PyObjectId is kept for type hints but fields use str
PyObjectId = ObjectId


class UserRole(str):
    """User role type."""
    USER = "user"
    INVESTIGATOR = "investigator"
    ADMIN = "admin"


class User(BaseModel):
    """User model."""
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    name: str
    password_hash: str
    role: Literal["user", "investigator", "admin"] = "user"
    is_active: bool = True
    is_locked: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class UserCreate(BaseModel):
    """User creation schema."""
    email: EmailStr
    name: str
    password: str
    role: Literal["user", "investigator", "admin"] = "user"


class UserResponse(BaseModel):
    """User response schema (without password)."""
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request schema."""
    token: str
    new_password: str

