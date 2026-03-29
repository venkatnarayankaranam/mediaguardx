"""Live monitoring routes with WebSocket support for real-time frame analysis."""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
from services.sightengine_client import analyze_deepfake_from_bytes
from config import settings
import logging
import base64
import uuid
import tempfile
import os
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_frame_reason(trust_score: float, source: str, deepfake_prob: float = 0) -> str:
    """Generate a human-readable reason for why a frame received its trust score."""
    if source == "sightengine":
        if trust_score >= 85:
            return "Sightengine API: No deepfake indicators detected. Frame appears authentic."
        elif trust_score >= 70:
            return f"Sightengine API: Minor anomalies detected (deepfake probability: {deepfake_prob:.0%}). Likely authentic."
        elif trust_score >= 40:
            return f"Sightengine API: Moderate deepfake indicators found (deepfake probability: {deepfake_prob:.0%}). Frame is suspicious."
        else:
            return f"Sightengine API: Strong deepfake indicators detected (deepfake probability: {deepfake_prob:.0%}). Likely manipulated."
    elif source == "ml_model":
        if trust_score >= 85:
            return "ML Model (EfficientNet-B0): High confidence authentic — no manipulation patterns detected."
        elif trust_score >= 70:
            return "ML Model (EfficientNet-B0): Frame appears authentic with minor uncertainty."
        elif trust_score >= 40:
            return "ML Model (EfficientNet-B0): Suspicious patterns detected — possible face manipulation or generation artifacts."
        else:
            return "ML Model (EfficientNet-B0): Strong manipulation patterns detected — likely AI-generated or deepfake."
    else:
        return "No detector available — score is a placeholder. Results may not be accurate."


async def _analyze_frame_with_model(image_bytes: bytes) -> dict:
    """Analyze a camera frame using the local ML model as fallback.

    Saves the raw JPEG bytes to a temporary file, runs the EfficientNet-B0
    model, and returns a trust score + label.  Falls back to 50 % only if
    the model itself is unavailable or raises an error.
    """
    try:
        from services import model_engine

        if not model_engine.ML_AVAILABLE or model_engine._MODEL is None:
            logger.info("ML model not loaded; returning default score")
            return {"trust_score": 50.0, "label": "Suspicious", "source": "fallback"}

        # Write bytes to a temp file so the model can read it
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            prob_real = model_engine._predict_image_prob_real(tmp_path)
            trust_score = round(prob_real * 100, 2)
            label = (
                "Authentic" if trust_score >= 70
                else "Suspicious" if trust_score >= 40
                else "Deepfake"
            )
            return {"trust_score": trust_score, "label": label, "source": "ml_model"}
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning("ML model fallback failed: %s", e)
        return {"trust_score": 50.0, "label": "Suspicious", "source": "fallback"}


