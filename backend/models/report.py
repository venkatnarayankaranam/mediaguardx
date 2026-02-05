"""Report model schema."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


class Report(BaseModel):
    """Report model."""
    id: Optional[str] = Field(default=None, alias="_id")
    detection_id: str
    user_id: str
    pdf_path: str
    case_id: str
    tamper_proof_hash: str
    qr_code_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class ReportResponse(BaseModel):
    """Report response schema."""
    id: str
    detectionId: str
    pdfUrl: str
    createdAt: datetime

