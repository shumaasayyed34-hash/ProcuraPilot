"""
Modular Procurement Text Chunker (Phase 2 Task I2.2)
Splits procurement documents (Quotations, Invoices, RFQs) into semantic chunks with metadata.
"""

import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """Represents a single chunk of vectorized text with rich metadata."""
    chunk_id: str = Field(..., description="Unique chunk identifier (e.g. DOC-123_chunk_0)")
    document_id: str = Field(..., description="Parent document tracking ID")
    chunk_index: int = Field(..., description="0-indexed chunk sequence order")
    text: str = Field(..., description="Cleaned chunk text content")
    token_count: int = Field(..., description="Estimated token count")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata (rfq_id, supplier, page)")


class ProcurementTextChunker:
    """Semantic sliding-window chunker tailored for structured & unstructured procurement text."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50, min_chunk_len: int = 40):
        self.chunk_size = chunk_size        # Approx characters per chunk
        self.chunk_overlap = chunk_overlap  # Character overlap between consecutive chunks
        self.min_chunk_len = min_chunk_len

    def split_text(
        self,
        text: str,
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:
        """Splits document text into overlapping semantic chunks."""
        return self._do_split(text, document_id, metadata)

    def chunk_document(
        self,
        text: str,
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[DocumentChunk]:
        """Alias for split_text with optional custom chunk params."""
        if chunk_size:
            self.chunk_size = chunk_size
        if chunk_overlap:
            self.chunk_overlap = chunk_overlap
        return self._do_split(text, document_id, metadata)

    def _do_split(
        self,
        text: str,
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:

        if not text or not text.strip():
            return []

        base_meta = metadata or {}
        cleaned_text = re.sub(r"\r\n", "\n", text.strip())

        # Attempt paragraph-based splitting first
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", cleaned_text) if p.strip()]

        raw_chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) + 1 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk and len(current_chunk) >= self.min_chunk_len:
                    raw_chunks.append(current_chunk)
                
                # If paragraph itself exceeds max chunk size, break by sentences/sliding window
                if len(para) > self.chunk_size:
                    sub_chunks = self._sliding_window_split(para)
                    raw_chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = para

        if current_chunk and len(current_chunk) >= self.min_chunk_len:
            raw_chunks.append(current_chunk)

        # Fallback if no paragraph boundaries found
        if not raw_chunks:
            raw_chunks = self._sliding_window_split(cleaned_text)

        # Build DocumentChunk objects
        document_chunks = []
        for idx, chunk_str in enumerate(raw_chunks):
            chunk_meta = base_meta.copy()
            chunk_meta.update({
                "document_id": document_id,
                "chunk_index": idx,
                "char_length": len(chunk_str),
            })
            
            # Estimate word/token count
            est_tokens = len(chunk_str.split())

            doc_chunk = DocumentChunk(
                chunk_id=f"{document_id}_chunk_{idx}",
                document_id=document_id,
                chunk_index=idx,
                text=chunk_str,
                token_count=est_tokens,
                metadata=chunk_meta,
            )
            document_chunks.append(doc_chunk)

        return document_chunks

    def _sliding_window_split(self, text: str) -> List[str]:
        """Sliding window fallback for long monolithic blocks of text."""
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            
            # Snap end to word boundary if not at text end
            if end < text_len:
                space_pos = text.rfind(" ", start, end)
                if space_pos > start + (self.chunk_size // 2):
                    end = space_pos

            chunk_text = text[start:end].strip()
            if len(chunk_text) >= self.min_chunk_len:
                chunks.append(chunk_text)

            # Move window forward with overlap
            start = end - self.chunk_overlap if end < text_len else text_len

        return chunks


chunker = ProcurementTextChunker()
