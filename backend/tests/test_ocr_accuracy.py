"""
Tests for Phase 1 Document Upload, OCR Engines, and Accuracy Evaluation
"""

import io
import os
import sys
from pathlib import Path
import pytest
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from services.upload_service import upload_service
from services.ocr_service import ocr_service
from utils.ocr_metrics import (
    calculate_character_accuracy_rate,
    calculate_word_accuracy_rate,
    evaluate_ocr_accuracy,
    levenshtein_distance,
)

client = TestClient(app)


def create_sample_quotation_image(text: str = "QUOTATION QTN-101\nSupplier: Acme Industrial\nTotal: 4500.00 INR") -> bytes:
    """Helper to generate a clean synthetic PNG image containing text for OCR testing."""
    img = Image.new("RGB", (600, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 30), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_document_validation():
    """Validates extension, size limit, and document ID generation."""
    is_valid, err = upload_service.validate_file("invoice.pdf", "application/pdf", 1024)
    assert is_valid is True

    is_valid, err = upload_service.validate_file("document.exe", "application/octet-stream", 1024)
    assert is_valid is False
    assert "Unsupported file format" in err

    # Exceed max file size
    oversized = 20 * 1024 * 1024  # 20 MB
    is_valid, err = upload_service.validate_file("quote.png", "image/png", oversized)
    assert is_valid is False
    assert "File size exceeds limit" in err

    doc_id = upload_service.generate_document_id()
    assert doc_id.startswith("DOC-")


def test_accuracy_metric_calculations():
    """Validates Levenshtein distance, CAR, and WAR calculation functions."""
    expected = "Quotation QTN-2024 Total: 5000 INR"
    actual_high_acc = "Quotation QTN-2024 Total: 5000 INR"
    actual_minor_ocr_error = "Quotation QTN-2024 Total: 5000 lNR"  # lowercase 'l' for 'I'

    assert levenshtein_distance("CAT", "HAT") == 1
    assert calculate_character_accuracy_rate(expected, actual_high_acc) == 100.0

    report = evaluate_ocr_accuracy(expected, actual_minor_ocr_error, engine_name="TestTesseract")
    assert report["car_percentage"] > 90.0
    assert report["levenshtein_distance"] == 1
    assert report["engine"] == "TestTesseract"


def test_ocr_service_processing():
    """Validates OCR processing on sample image and preprocessor integration."""
    sample_text = "QUOTATION QTN-999\nSupplier: Apex Tools\nAmount: 12500"
    img_bytes = create_sample_quotation_image(sample_text)

    res = ocr_service.process_document(
        file_path_or_bytes=img_bytes,
        filename="test_quote.png",
        engine="tesseract",
        preprocess=True,
    )

    assert res["filename"] == "test_quote.png"
    assert "cleaned_text" in res
    assert "preprocessor_metrics" in res


def test_upload_api_endpoint():
    """Tests the /api/v1/extraction/upload FastAPI endpoint."""
    img_bytes = create_sample_quotation_image("QUOTATION REF-555\nVendor: Steel Corp")

    files = {"file": ("test_quote.png", img_bytes, "image/png")}
    data = {"rfq_id": "42", "ocr_engine": "tesseract"}

    response = client.post("/api/v1/extraction/upload", files=files, data=data)
    assert response.status_code == 200
    json_resp = response.json()

    assert json_resp["document_id"].startswith("DOC-")
    assert json_resp["filename"] == "test_quote.png"
    assert "ocr" in json_resp
    assert "extraction" in json_resp


def test_compare_ocr_api_endpoint():
    """Tests the /api/v1/extraction/compare-ocr comparison endpoint."""
    ground_truth = "QUOTATION QTN-101\nSupplier: Acme Industrial\nTotal: 4500.00 INR"
    img_bytes = create_sample_quotation_image(ground_truth)

    files = {"file": ("test_compare.png", img_bytes, "image/png")}
    data = {"expected_text": ground_truth}

    response = client.post("/api/v1/extraction/compare-ocr", files=files, data=data)
    assert response.status_code == 200
    json_resp = response.json()

    assert "tesseract_ocr" in json_resp
    assert "paddle_ocr" in json_resp
    assert "accuracy_metrics" in json_resp
    assert "tesseract" in json_resp["accuracy_metrics"]
    assert "paddleocr" in json_resp["accuracy_metrics"]


if __name__ == "__main__":
    test_document_validation()
    test_accuracy_metric_calculations()
    test_ocr_service_processing()
    test_upload_api_endpoint()
    test_compare_ocr_api_endpoint()
    print("All Phase 1 OCR & Upload tests passed successfully!")
