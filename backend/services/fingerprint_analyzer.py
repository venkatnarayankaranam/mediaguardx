"""Deepfake fingerprint / source detection service.

Identifies which tool or technique was likely used to generate a deepfake
by analyzing characteristic artifacts left by known generation methods.
"""
import logging
import os
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

# Known deepfake tool fingerprints based on artifact patterns
KNOWN_SOURCES = [
    {"name": "FaceSwap", "indicators": ["face_boundary_blur", "color_mismatch"]},
    {"name": "DeepFaceLab", "indicators": ["mask_edge_artifacts", "consistent_skin_tone"]},
    {"name": "Face2Face", "indicators": ["expression_artifacts", "temporal_flicker"]},
    {"name": "NeuralTextures", "indicators": ["texture_pattern", "high_frequency_noise"]},
    {"name": "StyleGAN", "indicators": ["symmetric_artifacts", "spectral_anomaly"]},
    {"name": "Wav2Lip", "indicators": ["lip_region_blur", "resolution_mismatch"]},
]


def _analyze_frequency_domain(file_path: str) -> dict:
    """Analyze frequency-domain characteristics of an image.

    GAN-generated images often show distinctive patterns in the frequency
    domain (spectral peaks at regular intervals).
    """
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return {}

    try:
        img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {}

        # Compute 2D FFT
        f_transform = np.fft.fft2(img.astype(float))
        f_shift = np.fft.fftshift(f_transform)
        magnitude = np.log1p(np.abs(f_shift))

        h, w = magnitude.shape
        center_y, center_x = h // 2, w // 2

        # Analyze radial frequency distribution
        # Natural images have smooth falloff; GAN images have periodic peaks
        radii = np.sqrt(
            (np.arange(h)[:, None] - center_y) ** 2 +
            (np.arange(w)[None, :] - center_x) ** 2
        )

        max_radius = min(center_x, center_y)
        radial_profile = []
        for r in range(1, int(max_radius)):
            mask = (radii >= r - 0.5) & (radii < r + 0.5)
            if np.any(mask):
                radial_profile.append(float(np.mean(magnitude[mask])))

        if len(radial_profile) < 10:
            return {}

        profile = np.array(radial_profile)

        # Check for periodic peaks (GAN fingerprint)
        # Compute autocorrelation of the radial profile
        profile_centered = profile - np.mean(profile)
        autocorr = np.correlate(profile_centered, profile_centered, mode="full")
        autocorr = autocorr[len(autocorr) // 2:]
        if autocorr[0] > 0:
            autocorr = autocorr / autocorr[0]

        # Look for secondary peaks in autocorrelation
        peaks = []
        for i in range(2, len(autocorr) - 1):
            if autocorr[i] > autocorr[i-1] and autocorr[i] > autocorr[i+1] and autocorr[i] > 0.3:
                peaks.append(i)

        # High-frequency energy ratio
        mid = len(profile) // 2
        low_energy = float(np.mean(profile[:mid]))
        high_energy = float(np.mean(profile[mid:]))
        hf_ratio = high_energy / low_energy if low_energy > 0 else 0

        return {
            "periodic_peaks": len(peaks),
            "hf_ratio": hf_ratio,
            "spectral_std": float(np.std(profile)),
        }

    except Exception as e:
        logger.warning("Frequency analysis failed: %s", e)
        return {}


def _check_face_boundary(file_path: str) -> dict:
    """Check for blending artifacts at face boundaries."""
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return {}

    try:
        img = cv2.imread(file_path)
        if img is None:
            return {}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

        if len(faces) == 0:
            return {"has_face": False}

        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

        # Analyze edge sharpness around face boundary
        face_mask = np.zeros(gray.shape, dtype=np.uint8)
        face_mask[y:y+h, x:x+w] = 255

        # Dilate to get boundary region
        kernel = np.ones((5, 5), np.uint8)
        boundary = cv2.dilate(face_mask, kernel) - cv2.erode(face_mask, kernel)

        boundary_pixels = gray[boundary > 0]
        if len(boundary_pixels) < 10:
            return {"has_face": True}

        # Laplacian of the boundary region for blur detection
        boundary_region = gray.copy()
        boundary_region[boundary == 0] = 0
        laplacian = cv2.Laplacian(boundary_region, cv2.CV_64F)
        boundary_laplacian = laplacian[boundary > 0]

        blur_score = float(np.var(boundary_laplacian))

        return {
            "has_face": True,
            "boundary_blur": blur_score < 100,
            "blur_score": blur_score,
        }

    except Exception as e:
        logger.warning("Face boundary check failed: %s", e)
        return {}


async def analyze_fingerprint(file_path: str, media_type: str) -> Optional[dict]:
    """Identify the likely source/tool of a deepfake.

    Returns dict matching frontend fingerprint interface:
        { source: str|None, probability: float }
    """
    if media_type == "audio":
        return None

    freq_result = _analyze_frequency_domain(file_path)
    face_result = _check_face_boundary(file_path)

    if not freq_result and not face_result:
        return None

    scores = {}

    # Score each known source based on detected indicators
    periodic_peaks = freq_result.get("periodic_peaks", 0)
    hf_ratio = freq_result.get("hf_ratio", 0)
    has_boundary_blur = face_result.get("boundary_blur", False)
    has_face = face_result.get("has_face", False)

    if periodic_peaks > 2:
        scores["StyleGAN"] = scores.get("StyleGAN", 0) + 40
        scores["NeuralTextures"] = scores.get("NeuralTextures", 0) + 20

    if hf_ratio > 0.7:
        scores["NeuralTextures"] = scores.get("NeuralTextures", 0) + 30
    elif hf_ratio < 0.3:
        scores["FaceSwap"] = scores.get("FaceSwap", 0) + 20

    if has_face and has_boundary_blur:
        scores["FaceSwap"] = scores.get("FaceSwap", 0) + 35
        scores["DeepFaceLab"] = scores.get("DeepFaceLab", 0) + 30

    if not scores:
        return {
            "source": None,
            "probability": 0.0,
        }

    best_source = max(scores, key=scores.get)
    best_score = min(100, scores[best_source])

    return {
        "source": best_source if best_score > 30 else None,
        "probability": round(best_score, 1),
    }
