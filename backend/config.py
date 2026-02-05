"""Configuration settings for MediaGuardX backend."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # JWT Configuration
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24  # 24 hours
    
    # Database
    mongo_url: str
    
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
    
    # Account Security
    max_failed_login_attempts: int = 5
    account_lockout_minutes: int = 30
    
    # Email (placeholder)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

