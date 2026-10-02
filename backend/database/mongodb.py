import os
from pathlib import Path
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "procurapilot")

_client: Optional[AsyncIOMotorClient] = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
    return _client


def get_mongo_db():
    c = get_mongo_client()
    return c[MONGO_DB_NAME]


def close_mongo_client():
    global _client
    if _client is not None:
        _client.close()
        _client = None
