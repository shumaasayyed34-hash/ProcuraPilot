"""
Unit and Integration Tests for Phase 3: AHP Supplier Scoring Engine & Consistency Validation.
Assigned Tasks:
  - P3.1: Test AHP engine with sample procurement data across 5+ diverse configurations
  - P3.2: Validate Consistency Ratio (CR) calculations to ensure mathematical rigor (CR < 0.10)

Dependencies:
  - pytest
  - numpy
  - scipy (for exact principal eigenvector/eigenvalue cross-validation)
"""

import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pytest
from scipy.linalg import eig

# Ensure backend root is on sys.path for direct module imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.ahp_engine import (
    SAATY_RI,
    calculate_ahp_scores,
    calculate_consistency_ratio,
    calculate_weights,
    normalize_matrix,
    normalize_supplier_scores,
)


# ==============================================================================
# SECTION 1: MATHEMATICAL RIGOR & CONSISTENCY RATIO (CR) VALIDATION (P3.2)
# ==============================================================================

class TestAHPConsistencyMath:
    """
    Mathematical verification of AHP axioms, Random Index (RI),
    Consistency Index (CI), and Consistency Ratio (CR) calculations (P3.2).
    """

    def test_saaty_random_index_table_integrity(self):
        """
        Validates the Random Index (RI) table against Saaty's published standards (1980).
        RI represents the average CI obtained from randomly generated reciprocal matrices.
        """
        expected_saaty_ri = {
            1: 0.00,
            2: 0.00,
            3: 0.58,
            4: 0.90,
            5: 1.12,
            6: 1.24,
            7: 1.32,
            8: 1.41,
            9: 1.45,
        }
        for n, expected_ri in expected_saaty_ri.items():
            assert SAATY_RI[n] == pytest.approx(expected_ri, abs=1e-4), (
                f"Saaty RI for n={n} must equal {expected_ri}"
            )

        # Dimension lookup fallback for n > 9 should default gracefully to 1.45
        assert SAATY_RI.get(10, 1.45) == 1.45

    def test_perfect_consistency_3x3_transitive_matrix(self):
        """
        Tests a perfectly consistent 3x3 matrix where transitivity holds exactly:
        a_ik = a_ij * a_jk for all i, j, k.
        Mathematical theorem guarantees:
          lambda_max == n == 3.0
          CI == 0.0
          CR == 0.0
        """
        # Criteria: [Price, Quality, Delivery]
        # Quality is 2x Price; Delivery is 6x Price; Delivery is 3x Quality
        # a_12 = 2, a_23 = 3 => a_13 = 2 * 3 = 6
        matrix = [
            [1.0, 2.0, 6.0],
            [1.0 / 2.0, 1.0, 3.0],
            [1.0 / 6.0, 1.0 / 3.0, 1.0],
        ]
        n = len(matrix)

        # Step 1: Normalize Matrix by Column Sums
        norm = normalize_matrix(matrix)
        for c in range(n):
            col_sum = sum(norm[r][c] for r in range(n))
            assert col_sum == pytest.approx(1.0, abs=1e-6), "Normalized column sum must equal 1.0"

        # Step 2: Compute Priority Weights w
        weights = calculate_weights(norm)
        assert sum(weights) == pytest.approx(1.0, abs=1e-6), "Priority weights must sum to 1.0"
        assert all(w > 0 for w in weights), "Weights must be strictly positive"

        # Step 3: Weighted Sum Vector Aw
        aw = [sum(matrix[i][j] * weights[j] for j in range(n)) for i in range(n)]

        # Step 4: Step-by-Step Eigenvalue Estimates lambda_i = (Aw)_i / w_i
        lambdas = [aw[i] / weights[i] for i in range(n)]
        for i, lam in enumerate(lambdas):
            assert lam == pytest.approx(3.0, abs=1e-4), (
                f"In a perfectly consistent matrix, each lambda_{i} must equal n=3.0, got {lam}"
            )

        # Step 5: Consistency Ratio (CR)
        cr_result = calculate_consistency_ratio(matrix, weights)
        assert cr_result["lambda_max"] == pytest.approx(3.0, abs=1e-4)
        assert cr_result["CI"] == pytest.approx(0.0, abs=1e-4)
        assert cr_result["CR"] == pytest.approx(0.0, abs=1e-4)
        assert cr_result["is_consistent"] is True
        assert "Matrix is consistent" in cr_result["message"]

    def test_perfect_consistency_4x4_matrix(self):
        """
        Validates analytical consistency for a 4x4 matrix derived from exact ratios:
        w_true = [0.4, 0.3, 0.2, 0.1]
        a_ij = w_true[i] / w_true[j]
        """
        w_true = [0.4, 0.3, 0.2, 0.1]
        n = len(w_true)
        matrix = [[w_true[i] / w_true[j] for j in range(n)] for i in range(n)]

        norm = normalize_matrix(matrix)
        weights = calculate_weights(norm)

        for computed_w, expected_w in zip(weights, w_true):
            assert computed_w == pytest.approx(expected_w, abs=1e-4)

        cr_result = calculate_consistency_ratio(matrix, weights)
        assert cr_result["lambda_max"] == pytest.approx(4.0, abs=1e-4)
        assert cr_result["CI"] == pytest.approx(0.0, abs=1e-4)
        assert cr_result["CR"] == pytest.approx(0.0, abs=1e-4)
        assert cr_result["is_consistent"] is True

    def test_perron_frobenius_eigenvalue_lower_bound(self):
        """
        Perron-Frobenius Theorem: For any positive reciprocal matrix A,
        the principal eigenvalue lambda_max >= n, with equality holding if and only
        if A is perfectly consistent.
        """
        # Realistic judgment matrix with mild perturbation
        matrix = [
            [1.0, 3.0, 2.0, 4.0],
            [1.0 / 3.0, 1.0, 1.0 / 2.0, 2.0],
            [1.0 / 2.0, 2.0, 1.0, 3.0],
            [1.0 / 4.0, 1.0 / 2.0, 1.0 / 3.0, 1.0],
        ]
        n = len(matrix)
        norm = normalize_matrix(matrix)
        weights = calculate_weights(norm)
        cr_result = calculate_consistency_ratio(matrix, weights)

        # Mathematical assertion: lambda_max >= n
        assert cr_result["lambda_max"] >= n - 1e-6, (
            f"lambda_max ({cr_result['lambda_max']}) must be >= dimension n ({n})"
        )
        # Non-negative CI assertion
        assert cr_result["CI"] >= -1e-6, f"Consistency Index must be non-negative, got {cr_result['CI']}"

    def test_near_consistent_matrix_acceptance_threshold(self):
        """
        Tests a realistic 4x4 matrix with slight judgment inconsistency where CR < 0.10.
        Verifies step-by-step formula execution:
          CI = (lambda_max - n) / (n - 1)
          CR = CI / RI(4) where RI(4) = 0.90
        """
        # Saaty 4x4 Procurement comparison matrix
        # Price (1), Quality (2), Delivery (3), ESG (4)
        matrix = [
            [1.0,       2.0,       3.0,       5.0],
            [1.0 / 2.0, 1.0,       2.0,       4.0],
            [1.0 / 3.0, 1.0 / 2.0, 1.0,       3.0],
            [1.0 / 5.0, 1.0 / 4.0, 1.0 / 3.0, 1.0],
        ]
        n = 4
        ri = SAATY_RI[n]  # 0.90

        norm = normalize_matrix(matrix)
        weights = calculate_weights(norm)

        # Step-by-step calculation
        aw = [sum(matrix[i][j] * weights[j] for j in range(n)) for i in range(n)]
        lambdas = [aw[i] / weights[i] for i in range(n)]
        manual_lambda_max = sum(lambdas) / n
        manual_ci = (manual_lambda_max - n) / (n - 1)
        manual_cr = manual_ci / ri

        cr_result = calculate_consistency_ratio(matrix, weights)

        assert cr_result["lambda_max"] == pytest.approx(manual_lambda_max, abs=1e-4)
        assert cr_result["CI"] == pytest.approx(manual_ci, abs=1e-4)
        assert cr_result["CR"] == pytest.approx(manual_cr, abs=1e-4)
        assert cr_result["CR"] < 0.10, f"CR should be strictly < 0.10, got {cr_result['CR']}"
        assert cr_result["is_consistent"] is True

    def test_inconsistent_matrix_rejection(self):
        """
        Validates that heavily contradictory judgments (CR >= 0.10) are detected and flagged.
        Scenario: Circular logic
          A is strongly preferred to B (5.0)
          B is strongly preferred to C (5.0)
          C is strongly preferred to A (5.0)  <-- Extreme contradiction
        """
        inconsistent_matrix = [
            [1.0,       5.0,       1.0 / 5.0],
            [1.0 / 5.0, 1.0,       5.0],
            [5.0,       1.0 / 5.0, 1.0],
        ]
        norm = normalize_matrix(inconsistent_matrix)
        weights = calculate_weights(norm)
        cr_result = calculate_consistency_ratio(inconsistent_matrix, weights)

        # Mathematical assertion: Inconsistent matrix must yield CR >= 0.10
        assert cr_result["CR"] >= 0.10, f"Expected CR >= 0.10 for circular matrix, got {cr_result['CR']}"
        assert cr_result["is_consistent"] is False
        assert "inconsistent" in cr_result["message"].lower()
        assert f"CR = {cr_result['CR']}" in cr_result["message"]

    def test_scipy_exact_eigenvector_cross_validation(self):
        """
        Cross-validates the engine's row-average approximation against SciPy's
        exact principal right eigenvector calculation.
        Saaty showed that normalized row averages approximate the principal eigenvector
        within 1-2% error margin for consistent matrices (CR < 0.10).
        """
        matrix_data = [
            [1.0,       2.0,       4.0,       6.0],
            [1.0 / 2.0, 1.0,       3.0,       5.0],
            [1.0 / 4.0, 1.0 / 3.0, 1.0,       2.0],
            [1.0 / 6.0, 1.0 / 5.0, 1.0 / 2.0, 1.0],
        ]
        A = np.array(matrix_data, dtype=float)

        # 1. Engine Approximation (Normalized column sums -> row averages)
        norm = normalize_matrix(matrix_data)
        approx_weights = np.array(calculate_weights(norm))

        # 2. SciPy Exact Principal Eigenvector / Eigenvalue
        eigenvalues, eigenvectors = eig(A)
        # Find index of maximum real eigenvalue
        max_idx = np.argmax(eigenvalues.real)
        exact_lambda_max = eigenvalues[max_idx].real
        exact_eigenvector = eigenvectors[:, max_idx].real

        # Normalize principal eigenvector so components are positive and sum to 1
        if exact_eigenvector[0] < 0:
            exact_eigenvector = -exact_eigenvector
        exact_weights = exact_eigenvector / np.sum(exact_eigenvector)

        # Mathematical assertions
        # A) Eigenvalue comparison
        engine_cr = calculate_consistency_ratio(matrix_data, approx_weights.tolist())
        assert engine_cr["lambda_max"] == pytest.approx(exact_lambda_max, abs=0.05), (
            f"Engine lambda_max {engine_cr['lambda_max']} deviates from SciPy {exact_lambda_max}"
        )

        # B) Vector distance: L_inf norm (maximum absolute difference) < 0.015 (1.5%)
        l_inf_diff = np.max(np.abs(approx_weights - exact_weights))
        assert l_inf_diff < 0.015, (
            f"Approximation error ({l_inf_diff:.4f}) exceeds tolerance threshold 0.015"
        )

        # C) Ranking preservation: Order of criteria weights must match exactly
        assert list(np.argsort(-approx_weights)) == list(np.argsort(-exact_weights)), (
            "Approximation must preserve identical criteria priority ranking"
        )

    def test_reciprocal_matrix_algebraic_invariants(self):
        """
        Tests fundamental algebraic axioms of AHP pairwise reciprocal matrices:
          1. a_ii == 1.0 (Reflexivity)
          2. a_ij * a_ji == 1.0 (Reciprocity)
          3. a_ij > 0 (Positivity)
        """
        matrix = [
            [1.0, 3.0, 0.2, 5.0],
            [1.0 / 3.0, 1.0, 0.25, 2.0],
            [5.0, 4.0, 1.0, 7.0],
            [0.2, 0.5, 1.0 / 7.0, 1.0],
        ]
        n = len(matrix)
        for i in range(n):
            assert matrix[i][i] == 1.0, f"Diagonal entry a_{i}{i} must be 1.0"
            for j in range(n):
                assert matrix[i][j] > 0, f"Entry a_{i}{j} must be strictly positive"
                product = matrix[i][j] * matrix[j][i]
                assert product == pytest.approx(1.0, abs=1e-5), (
                    f"Reciprocal axiom violated: a_{i}{j} * a_{j}{i} = {product} != 1.0"
                )

    def test_dimension_boundary_conditions(self):
        """
        Validates edge cases for small dimensions:
          - n = 1: Single criterion (trivial, CI=0, CR=0)
          - n = 2: Two criteria (always mathematically consistent, CR=0)
          - n = 5: 5x5 procurement matrix (RI=1.12)
        """
        # n = 1
        m1 = [[1.0]]
        w1 = calculate_weights(normalize_matrix(m1))
        cr1 = calculate_consistency_ratio(m1, w1)
        assert cr1["CR"] == 0.0
        assert cr1["is_consistent"] is True

        # n = 2: Any 2x2 reciprocal matrix is strictly consistent
        m2 = [[1.0, 4.0], [0.25, 1.0]]
        w2 = calculate_weights(normalize_matrix(m2))
        cr2 = calculate_consistency_ratio(m2, w2)
        assert cr2["CR"] == 0.0
        assert cr2["is_consistent"] is True

        # n = 5
        m5 = [
            [1.0, 2.0, 3.0, 4.0, 5.0],
            [1/2, 1.0, 2.0, 3.0, 4.0],
            [1/3, 1/2, 1.0, 2.0, 3.0],
            [1/4, 1/3, 1/2, 1.0, 2.0],
            [1/5, 1/4, 1/3, 1/2, 1.0],
        ]
        w5 = calculate_weights(normalize_matrix(m5))
        cr5 = calculate_consistency_ratio(m5, w5)
        assert cr5["CR"] < 0.10
        assert cr5["is_consistent"] is True


