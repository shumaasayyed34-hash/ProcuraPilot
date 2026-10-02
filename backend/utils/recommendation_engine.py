from typing import Any, Dict, List, Optional


def calculate_recommendation_score(
    ahp_score: float,
    risk_score: float,
    market_deviation: float,
) -> float:
    risk_penalty = risk_score / 100

    if market_deviation > 30:
        market_effect = -0.20
    elif market_deviation > 15:
        market_effect = -0.15
    elif market_deviation > 5:
        market_effect = -0.08
    elif market_deviation < -5:
        market_effect = 0.05
    else:
        market_effect = 0.0

    score = (ahp_score * 0.60) - (risk_penalty * 0.30) + (market_effect * 0.10)
    return round(max(0.0, min(1.0, score)), 4)


def rank_suppliers(suppliers_data: List[Dict]) -> List[Dict]:
    eligible = []
    excluded = []

    for s in suppliers_data:
        if s.get("risk_category") == "critical":
            excluded.append({
                **s,
                "recommendation_score": 0.0,
                "rank": None,
                "excluded": True,
                "exclusion_reason": "Critical risk profile",
            })
        else:
            score = calculate_recommendation_score(
                ahp_score=s.get("ahp_score", 0),
                risk_score=s.get("risk_score", 50),
                market_deviation=s.get("market_deviation", 0),
            )
            eligible.append({**s, "recommendation_score": score, "excluded": False, "exclusion_reason": None})

    eligible.sort(key=lambda x: x["recommendation_score"], reverse=True)
    for i, s in enumerate(eligible, 1):
        s["rank"] = i

    return eligible + excluded


def generate_recommendation_rationale(
    winner: Dict,
    all_suppliers: List[Dict],
    market_data: Dict,
) -> Dict:
    name = winner.get("supplier_name", "Unknown")
    score = winner.get("recommendation_score", 0)
    risk_score = winner.get("risk_score", 0)
    risk_cat = winner.get("risk_category", "unknown").upper()
    ahp_score = winner.get("ahp_score", 0)
    deviation = winner.get("market_deviation", 0)
    quoted_price = winner.get("quoted_price", 0)
    n = len([s for s in all_suppliers if not s.get("excluded")])

    # Second best for competitive advantage
    ranked = [s for s in all_suppliers if not s.get("excluded") and s.get("rank")]
    second = ranked[1] if len(ranked) > 1 else None
    outperform_pct = 0.0
    if second and second.get("recommendation_score", 0) > 0:
        outperform_pct = round(
            ((score - second["recommendation_score"]) / second["recommendation_score"]) * 100, 1
        )

    if deviation < 0:
        pricing_txt = (
            f"{name} quoted ₹{quoted_price:,.0f} which is {abs(deviation):.1f}% below market rate, "
            f"making it the most competitively priced option among {n} suppliers."
        )
    elif deviation > 15:
        pricing_txt = (
            f"{name} quoted ₹{quoted_price:,.0f} which is {deviation:.1f}% above market rate. "
            f"Negotiation is recommended to bring pricing closer to market benchmarks."
        )
    else:
        pricing_txt = (
            f"{name} quoted ₹{quoted_price:,.0f} which is {deviation:.1f}% above market rate, "
            f"within an acceptable range compared to {n} competing suppliers."
        )

    watch_points = []
    if risk_score > 40:
        watch_points.append("Monitor delivery performance closely")
    if winner.get("risk_category") in ("medium", "high"):
        watch_points.append("Request updated compliance certificates before PO issuance")
    if deviation > 15:
        watch_points.append("Negotiate pricing to align with market benchmarks")
    if not watch_points:
        watch_points.append("Confirm delivery timeline and payment terms before issuing PO")

    return {
        "summary": (
            f"{name} is recommended as the optimal vendor with a recommendation score of {score:.3f}."
        ),
        "pricing_analysis": pricing_txt,
        "risk_assessment": (
            f"{name} carries a {risk_cat} risk profile (score: {risk_score:.0f}/100) "
            f"with strong compliance certificates and consistent delivery history."
        ),
        "competitive_advantage": (
            f"{name} ranked 1st in AHP scoring with utility score of {ahp_score:.3f}, "
            f"outperforming the next best supplier by {outperform_pct:.1f}%."
        ),
        "recommendation": (
            f"Proceed with {name}. Initiate negotiation to confirm delivery timeline and "
            "payment terms before issuing PO."
        ),
        "watch_points": watch_points,
    }


def calculate_savings_estimate(recommended: Dict, all_suppliers: List[Dict]) -> Dict:
    rec_price = recommended.get("quoted_price", 0)
    rec_name = recommended.get("supplier_name", "")

    others = [
        s for s in all_suppliers
        if s.get("supplier_name") != rec_name and s.get("quoted_price") is not None
    ]
    if not others:
        return {}

    prices = [s["quoted_price"] for s in others if s.get("quoted_price")]
    if not prices:
        return {}

    prices_sorted = sorted(prices)
    second_best_price = prices_sorted[0]  # cheapest among others
    most_expensive_price = max(prices)
    avg_price = round(sum(prices) / len(prices), 2)

    second_supplier = next((s["supplier_name"] for s in others if s["quoted_price"] == second_best_price), "")
    expensive_supplier = next((s["supplier_name"] for s in others if s["quoted_price"] == most_expensive_price), "")

    def pct(base, comp):
        if base == 0:
            return 0.0
        return round(((base - comp) / base) * 100, 1)

    return {
        "vs_second_best": {
            "supplier_name": second_supplier,
            "price_difference": round(second_best_price - rec_price, 2),
            "percentage_saving": pct(second_best_price, rec_price),
        },
        "vs_most_expensive": {
            "supplier_name": expensive_supplier,
            "price_difference": round(most_expensive_price - rec_price, 2),
            "percentage_saving": pct(most_expensive_price, rec_price),
        },
        "vs_market_average": {
            "average_quoted_price": avg_price,
            "saving_vs_average": round(avg_price - rec_price, 2),
            "percentage_saving": pct(avg_price, rec_price),
        },
    }
