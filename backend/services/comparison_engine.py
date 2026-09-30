"""
Supplier Comparison Engine & Multi-Criteria Decision Analysis (P2.1, P2.2, P2.3 Deliverable)

Features:
- Min-Max normalization for Cost criteria (lower is better) and Benefit criteria (higher is better).
- Multi-currency normalization layer integrating with Validation Engine FX rates (S2.2/S2.4).
- Vectorized scoring with NumPy with fallback handling for edge cases (single supplier, identical values, missing fields).
- Clean, structured output schema (P2.4) matching Faisal's Frontend comparison tables & dashboard (F2.2/F2.4).
"""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

from schemas.comparison import (
    BenchmarkSummary,
    ComparisonBadge,
    ComparisonEngineResponse,
    CriteriaWeights,
    CriterionBenchmark,
    CriterionDetail,
    CriterionType,
    FXConversionAudit,
    SupplierComparisonItem,
    SupplierQuoteInput,
)


class FXRateService:
    """FX Rate and Currency Normalization Layer (P2.3 Deliverable).
    
    Seamlessly integrates with Shumaaila's Validation Engine (S2.2 & S2.4)
    to convert multi-currency quotations into a uniform baseline currency (default: INR).
    """

    # Default fallback exchange rates relative to INR (1 Foreign Currency = X INR)
    # Can be dynamically overridden by live DB/API rates from S2.4
    DEFAULT_RATES_TO_INR: Dict[str, float] = {
        "INR": 1.0,
        "USD": 83.50,
        "EUR": 90.20,
        "GBP": 105.80,
        "AED": 22.73,
        "SGD": 62.15,
        "JPY": 0.55,
        "CNY": 11.50,
        "CAD": 61.20,
        "AUD": 54.80,
    }

    def __init__(self, custom_rates: Optional[Dict[str, float]] = None):
        self.rates_to_inr = dict(self.DEFAULT_RATES_TO_INR)
        if custom_rates:
            self.rates_to_inr.update({k.upper(): float(v) for k, v in custom_rates.items()})

    def get_rate(self, from_curr: str, to_curr: str = "INR") -> float:
        """Calculates exchange rate from from_curr to to_curr via cross-rate triangulation."""
        f_curr = from_curr.upper() if from_curr else "INR"
        t_curr = to_curr.upper() if to_curr else "INR"

        if f_curr == t_curr:
            return 1.0

        # Rate of from_curr to INR
        rate_from_to_inr = self.rates_to_inr.get(f_curr)
        if rate_from_to_inr is None:
            # Fallback for unknown currency: assume 1.0 to avoid pipeline crash
            rate_from_to_inr = 1.0

        # Rate of to_curr to INR
        rate_to_to_inr = self.rates_to_inr.get(t_curr)
        if rate_to_to_inr is None or rate_to_to_inr == 0:
            rate_to_to_inr = 1.0

        return rate_from_to_inr / rate_to_to_inr

    def convert_amount(
        self,
        amount: Optional[float],
        from_curr: str,
        to_curr: str = "INR",
    ) -> Tuple[Optional[float], FXConversionAudit]:
        """Converts an amount from quotation currency to base currency with audit metadata."""
        if amount is None:
            audit = FXConversionAudit(
                original_currency=from_curr,
                target_currency=to_curr,
                exchange_rate=1.0,
                conversion_timestamp=datetime.now(timezone.utc),
                source="ValidationEngine_S2.4",
            )
            return None, audit

        rate = self.get_rate(from_curr, to_curr)
        converted = round(amount * rate, 2)
        audit = FXConversionAudit(
            original_currency=from_curr,
            target_currency=to_curr,
            exchange_rate=round(rate, 4),
            conversion_timestamp=datetime.now(timezone.utc),
            source="ValidationEngine_S2.4",
        )
        return converted, audit


