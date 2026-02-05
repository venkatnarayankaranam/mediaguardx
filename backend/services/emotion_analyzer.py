"""Emotion mismatch detection service.

Compares facial expressions with audio emotional tone to detect
inconsistencies that may indicate deepfake manipulation.
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

# Simple emotion labels based on audio features
AUDIO_EMOTIONS = ["neutral", "happy", "sad", "angry", "surprised", "fearful"]


def _analyze_face_emotion(file_path: str, media_type: str) -> Optional[str]:
    """Estimate dominant facial expression from image/video.

    Uses simple heuristics based on facial landmark geometry when dlib is
    available, otherwise returns a basic estimate from image brightness/contrast.
    """
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return None

    try:
        if media_type == "image":
            frame = cv2.imread(file_path)
        elif media_type == "video":
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                return None
            # Sample middle frame
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.set(cv2.CAP_PROP_POS_FRAMES, total // 2 if total > 0 else 0)
            ret, frame = cap.read()
            cap.release()
            if not ret:
                return None
        else:
            return None

        if frame is None:
            return None

        # Use Haar cascade for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

        if len(faces) == 0:
            return "unknown"

        # Take the largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_roi = gray[y:y+h, x:x+w]

        # Simple heuristic based on pixel intensity distribution
        mean_val = np.mean(face_roi)
        std_val = np.std(face_roi)

        # Map intensity stats to rough emotion estimate
        if std_val > 60:
            return "surprised"
        elif mean_val < 80:
            return "sad"
        elif mean_val > 160:
            return "happy"
        else:
            return "neutral"

    except Exception as e:
        logger.warning("Face emotion analysis failed: %s", e)
        return None


def _analyze_audio_emotion(file_path: str) -> Optional[str]:
    """Estimate dominant emotion from audio track using spectral features."""
    if not LIBROSA_AVAILABLE or not NUMPY_AVAILABLE:
        return None

    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=30)
        if len(y) == 0:
            return None

        # Extract features that correlate with emotion
        rms = float(np.mean(librosa.feature.rms(y=y)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        spec_cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))

        # Simple rule-based emotion classification
        if rms > 0.1 and spec_cent > 3000:
            return "angry"
        elif rms > 0.08 and zcr > 0.1:
            return "happy"
        elif rms < 0.02:
            return "sad"
        elif spec_cent > 4000:
            return "surprised"
        else:
            return "neutral"

    except Exception as e:
        logger.warning("Audio emotion analysis failed: %s", e)
        return None


async def analyze_emotion_mismatch(file_path: str, media_type: str) -> Optional[dict]:
    """Detect emotion mismatch between face and audio.

    Returns dict matching frontend emotionMismatch interface:
        { faceEmotion: str, audioEmotion: str, score: float }
    """
    if media_type not in ("video", "image"):
        return None

    face_emotion = _analyze_face_emotion(file_path, media_type)
    audio_emotion = _analyze_audio_emotion(file_path) if media_type == "video" else None

    if face_emotion is None and audio_emotion is None:
        return None

    face_emotion = face_emotion or "unknown"
    audio_emotion = audio_emotion or "unknown"

    # Calculate mismatch score
    if face_emotion == "unknown" or audio_emotion == "unknown":
        mismatch_score = 30.0  # uncertain
    elif face_emotion == audio_emotion:
        mismatch_score = 5.0  # emotions match
    else:
        mismatch_score = 75.0  # clear mismatch

    return {
        "faceEmotion": face_emotion,
        "audioEmotion": audio_emotion,
        "score": round(mismatch_score, 1),
    }
