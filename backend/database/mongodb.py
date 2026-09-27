import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "procurapilot")

client: AsyncIOMotorClient = None


def get_mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(MONGO_URL)


def get_mongo_db():
    c = get_mongo_client()
    return c[MONGO_DB_NAME]
