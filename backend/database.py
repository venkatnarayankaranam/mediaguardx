"""Database connection and configuration."""
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
database = None


async def connect_db():
    """Connect to MongoDB database."""
    global client, database
    try:
        client = AsyncIOMotorClient(settings.mongo_url)
        database = client.get_database()
        # Test connection
        await client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.mongo_url}")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


def get_database():
    """Get database instance."""
    return database

