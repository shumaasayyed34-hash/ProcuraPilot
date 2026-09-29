"""
Document Upload & Storage Service (Phase 1 Task 1)
Handles file validation (type and size), safe file storage, and unique document ID generation.
"""

import os
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

# Configuration defaults suitable for college project environment
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


class DocumentUploadService:
    """Service to validate, store, and manage uploaded procurement files."""

    def __init__(self, upload_dir: Path = UPLOAD_DIR):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, filename: str, content_type: str, file_size: int) -> Tuple[bool, str]:
        """Validates file extension, mime type, and file size.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return (
                False,
                f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        if content_type and content_type.lower() not in ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
            return (
                False,
                f"Unsupported MIME type '{content_type}'. Must be PDF or PNG/JPG/JPEG image.",
            )

        if file_size > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
            return (
                False,
                f"File size exceeds limit of {max_mb:.0f} MB. Received size: {file_size / (1024 * 1024):.2f} MB",
            )

        if file_size == 0:
            return False, "Uploaded file is empty (0 bytes)."

        return True, ""

    def generate_document_id(self) -> str:
        """Generates a unique document tracking identifier."""
        return f"DOC-{uuid.uuid4().hex[:10].upper()}"

    async def save_uploaded_file(self, file: UploadFile) -> Tuple[str, Path, int]:
        """Reads, validates, generates ID, and securely saves the uploaded file to disk.
        
        Returns:
            Tuple of (document_id, file_path, file_size_bytes)
        """
        # Read file content to check size and save
        content = await file.read()
        file_size = len(content)

        is_valid, err_msg = self.validate_file(
            filename=file.filename or "unknown",
            content_type=file.content_type or "",
            file_size=file_size,
        )

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg,
            )

        doc_id = self.generate_document_id()
        ext = Path(file.filename or "file.bin").suffix.lower()
        safe_filename = f"{doc_id}{ext}"
        target_path = self.upload_dir / safe_filename

        with open(target_path, "wb") as f:
            f.write(content)

        # Reset cursor for downstream read if needed
        await file.seek(0)

        return doc_id, target_path, file_size


upload_service = DocumentUploadService()
