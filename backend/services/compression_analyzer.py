"""Social media compression analysis service.

Detects compression artifacts and estimates the social media platform
a file may have been shared through based on compression signatures.
"""
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except Exception:
    NUMPY_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except Exception:
    CV2_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

# Known social media compression signatures (resolution, bitrate ranges)
PLATFORM_SIGNATURES = {
    "WhatsApp": {"max_width": 1600, "max_height": 1200, "quality_range": (30, 60)},
    "Instagram": {"max_width": 1080, "max_height": 1350, "quality_range": (40, 75)},
    "TikTok": {"max_width": 1080, "max_height": 1920, "quality_range": (50, 80)},
    "Twitter/X": {"max_width": 4096, "max_height": 4096, "quality_range": (60, 85)},
    "Telegram": {"max_width": 2560, "max_height": 2560, "quality_range": (70, 90)},
}


def _estimate_jpeg_quality(file_path: str) -> Optional[float]:
    """Estimate JPEG quality level from quantization tables."""
    try:
        file_size = os.path.getsize(file_path)
        if PIL_AVAILABLE:
            img = Image.open(file_path)
            w, h = img.size
            # Estimate quality from compression ratio
            uncompressed = w * h * 3
            if uncompressed > 0:
                ratio = file_size / uncompressed
                # Map ratio to approximate quality (0-100)
                quality = min(100, max(0, ratio * 500))
                return quality
    except Exception:
        pass
    return None


def _detect_blocking_artifacts(file_path: str) -> float:
    """Detect JPEG blocking artifacts in an image (0=none, 1=severe)."""
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return 0.0

    try:
        img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0

        h, w = img.shape
        if h < 16 or w < 16:
            return 0.0

        # Measure blockiness by looking at 8x8 block boundaries
        block_size = 8
        h_blocks = (h // block_size) * block_size
        w_blocks = (w // block_size) * block_size
        img_cropped = img[:h_blocks, :w_blocks].astype(float)

        # Horizontal block boundary differences
        h_diffs = []
        for i in range(block_size, h_blocks, block_size):
            diff = np.mean(np.abs(img_cropped[i, :] - img_cropped[i-1, :]))
            h_diffs.append(diff)

        # Vertical block boundary differences
        v_diffs = []
        for j in range(block_size, w_blocks, block_size):
            diff = np.mean(np.abs(img_cropped[:, j] - img_cropped[:, j-1]))
            v_diffs.append(diff)

        if not h_diffs or not v_diffs:
            return 0.0

        # Compare boundary differences to non-boundary differences
        non_boundary_h = []
        for i in range(1, h_blocks):
            if i % block_size != 0:
                diff = np.mean(np.abs(img_cropped[i, :] - img_cropped[i-1, :]))
                non_boundary_h.append(diff)

        mean_boundary = (np.mean(h_diffs) + np.mean(v_diffs)) / 2
        mean_non_boundary = np.mean(non_boundary_h) if non_boundary_h else mean_boundary

        if mean_non_boundary > 0:
            blockiness = max(0, (mean_boundary - mean_non_boundary) / mean_non_boundary)
        else:
            blockiness = 0.0

        return min(1.0, blockiness)

    except Exception:
        return 0.0


async def analyze_compression(file_path: str, media_type: str) -> Optional[dict]:
    """Analyze compression artifacts and identify potential social media source.

    Returns dict matching frontend compressionInfo interface:
        { platform: str|None, compressionRatio: float, evidence: list[str] }
    """
    evidence = []
    detected_platform = None

    file_size = os.path.getsize(file_path)

    if media_type == "image":
        quality = _estimate_jpeg_quality(file_path)
        if quality is not None:
            evidence.append(f"Estimated JPEG quality: {quality:.0f}/100")

        blockiness = _detect_blocking_artifacts(file_path)
        if blockiness > 0.3:
            evidence.append(f"Significant blocking artifacts detected (score: {blockiness:.2f})")
        elif blockiness > 0.1:
            evidence.append(f"Mild blocking artifacts detected (score: {blockiness:.2f})")

        if PIL_AVAILABLE:
            try:
                img = Image.open(file_path)
                w, h = img.size
                uncompressed = w * h * 3
                comp_ratio = file_size / uncompressed if uncompressed > 0 else 1.0

                evidence.append(f"Image dimensions: {w}x{h}")
                evidence.append(f"Compression ratio: {comp_ratio:.4f}")

                # Match against platform signatures
                for platform, sig in PLATFORM_SIGNATURES.items():
                    if w <= sig["max_width"] and h <= sig["max_height"]:
                        q_low, q_high = sig["quality_range"]
                        if quality and q_low <= quality <= q_high:
                            detected_platform = platform
                            evidence.append(f"Dimensions and quality consistent with {platform}")
                            break

                return {
                    "platform": detected_platform,
                    "compressionRatio": round(comp_ratio, 4),
                    "evidence": evidence,
                }
            except Exception:
                pass

    elif media_type == "video":
        if CV2_AVAILABLE:
            try:
                cap = cv2.VideoCapture(file_path)
                if cap.isOpened():
                    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    cap.release()

                    duration = frames / fps if fps > 0 else 0
                    bitrate = (file_size * 8) / duration if duration > 0 else 0

                    evidence.append(f"Video dimensions: {w}x{h}")
                    evidence.append(f"Frame rate: {fps:.1f} fps")
                    evidence.append(f"Estimated bitrate: {bitrate/1000:.0f} kbps")

                    if bitrate < 500000:  # < 500kbps
                        evidence.append("Very low bitrate — heavy compression")
                        if w <= 480:
                            detected_platform = "WhatsApp"
                        elif w <= 720:
                            detected_platform = "Instagram"
                    elif bitrate < 2000000:  # < 2Mbps
                        evidence.append("Moderate bitrate — possible social media compression")
                        if w == 1080 and h == 1920:
                            detected_platform = "TikTok"

                    comp_ratio = bitrate / (w * h * fps * 24) if (w * h * fps) > 0 else 0
                    return {
                        "platform": detected_platform,
                        "compressionRatio": round(comp_ratio, 6),
                        "evidence": evidence,
                    }
            except Exception:
                pass

    if not evidence:
        evidence.append("No compression analysis available for this file type")

    return {
        "platform": detected_platform,
        "compressionRatio": 0.0,
        "evidence": evidence,
    }
