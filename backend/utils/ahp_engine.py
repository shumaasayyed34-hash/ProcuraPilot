from typing import Any

SAATY_RI = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12,
            6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}

# Criteria where LOWER value is better
_LOWER_IS_BETTER = {"price", "delivery_time"}


def normalize_matrix(matrix: list[list[float]]) -> list[list[float]]:
    n = len(matrix)
    col_sums = [sum(matrix[r][c] for r in range(n)) for c in range(n)]
    return [
        [matrix[r][c] / col_sums[c] for c in range(n)]
        for r in range(n)
    ]


def calculate_weights(normalized_matrix: list[list[float]]) -> list[float]:
    n = len(normalized_matrix)
    raw = [sum(normalized_matrix[r][c] for c in range(n)) / n for r in range(n)]
    total = sum(raw)
    return [w / total for w in raw]


def calculate_consistency_ratio(
    matrix: list[list[float]], weights: list[float]
) -> dict[str, Any]:
    n = len(matrix)
    # weighted sum vector: Aw
    aw = [sum(matrix[i][j] * weights[j] for j in range(n)) for i in range(n)]
    lambdas = [aw[i] / weights[i] for i in range(n) if weights[i] > 0]
    lambda_max = sum(lambdas) / len(lambdas)
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0.0
    ri = SAATY_RI.get(n, 1.45)
    cr = (ci / ri) if ri > 0 else 0.0
    is_consistent = cr < 0.10
    return {
        "lambda_max": round(lambda_max, 4),
        "CI": round(ci, 4),
        "CR": round(cr, 4),
        "is_consistent": is_consistent,
        "message": (
            "Matrix is consistent (CR < 0.10)"
            if is_consistent
            else f"Matrix is inconsistent (CR = {round(cr, 4)} ≥ 0.10). Please revise comparisons."
        ),
    }


def normalize_supplier_scores(
    suppliers_data: list[dict], criteria: list[str]
) -> dict[int, dict[str, float]]:
    result: dict[int, dict[str, float]] = {s["supplier_id"]: {} for s in suppliers_data}

    for criterion in criteria:
        values = [s.get(criterion) for s in suppliers_data if s.get(criterion) is not None]
        if not values:
            for s in suppliers_data:
                result[s["supplier_id"]][criterion] = 0.5
            continue

        mn, mx = min(values), max(values)
        for s in suppliers_data:
            val = s.get(criterion)
            if val is None:
                result[s["supplier_id"]][criterion] = 0.0
                continue
            if mx == mn:
                result[s["supplier_id"]][criterion] = 0.5
            elif criterion in _LOWER_IS_BETTER:
                result[s["supplier_id"]][criterion] = (mx - val) / (mx - mn)
            else:
                result[s["supplier_id"]][criterion] = (val - mn) / (mx - mn)

    return result


def calculate_ahp_scores(
    suppliers_data: list[dict], criteria_weights: dict[str, float]
) -> list[dict]:
    criteria = list(criteria_weights.keys())
    normalized = normalize_supplier_scores(suppliers_data, criteria)

    results = []
    sup_lookup = {s["supplier_id"]: s for s in suppliers_data}

    for supplier_id, scores in normalized.items():
        ahp_score = sum(scores.get(c, 0.0) * criteria_weights.get(c, 0.0) for c in criteria)
        results.append({
            "supplier_id": supplier_id,
            "supplier_name": sup_lookup[supplier_id].get("supplier_name", ""),
            "ahp_score": round(ahp_score, 4),
            "price_score": round(scores.get("price", 0.0), 4),
            "quality_score": round(scores.get("quality", 0.0), 4),
            "delivery_score": round(scores.get("delivery_time", 0.0), 4),
            "esg_score": round(scores.get("esg", 0.0), 4),
        })

    results.sort(key=lambda x: x["ahp_score"], reverse=True)
    for rank, item in enumerate(results, start=1):
        item["rank"] = rank

    return results


def build_suppliers_data(quotations: list, suppliers: list) -> list[dict]:
    supplier_map = {s.id: s for s in suppliers}
    data = []
    for q in quotations:
        sup = supplier_map.get(q.supplier_id)
        if sup is None:
            continue
        iso = getattr(sup, "iso_certified", False) or False
        msme = getattr(sup, "msme_number", None)
        warranty = q.warranty_months or 0
        quality = warranty * 10 + (50 if iso else 0)
        esg = (50 if iso else 0) + (25 if msme else 0)
        data.append({
            "supplier_id": sup.id,
            "supplier_name": sup.name,
            "price": q.unit_price or 0.0,
            "delivery_time": q.delivery_time_days or 0,
            "quality": quality,
            "esg": esg,
        })
    return data
