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
                import redis.asyncio as aioredis
                self.redis_client = aioredis.from_url(redis_url, decode_responses=True)
                logger.info("AgentSharedMemoryService initialized with async Redis backend.")
            except Exception:
                try:
                    import redis
                    self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
                    self.redis_client.ping()
                    logger.info("AgentSharedMemoryService initialized with sync Redis backend.")
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
            from database.mongodb import get_mongo_db
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
            from database.mongodb import get_mongo_db
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
            from database.mongodb import get_mongo_db
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
            from database.mongodb import get_mongo_db
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
            from database.mongodb import get_mongo_db
            db = get_mongo_db()
            await db.agent_shared_memory.delete_one({"session_id": session_id})
        except Exception as e:
            logger.debug(f"MongoDB clear_session error: {e}")

        return True

    async def store_ahp_results(
        self,
        run_id: str,
        evaluation_data: Dict[str, Any],
        ttl_seconds: Optional[int] = 86400
    ) -> bool:
        """
        Task I3.3: Store AHP scoring results, utility score breakdowns, and rationale into Agent Shared Memory.
        Key naming convention: agent_memory:ahp:{run_id}
        """
        ahp_key = f"agent_memory:ahp:{run_id}"

        # 1. Store via set_context under run_id session
        await self.set_context(
            session_id=run_id,
            key=ahp_key,
            value=evaluation_data,
            agent_id="AHPDecisionAgent_I3.1",
            ttl_seconds=ttl_seconds
        )

        # 2. Directly cache under ahp_key in Redis if active
        if self.redis_client:
            try:
                import json
                import inspect
                res = self.redis_client.set(ahp_key, json.dumps(evaluation_data), ex=ttl_seconds)
                if inspect.isawaitable(res):
                    await res
            except Exception as e:
                logger.warning(f"Redis store_ahp_results error for {ahp_key}: {e}")

        # 3. Always cache in memory
        if run_id not in _IN_MEMORY_SESSIONS:
            _IN_MEMORY_SESSIONS[run_id] = {}
        _IN_MEMORY_SESSIONS[run_id][ahp_key] = {
            "value": evaluation_data,
            "updated_by": "AHPDecisionAgent_I3.1",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        # Also store under direct ahp_key session for fast key lookup
        _IN_MEMORY_SESSIONS[ahp_key] = {
            "evaluation": {
                "value": evaluation_data,
                "updated_by": "AHPDecisionAgent_I3.1",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
        return True

    async def get_ahp_context(self, run_id: str) -> Optional[Dict[str, Any]]:
        """
        Task I3.3: Fast, structured retrieval of stored AHP evaluation results by run_id.
        """
        ahp_key = f"agent_memory:ahp:{run_id}"

        # 1. Try Redis first
        if self.redis_client:
            try:
                import json
                import inspect
                res = self.redis_client.get(ahp_key)
                if inspect.isawaitable(res):
                    raw_data = await res
                else:
                    raw_data = res
                if raw_data:
                    return json.loads(raw_data)
            except Exception as e:
                logger.warning(f"Redis get_ahp_context error for {ahp_key}: {e}")


        # 2. Try session context
        data = await self.get_context(session_id=run_id, key=ahp_key)
        if data is not None:
            return data

        # 3. Try direct key lookup in memory
        if ahp_key in _IN_MEMORY_SESSIONS:
            item = _IN_MEMORY_SESSIONS[ahp_key].get("evaluation")
            if item and "value" in item:
                return item["value"]

        return None

