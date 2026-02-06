"""Audio analysis service for deepfake detection.

Analyzes audio tracks for signs of voice cloning, robotic tone, and
frequency-domain anomalies using librosa.
"""
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import numpy as np
    import librosa
    LIBROSA_AVAILABLE = True
except Exception:
    LIBROSA_AVAILABLE = False


async def analyze_audio(file_path: str, media_type: str) -> Optional[dict]:
    """Analyze audio content for deepfake indicators.

    Works on audio files directly, or extracts audio track from video files.
    Returns dict matching frontend audioAnalysis interface:
        { cloned: bool, score: float, details: list[str] }
    """
    if not LIBROSA_AVAILABLE:
        logger.info("librosa not available; skipping audio analysis.")
        return None

    if media_type not in ("audio", "video"):
        return None

    try:
        # librosa can load audio from video containers too
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=60)

        if len(y) == 0:
            return None

        details = []
        flags = 0

        # 1. Spectral flatness — synthetic audio tends to be more uniform
        spec_flat = float(np.mean(librosa.feature.spectral_flatness(y=y)))
        if spec_flat > 0.4:
            details.append(f"High spectral flatness ({spec_flat:.3f}) suggesting synthetic generation")
            flags += 1

        # 2. Zero-crossing rate — cloned voices often have irregular ZCR
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_std = float(np.std(zcr))
        if zcr_std < 0.01:
            details.append(f"Unusually uniform zero-crossing rate (std={zcr_std:.4f})")
            flags += 1

        # 3. MFCC variance — natural speech has high MFCC variation
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_var = float(np.mean(np.var(mfccs, axis=1)))
        if mfcc_var < 5.0:
            details.append(f"Low MFCC variance ({mfcc_var:.2f}) indicating potential voice synthesis")
            flags += 1

        # 4. Pitch stability — cloned voices often have unnaturally stable pitch
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 0]
        if len(pitch_values) > 0:
            pitch_std = float(np.std(pitch_values))
            if pitch_std < 10:
                details.append(f"Unnaturally stable pitch (std={pitch_std:.1f}Hz)")
                flags += 1

        # 5. Spectral rolloff — indicates frequency energy distribution
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        mean_rolloff = float(np.mean(rolloff))
        if mean_rolloff < 2000:
            details.append(f"Low spectral rolloff ({mean_rolloff:.0f}Hz) — limited frequency range")
            flags += 1

        if not details:
            details.append("Audio characteristics appear natural")

        # Score: higher = more likely cloned (0-100)
        clone_score = min(100, flags * 20 + (spec_flat * 50 if spec_flat > 0.3 else 0))
        is_cloned = clone_score > 50

        return {
            "cloned": is_cloned,
            "score": round(clone_score, 1),
            "details": details,
        }

    except Exception as e:
        logger.warning("Audio analysis failed: %s", e)
        return None
