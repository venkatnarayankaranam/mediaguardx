"""User model schema for Supabase."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    email: str
    name: str
    role: Literal["user", "investigator", "admin"]
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
