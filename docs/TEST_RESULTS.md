# ProcuraPilot AI — Test Execution Report

**Execution Timestamp:** 2026-10-01T19:47:47+05:30  
**Status:** **ALL 48 TESTS PASSED (100% GREEN)**  
**Duration:** 124.27 seconds  
**Test Framework:** Pytest 9.1.1 (Python 3.10.0)  
**Log File:** [`backend/tests/test_results.log`](file:///c:/clone/ProcuraPilot/backend/tests/test_results.log)  
**JUnit XML:** [`backend/tests/test_results.xml`](file:///c:/clone/ProcuraPilot/backend/tests/test_results.xml)  

---

## Executive Summary

| Phase | Test Suite | Tests Run | Passed | Failed | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Phase 3** | [`backend/tests/test_ahp_scoring.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_ahp_scoring.py) | **21** | **21** | 0 | ~1.00s |
| **Phase 2** | [`backend/tests/test_comparison_engine.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_comparison_engine.py) | **9** | **9** | 0 | ~1.20s |
| **Phase 1** | [`backend/tests/test_extraction.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_extraction.py) | **8** | **8** | 0 | ~1.30s |
| **Phase 1** | [`backend/tests/test_ocr_accuracy.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_ocr_accuracy.py) | **5** | **5** | 0 | ~2.70s |
| **Phase 2** | [`backend/tests/test_vector_memory.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_vector_memory.py) | **5** | **5** | 0 | ~118.0s |
| **Total** | **All Modules** | **48** | **48** | **0** | **124.27s** |

---

## Test Inventory & Verification Coverage

### 1. Phase 3: AHP Scoring Engine & Consistency Rigor (21 Tests)
*File: `backend/tests/test_ahp_scoring.py`*
* `TestAHPConsistencyMath::test_saaty_random_index_table_integrity` — Validates Saaty (1980) Random Index table ($n=1..9$) and fallback.
* `TestAHPConsistencyMath::test_perfect_consistency_3x3_transitive_matrix` — Proves $\lambda_{\max} \equiv 3.0, CI \equiv 0.0, CR \equiv 0.0$ on transitive reciprocal matrices.
* `TestAHPConsistencyMath::test_perfect_consistency_4x4_matrix` — Proves exact ratio matrix yield $CR = 0.0$.
* `TestAHPConsistencyMath::test_perron_frobenius_eigenvalue_lower_bound` — Asserts $\lambda_{\max} \ge n$ for any positive reciprocal matrix.
* `TestAHPConsistencyMath::test_near_consistent_matrix_acceptance_threshold` — Asserts $CR < 0.10$ threshold on realistic comparisons.
* `TestAHPConsistencyMath::test_inconsistent_matrix_rejection` — Flags contradictory circular judgments ($CR \ge 0.10$).
* `TestAHPConsistencyMath::test_scipy_exact_eigenvector_cross_validation` — Cross-validates row-average weights against SciPy's exact right principal eigenvector (`scipy.linalg.eig`, $L_\infty < 0.015$).
* `TestAHPConsistencyMath::test_reciprocal_matrix_algebraic_invariants` — Verifies $a_{ii} = 1.0$, $a_{ij} \times a_{ji} = 1.0$, and $a_{ij} > 0$.
* `TestAHPConsistencyMath::test_dimension_boundary_conditions` — Tests $n=1, n=2$ (always $CR=0.0$), and $n=5$.
* `TestAHPProcurementScenarios::test_scenario_1_cost_dominant_procurement` — Validates high-volume commodity procurement (Price ~65% dominant, Apex Budget Supplies wins Rank 1).
* `TestAHPProcurementScenarios::test_scenario_2_quality_critical_procurement` — Validates aerospace/medical procurement (Quality ~55% dominant, Vanguard Precision wins Rank 1).
* `TestAHPProcurementScenarios::test_scenario_3_urgent_expedited_procurement` — Validates plant-shutdown emergency procurement (Delivery ~55% dominant, SwiftLogistics wins Rank 1).
* `TestAHPProcurementScenarios::test_scenario_4_sustainability_esg_focused_procurement` — Validates green public tender (ESG ~40% dominant, EcoGreen Solutions wins Rank 1).
* `TestAHPProcurementScenarios::test_scenario_5_balanced_multi_criteria_procurement` — Validates standard balanced RFQ (Price 35%, Qual 30%, Deliv 25%, ESG 10%).
* `TestAHPProcurementScenarios::test_scenario_6_degenerate_and_edge_case_robustness` — Tests tied scores ($0.5$), missing values ($0.0$), and Pareto dominance.
* `TestAHPProcurementScenarios::test_quotation_and_supplier_object_mapping_pipeline` — Verifies DB ORM model to AHP dictionary conversion (`build_suppliers_data`).
* `TestAHPProcurementScenarios::test_scale_invariance_under_unit_transformations` — Proves currency scaling (USD $\to$ INR) and time scaling (Days $\to$ Hours) yields identical normalized scores.
* `TestAHPProcurementScenarios::test_preconfigured_router_templates_execution[cost_focused]` — Verifies built-in `cost_focused` template.
* `TestAHPProcurementScenarios::test_preconfigured_router_templates_execution[quality_focused]` — Verifies built-in `quality_focused` template.
* `TestAHPProcurementScenarios::test_preconfigured_router_templates_execution[balanced]` — Verifies built-in `balanced` template.
* `TestAHPProcurementScenarios::test_preconfigured_router_templates_execution[sustainability_focused]` — Verifies built-in `sustainability_focused` template.

### 2. Phase 2: Supplier Comparison Engine (9 Tests)
*File: `backend/tests/test_comparison_engine.py`*
* `TestMinMaxNormalizer::test_benefit_criterion_normalization` — Higher-is-better scaling to $[0, 100]$.
* `TestMinMaxNormalizer::test_cost_criterion_normalization` — Lower-is-better inverted scaling.
* `TestMinMaxNormalizer::test_identical_values_edge_case` — Zero-variance handling.
* `TestMinMaxNormalizer::test_missing_values_penalty` — Penalizes missing metrics safely.
* `TestMinMaxNormalizer::test_single_supplier_edge_case` — Single-quote normalization handling.
* `TestFXRateService::test_eur_to_usd_triangulation` — Multi-currency conversion via base rate.
* `TestFXRateService::test_same_currency_identity` — Same-currency $1.0$ identity rate.
* `TestFXRateService::test_usd_to_inr_conversion` — USD $\to$ INR direct conversion.
* `TestSupplierComparisonEngine::test_comparison_scoring_and_ranking` — Multi-supplier quote comparison, composite scoring, and UI badges.

### 3. Phase 1: Quotation Extraction & Schemas (8 Tests)
*File: `backend/tests/test_extraction.py`*
* `test_monetary_cleaning` — Cleans ₹, $, European commas, and negative formats.
* `test_procurement_schema_reconciliation` — Full Pydantic extraction schema validation.
* `test_arithmetic_discrepancy_detection` — Line-item total vs. quoted total verification.
* `test_ocr_cleaner` — Removes OCR noise, artifacts, and excessive whitespace.
* `test_edge_case_missing_fields_audit` — Missing supplier names and partial headers.
* `test_line_item_auto_calculation` — Auto-derives unit price $\times$ quantity.
* `test_supplier_gstin_normalization` — Normalizes 15-character Indian GSTIN.
* `test_foreign_supplier_without_gstin` — Accommodates non-domestic international suppliers.

### 4. Phase 1: OCR Processing & Accuracy (5 Tests)
*File: `backend/tests/test_ocr_accuracy.py`*
* `test_document_validation` — File type white-listing and size cap validation.
* `test_accuracy_metric_calculations` — Character Accuracy Rate (CAR) and Levenshtein distance.
* `test_ocr_service_processing` — OCR preprocessing and text cleaning pipeline.
* `test_upload_api_endpoint` — Fast-path `/api/v1/extraction/upload` integration.
* `test_compare_ocr_api_endpoint` — Dual-engine OCR benchmarking endpoint (`/api/v1/extraction/compare-ocr`).

### 5. Phase 2: Vector DB & Memory (5 Tests)
*File: `backend/tests/test_vector_memory.py`*
* `test_chunker_sliding_window` — Overlapping chunk generation.
* `test_empty_document_and_query_handling` — Null-safe embeddings and query processing.
* `test_embedding_service` — Dense vector generation with deterministic fallback.
* `test_vector_store_duplicate_upsert_deduplication` — Prevents document duplication in vector store.
* `test_agent_shared_memory` — Cross-agent shared memory context, execution logging, and cleanup.
