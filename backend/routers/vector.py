"""
Vector Store API Router (Phase 2 Deliverable I2.1 & I2.2)
Provides endpoints for document chunking, embedding generation, index upserts, and vector similarity search.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.vector_db.chunker import ProcurementTextChunker
from backend.services.vector_db.embeddings import EmbeddingService
from backend.services.vector_db.vector_store import VectorStoreService

router = APIRouter(prefix="/vector", tags=["Vector DB & Embeddings"])

chunker = ProcurementTextChunker()
embedding_service = EmbeddingService()
vector_store = VectorStoreService()


class IndexDocumentRequest(BaseModel):
    document_id: str = Field(..., description="Unique ID for the procurement document")
    text: str = Field(..., description="Raw or OCR-extracted text of the document")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata tags (supplier, rfq_id, doc_type)")
    chunk_size: int = Field(default=300, description="Target token/character count per chunk")
    chunk_overlap: int = Field(default=50, description="Overlap between consecutive chunks")


class IndexDocumentResponse(BaseModel):
    status: str
    document_id: str
    chunks_count: int
    dimension: int


class SimilaritySearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    top_k: int = Field(default=5, description="Number of nearest chunks to retrieve")
    min_score: float = Field(default=0.0, description="Minimum similarity score threshold")


class SearchResultItem(BaseModel):
    id: str
    score: float
    text: str
    metadata: Dict[str, Any]


class SimilaritySearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]


@router.post("/index-document", response_model=IndexDocumentResponse)
async def index_document(req: IndexDocumentRequest):
    """
    Chunk document text, generate embeddings, and upsert vectors into vector store.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Document text cannot be empty.")

    chunks = chunker.chunk_document(
        text=req.text,
        document_id=req.document_id,
        metadata=req.metadata,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap
    )

    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks generated from document text.")

    # Generate embeddings
    texts = [c.text for c in chunks]
    embeddings = embedding_service.encode_batch(texts)

    # Prepare vector records
    records = []
    for chunk, emb in zip(chunks, embeddings):
        records.append({
            "id": chunk.chunk_id,
            "values": emb,
            "metadata": {
                **chunk.metadata,
                "text": chunk.text,
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "start_char": chunk.start_char,
                "end_char": chunk.end_char
            }
        })

    vector_store.upsert_vectors(records)

    return IndexDocumentResponse(
        status="success",
        document_id=req.document_id,
        chunks_count=len(chunks),
        dimension=embedding_service.get_dimension()
    )


@router.post("/search", response_model=SimilaritySearchResponse)
async def similarity_search(req: SimilaritySearchRequest):
    """
    Perform semantic similarity search over stored procurement document vectors.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    query_vec = embedding_service.encode_single(req.query)
    raw_results = vector_store.similarity_search(query_vector=query_vec, top_k=req.top_k)

    results = []
    for r in raw_results:
        if r.get("score", 0.0) >= req.min_score:
            meta = r.get("metadata", {})
            text = meta.get("text", "")
            results.append(SearchResultItem(
                id=r["id"],
                score=r.get("score", 0.0),
                text=text,
                metadata=meta
            ))

    return SimilaritySearchResponse(
        query=req.query,
        total_results=len(results),
        results=results
    )
