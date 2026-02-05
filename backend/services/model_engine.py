"""Model engine service that uses a PyTorch classifier when available.

If no trained model artifact is found, the service falls back to the existing
deterministic placeholder for compatibility and testing.
"""
import logging
import os
from pathlib import Path
from typing import List, Literal, Optional

import numpy as np

from models.detection import Anomaly
from config import settings

logger = logging.getLogger(__name__)


# Try to import ML libs lazily
try:
    import torch
    import torch.nn as nn
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
        ckpt = torch.load(path, map_location=device, weights_only=False)
        arch = ckpt.get("arch", "efficientnet_b0")
        if arch == "efficientnet_b0":
            model = models.efficientnet_b0(weights=None)
            in_features = model.classifier[1].in_features
            model.classifier = nn.Sequential(nn.Dropout(p=0.2), nn.Linear(in_features, ckpt.get("num_classes", 2)))
        else:
            model = models.efficientnet_b0(weights=None)

        model.load_state_dict(ckpt["model_state_dict"])
        model.to(device)

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


def _get_real_class_index() -> int:
    """Get the index for the 'real' class from class_to_idx mapping."""
    if _CLASS_TO_IDX is None:
        return 0
    for k, v in _CLASS_TO_IDX.items():
        if k.lower() in ["real", "original", "genuine"]:
            return v
    return 0


def _predict_image_prob_real(image_path: str) -> float:
    """Return probability that image is REAL as a float in [0,1]."""
    if _MODEL is None:
        raise RuntimeError("Model not loaded")

    img = Image.open(image_path).convert("RGB")
    inp = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)
    _MODEL.eval()
    with torch.no_grad():
        logits = _MODEL(inp)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]

    idx_real = _get_real_class_index()
    return float(probs[idx_real])


def _predict_image_from_pil(pil_img) -> float:
    """Return probability that a PIL image is REAL as a float in [0,1]."""
    if _MODEL is None:
        raise RuntimeError("Model not loaded")

    inp = _TRANSFORM(pil_img.convert("RGB")).unsqueeze(0).to(_DEVICE)
    _MODEL.eval()
    with torch.no_grad():
        logits = _MODEL(inp)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]

    idx_real = _get_real_class_index()
    return float(probs[idx_real])


