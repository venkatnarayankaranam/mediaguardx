"""Database connection - works with or without MongoDB."""
import os
import json
import logging
from typing import Optional
from datetime import datetime
from config import settings

logger = logging.getLogger(__name__)

# Global database instance
_db = None
_use_local = False

# Local storage directory
LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "local_data")


class LocalCollection:
    """Local file-based collection that mimics MongoDB collection."""

    def __init__(self, name: str):
        self.name = name
        self.file_path = os.path.join(LOCAL_DATA_DIR, f"{name}.json")
        os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as f:
                json.dump([], f)

    def _load(self):
        try:
            with open(self.file_path, 'r') as f:
                return json.load(f)
        except:
            return []

    def _save(self, data):
        with open(self.file_path, 'w') as f:
            json.dump(data, f, default=str, indent=2)

    async def find_one(self, query: dict):
        data = self._load()
        for item in data:
            match = True
            for key, value in query.items():
                if key == "_id":
                    if str(item.get("_id")) != str(value):
                        match = False
                        break
                elif item.get(key) != value:
                    match = False
                    break
            if match:
                return item
        return None

    async def find(self, query: dict = None):
        data = self._load()
        if query is None:
            return LocalCursor(data)

        results = []
        for item in data:
            match = True
            for key, value in query.items():
                if key == "_id":
                    if str(item.get("_id")) != str(value):
                        match = False
                        break
                elif item.get(key) != value:
                    match = False
                    break
            if match:
                results.append(item)
        return LocalCursor(results)

    async def insert_one(self, document: dict):
        data = self._load()
        if "_id" not in document:
            from bson import ObjectId
            document["_id"] = str(ObjectId())
        else:
            document["_id"] = str(document["_id"])
        data.append(document)
        self._save(data)

        class InsertResult:
            def __init__(self, id):
                self.inserted_id = id
        return InsertResult(document["_id"])

    async def update_one(self, query: dict, update: dict):
        data = self._load()
        for i, item in enumerate(data):
            match = True
            for key, value in query.items():
                if key == "_id":
                    if str(item.get("_id")) != str(value):
                        match = False
                        break
                elif item.get(key) != value:
                    match = False
                    break
            if match:
                if "$set" in update:
                    for key, value in update["$set"].items():
                        data[i][key] = value
                self._save(data)
                return

    async def count_documents(self, query: dict = None):
        if query is None:
            query = {}
        cursor = await self.find(query)
        return len(cursor.data)

    async def aggregate(self, pipeline: list):
        data = self._load()
        return LocalCursor(data)


class LocalCursor:
    """Local cursor that mimics MongoDB cursor."""

    def __init__(self, data):
        self.data = data
        self._skip = 0
        self._limit = None
        self._sort_key = None
        self._sort_dir = 1

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, list):
            if key_or_list:
                self._sort_key = key_or_list[0][0]
                self._sort_dir = key_or_list[0][1]
        else:
            self._sort_key = key_or_list
            self._sort_dir = direction or 1
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, length=None):
        result = self.data

        if self._sort_key:
            result = sorted(result, key=lambda x: x.get(self._sort_key, ''), reverse=(self._sort_dir == -1))

        if self._skip:
            result = result[self._skip:]

        if self._limit:
            result = result[:self._limit]
        elif length:
            result = result[:length]

        return result


class LocalDatabase:
    """Local file-based database that mimics MongoDB database."""

    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith('_'):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = LocalCollection(name)
        return self._collections[name]


async def connect_db():
    """Connect to MongoDB or use local storage."""
    global _db, _use_local

    # Try MongoDB first
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(settings.mongo_url, serverSelectionTimeoutMS=3000)
        await client.admin.command('ping')
        _db = client.mediaguardx
        _use_local = False
        logger.info(f"Connected to MongoDB: {settings.mongo_url}")
    except Exception as e:
        # Fall back to local storage
        logger.warning(f"MongoDB not available, using local storage")
        _db = LocalDatabase()
        _use_local = True
        logger.info("Using local file-based storage (no MongoDB required)")


async def close_db():
    """Close database connection."""
    global _db
    if _db is not None and not _use_local:
        try:
            _db.client.close()
        except:
            pass
    _db = None


def get_database():
    """Get database instance."""
    global _db
    if _db is None:
        _db = LocalDatabase()
    return _db
