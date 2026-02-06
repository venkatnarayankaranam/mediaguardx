"""Live monitoring routes with WebSocket support for real-time frame analysis."""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from database import get_database
from models.user import User
from middleware.auth import get_current_user
from services.model_engine import load_model_if_available, _MODEL, _TRANSFORM, _DEVICE, _get_real_class_index, ML_AVAILABLE, get_label_from_score
import logging
import base64
import io
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/monitor")
async def live_monitor(current_user: User = Depends(get_current_user)):
    """Live camera monitoring status endpoint."""
    model_loaded = _MODEL is not None or load_model_if_available()
    return {
        "status": "ready" if model_loaded else "no_model",
        "wsEndpoint": "/api/live/ws",
        "modelLoaded": model_loaded,
        "message": "Connect via WebSocket at /api/live/ws for real-time frame analysis"
    }


@router.websocket("/ws")
async def websocket_frame_analysis(websocket: WebSocket):
    """WebSocket endpoint for real-time frame analysis.

    Client sends base64-encoded JPEG frames.
    Server responds with trust score and label for each frame.
    """
    await websocket.accept()
    logger.info("WebSocket connection established for live monitoring")

    model_loaded = _MODEL is not None or load_model_if_available()

    try:
        while True:
            data = await websocket.receive_text()

            frame_id = f"frame_{uuid.uuid4().hex[:8]}"
            timestamp = datetime.utcnow().isoformat()

            if not model_loaded or not ML_AVAILABLE:
                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": timestamp,
                    "trustScore": 50.0,
                    "label": "Suspicious",
                    "status": "no_model",
                    "message": "No ML model loaded; scores are placeholder"
                })
                continue

            try:
                import torch
                import torch.nn.functional as F
                from PIL import Image

                # Decode base64 JPEG frame
                image_data = data
                if image_data.startswith("data:image"):
                    image_data = image_data.split(",", 1)[1]

                image_bytes = base64.b64decode(image_data)
                img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

                # Run inference
                inp = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)
                _MODEL.eval()
                with torch.no_grad():
                    logits = _MODEL(inp)
                    probs = F.softmax(logits, dim=1).cpu().numpy()[0]

                idx_real = _get_real_class_index()
                prob_real = float(probs[idx_real])
                trust_score = round(prob_real * 100.0, 2)
                label = get_label_from_score(trust_score)

                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": timestamp,
                    "trustScore": trust_score,
                    "label": label,
                    "status": "analyzed",
                })

            except Exception as e:
                logger.warning("Frame analysis error: %s", e)
                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": timestamp,
                    "trustScore": 50.0,
                    "label": "Suspicious",
                    "status": "error",
                    "message": str(e),
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
