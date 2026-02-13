"""Database connection using Supabase."""
import logging
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)

_supabase: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client instance (service role for backend operations)."""
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_key)
        logger.info("Supabase client initialized")
    return _supabase


async def connect_db():
    """Initialize Supabase connection."""
    get_supabase()
    logger.info(f"Connected to Supabase: {settings.supabase_url}")


async def close_db():
    """Cleanup (no-op for Supabase HTTP client)."""
    global _supabase
    _supabase = None
    logger.info("Supabase client released")
