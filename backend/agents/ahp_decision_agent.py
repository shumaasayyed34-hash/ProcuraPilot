"""
AHP Decision Agent Core (Phase 3 Task I3.1)
Autonomous decision agent that evaluates supplier quotations using Analytical Hierarchy Process (AHP)
utility scoring (integrating S3.3 calculate_ahp_scores), compiles ordinal rankings, and generates structured rationale summaries.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

try:
    from schemas.ahp_agent import (
        AHPEvaluationRequest,
        AHPAgentDecisionResponse,
        AHPSupplierRankItem,
        AHPScoreBreakdown,
        AHPRationaleSummary,
    )
    from utils.ahp_engine import calculate_ahp_scores
    from services.shared_memory.memory_service import AgentSharedMemoryService
except ImportError:
    from backend.schemas.ahp_agent import (
        AHPEvaluationRequest,
        AHPAgentDecisionResponse,
        AHPSupplierRankItem,
        AHPScoreBreakdown,
        AHPRationaleSummary,
    )
    from backend.utils.ahp_engine import calculate_ahp_scores
    from backend.services.shared_memory.memory_service import AgentSharedMemoryService

logger = logging.getLogger("procurapilot.ahp_agent")


class AHPDecisionAgent:
    """
    Autonomous AHP Decision Agent (Task I3.1).
    Integrates directly with Shumaaila's S3.3 AHP Scoring Engine (calculate_ahp_scores).
    Evaluates suppliers using multi-criteria weighted utility scoring, compiles ordinal rankings,
    builds decision rationale text, and persists session state to Agent Shared Memory (I3.3).
    """

    def __init__(
        self,
        memory_service: Optional[AgentSharedMemoryService] = None,
    ):
        self.memory_service = memory_service or AgentSharedMemoryService()

    async def evaluate_suppliers(
        self,
        request: AHPEvaluationRequest
    ) -> AHPAgentDecisionResponse:
        """
        Executes AHP supplier scoring via S3.3 engine, ranks suppliers, generates rationale summary,
        and persists results to Agent Shared Memory.
        """
        logger.info(f"[AHPDecisionAgent] Starting evaluation run '{request.run_id}' for RFQ {request.rfq_id}")

        if not request.supplier_quotes:
            raise ValueError("Supplier quotes list cannot be empty for AHP evaluation.")

        # Normalize criteria weight keys for S3.3 AHP Engine (price, quality, delivery_time, esg)
        weights_mapped = {}
        for k, v in request.criteria_weights.items():
            norm_k = k.lower().replace("quality_rating", "quality").replace("esg_compliance", "esg")
            weights_mapped[norm_k] = float(v)

        # Ensure required keys exist
        default_keys = ["price", "quality", "delivery_time", "esg"]
        for dk in default_keys:
            if dk not in weights_mapped:
                weights_mapped[dk] = 0.0

        # Build supplier_data dict list expected by S3.3 calculate_ahp_scores
        suppliers_input: List[Dict[str, Any]] = []
        for raw in request.supplier_quotes:
            suppliers_input.append({
                "supplier_id": raw["supplier_id"],
                "supplier_name": raw.get("supplier_name", f"Supplier {raw['supplier_id']}"),
                "price": float(raw.get("price", raw.get("unit_price", raw.get("total_amount", 0.0)))),
                "quality": float(raw.get("quality", raw.get("supplier_rating", raw.get("rating", 4.0)))),
                "delivery_time": float(raw.get("delivery_time", raw.get("delivery_time_days", 30))),
                "esg": float(raw.get("esg", raw.get("esg_total", raw.get("esg_score", 50.0)))),
            })

        # Integrate with Shumaaila's S3.3 AHP Utility Score Calculator
        ahp_results = calculate_ahp_scores(
            suppliers_data=suppliers_input,
            criteria_weights=weights_mapped
        )

        # Build AHPSupplierRankItem models
        ranked_items: List[AHPSupplierRankItem] = []
        for idx, item in enumerate(ahp_results, start=1):
            score_scale = round(item["ahp_score"] * 100.0, 2)

            breakdowns: Dict[str, AHPScoreBreakdown] = {
                "price": AHPScoreBreakdown(
                    criterion_name="price",
                    raw_value=suppliers_input[idx-1]["price"],
                    normalized_score=round(item.get("price_score", 0.0) * 100.0, 2),
                    weight=weights_mapped.get("price", 0.0),
                    weighted_score=round(item.get("price_score", 0.0) * weights_mapped.get("price", 0.0) * 100.0, 2),
                    is_best_in_class=(item.get("price_score", 0.0) == 1.0),
                ),
                "quality": AHPScoreBreakdown(
                    criterion_name="quality",
                    raw_value=suppliers_input[idx-1]["quality"],
                    normalized_score=round(item.get("quality_score", 0.0) * 100.0, 2),
                    weight=weights_mapped.get("quality", 0.0),
                    weighted_score=round(item.get("quality_score", 0.0) * weights_mapped.get("quality", 0.0) * 100.0, 2),
                    is_best_in_class=(item.get("quality_score", 0.0) == 1.0),
                ),
                "delivery_time": AHPScoreBreakdown(
                    criterion_name="delivery_time",
                    raw_value=suppliers_input[idx-1]["delivery_time"],
                    normalized_score=round(item.get("delivery_score", 0.0) * 100.0, 2),
                    weight=weights_mapped.get("delivery_time", 0.0),
                    weighted_score=round(item.get("delivery_score", 0.0) * weights_mapped.get("delivery_time", 0.0) * 100.0, 2),
                    is_best_in_class=(item.get("delivery_score", 0.0) == 1.0),
                ),
                "esg": AHPScoreBreakdown(
                    criterion_name="esg",
                    raw_value=suppliers_input[idx-1]["esg"],
                    normalized_score=round(item.get("esg_score", 0.0) * 100.0, 2),
                    weight=weights_mapped.get("esg", 0.0),
                    weighted_score=round(item.get("esg_score", 0.0) * weights_mapped.get("esg", 0.0) * 100.0, 2),
                    is_best_in_class=(item.get("esg_score", 0.0) == 1.0),
                ),
            }

            # Badges
            badges = []
            if breakdowns["price"].is_best_in_class:
                badges.append("Lowest Price")
            if breakdowns["delivery_time"].is_best_in_class:
                badges.append("Fastest Delivery")
            if breakdowns["quality"].is_best_in_class:
                badges.append("Top Rated Quality")
            if breakdowns["esg"].is_best_in_class:
                badges.append("ESG Leader")

            ranked_items.append(
                AHPSupplierRankItem(
                    supplier_id=item["supplier_id"],
                    supplier_name=item["supplier_name"],
                    rank=item.get("rank", idx),
                    total_score=score_scale,
                    badges=badges,
                    criteria_breakdown=breakdowns,
                )
            )

        # Build Rationale Summary
        winner = ranked_items[0]
        runner_up = ranked_items[1] if len(ranked_items) > 1 else None
        margin = round(winner.total_score - (runner_up.total_score if runner_up else 0.0), 2)

        winning_diffs = []
        for crit_name, b_info in winner.criteria_breakdown.items():
            if b_info.is_best_in_class:
                winning_diffs.append(f"Best-in-class {crit_name.title()}")

        if not winning_diffs:
            winning_diffs.append("Highest overall weighted utility score across price, quality, delivery, and ESG")

        rationale_text = (
            f"Supplier '{winner.supplier_name}' (ID: {winner.supplier_id}) earned Rank 1 with a top "
            f"AHP Composite Score of {winner.total_score:.2f}/100. "
        )

        if runner_up:
            rationale_text += (
                f"Outperformed runner-up '{runner_up.supplier_name}' by {margin:.2f} points. "
                f"Key competitive advantages: {', '.join(winning_diffs)}."
            )
        else:
            rationale_text += f"Key competitive advantages: {', '.join(winning_diffs)}."

        rationale_summary = AHPRationaleSummary(
            winner_supplier_id=winner.supplier_id,
            winner_name=winner.supplier_name,
            winner_total_score=winner.total_score,
            margin_over_runner_up=margin,
            key_differentiators=winning_diffs,
            rationale_text=rationale_text,
        )

        decision_response = AHPAgentDecisionResponse(
            run_id=request.run_id,
            rfq_id=request.rfq_id,
            status="SUCCESS",
            total_suppliers_evaluated=len(ranked_items),
            criteria_weights=request.criteria_weights,
            rankings=ranked_items,
            rationale=rationale_summary,
            executed_at=datetime.now(timezone.utc).isoformat(),
        )

        # Store results into Agent Shared Memory (Task I3.3)
        await self.memory_service.store_ahp_results(
            run_id=request.run_id,
            evaluation_data=decision_response.model_dump(mode="json")
        )

        # Log decision execution trace
        await self.memory_service.append_agent_log(
            session_id=request.run_id,
            agent_name="AHPDecisionAgent_I3.1",
            action="EVALUATE_SUPPLIERS",
            payload={
                "rfq_id": request.rfq_id,
                "winner_supplier_id": winner.supplier_id,
                "winner_score": winner.total_score,
                "margin": margin,
            }
        )

        logger.info(
            f"[AHPDecisionAgent] Completed run '{request.run_id}'. "
            f"Winner: '{winner.supplier_name}' (Score: {winner.total_score:.2f})"
        )

        return decision_response


ahp_decision_agent = AHPDecisionAgent()
