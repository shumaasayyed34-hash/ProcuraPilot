"""
Agent Shared Memory API Router (Phase 2 Deliverable I2.3)
Provides endpoints for cross-agent context retrieval, session state, and inter-agent data passing.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from backend.services.shared_memory.memory_service import AgentSharedMemoryService

router = APIRouter(prefix="/memory", tags=["Agent Shared Memory"])

memory_service = AgentSharedMemoryService()


class SetContextRequest(BaseModel):
    session_id: str = Field(..., description="Unique session or pipeline ID")
    key: str = Field(..., description="Context parameter key")
    value: Any = Field(..., description="Context parameter value (dict, list, string, number)")
    agent_id: Optional[str] = Field(default="system", description="ID/Name of the agent updating context")
    ttl_seconds: Optional[int] = Field(default=None, description="Optional Time-to-Live in seconds")


class AppendLogRequest(BaseModel):
    session_id: str = Field(..., description="Unique session or pipeline ID")
    agent_name: str = Field(..., description="Name of the reporting agent")
    action: str = Field(..., description="Action or step name executed by agent")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Detailed trace/output of action")


@router.post("/context")
async def set_context(req: SetContextRequest):
    """
    Store or update a context parameter for a specified session.
    """
    success = await memory_service.set_context(
        session_id=req.session_id,
        key=req.key,
        value=req.value,
        agent_id=req.agent_id,
        ttl_seconds=req.ttl_seconds
    )
    return {"status": "success", "session_id": req.session_id, "key": req.key}


@router.get("/context/{session_id}")
async def get_context(
    session_id: str,
    key: Optional[str] = Query(default=None, description="Optional key filter")
):
    """
    Retrieve session context (or a specific key within context).
    """
    context = await memory_service.get_context(session_id=session_id, key=key)
    if context is None and key is not None:
        raise HTTPException(status_code=404, detail=f"Key '{key}' not found in session '{session_id}'.")
    return {"session_id": session_id, "key": key, "data": context}


@router.post("/log")
async def append_agent_log(req: AppendLogRequest):
    """
    Append an agent execution log/reasoning trace to session memory.
    """
    await memory_service.append_agent_log(
        session_id=req.session_id,
        agent_name=req.agent_name,
        action=req.action,
        payload=req.payload
    )
    return {"status": "success", "session_id": req.session_id, "agent": req.agent_name}


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """
    Get full session memory state (context + agent logs).
    """
    session_data = await memory_service.get_session_memory(session_id=session_id)
    return session_data


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """
    Clear all memory for a given session.
    """
    await memory_service.clear_session(session_id=session_id)
    return {"status": "cleared", "session_id": session_id}
