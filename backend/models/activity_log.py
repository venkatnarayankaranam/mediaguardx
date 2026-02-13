"""Activity log model schema for Supabase."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityLogResponse(BaseModel):
    """Activity log response schema."""
    id: str
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime
