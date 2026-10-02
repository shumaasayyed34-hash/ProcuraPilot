"""
Redis Message Bus Integration (Phase 3 Task I3.2)
Subscribes to Redis pub/sub channels ('ahp:evaluation:requests'), automatically triggers
AHPDecisionAgent evaluation runs upon message arrival, and broadcasts completion events ('ahp:evaluation:completed').

Includes robust fallback in-memory message queue mode when Redis is unconfigured or offline.
"""

import os
import json
import asyncio
import logging
from typing import Dict, Any, Callable, Optional, List

from backend.schemas.ahp_agent import AHPEvaluationRequest, AHPAgentDecisionResponse
from backend.agents.ahp_decision_agent import AHPDecisionAgent, ahp_decision_agent

logger = logging.getLogger("procurapilot.redis_bus")

# In-memory channel fallback queues
_IN_MEMORY_BUS_LISTENERS: Dict[str, List[Callable]] = {}
_IN_MEMORY_COMPLETED_EVENTS: Dict[str, List[Dict[str, Any]]] = {}


class RedisMessageBusSubscriber:
    """
    Message Bus Consumer & Publisher for AHP Agent (Task I3.2).
    Listens on 'ahp:evaluation:requests', executes AHP Decision Agent, and publishes to 'ahp:evaluation:completed'.
    """

    def __init__(
        self,
        agent: AHPDecisionAgent = ahp_decision_agent,
        redis_url: Optional[str] = os.getenv("REDIS_URL"),
        request_channel: str = "ahp:evaluation:requests",
        completed_channel: str = "ahp:evaluation:completed",
    ):
        self.agent = agent
        self.redis_url = redis_url
        self.request_channel = request_channel
        self.completed_channel = completed_channel
        self.redis_client = None
        self.is_running = False
        self._listener_task: Optional[asyncio.Task] = None

        self._init_redis()

    def _init_redis(self):
        if self.redis_url:
            try:
                import redis.asyncio as aioredis
                self.redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
                logger.info(f"[RedisBus] Connected to Redis bus at {self.redis_url}")
            except Exception as e:
                logger.warning(f"[RedisBus] Redis connection failed ({e}). Operating in fallback in-memory mode.")
                self.redis_client = None

    async def publish_request(self, request: AHPEvaluationRequest) -> bool:
        """
        Publishes an AHP evaluation trigger message to the message bus.
        """
        payload_str = request.model_dump_json()

        # 1. Redis Pub/Sub Publish
        if self.redis_client:
            try:
                await self.redis_client.publish(self.request_channel, payload_str)
                logger.info(f"[RedisBus] Published evaluation request '{request.run_id}' to '{self.request_channel}'")
                return True
            except Exception as e:
                logger.error(f"[RedisBus] Error publishing to Redis channel '{self.request_channel}': {e}")

        # 2. Fallback In-Memory Bus Dispatch
        logger.info(f"[RedisBus In-Memory] Dispatching evaluation request '{request.run_id}'")
        listeners = _IN_MEMORY_BUS_LISTENERS.get(self.request_channel, [])
        for cb in listeners:
            asyncio.create_task(cb(payload_str))

        # Auto-process synchronously if no listener loop attached
        if not listeners:
            asyncio.create_task(self.process_message(payload_str))

        return True

    async def publish_completed_event(self, response: AHPAgentDecisionResponse) -> bool:
        """
        Publishes an AHP evaluation completion event message to the message bus.
        """
        payload_str = response.model_dump_json()

        if self.redis_client:
            try:
                await self.redis_client.publish(self.completed_channel, payload_str)
                logger.info(f"[RedisBus] Published completion event '{response.run_id}' to '{self.completed_channel}'")
            except Exception as e:
                logger.error(f"[RedisBus] Error publishing completion event: {e}")

        # Record event in fallback store
        if self.completed_channel not in _IN_MEMORY_COMPLETED_EVENTS:
            _IN_MEMORY_COMPLETED_EVENTS[self.completed_channel] = []
        _IN_MEMORY_COMPLETED_EVENTS[self.completed_channel].append(response.model_dump(mode="json"))
        return True

    async def process_message(self, raw_message: str) -> Optional[AHPAgentDecisionResponse]:
        """
        Parses incoming message, triggers AHPDecisionAgent, and broadcasts completion event.
        """
        try:
            data = json.loads(raw_message)
            req = AHPEvaluationRequest(**data)
            logger.info(f"[RedisBus] Processing AHP evaluation trigger '{req.run_id}'")

            # Execute AHP Decision Agent
            decision_resp = await self.agent.evaluate_suppliers(req)

            # Publish completed event
            await self.publish_completed_event(decision_resp)
            return decision_resp

        except Exception as err:
            logger.error(f"[RedisBus] Error processing evaluation message: {err}", exc_info=True)
            return None

    async def start_listening(self):
        """
        Starts async subscription loop listening for incoming evaluation triggers.
        """
        self.is_running = True

        if self.redis_client:
            pubsub = self.redis_client.pubsub()
            await pubsub.subscribe(self.request_channel)
            logger.info(f"[RedisBus] Subscribed to Redis channel '{self.request_channel}'")

            async for message in pubsub.listen():
                if not self.is_running:
                    break
                if message["type"] == "message":
                    raw_data = message["data"]
                    asyncio.create_task(self.process_message(raw_data))

        else:
            logger.info(f"[RedisBus In-Memory] Registered listener for '{self.request_channel}'")
            if self.request_channel not in _IN_MEMORY_BUS_LISTENERS:
                _IN_MEMORY_BUS_LISTENERS[self.request_channel] = []
            
            async def _in_mem_callback(msg_str: str):
                await self.process_message(msg_str)

            _IN_MEMORY_BUS_LISTENERS[self.request_channel].append(_in_mem_callback)

    def stop_listening(self):
        """Stops the subscriber listener loop."""
        self.is_running = False
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()


redis_subscriber = RedisMessageBusSubscriber()