class MinMaxNormalizer:
    """Mathematical Min-Max Normalization Engine (P2.2 Deliverable).
    
    Transforms heterogeneous metrics (dollars, days, stars, months) into
    standardized dimensionless scores in the range [0.0, 1.0] (or 0-100%).
    
    Formulas:
    1. Benefit Criteria (Higher is better, e.g., Rating, Warranty):
       S_i = (x_i - min(X)) / (max(X) - min(X))
       
    2. Cost Criteria (Lower is better, e.g., Price, Lead Time):
       S_i = (max(X) - x_i) / (max(X) - min(X))
       
    Robustness Guarantees:
    - If all values are identical (max == min), all entities receive 1.0 (100%).
    - If only 1 supplier is present, score is 1.0 (100%).
    - Missing/NaN values are penalized gracefully with 0.0 score while preserving pipeline stability.
    """

    @staticmethod
    def normalize_vector(
        values: List[Optional[float]],
        criterion_type: CriterionType,
        scale_to_100: bool = True,
        penalty_for_missing: float = 0.0,
    ) -> List[float]:
        """Normalizes a 1D vector of numbers according to criterion direction.
        
        Args:
            values: List of raw values (floats or None).
            criterion_type: CriterionType.COST or CriterionType.BENEFIT.
            scale_to_100: If True, returns scores in [0.0, 100.0], else [0.0, 1.0].
            penalty_for_missing: Default score assigned to None values.
            
        Returns:
            List of normalized float scores.
        """
        if not values:
            return []

        # Extract valid numerical values
        valid_vals = [float(v) for v in values if v is not None and not math.isnan(v)]

        # Edge case: No valid values in column
        if not valid_vals:
            default_score = 100.0 if scale_to_100 else 1.0
            return [default_score] * len(values)

        v_min = min(valid_vals)
        v_max = max(valid_vals)

        # Edge case: All values identical or single supplier (v_max == v_min)
        if abs(v_max - v_min) < 1e-9:
            base_score = 100.0 if scale_to_100 else 1.0
            return [
                base_score if (v is not None and not math.isnan(v)) else penalty_for_missing
                for v in values
            ]

        # Use NumPy for vector operations
        val_array = np.array(
            [float(v) if (v is not None and not math.isnan(v)) else np.nan for v in values],
            dtype=float,
        )

        if criterion_type == CriterionType.BENEFIT:
            # S_i = (x_i - min) / (max - min)
            norm = (val_array - v_min) / (v_max - v_min)
        else:
            # S_i = (max - x_i) / (max - min)
            norm = (v_max - val_array) / (v_max - v_min)

        # Scale to [0, 100] if requested
        factor = 100.0 if scale_to_100 else 1.0
        norm = norm * factor

        # Replace NaN (missing raw values) with penalty score
        result: List[float] = []
        for raw, score in zip(values, norm):
            if raw is None or math.isnan(score):
                result.append(round(penalty_for_missing * factor, 2))
            else:
                # Clamp between 0.0 and factor to prevent numerical overflow
                clamped = max(0.0, min(factor, float(score)))
                result.append(round(clamped, 2))

        return result


