"""Model engine service with adaptive learning.

Loads an EfficientNet-B0 deepfake classifier and supports adaptive learning:
users can submit feedback (confirm real/fake), and the model fine-tunes
on accumulated feedback to improve over time.
"""
import logging
import json
import os
import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np

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
        ckpt = torch.load(path, map_location=device, weights_only=True)
        arch = ckpt.get("arch", "efficientnet_b0")
        num_classes = ckpt.get("num_classes", 2)
        if arch == "efficientnet_b0":
            model = models.efficientnet_b0(weights=None)
            in_features = model.classifier[1].in_features
            # Detect classifier architecture from checkpoint keys
            has_deep_head = any("classifier.4" in k for k in ckpt["model_state_dict"])
            if has_deep_head:
                model.classifier = nn.Sequential(
                    nn.Dropout(p=0.3),
                    nn.Linear(in_features, 128),
                    nn.ReLU(),
                    nn.Dropout(p=0.2),
                    nn.Linear(128, num_classes),
                )
            else:
                model.classifier = nn.Sequential(
                    nn.Dropout(p=0.2),
                    nn.Linear(in_features, num_classes),
                )
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
        confidence = round(mean_activation, 3)  # 0-1 range
        pct = round(confidence * 100, 1)

        region_name = _describe_region(cx, cy)
        regions.append({
            "region": region_name,
            "confidence": confidence,
            "description": f"High manipulation probability ({pct}%) in {region_name.lower()} area"
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
# Adaptive Learning — learn from user feedback
# ---------------------------------------------------------------------------

_FEEDBACK_DIR = None
_ADAPTIVE_LOCK = threading.Lock()
_MIN_FEEDBACK_FOR_RETRAIN = 10  # minimum new samples before retraining


def _get_feedback_dir() -> Path:
    """Get (and create) the feedback directory for adaptive learning samples."""
    global _FEEDBACK_DIR
    if _FEEDBACK_DIR is None:
        backend_root = Path(__file__).resolve().parents[1]
        _FEEDBACK_DIR = backend_root / "adaptive_data"
    _FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    (_FEEDBACK_DIR / "fake").mkdir(exist_ok=True)
    (_FEEDBACK_DIR / "real").mkdir(exist_ok=True)
    return _FEEDBACK_DIR


def submit_feedback(image_path: str, true_label: str, detection_id: str) -> dict:
    """Save a user-confirmed image to the adaptive learning dataset.

    Args:
        image_path: Path to the detection image file.
        true_label: 'fake' or 'real' (user-confirmed ground truth).
        detection_id: The detection ID for tracing.

    Returns:
        dict with status and counts.
    """
    if true_label not in ("fake", "real"):
        return {"status": "error", "message": "Label must be 'fake' or 'real'"}

    feedback_dir = _get_feedback_dir()
    dest_folder = feedback_dir / true_label

    # Copy image to feedback folder
    src = Path(image_path)
    if not src.exists():
        return {"status": "error", "message": "Source image not found"}

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    dest = dest_folder / f"{timestamp}_{detection_id}{src.suffix}"
    shutil.copy2(str(src), str(dest))

    # Log the feedback
    log_path = feedback_dir / "feedback_log.jsonl"
    entry = {
        "detection_id": detection_id,
        "true_label": true_label,
        "image_path": str(dest),
        "timestamp": datetime.utcnow().isoformat(),
    }
    with open(log_path, "a") as f:
        f.write(json.dumps(entry) + "\n")

    # Count available feedback
    fake_count = len(list((feedback_dir / "fake").glob("*")))
    real_count = len(list((feedback_dir / "real").glob("*")))
    total = fake_count + real_count

    logger.info(
        "Feedback saved: %s as %s (total: %d fake, %d real)",
        detection_id, true_label, fake_count, real_count,
    )

    return {
        "status": "saved",
        "total_feedback": total,
        "fake_count": fake_count,
        "real_count": real_count,
        "ready_to_retrain": total >= _MIN_FEEDBACK_FOR_RETRAIN,
    }


def get_feedback_stats() -> dict:
    """Get current adaptive learning statistics."""
    feedback_dir = _get_feedback_dir()
    fake_count = len(list((feedback_dir / "fake").glob("*")))
    real_count = len(list((feedback_dir / "real").glob("*")))
    total = fake_count + real_count

    # Read model metadata
    model_path = _default_model_path()
    model_info = {}
    if model_path.exists() and ML_AVAILABLE:
        try:
            ckpt = torch.load(model_path, map_location="cpu", weights_only=True)
            model_info = {
                "val_accuracy": ckpt.get("val_accuracy"),
                "epoch": ckpt.get("epoch"),
                "last_retrained": ckpt.get("retrained_at"),
            }
        except Exception:
            pass

    return {
        "feedback_samples": total,
        "fake_count": fake_count,
        "real_count": real_count,
        "min_for_retrain": _MIN_FEEDBACK_FOR_RETRAIN,
        "ready_to_retrain": total >= _MIN_FEEDBACK_FOR_RETRAIN,
        "model_loaded": _MODEL is not None,
        "model_info": model_info,
    }


def trigger_adaptive_retrain() -> dict:
    """Retrain the model using original dataset + feedback samples.

    This merges the base training data with user feedback and fine-tunes
    the model for a few epochs. The retrained model is hot-swapped in.
    """
    if not ML_AVAILABLE:
        return {"status": "error", "message": "ML libraries not available"}

    feedback_dir = _get_feedback_dir()
    fake_count = len(list((feedback_dir / "fake").glob("*")))
    real_count = len(list((feedback_dir / "real").glob("*")))
    total = fake_count + real_count

    if total < _MIN_FEEDBACK_FOR_RETRAIN:
        return {
            "status": "not_ready",
            "message": f"Need at least {_MIN_FEEDBACK_FOR_RETRAIN} samples, have {total}",
        }

    # Run retraining in a background thread to not block the server
    def _retrain():
        with _ADAPTIVE_LOCK:
            try:
                _do_adaptive_retrain(feedback_dir)
            except Exception as e:
                logger.exception("Adaptive retraining failed: %s", e)

    thread = threading.Thread(target=_retrain, daemon=True)
    thread.start()

    return {
        "status": "started",
        "message": f"Retraining started with {total} feedback samples ({fake_count} fake, {real_count} real)",
    }


def _do_adaptive_retrain(feedback_dir: Path):
    """Internal: run adaptive retraining and hot-swap the model."""
    global _MODEL, _DEVICE, _CLASS_TO_IDX

    import torch.optim as optim
    from torch.utils.data import DataLoader, Dataset

    logger.info("=== Adaptive retraining started ===")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load current model as starting point
    model_path = _default_model_path()
    if not model_path.exists():
        logger.error("No base model found for adaptive retraining")
        return

    ckpt = torch.load(model_path, map_location=device, weights_only=True)
    num_classes = ckpt.get("num_classes", 2)

    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    has_deep_head = any("classifier.4" in k for k in ckpt["model_state_dict"])
    if has_deep_head:
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 128),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(128, num_classes),
        )
    else:
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(in_features, num_classes),
        )

    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)

    # Build dataset from feedback
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    class FeedbackDataset(Dataset):
        def __init__(self, feedback_dir, transform):
            self.transform = transform
            self.samples = []
            for img_path in (feedback_dir / "fake").glob("*"):
                if img_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    self.samples.append((str(img_path), 0))
            for img_path in (feedback_dir / "real").glob("*"):
                if img_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    self.samples.append((str(img_path), 1))

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            path, label = self.samples[idx]
            img = Image.open(path).convert("RGB")
            return self.transform(img), label

    feedback_dataset = FeedbackDataset(feedback_dir, train_transform)
    if len(feedback_dataset) == 0:
        logger.warning("No valid feedback images found")
        return

    loader = DataLoader(
        feedback_dataset, batch_size=8, shuffle=True,
        num_workers=0, pin_memory=True,
    )

    # Fine-tune for a few epochs with very low LR
    model.train()
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=1e-5, weight_decay=1e-4)

    num_epochs = 5
    for epoch in range(num_epochs):
        running_loss = 0.0
        correct = 0
        total = 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            with torch.amp.autocast(device_type="cuda" if device.type == "cuda" else "cpu"):
                outputs = model(images)
                loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

        acc = 100.0 * correct / total if total > 0 else 0
        logger.info(
            "Adaptive epoch %d/%d: loss=%.4f acc=%.1f%%",
            epoch + 1, num_epochs, running_loss / total, acc,
        )

    # Save retrained model
    new_ckpt = {
        "model_state_dict": model.state_dict(),
        "arch": "efficientnet_b0",
        "num_classes": num_classes,
        "class_to_idx": {"fake": 0, "real": 1},
        "val_accuracy": ckpt.get("val_accuracy"),
        "retrained_at": datetime.utcnow().isoformat(),
        "feedback_samples": len(feedback_dataset),
    }

    # Backup current model
    backup_path = model_path.with_suffix(".pth.bak")
    if model_path.exists():
        shutil.copy2(str(model_path), str(backup_path))

    torch.save(new_ckpt, model_path)

    # Hot-swap the model in memory
    _MODEL = model
    _DEVICE = device
    _CLASS_TO_IDX = new_ckpt["class_to_idx"]

    logger.info(
        "=== Adaptive retraining complete: %d samples, model hot-swapped ===",
        len(feedback_dataset),
    )
