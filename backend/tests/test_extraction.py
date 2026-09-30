"""
Tests for Procurement Extraction & Pydantic Schemas (P1.1, P1.2, P1.3)
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from schemas.procurement import (
    ProcurementDocumentExtract,
    clean_monetary_value,
)
from services.preprocessor import OCRPreprocessor


def test_monetary_cleaning():
    assert clean_monetary_value("₹ 1,25,000.00") == 125000.0
    assert clean_monetary_value("$ 4,500.50") == 4500.50
    assert clean_monetary_value("1.250,50") == 1250.50
    assert clean_monetary_value("(150.00)") == -150.00
    assert clean_monetary_value("N/A") is None
    assert clean_monetary_value("nil") is None


def test_procurement_schema_reconciliation():
    sample_data = {
        "document_type": "QUOTATION",
        "document_number": "QTN-2024-884",
        "issue_date": "2024-06-10",
        "currency": "₹",
        "supplier": {
            "name": "Bharat Heavy Steel Pvt Ltd",
            "gstin": "27AAACB2211D1Z5",
            "email": "sales@bharatsteel.com",
            "address": "Plot 42, MIDC Industrial Area, Pune",
        },
        "line_items": [
            {
                "item_index": 1,
                "description": "Mild Steel Pipes 50mm NB",
                "quantity": 100,
                "unit": "MTR",
                "unit_price": 450.0,
                "total_amount": 45000.0,
            },
            {
                "item_index": 2,
                "description": "Galvanized Iron Couplings",
                "quantity": 50,
                "unit": "PCS",
                "unit_price": 120.0,
                "total_amount": 6000.0,
            },
        ],
        "subtotal_amount": 51000.0,
        "gst_percentage": 18.0,
        "total_tax_amount": 9180.0,
        "total_amount": 60180.0,
        "delivery_time_days": 14,
        "payment_terms": "30% Advance, 70% against delivery",
        "incoterms": "Ex-Works",
        "moq": 10.0,
        "validity_days": 30,
        "warranty_months": 12,
    }

    doc = ProcurementDocumentExtract.model_validate(sample_data)
    assert doc.currency == "INR"
    assert doc.supplier.gstin == "27AAACB2211D1Z5"
    assert doc.total_amount == 60180.0
    assert doc.quality.arithmetic_valid is True
    assert doc.quality.confidence_score == 1.0


def test_arithmetic_discrepancy_detection():
    sample_data = {
        "document_type": "QUOTATION",
        "supplier": {"name": "Test Supplier"},
        "line_items": [
            {
                "description": "Item X",
                "quantity": 1,
                "unit_price": 1000.0,
                "total_amount": 1000.0,
            }
        ],
        "subtotal_amount": 1000.0,
        "total_tax_amount": 0.0,
        "total_amount": 2500.0,  # Intentional discrepancy
    }

    doc = ProcurementDocumentExtract.model_validate(sample_data)
    assert doc.quality.arithmetic_valid is False
    assert len(doc.quality.warnings) > 0
    assert doc.quality.confidence_score < 1.0


def test_ocr_cleaner():
    dirty = "\x00\x01\x1b Bharat Heavy Steel \xa0\xa0\xa0 Date: 2024-01-01 \n\n\n\n Total: ₹ 50,000 \r\n================="
    cleaned, metrics = OCRPreprocessor.clean(dirty)
    assert "\x00" not in cleaned
    assert "\xa0" not in cleaned
    assert "Bharat Heavy Steel Date: 2024-01-01" in cleaned
    assert metrics["noise_ratio"] > 0
    assert not metrics["is_empty"]


def test_edge_case_missing_fields_audit():
    """Validates that missing commercial terms are detected and reported."""
    sparse_data = {
        "document_type": "QUOTATION",
        "supplier": {"name": "Ambica Industrial Supplies"},
        "line_items": [
            {
                "description": "Flange Gaskets 150#",
                "quantity": 20,
                "unit_price": 50.0,
                "total_amount": 1000.0,
            }
        ],
        "total_amount": 1000.0,
    }
    doc = ProcurementDocumentExtract.model_validate(sparse_data)
    assert "document_number" in doc.quality.missing_fields
    assert "issue_date" in doc.quality.missing_fields
    assert "payment_terms" in doc.quality.missing_fields
    assert "delivery_time_days" in doc.quality.missing_fields
    # Derived subtotal fallback check
    assert doc.subtotal_amount == 1000.0
    assert doc.unit_price == 50.0


def test_line_item_auto_calculation():
    """Validates that total_amount is auto-calculated when omitted from line item."""
    data = {
        "document_type": "QUOTATION",
        "supplier": {"name": "Alpha Valves Ltd"},
        "line_items": [
            {
                "description": "Ball Valve 2 inch SS316",
                "quantity": 5,
                "unit_price": 2400.0,
                "total_amount": 0.0,  # Missing or zero from OCR
            }
        ],
        "total_amount": 12000.0,
    }
    doc = ProcurementDocumentExtract.model_validate(data)
    assert doc.line_items[0].total_amount == 12000.0
    assert doc.subtotal_amount == 12000.0
    assert doc.quality.arithmetic_valid is True


def test_supplier_gstin_normalization():
    """Validates GSTIN whitespace removal and casing."""
    data = {
        "document_type": "QUOTATION",
        "supplier": {
            "name": "Zenith Fasteners",
            "gstin": " 27 aabbc 1234 d 1 z 5 ",
        },
        "total_amount": 500.0,
    }
    doc = ProcurementDocumentExtract.model_validate(data)
    assert doc.supplier.gstin == "27AABBC1234D1Z5"


def test_foreign_supplier_without_gstin():
    """Validates foreign supplier handling with non-INR currency and no GSTIN."""
    data = {
        "document_type": "QUOTATION",
        "currency": "$",
        "supplier": {
            "name": "Global Tech GMBH",
            "country": "Germany",
            "email": "export@globaltech.de",
        },
        "line_items": [
            {
                "description": "Pressure Sensors Model PS-400",
                "quantity": 10,
                "unit_price": 150.0,
                "total_amount": 1500.0,
            }
        ],
        "total_amount": 1500.0,
    }
    doc = ProcurementDocumentExtract.model_validate(data)
    assert doc.currency == "USD"
    assert doc.supplier.country == "Germany"
    assert doc.supplier.gstin is None
    assert doc.quality.arithmetic_valid is True


if __name__ == "__main__":
    test_monetary_cleaning()
    test_procurement_schema_reconciliation()
    test_arithmetic_discrepancy_detection()
    test_ocr_cleaner()
    test_edge_case_missing_fields_audit()
    test_line_item_auto_calculation()
    test_supplier_gstin_normalization()
    test_foreign_supplier_without_gstin()
    print("All tests in C:/clone/ProcuraPilot/backend/tests passed successfully!")