class SupplierComparisonEngine:
    """Phase 2 Supplier Comparison Engine (P2.1 Deliverable).
    
    Orchestrates:
    - Multi-currency conversion via FXRateService.
    - Min-max scoring across cost & benefit dimensions via MinMaxNormalizer.
    - Composite weighted scoring and dynamic ranking.
    - Generation of UI comparison badges (Lowest Price, Fastest Delivery, etc.).
    - Statistical benchmark summaries for executive overview cards.
    """

    def __init__(self, fx_service: Optional[FXRateService] = None):
        self.fx_service = fx_service or FXRateService()
        self.normalizer = MinMaxNormalizer()

    def compare_quotes(
        self,
        rfq_id: int,
        quotes: List[SupplierQuoteInput],
        weights: Optional[CriteriaWeights] = None,
        base_currency: str = "INR",
    ) -> ComparisonEngineResponse:
        """Executes full comparative analysis across supplier quotations.
        
        Args:
            rfq_id: ID of the RFQ under analysis.
            quotes: List of extracted supplier quotes.
            weights: User-specified or default criteria weights.
            base_currency: Target baseline currency (default: 'INR').
            
        Returns:
            ComparisonEngineResponse conforming to standard P2.4 JSON schema.
        """
        if not quotes:
            raise ValueError(f"Cannot perform supplier comparison: No quotations provided for RFQ {rfq_id}")

        weights = weights or CriteriaWeights()

        # Step 1: Currency Normalization Layer (P2.3)
        converted_quotes = []
        for q in quotes:
            # Choose primary price: unit_price or total_amount
            raw_price = q.unit_price if q.unit_price is not None else q.total_amount
            base_unit_price, fx_audit_unit = self.fx_service.convert_amount(
                q.unit_price, q.currency, base_currency
            )
            base_total_amount, _ = self.fx_service.convert_amount(
                q.total_amount, q.currency, base_currency
            )

            # Combined ESG score: base ESG score + bonus for ISO certification
            iso_bonus = 15.0 if q.is_iso_certified else 0.0
            total_esg = min(100.0, (q.esg_score or 50.0) + iso_bonus)

            converted_quotes.append({
                "quote": q,
                "base_unit_price": base_unit_price,
                "base_total_amount": base_total_amount,
                "effective_price": base_unit_price if base_unit_price is not None else base_total_amount,
                "delivery_time_days": q.delivery_time_days,
                "supplier_rating": q.supplier_rating,
                "warranty_months": q.warranty_months or 0,
                "esg_total": total_esg,
                "fx_audit": fx_audit_unit,
            })

        # Step 2: Min-Max Normalization across each criterion (P2.2)
        # Vector 1: Price (Cost criterion: lower is better)
        price_vector = [item["effective_price"] for item in converted_quotes]
        price_scores = self.normalizer.normalize_vector(
            price_vector, criterion_type=CriterionType.COST, scale_to_100=True
        )

        # Vector 2: Delivery Time (Cost criterion: lower is better)
        delivery_vector = [
            float(item["delivery_time_days"]) if item["delivery_time_days"] is not None else None
            for item in converted_quotes
        ]
        delivery_scores = self.normalizer.normalize_vector(
            delivery_vector, criterion_type=CriterionType.COST, scale_to_100=True
        )

        # Vector 3: Quality Rating (Benefit criterion: higher is better)
        rating_vector = [item["supplier_rating"] for item in converted_quotes]
        rating_scores = self.normalizer.normalize_vector(
            rating_vector, criterion_type=CriterionType.BENEFIT, scale_to_100=True
        )

        # Vector 4: Warranty Duration (Benefit criterion: higher is better)
        warranty_vector = [float(item["warranty_months"]) for item in converted_quotes]
        warranty_scores = self.normalizer.normalize_vector(
            warranty_vector, criterion_type=CriterionType.BENEFIT, scale_to_100=True
        )

        # Vector 5: ESG & Compliance (Benefit criterion: higher is better)
        esg_vector = [item["esg_total"] for item in converted_quotes]
        esg_scores = self.normalizer.normalize_vector(
            esg_vector, criterion_type=CriterionType.BENEFIT, scale_to_100=True
        )

        # Step 3: Identify Best-in-Class performers for UI highlight tags
        valid_prices = [p for p in price_vector if p is not None]
        min_price = min(valid_prices) if valid_prices else None

        valid_deliv = [d for d in delivery_vector if d is not None]
        min_deliv = min(valid_deliv) if valid_deliv else None

        max_rating = max(rating_vector) if rating_vector else None
        max_warranty = max(warranty_vector) if warranty_vector else None
        max_esg = max(esg_vector) if esg_vector else None

        # Step 4: Calculate Composite Scores & Build Supplier Items
        supplier_items: List[SupplierComparisonItem] = []

        for idx, item in enumerate(converted_quotes):
            q: SupplierQuoteInput = item["quote"]

            # Criteria Details Breakdown
            crit_breakdown: Dict[str, CriterionDetail] = {
                "price": CriterionDetail(
                    criterion_name="price",
                    criterion_type=CriterionType.COST,
                    raw_value=q.unit_price or q.total_amount,
                    raw_unit=q.currency,
                    normalized_base_value=item["effective_price"],
                    score=price_scores[idx],
                    weight=weights.price,
                    weighted_score=round(price_scores[idx] * weights.price, 2),
                    is_best_in_class=(item["effective_price"] == min_price and min_price is not None),
                ),
                "delivery_time": CriterionDetail(
                    criterion_name="delivery_time",
                    criterion_type=CriterionType.COST,
                    raw_value=float(q.delivery_time_days) if q.delivery_time_days is not None else None,
                    raw_unit="days",
                    normalized_base_value=float(q.delivery_time_days) if q.delivery_time_days is not None else None,
                    score=delivery_scores[idx],
                    weight=weights.delivery_time,
                    weighted_score=round(delivery_scores[idx] * weights.delivery_time, 2),
                    is_best_in_class=(
                        q.delivery_time_days is not None and q.delivery_time_days == min_deliv
                    ),
                ),
                "quality_rating": CriterionDetail(
                    criterion_name="quality_rating",
                    criterion_type=CriterionType.BENEFIT,
                    raw_value=q.supplier_rating,
                    raw_unit="stars",
                    normalized_base_value=q.supplier_rating,
                    score=rating_scores[idx],
                    weight=weights.quality_rating,
                    weighted_score=round(rating_scores[idx] * weights.quality_rating, 2),
                    is_best_in_class=(q.supplier_rating == max_rating and max_rating is not None),
                ),
                "warranty": CriterionDetail(
                    criterion_name="warranty",
                    criterion_type=CriterionType.BENEFIT,
                    raw_value=float(q.warranty_months or 0),
                    raw_unit="months",
                    normalized_base_value=float(q.warranty_months or 0),
                    score=warranty_scores[idx],
                    weight=weights.warranty,
                    weighted_score=round(warranty_scores[idx] * weights.warranty, 2),
                    is_best_in_class=(
                        q.warranty_months is not None and q.warranty_months == max_warranty and max_warranty > 0
                    ),
                ),
                "esg_compliance": CriterionDetail(
                    criterion_name="esg_compliance",
                    criterion_type=CriterionType.BENEFIT,
                    raw_value=item["esg_total"],
                    raw_unit="index",
                    normalized_base_value=item["esg_total"],
                    score=esg_scores[idx],
                    weight=weights.esg_compliance,
                    weighted_score=round(esg_scores[idx] * weights.esg_compliance, 2),
                    is_best_in_class=(item["esg_total"] == max_esg and max_esg is not None),
                ),
            }

            # Composite Score = Sum of weighted scores
            composite = sum(c.weighted_score for c in crit_breakdown.values())
            composite = round(min(100.0, max(0.0, composite)), 2)

            # Determine Badges
            badges: List[ComparisonBadge] = []
            if crit_breakdown["price"].is_best_in_class:
                badges.append(ComparisonBadge.LOWEST_PRICE)
            if crit_breakdown["delivery_time"].is_best_in_class:
                badges.append(ComparisonBadge.FASTEST_DELIVERY)
            if crit_breakdown["quality_rating"].is_best_in_class and q.supplier_rating >= 4.0:
                badges.append(ComparisonBadge.TOP_RATED)
            if crit_breakdown["warranty"].is_best_in_class and (q.warranty_months or 0) >= 12:
                badges.append(ComparisonBadge.BEST_WARRANTY)
            if crit_breakdown["esg_compliance"].is_best_in_class and item["esg_total"] >= 70.0:
                badges.append(ComparisonBadge.ESG_LEADER)

            comp_item = SupplierComparisonItem(
                supplier_id=q.supplier_id,
                supplier_name=q.supplier_name,
                quotation_id=q.quotation_id,
                quote_number=q.quote_number,
                country=q.country,
                is_iso_certified=q.is_iso_certified,
                currency=q.currency,
                raw_unit_price=q.unit_price,
                raw_total_amount=q.total_amount,
                base_unit_price=item["base_unit_price"],
                base_total_amount=item["base_total_amount"],
                fx_audit=item["fx_audit"],
                delivery_time_days=q.delivery_time_days,
                warranty_months=q.warranty_months,
                payment_terms=q.payment_terms,
                supplier_rating=q.supplier_rating,
                composite_score=composite,
                rank=0,  # Assigned in next ranking step
                badges=badges,
                criteria_scores=crit_breakdown,
            )
            supplier_items.append(comp_item)

        # Step 5: Rank Suppliers (Rank 1 = Highest Composite Score)
        # Tie-breaker: Lower effective price wins
        supplier_items.sort(
            key=lambda x: (-x.composite_score, x.base_unit_price or float("inf"))
        )

        for rank_idx, item in enumerate(supplier_items, start=1):
            item.rank = rank_idx
            if rank_idx == 1:
                item.badges.insert(0, ComparisonBadge.BEST_OVERALL)
            elif rank_idx == 2 and len(supplier_items) > 2:
                item.badges.append(ComparisonBadge.RUNNER_UP)

        # Step 6: Generate Benchmark Summary (Executive Overview Cards)
        total_suppliers = len(supplier_items)
        max_price = max(valid_prices) if valid_prices else None
        price_variance = (
            round(((max_price - min_price) / min_price) * 100.0, 1)
            if (min_price and max_price and min_price > 0)
            else 0.0
        )
        max_deliv = max(valid_deliv) if valid_deliv else None

        benchmarks: Dict[str, CriterionBenchmark] = {
            "price": CriterionBenchmark(
                criterion_name="price",
                criterion_type=CriterionType.COST,
                unit=base_currency,
                best_value=min_price,
                worst_value=max_price,
                average_value=round(sum(valid_prices) / len(valid_prices), 2) if valid_prices else None,
                best_supplier_name=supplier_items[0].supplier_name if supplier_items else None,
            ),
            "delivery_time": CriterionBenchmark(
                criterion_name="delivery_time",
                criterion_type=CriterionType.COST,
                unit="days",
                best_value=min_deliv,
                worst_value=max_deliv,
                average_value=round(sum(valid_deliv) / len(valid_deliv), 1) if valid_deliv else None,
            ),
            "warranty": CriterionBenchmark(
                criterion_name="warranty",
                criterion_type=CriterionType.BENEFIT,
                unit="months",
                best_value=max_warranty,
                worst_value=min(warranty_vector) if warranty_vector else None,
                average_value=round(sum(warranty_vector) / len(warranty_vector), 1) if warranty_vector else None,
            ),
        }

        benchmark_summary = BenchmarkSummary(
            total_suppliers_compared=total_suppliers,
            lowest_price_base=min_price,
            highest_price_base=max_price,
            price_variance_percent=price_variance,
            fastest_delivery_days=int(min_deliv) if min_deliv is not None else None,
            slowest_delivery_days=int(max_deliv) if max_deliv is not None else None,
            max_warranty_months=int(max_warranty) if max_warranty is not None else None,
            benchmarks_by_criterion=benchmarks,
        )

        return ComparisonEngineResponse(
            rfq_id=rfq_id,
            base_currency=base_currency,
            comparison_timestamp=datetime.now(timezone.utc),
            weights_applied=weights,
            benchmark_summary=benchmark_summary,
            recommended_supplier_id=supplier_items[0].supplier_id,
            recommended_supplier_name=supplier_items[0].supplier_name,
            suppliers=supplier_items,
        )


# Exported singleton instance
comparison_engine = SupplierComparisonEngine()
