"""Model engine service that uses a PyTorch classifier when available.

If no trained model artifact is found, the service falls back to the existing
deterministic placeholder for compatibility and testing.
"""
import logging
import os
from pathlib import Path
from typing import List, Literal, Optional

from models.detection import Anomaly
from config import settings

logger = logging.getLogger(__name__)


# Try to import ML libs lazily
try:
    import torch
    import torch.nn.functional as F
    from torchvision import transforms, models
    from PIL import Image
    import cv2
    ML_AVAILABLE = True
except Exception:
    ML_AVAILABLE = False


# Model runtime state (populated if model loaded)
_MODEL = None
_DEVICE = None
_CLASS_TO_IDX = None
_TRANSFORM = None


def _default_model_path() -> Path:
    backend_root = Path(__file__).resolve().parents[1]
    return backend_root / "models" / "deepfake_detector.pth"


def load_model_if_available(model_path: Optional[str] = None):
    """Attempt to load a PyTorch model checkpoint if present.

    Returns True if a model was loaded, False otherwise.
    """
    global _MODEL, _DEVICE, _CLASS_TO_IDX, _TRANSFORM
    if not ML_AVAILABLE:
        logger.info("ML libraries not available; skipping model load.")
        return False

    path = Path(model_path) if model_path else _default_model_path()
    if not path.exists():
        logger.info(f"No model file found at {path}; using placeholder logic.")
        return False

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        ckpt = torch.load(path, map_location=device)
        arch = ckpt.get("arch", "efficientnet_b0")
        if arch == "efficientnet_b0":
            model = models.efficientnet_b0(pretrained=False)
            in_features = model.classifier[1].in_features
            import torch.nn as nn
            model.classifier = nn.Sequential(nn.Dropout(p=0.2), nn.Linear(in_features, ckpt.get("num_classes", 2)))
        else:
            # Fallback: try efficientnet
            model = models.efficientnet_b0(pretrained=False)

        model.load_state_dict(ckpt["model_state_dict"])
        model.to(device).eval()

        _MODEL = model
        _DEVICE = device
        _CLASS_TO_IDX = ckpt.get("class_to_idx", {"real": 1, "fake": 0})
        _TRANSFORM = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        logger.info(f"Loaded model from {path} on device {_DEVICE}")
        return True
    except Exception as e:
        logger.exception(f"Failed to load model from {path}: {e}")
        return False


def _predict_image_prob_real(image_path: str) -> float:
    """Return probability that image is REAL as a float in [0,1]."""
    global _MODEL, _DEVICE, _CLASS_TO_IDX, _TRANSFORM
    if _MODEL is None:
        raise RuntimeError("Model not loaded")

    img = Image.open(image_path).convert("RGB")
    inp = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)
    with torch.no_grad():
        logits = _MODEL(inp)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]

    # find index for 'real' class (if present)
    idx_real = None
    for k, v in _CLASS_TO_IDX.items():
        if k.lower() in ["real", "original", "genuine"]:
            idx_real = v
            break
    if idx_real is None:
        # fallback: assume class 0=real
        idx_real = 0

    prob_real = float(probs[idx_real])
    return prob_real


def _predict_video_prob_real(video_path: str, max_frames: int = 12) -> float:
    """Extract up to `max_frames` evenly spaced frames and average real-probability."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Unable to open video")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        # fallback to reading sequentially until end or max_frames
        probs = []
        i = 0
        while i < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            # write temp image to memory using PIL conversion
            from PIL import Image
            img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            tmp = Path(".tmp_frame.jpg")
            img.save(tmp)
            probs.append(_predict_image_prob_real(str(tmp)))
            tmp.unlink(missing_ok=True)
            i += 1
        cap.release()
        return float(sum(probs) / len(probs)) if probs else 0.5

    # sample frames evenly
    indices = list({int(i * frame_count / max_frames) for i in range(max_frames)})
    probs = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        from PIL import Image
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        tmp = Path(f".tmp_frame_{idx}.jpg")
        img.save(tmp)
        try:
            probs.append(_predict_image_prob_real(str(tmp)))
        finally:
            tmp.unlink(missing_ok=True)

    cap.release()
    return float(sum(probs) / len(probs)) if probs else 0.5


def get_label_from_score(trust_score: float) -> Literal["Authentic", "Suspicious", "Deepfake"]:
    if trust_score >= 70:
        return "Authentic"
    elif trust_score >= 40:
        return "Suspicious"
    else:
        return "Deepfake"


def generate_heatmap_placeholder(file_path: str, detection_id: str) -> str:
    """Keep existing visible placeholder heatmap generation for frontend compatibility."""
    try:
        from PIL import Image, ImageDraw
        # Ensure heatmaps directory exists
        os.makedirs(settings.heatmaps_dir, exist_ok=True)

        img = Image.new('RGB', (640, 480), color=(40, 40, 50))
        draw = ImageDraw.Draw(img)
        for i in range(0, 480, 20):
            draw.rectangle([(0, i), (640, i+10)], fill=(60 + (i % 40), 60 + (i % 40), 70 + (i % 40)))
        heatmap_filename = f"heatmap_{detection_id}.png"
        heatmap_path = Path(settings.heatmaps_dir) / heatmap_filename
        img.save(heatmap_path, 'PNG')
        return f"/heatmaps/{heatmap_filename}"
    except Exception as e:
        logger.exception("Error generating heatmap placeholder: %s", e)
        return f"/heatmaps/heatmap_{detection_id}.png"


async def analyze_media(file_path: str, media_type: str, detection_id: str) -> dict:
    """Analyze media using loaded ML model if available, else use deterministic placeholder.

    Returns: trust_score(0-100), label string, anomalies list, heatmap_url
    """
    # Try to ensure model is loaded (load lazily)
    model_loaded = _MODEL is not None or load_model_if_available()

    if model_loaded and ML_AVAILABLE:
        try:
            if media_type == "image":
                prob_real = _predict_image_prob_real(file_path)
            elif media_type == "video":
                prob_real = _predict_video_prob_real(file_path)
            else:
                # audio / unknown: fall back
                prob_real = 0.5

            trust_score = round(float(prob_real) * 100.0, 2)
            label = get_label_from_score(trust_score)
            anomalies = []
            if trust_score < 70:
                anomalies.append(Anomaly(type="model_prediction", severity=("high" if trust_score<40 else "medium"), description="Model predicted potential manipulation", confidence=round(100-trust_score,2)))

            heatmap_url = generate_heatmap_placeholder(file_path, detection_id)
            return {"trust_score": trust_score, "label": label, "anomalies": anomalies, "heatmap_url": heatmap_url}
        except Exception as e:
            logger.exception("Error during ML inference: %s", e)

    # Fallback deterministic behavior (preserve prior placeholder behaviour)
    try:
        # Use file hashing based deterministic score for fallback
        import hashlib
        file_size = os.path.getsize(file_path)
        with open(file_path, "rb") as f:
            chunk = f.read(65536)
            h = hashlib.md5(chunk).hexdigest()
        base = (int(h[0:8], 16) + (file_size % 1000)) % 101
        trust_score = float(base)
    except Exception:
        trust_score = 50.0

    label = get_label_from_score(trust_score)
    anomalies = []
    if trust_score < 70:
        anomalies.append(Anomaly(type="placeholder", severity=("high" if trust_score<40 else "medium"), description="Placeholder anomaly generated", confidence=round(100-trust_score,2)))
    heatmap_url = generate_heatmap_placeholder(file_path, detection_id)
    return {"trust_score": trust_score, "label": label, "anomalies": anomalies, "heatmap_url": heatmap_url}