@router.get("/monitor")
async def live_monitor(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Live camera monitoring status endpoint."""
    api_available = bool(settings.sightengine_api_user and settings.sightengine_api_secret)
    return {
        "status": "ready" if api_available else "no_api",
        "wsEndpoint": "/api/live/ws",
        "apiAvailable": api_available,
        "message": "Connect via WebSocket at /api/live/ws?token=<supabase_token> for real-time frame analysis",
    }


@router.websocket("/ws")
async def websocket_frame_analysis(websocket: WebSocket, token: str = Query(None)):
    """WebSocket endpoint for real-time frame analysis.

    Authenticates via first message (preferred) or ?token= query param (legacy).
    Client sends base64-encoded JPEG frames after authentication.
    Server responds with trust score and label for each frame.
    """
    await websocket.accept()

    # Authenticate: prefer first-message auth, fall back to query param
    auth_token = token
    if not auth_token:
        try:
            import json as _json
            first_msg = await websocket.receive_text()
            try:
                msg = _json.loads(first_msg)
                if msg.get("type") == "auth":
                    auth_token = msg.get("token")
            except (ValueError, TypeError):
                pass
        except Exception:
            pass

    if not auth_token:
        await websocket.send_json({"status": "error", "message": "Authentication required"})
        await websocket.close(code=4001, reason="Authentication required")
        return

    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(auth_token)
        if not user_response or not user_response.user:
            await websocket.send_json({"status": "error", "message": "Invalid token"})
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.send_json({"status": "error", "message": "Authentication failed"})
        await websocket.close(code=4001, reason="Authentication failed")
        return
    logger.info("WebSocket connection established for live monitoring")

    api_available = bool(settings.sightengine_api_user and settings.sightengine_api_secret)

    import time
    MIN_FRAME_INTERVAL = 0.2  # 5 FPS max
    MAX_PAYLOAD_SIZE = 2_000_000  # ~1.5MB base64 = ~1MB image
    last_frame_time = 0.0

    try:
        while True:
            data = await websocket.receive_text()

            # Rate limit: skip frames that arrive too fast
            now = time.monotonic()
            if now - last_frame_time < MIN_FRAME_INTERVAL:
                continue
            last_frame_time = now

            # Payload size limit
            if len(data) > MAX_PAYLOAD_SIZE:
                await websocket.send_json({"status": "error", "message": "Frame too large (max 1.5MB)"})
                continue

            frame_id = f"frame_{uuid.uuid4().hex[:8]}"
            timestamp = datetime.now(datetime.timezone.utc).isoformat()

            image_bytes = None
            try:
                # Decode base64 JPEG frame (needed by both API and ML paths)
                image_data = data
                if image_data.startswith("data:image"):
                    image_data = image_data.split(",", 1)[1]

                image_bytes = base64.b64decode(image_data)

                if not api_available:
                    # Sightengine not configured -> use local ML model
                    logger.info("Sightengine API not configured; falling back to ML model")
                    ml = await _analyze_frame_with_model(image_bytes)
                    reason = _get_frame_reason(ml["trust_score"], ml["source"])
                    await websocket.send_json({
                        "frameId": frame_id,
                        "timestamp": timestamp,
                        "trustScore": ml["trust_score"],
                        "label": ml["label"],
                        "status": "analyzed_ml" if ml["source"] == "ml_model" else "no_api",
                        "message": "Analyzed with local ML model" if ml["source"] == "ml_model" else "No detector available; score is placeholder",
                        "reason": reason,
                        "source": ml["source"],
                    })
                    continue

                # Prefer Sightengine API
                result = await analyze_deepfake_from_bytes(
                    image_bytes,
                    settings.sightengine_api_user,
                    settings.sightengine_api_secret,
                )

                if result["api_available"] and result["trust_score"] is not None:
                    trust_score = result["trust_score"]
                    label = "Authentic" if trust_score >= 70 else "Suspicious" if trust_score >= 40 else "Deepfake"
                    deepfake_prob = result.get("deepfake_probability", 0)
                    reason = _get_frame_reason(trust_score, "sightengine", deepfake_prob)
                    await websocket.send_json({
                        "frameId": frame_id,
                        "timestamp": timestamp,
                        "trustScore": trust_score,
                        "label": label,
                        "status": "analyzed",
                        "reason": reason,
                        "source": "sightengine",
                        "sightengineScore": trust_score,
                    })
                else:
                    # API returned but gave no usable score -> ML fallback
                    logger.warning("Sightengine API returned no result; falling back to ML model")
                    ml = await _analyze_frame_with_model(image_bytes)
                    reason = _get_frame_reason(ml["trust_score"], ml["source"])
                    await websocket.send_json({
                        "frameId": frame_id,
                        "timestamp": timestamp,
                        "trustScore": ml["trust_score"],
                        "label": ml["label"],
                        "status": "analyzed_ml" if ml["source"] == "ml_model" else "api_error",
                        "message": "API returned no result; analyzed with local ML model" if ml["source"] == "ml_model" else "API returned no result; score is placeholder",
                        "reason": reason,
                        "source": ml["source"],
                    })

            except Exception as e:
                logger.error("Frame analysis error: %s", e, exc_info=True)
                # Last resort: try ML model even on unexpected errors
                ml = {"trust_score": 50.0, "label": "Suspicious", "source": "fallback"}
                try:
                    if image_bytes:
                        ml = await _analyze_frame_with_model(image_bytes)
                except Exception:
                    pass  # keep the default ml dict
                reason = _get_frame_reason(ml["trust_score"], ml["source"])
                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": timestamp,
                    "trustScore": ml["trust_score"],
                    "label": ml["label"],
                    "status": "analyzed_ml" if ml["source"] == "ml_model" else "error",
                    "message": "An error occurred during frame analysis",
                    "reason": reason,
                    "source": ml["source"],
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
