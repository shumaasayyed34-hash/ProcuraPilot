"""
Phase 3 Unit & Integration Tests:
- I3.1: AHP Decision Agent supplier evaluation & rationale generation
- I3.2: Redis Message Bus subscription & completion event broadcasting
- I3.3: Agent Shared Memory AHP result storage and retrieval
"""

import asyncio
import pytest
try:
    from schemas.ahp_agent import AHPEvaluationRequest, AHPAgentDecisionResponse
    from agents.ahp_decision_agent import AHPDecisionAgent
    from services.redis_subscriber import RedisMessageBusSubscriber
    from services.shared_memory.memory_service import AgentSharedMemoryService
except ImportError:
    from backend.schemas.ahp_agent import AHPEvaluationRequest, AHPAgentDecisionResponse
    from backend.agents.ahp_decision_agent import AHPDecisionAgent
    from backend.services.redis_subscriber import RedisMessageBusSubscriber
    from backend.services.shared_memory.memory_service import AgentSharedMemoryService


def test_ahp_decision_agent_evaluation():
    async def _run():
        agent = AHPDecisionAgent()

        sample_request = AHPEvaluationRequest(
            run_id="AHP-TEST-RUN-101",
            rfq_id=1,
            criteria_weights={"price": 0.40, "quality_rating": 0.25, "delivery_time": 0.20, "esg_compliance": 0.15},
            supplier_quotes=[
                {
                    "supplier_id": 101,
                    "supplier_name": "Alpha Steel Corp",
                    "unit_price": 500.0,
                    "currency": "INR",
                    "delivery_time_days": 10,
                    "supplier_rating": 4.8,
                    "esg_total": 85.0
                },
                {
                    "supplier_id": 102,
                    "supplier_name": "Beta Metals Ltd",
                    "unit_price": 750.0,
                    "currency": "INR",
                    "delivery_time_days": 25,
                    "supplier_rating": 3.5,
                    "esg_total": 60.0
                },
                {
                    "supplier_id": 103,
                    "supplier_name": "Gamma Hardware Ltd",
                    "unit_price": 600.0,
                    "currency": "INR",
                    "delivery_time_days": 15,
                    "supplier_rating": 4.2,
                    "esg_total": 72.0
                }
            ]
        )

        response = await agent.evaluate_suppliers(sample_request)

        # Assertions
        assert response.status == "SUCCESS"
        assert response.run_id == "AHP-TEST-RUN-101"
        assert response.total_suppliers_evaluated == 3
        assert len(response.rankings) == 3

        # Alpha Steel should be Rank 1 due to lowest price & highest rating
        winner = response.rankings[0]
        assert winner.rank == 1
        assert winner.supplier_id == 101
        assert winner.total_score > response.rankings[1].total_score

        # Check rationale text
        assert "Alpha Steel Corp" in response.rationale.rationale_text
        assert response.rationale.winner_supplier_id == 101
        assert response.rationale.margin_over_runner_up > 0.0

        # Check Agent Shared Memory persistence (Task I3.3)
        memory = AgentSharedMemoryService()
        cached_context = await memory.get_ahp_context("AHP-TEST-RUN-101")
        assert cached_context is not None
        assert cached_context["run_id"] == "AHP-TEST-RUN-101"
        assert cached_context["rationale"]["winner_supplier_id"] == 101

    asyncio.run(_run())


def test_redis_message_bus_subscriber():
    async def _run():
        bus = RedisMessageBusSubscriber()

        sample_request = AHPEvaluationRequest(
            run_id="AHP-BUS-RUN-202",
            rfq_id=2,
            criteria_weights={"price": 0.50, "quality_rating": 0.30, "delivery_time": 0.20},
            supplier_quotes=[
                {"supplier_id": 201, "supplier_name": "Supplier X", "unit_price": 100.0, "supplier_rating": 4.0},
                {"supplier_id": 202, "supplier_name": "Supplier Y", "unit_price": 200.0, "supplier_rating": 3.0}
            ]
        )

        # Direct message process trigger
        resp = await bus.process_message(sample_request.model_dump_json())

        assert resp is not None
        assert resp.run_id == "AHP-BUS-RUN-202"
        assert resp.rankings[0].supplier_id == 201

    asyncio.run(_run())
