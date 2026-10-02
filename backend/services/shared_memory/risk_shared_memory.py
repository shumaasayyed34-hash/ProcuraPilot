"""
Agent Shared Memory Helper for Risk Intelligence Module (Task I4.4)
Provides clean convenience functions wrapping AgentSharedMemoryService.
"""

from typing import Any, Dict, Optional
from services.shared_memory.memory_service import AgentSharedMemoryService

shared_memory_service = AgentSharedMemoryService()


async def store_risk_report(supplier_id: str, report_data: Dict[str, Any], ttl_seconds: Optional[int] = 86400 * 7) -> bool:
    """Persists supplier risk report into shared memory."""
    return await shared_memory_service.store_risk_report(
        supplier_id=str(supplier_id),
        report_data=report_data,
        ttl_seconds=ttl_seconds,
    )


async def get_risk_context(supplier_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves stored supplier risk report context from shared memory."""
    return await shared_memory_service.get_risk_context(supplier_id=str(supplier_id))
