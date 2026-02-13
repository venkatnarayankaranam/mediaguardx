"""Detection model schema for Supabase."""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


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


class DetectionResponse(BaseModel):
    """Detection API response schema."""
    status: str = "success"
    mediaType: Literal["image", "video", "audio"]
    trustScore: float
    label: Literal["Authentic", "Suspicious", "Deepfake"]
    anomalies: List[dict]
    heatmapUrl: Optional[str] = None
    fileUrl: Optional[str] = None
    detectionId: str
    sightengineResult: Optional[dict] = None
    audioAnalysis: Optional[dict] = None
    metadataAnalysis: Optional[dict] = None
    fingerprint: Optional[dict] = None
    compressionInfo: Optional[dict] = None
    emotionMismatch: Optional[dict] = None
    syncAnalysis: Optional[dict] = None
    xaiRegions: Optional[List[dict]] = None
