"""Configuration settings for MediaGuardX backend."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str
    supabase_service_key: str

    # Sightengine API
    sightengine_api_user: str = ""
    sightengine_api_secret: str = ""

    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    node_env: str = "development"

    # CORS
    frontend_url: str = "http://localhost:5173"

    # File Upload
    max_file_size_mb: int = 500
    upload_dir: str = "uploads"
    reports_dir: str = "reports"
    heatmaps_dir: str = "heatmaps"

    # Rate Limiting
    rate_limit_per_minute: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
