"""Activity log model schema."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


class ActivityLog(BaseModel):
    """Activity log model for auditing."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    action: str
    resource_type: Literal["user", "detection", "report", "admin"]
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[dict] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

