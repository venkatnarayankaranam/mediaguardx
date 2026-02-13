"""Live monitoring routes with WebSocket support for real-time frame analysis."""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from database import get_supabase
from middleware.auth import get_current_user, AuthenticatedUser
from services.sightengine_client import analyze_deepfake_from_bytes
from config import settings
import logging
import base64
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


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

    Authenticates via ?token= query param (Supabase JWT).
    Client sends base64-encoded JPEG frames.
    Server responds with trust score and label for each frame.
    """
    # Authenticate via token query param
    if not token:
        await websocket.close(code=4001, reason="Authentication required. Pass ?token=<jwt>")
        return

    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()
    logger.info("WebSocket connection established for live monitoring")

    api_available = bool(settings.sightengine_api_user and settings.sightengine_api_secret)

    try:
        while True:
            data = await websocket.receive_text()

            frame_id = f"frame_{uuid.uuid4().hex[:8]}"
            timestamp = datetime.utcnow().isoformat()

            if not api_available:
                await websocket.send_json({
                    "frameId": frame_id,
                    "timestamp": timestamp,
                    "trustScore": 50.0,
                    "label": "Suspicious",
                    "status": "no_api",
                    "message": "Sightengine API not configured; scores are placeholder",
                })
                continue

            try:
                # Decode base64 JPEG frame
                image_data = data
                if image_data.startswith("data:image"):
                    image_data = image_data.split(",", 1)[1]

                image_bytes = base64.b64decode(image_data)

                # Call Sightengine API
                result = await analyze_deepfake_from_bytes(
                    image_bytes,
                    settings.sightengine_api_user,
                    settings.sightengine_api_secret,
                )

                if result["api_available"] and result["trust_score"] is not None:
                    trust_score = result["trust_score"]
                    label = "Authentic" if trust_score >= 70 else "Suspicious" if trust_score >= 40 else "Deepfake"
                    await websocket.send_json({
                        "frameId": frame_id,
                        "timestamp": timestamp,
                        "trustScore": trust_score,
                        "label": label,
                        "status": "analyzed",
                    })
                else:
                    await websocket.send_json({
                        "frameId": frame_id,
                        "timestamp": timestamp,
                        "trustScore": 50.0,
                        "label": "Suspicious",
                        "status": "api_error",
                        "message": "Sightengine API returned no result",
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
