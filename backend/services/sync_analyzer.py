"""Voice-face synchronization analysis service.

Detects lip-sync mismatches by comparing audio onset times with
facial motion in video content.
"""
import logging
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
    import librosa
    LIBROSA_AVAILABLE = True
except Exception:
    LIBROSA_AVAILABLE = False


def _detect_mouth_motion(video_path: str, max_frames: int = 30) -> list:
    """Detect mouth region motion across video frames.

    Returns list of per-frame mouth motion magnitude values.
    """
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return []

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        motion_values = []
        prev_mouth_roi = None
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        step = max(1, frame_count // max_frames) if frame_count > 0 else 1

        frame_idx = 0
        while len(motion_values) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % step != 0:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

            if len(faces) > 0:
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                # Mouth region: lower third of face
                mouth_y = y + int(h * 0.6)
                mouth_h = int(h * 0.4)
                mouth_roi = gray[mouth_y:mouth_y + mouth_h, x:x + w]

                if prev_mouth_roi is not None and mouth_roi.shape == prev_mouth_roi.shape:
                    diff = np.mean(np.abs(mouth_roi.astype(float) - prev_mouth_roi.astype(float)))
                    motion_values.append(float(diff))

                prev_mouth_roi = mouth_roi.copy()

        cap.release()
        return motion_values

    except Exception as e:
        logger.warning("Mouth motion detection failed: %s", e)
        return []


def _detect_audio_onsets(file_path: str) -> list:
    """Detect audio onset times (speech segments) in the audio track."""
    if not LIBROSA_AVAILABLE or not NUMPY_AVAILABLE:
        return []

    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=30)
        if len(y) == 0:
            return []

        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units="time")
        return onset_frames.tolist()

    except Exception as e:
        logger.warning("Audio onset detection failed: %s", e)
        return []


async def analyze_sync(file_path: str, media_type: str) -> Optional[dict]:
    """Analyze voice-face synchronization.

    Returns dict matching frontend syncAnalysis interface:
        { lipSyncMismatch: bool, mismatchScore: float, details: list[str] }
    """
    if media_type != "video":
        return None

    details = []

    mouth_motion = _detect_mouth_motion(file_path)
    audio_onsets = _detect_audio_onsets(file_path)

    if not mouth_motion and not audio_onsets:
        return None

    if not mouth_motion:
        details.append("No face/mouth detected in video frames")
        return {
            "lipSyncMismatch": False,
            "mismatchScore": 30.0,
            "details": details,
        }

    if not audio_onsets:
        details.append("No speech detected in audio track")
        has_mouth_activity = any(m > 5.0 for m in mouth_motion)
        if has_mouth_activity:
            details.append("Mouth movement detected but no corresponding audio — possible mismatch")
            return {
                "lipSyncMismatch": True,
                "mismatchScore": 70.0,
                "details": details,
            }
        return {
            "lipSyncMismatch": False,
            "mismatchScore": 10.0,
            "details": details,
        }

    # Compare audio activity with mouth motion
    motion_mean = float(np.mean(mouth_motion))
    motion_std = float(np.std(mouth_motion))
    onset_density = len(audio_onsets) / 30.0  # onsets per second

    # High audio activity with low mouth motion = mismatch
    if onset_density > 2.0 and motion_mean < 3.0:
        mismatch_score = 80.0
        lip_sync_mismatch = True
        details.append("Active speech detected but minimal mouth movement")
    # Low audio activity with high mouth motion = mismatch
    elif onset_density < 0.5 and motion_mean > 10.0:
        mismatch_score = 70.0
        lip_sync_mismatch = True
        details.append("Significant mouth movement with minimal speech audio")
    else:
        mismatch_score = max(0, 50.0 - (motion_std * 2))
        lip_sync_mismatch = mismatch_score > 50
        if lip_sync_mismatch:
            details.append("Irregular correlation between speech and lip movement")
        else:
            details.append("Lip movement correlates reasonably with audio")

    return {
        "lipSyncMismatch": lip_sync_mismatch,
        "mismatchScore": round(mismatch_score, 1),
        "details": details,
    }
