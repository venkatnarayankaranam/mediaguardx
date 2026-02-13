"""Report model schema for Supabase."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportResponse(BaseModel):
    """Report response schema."""
    id: str
    detectionId: str
    pdfUrl: str
    caseId: Optional[str] = None
    tamperProofHash: Optional[str] = None
    createdAt: datetime