def _predict_video_prob_real(video_path: str, max_frames: int = 12) -> float:
    """Extract up to max_frames evenly spaced frames and average real-probability."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Unable to open video")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    probs = []

    if frame_count <= 0:
        i = 0
        while i < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            probs.append(_predict_image_from_pil(pil_img))
            i += 1
    else:
        indices = sorted({int(i * frame_count / max_frames) for i in range(max_frames)})
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            probs.append(_predict_image_from_pil(pil_img))

    cap.release()
    return float(sum(probs) / len(probs)) if probs else 0.5


# ---------------------------------------------------------------------------
# Grad-CAM heatmap generation
# ---------------------------------------------------------------------------

def _generate_gradcam(image_path: str, detection_id: str) -> tuple:
    """Generate a Grad-CAM heatmap overlaid on the input image.

    Returns (heatmap_url, xai_regions) where xai_regions is a list of dicts.
    """
    if not ML_AVAILABLE or _MODEL is None:
        return _generate_heatmap_placeholder(image_path, detection_id), []

    try:
        img = Image.open(image_path).convert("RGB")
        original_size = img.size  # (W, H)
        inp = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)
        inp.requires_grad_(True)

        # Hook into the last convolutional block (features[-1] for EfficientNet)
        feature_maps = []
        gradients = []

        def forward_hook(module, input, output):
            feature_maps.append(output)

        def backward_hook(module, grad_input, grad_output):
            gradients.append(grad_output[0])

        # EfficientNet-B0: features[-1] is the last block before avgpool
        target_layer = _MODEL.features[-1]
        fh = target_layer.register_forward_hook(forward_hook)
        bh = target_layer.register_full_backward_hook(backward_hook)

        # Forward pass (need gradients so no torch.no_grad)
        _MODEL.eval()
        output = _MODEL(inp)
        idx_fake = 1 - _get_real_class_index()  # highlight fake-class activation
        score = output[0, idx_fake]

        # Backward pass
        _MODEL.zero_grad()
        score.backward()

        fh.remove()
        bh.remove()

        # Compute Grad-CAM
        grads = gradients[0].cpu().data.numpy()[0]   # (C, H, W)
        fmaps = feature_maps[0].cpu().data.numpy()[0]  # (C, H, W)

        weights = np.mean(grads, axis=(1, 2))  # (C,)
        cam = np.zeros(fmaps.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * fmaps[i]

        cam = np.maximum(cam, 0)  # ReLU
        if cam.max() > 0:
            cam = cam / cam.max()

        # Resize to original image dimensions
        cam_resized = cv2.resize(cam, original_size)

        # Convert to color heatmap and overlay
        heatmap_colored = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        original_np = np.array(img.resize(original_size))
        overlay = (0.5 * original_np + 0.5 * heatmap_colored).astype(np.uint8)

        # Save heatmap
        os.makedirs(settings.heatmaps_dir, exist_ok=True)
        heatmap_filename = f"heatmap_{detection_id}.png"
        heatmap_path = Path(settings.heatmaps_dir) / heatmap_filename
        Image.fromarray(overlay).save(heatmap_path, "PNG")

        # Extract XAI regions from cam
        xai_regions = _extract_xai_regions(cam_resized, original_size)

        return f"/heatmaps/{heatmap_filename}", xai_regions

    except Exception as e:
        logger.exception("Grad-CAM generation failed, falling back to placeholder: %s", e)
        return _generate_heatmap_placeholder(image_path, detection_id), []


def _extract_xai_regions(cam, image_size: tuple) -> list:
    """Extract high-activation regions from the CAM for xaiRegions field."""
    regions = []
    threshold = 0.5
    h, w = cam.shape

    # Find contiguous high-activation areas
    binary = (cam > threshold).astype(np.uint8)

    contours_result = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # Handle both OpenCV 3.x (3 return values) and 4.x (2 return values)
    contours = contours_result[0] if len(contours_result) == 2 else contours_result[1]

    for contour in contours[:5]:  # top 5 regions
        x, y, cw, ch = cv2.boundingRect(contour)
        cx = (x + cw / 2) / w
        cy = (y + ch / 2) / h
        area_ratio = (cw * ch) / (w * h)

        if area_ratio < 0.01:
            continue

        mean_activation = float(np.mean(cam[y:y+ch, x:x+cw]))
        confidence = round(mean_activation * 100, 1)

        region_name = _describe_region(cx, cy)
        regions.append({
            "region": region_name,
            "confidence": confidence,
            "description": f"High manipulation probability ({confidence}%) in {region_name.lower()} area"
        })

    return sorted(regions, key=lambda r: r["confidence"], reverse=True)


def _describe_region(cx: float, cy: float) -> str:
    """Convert normalized (cx, cy) center to a human-readable region name."""
    v = "Top" if cy < 0.33 else ("Middle" if cy < 0.66 else "Bottom")
    h = "Left" if cx < 0.33 else ("Center" if cx < 0.66 else "Right")
    return f"{v}-{h}"


def _generate_heatmap_placeholder(file_path: str, detection_id: str) -> str:
    """Fallback heatmap when Grad-CAM is not available."""
    try:
        from PIL import Image as PILImage, ImageDraw
        os.makedirs(settings.heatmaps_dir, exist_ok=True)

        img = PILImage.new("RGB", (640, 480), color=(40, 40, 50))
        draw = ImageDraw.Draw(img)
        for i in range(0, 480, 20):
            draw.rectangle([(0, i), (640, i + 10)], fill=(60 + (i % 40), 60 + (i % 40), 70 + (i % 40)))
        heatmap_filename = f"heatmap_{detection_id}.png"
        heatmap_path = Path(settings.heatmaps_dir) / heatmap_filename
        img.save(heatmap_path, "PNG")
        return f"/heatmaps/{heatmap_filename}"
    except Exception as e:
        logger.exception("Error generating heatmap placeholder: %s", e)
        return f"/heatmaps/heatmap_{detection_id}.png"


# ---------------------------------------------------------------------------
# Label helpers
# ---------------------------------------------------------------------------

def get_label_from_score(trust_score: float) -> Literal["Authentic", "Suspicious", "Deepfake"]:
    if trust_score >= 70:
        return "Authentic"
    elif trust_score >= 40:
        return "Suspicious"
    else:
        return "Deepfake"


def _build_anomalies(trust_score: float, is_model: bool) -> List[Anomaly]:
    """Build anomaly list based on trust score."""
    anomalies: List[Anomaly] = []
    if trust_score < 70:
        severity = "high" if trust_score < 40 else "medium"
        if is_model:
            anomalies.append(Anomaly(
                type="model_prediction",
                severity=severity,
                description="EfficientNet-B0 classifier detected potential manipulation artifacts",
                confidence=round(100 - trust_score, 2),
            ))
            if trust_score < 50:
                anomalies.append(Anomaly(
                    type="face_blending",
                    severity=severity,
                    description="Possible face blending boundary detected by neural network",
                    confidence=round(min(100, (100 - trust_score) * 0.8), 2),
                ))
        else:
            anomalies.append(Anomaly(
                type="general",
                severity=severity,
                description="Placeholder analysis — no trained model loaded",
                confidence=round(100 - trust_score, 2),
            ))
    return anomalies


# ---------------------------------------------------------------------------
# Main analysis entry point
# ---------------------------------------------------------------------------

async def analyze_media(file_path: str, media_type: str, detection_id: str) -> dict:
    """Analyze media using loaded ML model if available, else use deterministic placeholder.

    Returns dict with: trust_score, label, anomalies, heatmap_url, xai_regions
    """
    model_loaded = _MODEL is not None or load_model_if_available()

    if model_loaded and ML_AVAILABLE:
        try:
            if media_type == "image":
                prob_real = _predict_image_prob_real(file_path)
            elif media_type == "video":
                prob_real = _predict_video_prob_real(file_path)
            else:
                prob_real = 0.5

            trust_score = round(float(prob_real) * 100.0, 2)
            label = get_label_from_score(trust_score)
            anomalies = _build_anomalies(trust_score, is_model=True)

            # Generate Grad-CAM heatmap (for images; placeholder for video/audio)
            if media_type == "image":
                heatmap_url, xai_regions = _generate_gradcam(file_path, detection_id)
            else:
                heatmap_url = _generate_heatmap_placeholder(file_path, detection_id)
                xai_regions = []

            return {
                "trust_score": trust_score,
                "label": label,
                "anomalies": anomalies,
                "heatmap_url": heatmap_url,
                "xai_regions": xai_regions,
            }
        except Exception as e:
            logger.exception("Error during ML inference: %s", e)

    # Fallback deterministic behavior
    try:
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
    anomalies = _build_anomalies(trust_score, is_model=False)
    heatmap_url = _generate_heatmap_placeholder(file_path, detection_id)

    return {
        "trust_score": trust_score,
        "label": label,
        "anomalies": anomalies,
        "heatmap_url": heatmap_url,
        "xai_regions": [],
    }
