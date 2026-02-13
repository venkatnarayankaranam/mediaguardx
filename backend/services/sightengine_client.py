"""Sightengine API client for deepfake detection."""
import httpx
import logging

logger = logging.getLogger(__name__)


async def analyze_deepfake(file_path: str, api_user: str, api_secret: str) -> dict:
    """Call Sightengine deepfake detection API.

    Returns dict with trust_score, deepfake_probability, raw_response, api_available.
    """
    if not api_user or not api_secret:
        logger.warning("Sightengine API credentials not configured, returning fallback")
        return {
            "trust_score": None,
            "deepfake_probability": None,
            "raw_response": None,
            "api_available": False,
        }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(file_path, "rb") as f:
                resp = await client.post(
                    "https://api.sightengine.com/1.0/check.json",
                    data={
                        "models": "deepfake",
                        "api_user": api_user,
                        "api_secret": api_secret,
                    },
                    files={"media": f},
                )
            result = resp.json()

            if result.get("status") == "failure":
                logger.error(f"Sightengine API error: {result.get('error', {}).get('message', 'Unknown')}")
                return {
                    "trust_score": None,
                    "deepfake_probability": None,
                    "raw_response": result,
                    "api_available": False,
                }

            deepfake_score = result.get("type", {}).get("deepfake", 0)
            # Convert: 0 = authentic (trust=100), 1 = deepfake (trust=0)
            trust_score = round((1 - deepfake_score) * 100, 2)

            return {
                "trust_score": trust_score,
                "deepfake_probability": deepfake_score,
                "raw_response": result,
                "api_available": True,
            }

    except Exception as e:
        logger.error(f"Sightengine API call failed: {e}")
        return {
            "trust_score": None,
            "deepfake_probability": None,
            "raw_response": None,
            "api_available": False,
        }


async def analyze_deepfake_from_bytes(image_bytes: bytes, api_user: str, api_secret: str) -> dict:
    """Call Sightengine API with raw bytes (for live camera frames)."""
    if not api_user or not api_secret:
        return {
            "trust_score": None,
            "deepfake_probability": None,
            "raw_response": None,
            "api_available": False,
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.sightengine.com/1.0/check.json",
                data={
                    "models": "deepfake",
                    "api_user": api_user,
                    "api_secret": api_secret,
                },
                files={"media": ("frame.jpg", image_bytes, "image/jpeg")},
            )
            result = resp.json()

            if result.get("status") == "failure":
                return {
                    "trust_score": None,
                    "deepfake_probability": None,
                    "raw_response": result,
                    "api_available": False,
                }

            deepfake_score = result.get("type", {}).get("deepfake", 0)
            trust_score = round((1 - deepfake_score) * 100, 2)

            return {
                "trust_score": trust_score,
                "deepfake_probability": deepfake_score,
                "raw_response": result,
                "api_available": True,
            }

    except Exception as e:
        logger.error(f"Sightengine API call failed for frame: {e}")
        return {
            "trust_score": None,
            "deepfake_probability": None,
            "raw_response": None,
            "api_available": False,
        }
