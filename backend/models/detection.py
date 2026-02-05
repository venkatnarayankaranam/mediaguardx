"""Detection model schema."""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


class Anomaly(BaseModel):
    """Anomaly detection result."""
    type: Literal[
        "face_blending",
        "texture_artifacts",
        "lighting_inconsistency",
        "audio_sync_mismatch",
        "metadata_tampering",
        "model_prediction",
        "general"
    ]
    severity: Literal["low", "medium", "high"]
    description: str
    confidence: float = Field(ge=0, le=100)


class DetectionRecord(BaseModel):
    """Detection record model."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    filename: str
    media_type: Literal["image", "video", "audio"]
    file_path: str
    file_size: int
    trust_score: float = Field(ge=0, le=100)
    label: Literal["Authentic", "Suspicious", "Deepfake"]
    anomalies: List[Anomaly] = []
    heatmap_url: Optional[str] = None
    metadata: Optional[dict] = {}
    decision_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class DetectionResponse(BaseModel):
    """Detection API response schema."""
    status: str = "success"
    mediaType: Literal["image", "video", "audio"]
    trustScore: float
    label: Literal["Authentic", "Suspicious", "Deepfake"]
    anomalies: List[dict]
    heatmapUrl: Optional[str] = None
    fileUrl: Optional[str] = None
    reportId: str
    detectionId: str
    audioAnalysis: Optional[dict] = None
    metadataAnalysis: Optional[dict] = None
    fingerprint: Optional[dict] = None
    compressionInfo: Optional[dict] = None
    emotionMismatch: Optional[dict] = None
    syncAnalysis: Optional[dict] = None
    xaiRegions: Optional[List[dict]] = None

