"""Metadata analysis service for deepfake detection.

Extracts and analyzes file metadata (EXIF, video metadata) to find
tampering indicators like missing camera info, irregular timestamps,
and suspicious compression artifacts.
"""
import logging
import os
import struct
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except Exception:
    CV2_AVAILABLE = False


def _extract_image_exif(file_path: str) -> dict:
    """Extract EXIF metadata from an image file."""
    if not PIL_AVAILABLE:
        return {}

    try:
        img = Image.open(file_path)
        exif_data = img.getexif()
        if not exif_data:
            return {}

        result = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            try:
                result[tag_name] = str(value)
            except Exception:
                pass
        return result
    except Exception:
        return {}


def _extract_video_metadata(file_path: str) -> dict:
    """Extract metadata from a video file using OpenCV."""
    if not CV2_AVAILABLE:
        return {}

    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return {}

        meta = {
            "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "codec": int(cap.get(cv2.CAP_PROP_FOURCC)),
        }
        cap.release()

        # Decode fourcc
        fourcc = meta["codec"]
        if fourcc > 0:
            meta["codec_name"] = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

        return meta
    except Exception:
        return {}


async def analyze_metadata(file_path: str, media_type: str) -> Optional[dict]:
    """Analyze file metadata for deepfake indicators.

    Returns dict matching frontend metadataAnalysis interface:
        { missingCamera: bool, irregularTimestamps: bool,
          suspiciousCompression: bool, details: list[str] }
    """
    details = []
    missing_camera = False
    irregular_timestamps = False
    suspicious_compression = False

    if media_type == "image":
        exif = _extract_image_exif(file_path)

        if not exif:
            missing_camera = True
            details.append("No EXIF metadata found — typical of AI-generated or edited images")
        else:
            # Check for camera info
            camera_fields = ["Make", "Model", "LensModel"]
            has_camera = any(f in exif for f in camera_fields)
            if not has_camera:
                missing_camera = True
                details.append("No camera make/model in EXIF data")

            # Check for software editing tags
            software = exif.get("Software", "")
            editing_tools = ["photoshop", "gimp", "affinity", "lightroom", "deepfake"]
            if any(tool in software.lower() for tool in editing_tools):
                details.append(f"Editing software detected: {software}")

            # Check date consistency
            date_original = exif.get("DateTimeOriginal")
            date_digitized = exif.get("DateTimeDigitized")
            date_modified = exif.get("DateTime")
            if date_original and date_modified and date_original != date_modified:
                irregular_timestamps = True
                details.append(f"Timestamp mismatch: original={date_original}, modified={date_modified}")

            # Check for thumbnail mismatch (common in tampered images)
            if "JPEGThumbnailLength" in exif:
                details.append("Embedded thumbnail present — checking for consistency")

        # Check file compression ratio
        file_size = os.path.getsize(file_path)
        if PIL_AVAILABLE:
            try:
                img = Image.open(file_path)
                w, h = img.size
                uncompressed = w * h * 3  # RGB bytes
                ratio = file_size / uncompressed if uncompressed > 0 else 1
                if ratio > 0.8:
                    suspicious_compression = True
                    details.append(f"Unusually low compression ratio ({ratio:.2f})")
                elif ratio < 0.01:
                    suspicious_compression = True
                    details.append(f"Extremely high compression ({ratio:.4f}) — possible re-encoding")
            except Exception:
                pass

    elif media_type == "video":
        vmeta = _extract_video_metadata(file_path)
        if not vmeta:
            details.append("Unable to extract video metadata")
        else:
            fps = vmeta.get("fps", 0)
            if fps and fps not in [23.976, 24, 25, 29.97, 30, 50, 59.94, 60]:
                irregular_timestamps = True
                details.append(f"Non-standard frame rate: {fps:.3f} fps")

            codec_name = vmeta.get("codec_name", "")
            if codec_name:
                details.append(f"Video codec: {codec_name}")

            # Check for very low resolution (common in compressed deepfakes)
            w = vmeta.get("width", 0)
            h = vmeta.get("height", 0)
            if w > 0 and h > 0 and (w < 360 or h < 360):
                suspicious_compression = True
                details.append(f"Low resolution ({w}x{h}) — possible social media compression")

    elif media_type == "audio":
        # Basic audio file metadata
        file_size = os.path.getsize(file_path)
        ext = Path(file_path).suffix.lower()
        if ext in [".mp3", ".aac", ".ogg"]:
            details.append(f"Lossy audio format ({ext})")
            if file_size < 50000:
                suspicious_compression = True
                details.append("Very small audio file — heavily compressed")

    if not details:
        details.append("Metadata appears normal")

    return {
        "missingCamera": missing_camera,
        "irregularTimestamps": irregular_timestamps,
        "suspiciousCompression": suspicious_compression,
        "details": details,
    }
