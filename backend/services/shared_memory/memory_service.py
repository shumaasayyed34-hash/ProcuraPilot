"""
Agent Shared Memory Layer (Phase 2 Task I2.3)
Provides a thread-safe, persistence-backed shared memory engine for cross-agent collaboration,
pipeline context sharing, session state management, and execution trace logging.

Storage Engine Priority:
1. Redis (if REDIS_URL configured and redis installed)
2. MongoDB (if MONGO_URL configured via Motor/pymongo)
3. In-Memory Dictionary fallback (always operational zero-dependency mode)
"""

import os
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# In-memory session store fallback
_IN_MEMORY_SESSIONS: Dict[str, Dict[str, Any]] = {}
_IN_MEMORY_LOGS: Dict[str, List[Dict[str, Any]]] = {}

class AgentSharedMemoryService:
    """
    Shared Memory Interface for AI Agents (Validation Engine, Supplier Comparison, AHP/Risk Agents).
    """

    def __init__(self):
        self.redis_client = None
        self._init_redis()

    def _init_redis(self):
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                logger.info("AgentSharedMemoryService initialized with Redis backend.")
            except Exception as e:
                logger.warning(f"Redis connection failed ({e}). Falling back to Mongo/In-Memory mode.")
                self.redis_client = None

    async def set_context(
        self,
        session_id: str,
        key: str,
        value: Any,
        agent_id: Optional[str] = None,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Set a context key-value pair for a given procurement session.
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        context_payload = {
            "value": value,
            "updated_by": agent_id or "system",
            "updated_at": timestamp
        }

        # 1. Redis Tier
        if self.redis_client:
            try:
                import json
                redis_key = f"session:{session_id}:context:{key}"
                self.redis_client.set(redis_key, json.dumps(context_payload), ex=ttl_seconds)
            except Exception as e:
                logger.warning(f"Redis set failed for {key}: {e}")

        # 2. MongoDB Tier (Async)
        try:
            from backend.database.mongodb import get_mongo_db
            db = get_mongo_db()
            await db.agent_shared_memory.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        f"context.{key}": context_payload,
                        "updated_at": timestamp
                    },
                    "$setOnInsert": {
                        "created_at": timestamp,
                        "agent_logs": []
                    }
                },
                upsert=True
            )
        except Exception as e:
            logger.debug(f"MongoDB context update fallback to in-memory: {e}")

        # 3. In-Memory Tier (Always Sync Guarantee)
        if session_id not in _IN_MEMORY_SESSIONS:
            _IN_MEMORY_SESSIONS[session_id] = {}
        _IN_MEMORY_SESSIONS[session_id][key] = context_payload
        return True

    async def get_context(
        self,
        session_id: str,
        key: Optional[str] = None
    ) -> Optional[Any]:
        """
        Retrieve context for a session. Returns full dict if key is None, else specific key value.
        """
        # Check In-Memory first for fast response
        if session_id in _IN_MEMORY_SESSIONS:
            session_data = _IN_MEMORY_SESSIONS[session_id]
            if key is not None:
                item = session_data.get(key)
                return item["value"] if isinstance(item, dict) and "value" in item else item
            return {k: (v["value"] if isinstance(v, dict) and "value" in v else v) for k, v in session_data.items()}

        # MongoDB check
        try:
            from backend.database.mongodb import get_mongo_db
            db = get_mongo_db()
            doc = await db.agent_shared_memory.find_one({"session_id": session_id})
            if doc and "context" in doc:
                ctx = doc["context"]
                if key is not None:
                    k_data = ctx.get(key)
                    return k_data["value"] if isinstance(k_data, dict) and "value" in k_data else k_data
                return {k: (v["value"] if isinstance(v, dict) and "value" in v else v) for k, v in ctx.items()}
        except Exception as e:
            logger.debug(f"MongoDB get_context error: {e}")

        return None

    async def append_agent_log(
        self,
        session_id: str,
        agent_name: str,
        action: str,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Append agent decision logs, prompt outputs, or validation traces.
        """
        entry = {
            "agent": agent_name,
            "action": action,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # MongoDB append
        try:
            from backend.database.mongodb import get_mongo_db
            db = get_mongo_db()
            await db.agent_shared_memory.update_one(
                {"session_id": session_id},
                {
                    "$push": {"agent_logs": entry},
                    "$set": {"updated_at": entry["timestamp"]}
                },
                upsert=True
            )
        except Exception as e:
            logger.debug(f"MongoDB append_agent_log fallback: {e}")

        # In-Memory append
        if session_id not in _IN_MEMORY_LOGS:
            _IN_MEMORY_LOGS[session_id] = []
        _IN_MEMORY_LOGS[session_id].append(entry)
        return True

    async def get_session_memory(self, session_id: str) -> Dict[str, Any]:
        """
        Fetch full session snapshot (context + logs).
        """
        context = await self.get_context(session_id) or {}
        logs = _IN_MEMORY_LOGS.get(session_id, [])

        try:
            from backend.database.mongodb import get_mongo_db
            db = get_mongo_db()
            doc = await db.agent_shared_memory.find_one({"session_id": session_id})
            if doc:
                db_logs = doc.get("agent_logs", [])
                if len(db_logs) > len(logs):
                    logs = db_logs
        except Exception as e:
            logger.debug(f"MongoDB get_session_memory log query fallback: {e}")

        return {
            "session_id": session_id,
            "context": context,
            "agent_logs": logs
        }

    async def clear_session(self, session_id: str) -> bool:
        """
        Clear session memory state.
        """
        _IN_MEMORY_SESSIONS.pop(session_id, None)
        _IN_MEMORY_LOGS.pop(session_id, None)

        try:
            from backend.database.mongodb import get_mongo_db
            db = get_mongo_db()
            await db.agent_shared_memory.delete_one({"session_id": session_id})
        except Exception as e:
            logger.debug(f"MongoDB clear_session error: {e}")

        return True