# ==============================================================================
# SECTION 2: END-TO-END PROCUREMENT SCENARIO VALIDATIONS (P3.1)
# ==============================================================================

class TestAHPProcurementScenarios:
    """
    Validates AHP multi-criteria scoring engine across 5+ diverse, realistic
    procurement configurations, ensuring mathematical convergence and business logic (P3.1).
    """

    @pytest.fixture
    def four_suppliers_data(self) -> List[Dict[str, Any]]:
        """
        Diverse supplier dataset representing typical enterprise procurement quotes.
        """
        return [
            {
                "supplier_id": 101,
                "supplier_name": "Apex Budget Supplies",
                "price": 12000.0,       # Lowest price (Best cost)
                "delivery_time": 25,    # Slower delivery
                "quality": 50.0,        # Basic warranty (non-ISO)
                "esg": 25.0,            # Basic MSME only
            },
            {
                "supplier_id": 102,
                "supplier_name": "Vanguard Precision Engineering",
                "price": 28000.0,       # Premium price
                "delivery_time": 8,     # Very fast
                "quality": 95.0,        # 36-mo warranty + ISO certified
                "esg": 75.0,            # ISO + MSME certified
            },
            {
                "supplier_id": 103,
                "supplier_name": "SwiftLogistics Express",
                "price": 19000.0,       # Moderate price
                "delivery_time": 3,     # Fastest delivery
                "quality": 65.0,        # Moderate warranty + ISO
                "esg": 50.0,            # ISO certified
            },
            {
                "supplier_id": 104,
                "supplier_name": "EcoGreen Solutions Pvt Ltd",
                "price": 21000.0,       # Moderate price
                "delivery_time": 18,    # Standard delivery
                "quality": 80.0,        # 24-mo warranty + ISO
                "esg": 90.0,            # Top ESG, carbon neutral, MSME + ISO
            },
        ]

    def test_scenario_1_cost_dominant_procurement(self, four_suppliers_data):
        """
        Scenario 1: Commodity / High-Volume Procurement (Cost-Focused)
        Procurement context: Standardized components where cost is paramount.
        Pairwise Matrix: Price >> Quality > Delivery > ESG
        Criteria Weights: ~60% Price, ~20% Quality, ~15% Delivery, ~5% ESG
        """
        pairwise_matrix = [
            # Price,     Quality,   Delivery,  ESG
            [1.0,       5.0,       5.0,       9.0],       # Price (Strongly dominant)
            [1.0 / 5.0, 1.0,       1.0,       3.0],       # Quality
            [1.0 / 5.0, 1.0,       1.0,       3.0],       # Delivery
            [1.0 / 9.0, 1.0 / 3.0, 1.0 / 3.0, 1.0],       # ESG
        ]
        norm = normalize_matrix(pairwise_matrix)
        weights_list = calculate_weights(norm)
        cr = calculate_consistency_ratio(pairwise_matrix, weights_list)

        # Rigor assertions
        assert cr["CR"] < 0.10, f"Scenario 1 matrix must be consistent, CR={cr['CR']}"
        assert cr["is_consistent"] is True

        criteria = ["price", "quality", "delivery_time", "esg"]
        weights_dict = {c: w for c, w in zip(criteria, weights_list)}

        # Price weight should be dominant (> 50%)
        assert weights_dict["price"] > 0.50

        # Execute Scoring
        rankings = calculate_ahp_scores(four_suppliers_data, weights_dict)

        # Assertions
        assert len(rankings) == 4
        # Winner must be the lowest-cost supplier
        winner = rankings[0]
        assert winner["supplier_id"] == 101
        assert winner["supplier_name"] == "Apex Budget Supplies"
        assert winner["rank"] == 1
        # Price score for lowest-cost supplier must be 1.0 (min-max inverted)
        assert winner["price_score"] == pytest.approx(1.0, abs=1e-4)
        # Ranks must be contiguous [1, 2, 3, 4]
        assert [r["rank"] for r in rankings] == [1, 2, 3, 4]
        # Scores strictly monotonically decreasing
        scores = [r["ahp_score"] for r in rankings]
        assert scores == sorted(scores, reverse=True)

    def test_scenario_2_quality_critical_procurement(self, four_suppliers_data):
        """
        Scenario 2: Quality-Critical Procurement (Aerospace / Medical / Mission Critical)
        Procurement context: Zero tolerance for failure; quality & warranties dominate.
        Pairwise Matrix: Quality >> Price > Delivery > ESG
        Criteria Weights: ~55% Quality, ~20% Price, ~15% Delivery, ~10% ESG
        """
        pairwise_matrix = [
            # Price,     Quality, Delivery, ESG
            [1.0,       1.0 / 3, 2.0,      2.0],       # Price
            [3.0,       1.0,     4.0,      5.0],       # Quality (Dominant)
            [1.0 / 2.0, 1.0 / 4, 1.0,      2.0],       # Delivery
            [1.0 / 2.0, 1.0 / 5, 1.0 / 2,  1.0],       # ESG
        ]
        norm = normalize_matrix(pairwise_matrix)
        weights_list = calculate_weights(norm)
        cr = calculate_consistency_ratio(pairwise_matrix, weights_list)

        assert cr["CR"] < 0.10, f"Scenario 2 matrix must be consistent, CR={cr['CR']}"
        criteria = ["price", "quality", "delivery_time", "esg"]
        weights_dict = {c: w for c, w in zip(criteria, weights_list)}

        assert weights_dict["quality"] > 0.50

        rankings = calculate_ahp_scores(four_suppliers_data, weights_dict)

        # Winner must be Vanguard (highest quality score 95.0) despite highest price
        winner = rankings[0]
        assert winner["supplier_id"] == 102
        assert winner["supplier_name"] == "Vanguard Precision Engineering"
        assert winner["quality_score"] == pytest.approx(1.0, abs=1e-4)

        # Budget supplier (lowest quality) must be penalized and finish near bottom
        budget_rank = next(r["rank"] for r in rankings if r["supplier_id"] == 101)
        assert budget_rank >= 3

    def test_scenario_3_urgent_expedited_procurement(self, four_suppliers_data):
        """
        Scenario 3: Urgent / Just-In-Time Procurement (Plant Shutdown Emergency)
        Procurement context: Assembly line is stopped; every day of delay causes huge losses.
        Pairwise Matrix: Delivery Time >> Quality > Price > ESG
        Criteria Weights: ~55% Delivery Time, ~20% Quality, ~15% Price, ~10% ESG
        """
        pairwise_matrix = [
            # Price,     Quality, Delivery,  ESG
            [1.0,       1.0 / 2, 1.0 / 4,   2.0],       # Price
            [2.0,       1.0,     1.0 / 3,   3.0],       # Quality
            [4.0,       3.0,     1.0,       5.0],       # Delivery (Dominant)
            [1.0 / 2.0, 1.0 / 3, 1.0 / 5,   1.0],       # ESG
        ]
        norm = normalize_matrix(pairwise_matrix)
        weights_list = calculate_weights(norm)
        cr = calculate_consistency_ratio(pairwise_matrix, weights_list)

        assert cr["CR"] < 0.10, f"Scenario 3 matrix must be consistent, CR={cr['CR']}"
        criteria = ["price", "quality", "delivery_time", "esg"]
        weights_dict = {c: w for c, w in zip(criteria, weights_list)}

        assert weights_dict["delivery_time"] > 0.50

        rankings = calculate_ahp_scores(four_suppliers_data, weights_dict)

        # Winner must be SwiftLogistics (3-day delivery)
        winner = rankings[0]
        assert winner["supplier_id"] == 103
        assert winner["supplier_name"] == "SwiftLogistics Express"
        assert winner["delivery_score"] == pytest.approx(1.0, abs=1e-4)

        # Apex Budget (25 days delivery) must have delivery_score == 0.0
        budget = next(r for r in rankings if r["supplier_id"] == 101)
        assert budget["delivery_score"] == pytest.approx(0.0, abs=1e-4)

    def test_scenario_4_sustainability_esg_focused_procurement(self, four_suppliers_data):
        """
        Scenario 4: Sustainable & MSME Compliant Procurement (Public Sector / Green Mandate)
        Procurement context: Government tender with statutory green procurement quotas.
        Pairwise Matrix: ESG >> Quality > Price = Delivery
        Criteria Weights: ~40% ESG, ~30% Quality, ~15% Price, ~15% Delivery
        """
        pairwise_matrix = [
            # Price, Quality, Delivery, ESG
            [1.0,    1.0 / 2, 1.0,      1.0 / 3],       # Price
            [2.0,    1.0,     2.0,      1.0 / 2],       # Quality
            [1.0,    1.0 / 2, 1.0,      1.0 / 3],       # Delivery
            [3.0,    2.0,     3.0,      1.0],           # ESG (Dominant)
        ]
        norm = normalize_matrix(pairwise_matrix)
        weights_list = calculate_weights(norm)
        cr = calculate_consistency_ratio(pairwise_matrix, weights_list)

        assert cr["CR"] < 0.10, f"Scenario 4 matrix must be consistent, CR={cr['CR']}"
        criteria = ["price", "quality", "delivery_time", "esg"]
        weights_dict = {c: w for c, w in zip(criteria, weights_list)}

        assert weights_dict["esg"] >= 0.35

        rankings = calculate_ahp_scores(four_suppliers_data, weights_dict)

        # EcoGreen Solutions (ESG = 90) must be Rank 1
        winner = rankings[0]
        assert winner["supplier_id"] == 104
        assert winner["supplier_name"] == "EcoGreen Solutions Pvt Ltd"
        assert winner["esg_score"] == pytest.approx(1.0, abs=1e-4)

    def test_scenario_5_balanced_multi_criteria_procurement(self, four_suppliers_data):
        """
        Scenario 5: Balanced Multi-Criteria Evaluation (Standard Commercial RFQ)
        Procurement context: Well-balanced RFP trade-off between price, quality, delivery, ESG.
        Weights: Price 35%, Quality 30%, Delivery 25%, ESG 10%
        """
        pairwise_matrix = [
            # Price, Quality, Delivery, ESG
            [1.0,    1.2,     1.4,      3.5],       # Price
            [1/1.2,  1.0,     1.2,      3.0],       # Quality
            [1/1.4,  1/1.2,   1.0,      2.5],       # Delivery
            [1/3.5,  1/3.0,   1/2.5,    1.0],       # ESG
        ]
        norm = normalize_matrix(pairwise_matrix)
        weights_list = calculate_weights(norm)
        cr = calculate_consistency_ratio(pairwise_matrix, weights_list)

        assert cr["CR"] < 0.10, f"Scenario 5 matrix must be consistent, CR={cr['CR']}"
        criteria = ["price", "quality", "delivery_time", "esg"]
        weights_dict = {c: w for c, w in zip(criteria, weights_list)}

        rankings = calculate_ahp_scores(four_suppliers_data, weights_dict)

        # Verify all sub-scores are strictly bounded in [0.0, 1.0]
        for item in rankings:
            for score_key in ["price_score", "quality_score", "delivery_score", "esg_score", "ahp_score"]:
                assert 0.0 <= item[score_key] <= 1.0, (
                    f"Score {score_key}={item[score_key]} out of valid [0, 1] range"
                )

        # Verify linear additive aggregation math for top supplier:
        top = rankings[0]
        expected_top_ahp = (
            top["price_score"] * weights_dict["price"] +
            top["quality_score"] * weights_dict["quality"] +
            top["delivery_score"] * weights_dict["delivery_time"] +
            top["esg_score"] * weights_dict["esg"]
        )
        assert top["ahp_score"] == pytest.approx(round(expected_top_ahp, 4), abs=1e-4)

    def test_scenario_6_degenerate_and_edge_case_robustness(self):
        """
        Scenario 6: Robustness testing under boundary and degenerate conditions:
          - Identical supplier metrics (tied: max == min => 0.5)
          - Missing criteria values (None => 0.0)
          - Single supplier evaluation
          - Strict Pareto dominance check
        """
        # Case A: Identical values for all suppliers
        tied_suppliers = [
            {"supplier_id": 1, "supplier_name": "Tied A", "price": 100.0, "quality": 80.0},
            {"supplier_id": 2, "supplier_name": "Tied B", "price": 100.0, "quality": 80.0},
        ]
        weights = {"price": 0.5, "quality": 0.5}
        norm_scores = normalize_supplier_scores(tied_suppliers, ["price", "quality"])
        # Both must receive 0.5 neutral score
        assert norm_scores[1]["price"] == 0.5
        assert norm_scores[2]["price"] == 0.5
        rankings = calculate_ahp_scores(tied_suppliers, weights)
        assert rankings[0]["ahp_score"] == rankings[1]["ahp_score"] == 0.5

        # Case B: Missing / None value handling
        partial_suppliers = [
            {"supplier_id": 1, "supplier_name": "Has ESG", "esg": 80.0},
            {"supplier_id": 2, "supplier_name": "Missing ESG", "esg": None},
        ]
        norm_partial = normalize_supplier_scores(partial_suppliers, ["esg"])
        assert norm_partial[1]["esg"] == 0.5 or norm_partial[1]["esg"] == 1.0
        assert norm_partial[2]["esg"] == 0.0  # None must map safely to 0.0

        # Case C: Pareto Dominance (Supplier A strictly beats Supplier B across all criteria)
        pareto_suppliers = [
            {"supplier_id": 1, "supplier_name": "Dominant A", "price": 10.0, "quality": 100.0, "delivery_time": 1, "esg": 100.0},
            {"supplier_id": 2, "supplier_name": "Inferior B", "price": 50.0, "quality": 20.0, "delivery_time": 10, "esg": 10.0},
        ]
        pareto_rankings = calculate_ahp_scores(pareto_suppliers, {"price": 0.25, "quality": 0.25, "delivery_time": 0.25, "esg": 0.25})
        assert pareto_rankings[0]["supplier_id"] == 1
        assert pareto_rankings[0]["ahp_score"] == 1.0
        assert pareto_rankings[1]["ahp_score"] == 0.0

    def test_quotation_and_supplier_object_mapping_pipeline(self):
        """
        Validates build_suppliers_data pipeline bridging database ORM entities
        (Quotation, Supplier) to AHP calculation inputs.
        Quality calculation: warranty * 10 + (50 if iso else 0)
        ESG calculation: (50 if iso else 0) + (25 if msme else 0)
        """
        from utils.ahp_engine import build_suppliers_data

        class MockSupplier:
            def __init__(self, id, name, iso_certified, msme_number):
                self.id = id
                self.name = name
                self.iso_certified = iso_certified
                self.msme_number = msme_number

        class MockQuotation:
            def __init__(self, supplier_id, unit_price, delivery_time_days, warranty_months):
                self.supplier_id = supplier_id
                self.unit_price = unit_price
                self.delivery_time_days = delivery_time_days
                self.warranty_months = warranty_months

        suppliers = [
            MockSupplier(id=1, name="MSME Supplier", iso_certified=True, msme_number="UDYAM-MH-01-0012345"),
            MockSupplier(id=2, name="Basic Supplier", iso_certified=False, msme_number=None),
        ]
        quotations = [
            MockQuotation(supplier_id=1, unit_price=150.0, delivery_time_days=5, warranty_months=24),
            MockQuotation(supplier_id=2, unit_price=110.0, delivery_time_days=12, warranty_months=6),
        ]

        data = build_suppliers_data(quotations, suppliers)
        assert len(data) == 2

        sup1 = next(s for s in data if s["supplier_id"] == 1)
        # Quality: 24 * 10 + 50 = 290
        assert sup1["quality"] == 290
        # ESG: 50 (ISO) + 25 (MSME) = 75
        assert sup1["esg"] == 75
        assert sup1["price"] == 150.0
        assert sup1["delivery_time"] == 5

        sup2 = next(s for s in data if s["supplier_id"] == 2)
        # Quality: 6 * 10 + 0 = 60
        assert sup2["quality"] == 60
        # ESG: 0 + 0 = 0
        assert sup2["esg"] == 0

    def test_scale_invariance_under_unit_transformations(self, four_suppliers_data):
        """
        AHP utility score normalization must be scale-invariant under positive linear scaling.
        E.g. Converting Price from USD to INR, or Delivery from Days to Hours
        must result in identical normalized scores.
        """
        data_inr = []
        fx_rate = 83.5
        for s in four_suppliers_data:
            copy_s = dict(s)
            copy_s["price"] = s["price"] * fx_rate
            copy_s["delivery_time"] = s["delivery_time"] * 24  # Days to hours
            data_inr.append(copy_s)

        criteria = ["price", "quality", "delivery_time", "esg"]
        weights = {"price": 0.4, "quality": 0.3, "delivery_time": 0.2, "esg": 0.1}

        res_base = calculate_ahp_scores(four_suppliers_data, weights)
        res_scaled = calculate_ahp_scores(data_inr, weights)

        for b, s in zip(res_base, res_scaled):
            assert b["supplier_id"] == s["supplier_id"]
            assert b["ahp_score"] == pytest.approx(s["ahp_score"], abs=1e-4)
            assert b["price_score"] == pytest.approx(s["price_score"], abs=1e-4)
            assert b["delivery_score"] == pytest.approx(s["delivery_score"], abs=1e-4)
            assert b["rank"] == s["rank"]

    @pytest.mark.parametrize("template_name, weights", [
        ("cost_focused", {"price": 0.60, "quality": 0.20, "delivery_time": 0.15, "esg": 0.05}),
        ("quality_focused", {"price": 0.20, "quality": 0.55, "delivery_time": 0.15, "esg": 0.10}),
        ("balanced", {"price": 0.35, "quality": 0.30, "delivery_time": 0.25, "esg": 0.10}),
        ("sustainability_focused", {"price": 0.25, "quality": 0.25, "delivery_time": 0.20, "esg": 0.30}),
    ])
    def test_preconfigured_router_templates_execution(self, template_name, weights, four_suppliers_data):
        """
        Validates execution of all 4 pre-configured procurement templates from routers/ahp.py:
        Verifies sum(weights) == 1.0, non-empty rankings, and valid monotonic ranks.
        """
        assert sum(weights.values()) == pytest.approx(1.0, abs=1e-4)
        results = calculate_ahp_scores(four_suppliers_data, weights)
        assert len(results) == len(four_suppliers_data)
        assert [r["rank"] for r in results] == [1, 2, 3, 4]
        for r in results:
            assert 0.0 <= r["ahp_score"] <= 1.0

