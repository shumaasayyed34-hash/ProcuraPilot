"""
Unit Tests for Phase 2: Supplier Comparison Engine & Normalization (P2.1 & P2.2)
Compatible with Python standard unittest runner and pytest.
"""

import unittest
import sys
import os

# Add backend directory to sys.path so imports work seamlessly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from schemas.comparison import (
    ComparisonBadge,
    CriteriaWeights,
    CriterionType,
    SupplierQuoteInput,
)
from services.comparison_engine import (
    FXRateService,
    MinMaxNormalizer,
    SupplierComparisonEngine,
)


class TestMinMaxNormalizer(unittest.TestCase):
    """Tests mathematical formulation and edge cases for MinMaxNormalizer (P2.2)."""

    def test_benefit_criterion_normalization(self):
        # Higher is better: Rating [1.0, 3.0, 5.0]
        # Min = 1.0, Max = 5.0
        # Expected scores: 0.0, 50.0, 100.0
        raw_ratings = [1.0, 3.0, 5.0]
        scores = MinMaxNormalizer.normalize_vector(
            raw_ratings, criterion_type=CriterionType.BENEFIT, scale_to_100=True
        )
        self.assertEqual(scores, [0.0, 50.0, 100.0])

    def test_cost_criterion_normalization(self):
        # Lower is better: Prices [100.0, 150.0, 200.0]
        # Min = 100.0, Max = 200.0
        # Expected scores: 100.0 (cheapest), 50.0, 0.0 (most expensive)
        raw_prices = [100.0, 150.0, 200.0]
        scores = MinMaxNormalizer.normalize_vector(
            raw_prices, criterion_type=CriterionType.COST, scale_to_100=True
        )
        self.assertEqual(scores, [100.0, 50.0, 0.0])

    def test_identical_values_edge_case(self):
        # If all suppliers offer the exact same price or delivery time (v_max == v_min),
        # neither should be penalized: all get 100.0
        raw_prices = [500.0, 500.0, 500.0]
        scores = MinMaxNormalizer.normalize_vector(
            raw_prices, criterion_type=CriterionType.COST, scale_to_100=True
        )
        self.assertEqual(scores, [100.0, 100.0, 100.0])

    def test_single_supplier_edge_case(self):
        # Solo quote in RFQ
        raw_prices = [2500.0]
        scores = MinMaxNormalizer.normalize_vector(
            raw_prices, criterion_type=CriterionType.COST, scale_to_100=True
        )
        self.assertEqual(scores, [100.0])

    def test_missing_values_penalty(self):
        # When a quotation has missing fields (None), penalty score should be assigned
        values = [10.0, None, 20.0]
        scores = MinMaxNormalizer.normalize_vector(
            values, criterion_type=CriterionType.BENEFIT, scale_to_100=True, penalty_for_missing=0.0
        )
        self.assertEqual(scores[0], 0.0)
        self.assertEqual(scores[1], 0.0)
        self.assertEqual(scores[2], 100.0)


class TestFXRateService(unittest.TestCase):
    """Tests multi-currency conversion layer (P2.3)."""

    def test_same_currency_identity(self):
        fx = FXRateService()
        self.assertEqual(fx.get_rate("INR", "INR"), 1.0)
        self.assertEqual(fx.get_rate("USD", "USD"), 1.0)

    def test_usd_to_inr_conversion(self):
        fx = FXRateService({"USD": 83.50})
        converted, audit = fx.convert_amount(100.0, "USD", "INR")
        self.assertEqual(converted, 8350.0)
        self.assertEqual(audit.original_currency, "USD")
        self.assertEqual(audit.target_currency, "INR")
        self.assertEqual(audit.exchange_rate, 83.50)

    def test_eur_to_usd_triangulation(self):
        fx = FXRateService({"USD": 80.0, "EUR": 88.0})
        # 1 EUR = 88 INR; 1 USD = 80 INR -> 1 EUR = 1.10 USD
        rate = fx.get_rate("EUR", "USD")
        self.assertEqual(round(rate, 2), 1.10)


