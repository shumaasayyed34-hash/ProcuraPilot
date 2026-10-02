"""
AHP Decision Agent API Router (Phase 3 Deliverables I3.1, I3.2, I3.3)
Provides endpoints to trigger AHP decision agent evaluations, publish messages to message bus,
and retrieve decision context from Agent Shared Memory.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from backend.schemas.ahp_agent import AHPEvaluationRequest, AHPAgentDecisionResponse
from backend.agents.ahp_decision_agent import AHPDecisionAgent, ahp_decision_agent
from backend.services.redis_subscriber import RedisMessageBusSubscriber, redis_subscriber
from backend.services.shared_memory.memory_service import AgentSharedMemoryService

router = APIRouter(prefix="/ahp-agent", tags=["AHP Decision Agent"])

memory_service = AgentSharedMemoryService()


@router.post("/evaluate", response_model=AHPAgentDecisionResponse)
async def evaluate_suppliers(request: AHPEvaluationRequest):
    """
    Direct REST trigger to execute AHP Decision Agent evaluation, calculate utility scores,
    compile rankings, generate text rationale, and store results into Agent Shared Memory.
    """
    try:
        response = await ahp_decision_agent.evaluate_suppliers(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AHP Agent evaluation failed: {str(e)}")


@router.post("/trigger-message")
async def trigger_via_message_bus(request: AHPEvaluationRequest):
    """
    Publishes an AHP evaluation request message to the Redis Message Bus ('ahp:evaluation:requests').
    Listened by RedisMessageBusSubscriber to auto-trigger decision evaluation asynchronously.
    """
    try:
        published = await redis_subscriber.publish_request(request)
        return {
            "status": "published",
            "run_id": request.run_id,
            "channel": "ahp:evaluation:requests",
            "message": "Evaluation trigger published to Redis Message Bus"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish to message bus: {str(e)}")


@router.get("/context/{run_id}")
async def get_ahp_context(run_id: str):
    """
    Task I3.3: Retrieves stored AHP decision context, rankings, utility score breakdowns,
    and rationale summaries from Agent Shared Memory by run_id.
    """
    data = await memory_service.get_ahp_context(run_id=run_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No AHP decision context found for run_id '{run_id}'.")
    return {"run_id": run_id, "data": data}
