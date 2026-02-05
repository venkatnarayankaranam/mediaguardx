"""File handling utilities."""
import os
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile
from config import settings

# Create directories if they don't exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.reports_dir, exist_ok=True)
os.makedirs(settings.heatmaps_dir, exist_ok=True)


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"}


def get_file_extension(filename: str) -> str:
    """Get file extension from filename."""
    return Path(filename).suffix.lower()


def is_valid_file_type(filename: str, media_type: str) -> bool:
    """Check if file type is valid for the media type."""
    ext = get_file_extension(filename)
    
    if media_type == "image":
        return ext in ALLOWED_IMAGE_EXTENSIONS
    elif media_type == "video":
        return ext in ALLOWED_VIDEO_EXTENSIONS
    elif media_type == "audio":
        return ext in ALLOWED_AUDIO_EXTENSIONS
    return False


async def save_uploaded_file(file: UploadFile, media_type: str, user_id: str) -> Tuple[str, int]:
    """Save uploaded file and return file path and size."""
    # Validate file type
    if not is_valid_file_type(file.filename, media_type):
        raise ValueError(f"Invalid file type for {media_type}")
    
    # Generate unique filename
    file_ext = get_file_extension(file.filename)
    unique_filename = f"{user_id}_{uuid.uuid4()}{file_ext}"
    
    # Create user-specific directory
    user_dir = Path(settings.upload_dir) / media_type / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = user_dir / unique_filename
    
    # Save file
    contents = await file.read()
    file_size = len(contents)
    
    # Check file size (convert MB to bytes)
    max_size = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_size:
        raise ValueError(f"File size exceeds maximum allowed size of {settings.max_file_size_mb}MB")
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return str(file_path), file_size


def get_file_path_for_detection(file_path: str) -> str:
    """Get relative file path for storage in database."""
    # Store relative path from upload directory
    if file_path.startswith(settings.upload_dir):
        return file_path
    return file_path