class TestSupplierComparisonEngine(unittest.TestCase):
    """Tests orchestrator for comparison, ranking, and UI badges (P2.1 & P2.4)."""

    def setUp(self):
        self.sample_quotes = [
            SupplierQuoteInput(
                supplier_id=1,
                supplier_name="Alpha Tech Corp",
                quotation_id=101,
                currency="INR",
                unit_price=1000.0,
                delivery_time_days=10,
                warranty_months=12,
                supplier_rating=4.5,
                is_iso_certified=True,
                esg_score=75.0,
            ),
            SupplierQuoteInput(
                supplier_id=2,
                supplier_name="Beta Global LLC",
                quotation_id=102,
                currency="USD",
                unit_price=15.0,  # 15 * 83.5 = 1252.50 INR
                delivery_time_days=5,  # Fastest delivery
                warranty_months=24,  # Longest warranty
                supplier_rating=4.8,
                is_iso_certified=True,
                esg_score=85.0,
            ),
            SupplierQuoteInput(
                supplier_id=3,
                supplier_name="Gamma Industries",
                quotation_id=103,
                currency="INR",
                unit_price=800.0,  # Lowest price
                delivery_time_days=20,
                warranty_months=6,
                supplier_rating=3.2,
                is_iso_certified=False,
                esg_score=40.0,
            ),
        ]

    def test_comparison_scoring_and_ranking(self):
        engine = SupplierComparisonEngine()
        weights = CriteriaWeights(
            price=0.40,
            delivery_time=0.25,
            quality_rating=0.15,
            warranty=0.10,
            esg_compliance=0.10,
        )

        response = engine.compare_quotes(
            rfq_id=42,
            quotes=self.sample_quotes,
            weights=weights,
            base_currency="INR",
        )

        # 1. Output structure checks
        self.assertEqual(response.rfq_id, 42)
        self.assertEqual(response.base_currency, "INR")
        self.assertEqual(len(response.suppliers), 3)

        # 2. Ranking checks (Rank 1, 2, 3 sorted descending by composite score)
        ranks = [s.rank for s in response.suppliers]
        self.assertEqual(ranks, [1, 2, 3])
        scores = [s.composite_score for s in response.suppliers]
        self.assertGreaterEqual(scores[0], scores[1])
        self.assertGreaterEqual(scores[1], scores[2])

        # 3. Badges verification
        winner = response.suppliers[0]
        self.assertIn(ComparisonBadge.BEST_OVERALL, winner.badges)

        # Lowest price badge check (Gamma Industries has 800 INR)
        gamma = next(s for s in response.suppliers if s.supplier_name == "Gamma Industries")
        self.assertIn(ComparisonBadge.LOWEST_PRICE, gamma.badges)

        # Fastest delivery badge check (Beta Global has 5 days)
        beta = next(s for s in response.suppliers if s.supplier_name == "Beta Global LLC")
        self.assertIn(ComparisonBadge.FASTEST_DELIVERY, beta.badges)

        # 4. Multi-currency check for Beta Global (USD -> INR)
        self.assertEqual(beta.currency, "USD")
        self.assertEqual(beta.raw_unit_price, 15.0)
        self.assertEqual(beta.base_unit_price, round(15.0 * 83.50, 2))
        self.assertEqual(beta.fx_audit.exchange_rate, 83.50)

        # 5. Benchmark summary check
        benchmarks = response.benchmark_summary
        self.assertEqual(benchmarks.total_suppliers_compared, 3)
        self.assertEqual(benchmarks.lowest_price_base, 800.0)
        self.assertEqual(benchmarks.fastest_delivery_days, 5)
        self.assertEqual(benchmarks.max_warranty_months, 24)


if __name__ == "__main__":
    unittest.main()
