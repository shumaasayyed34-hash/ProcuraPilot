"""
Phase 2 Comprehensive Unit & Integration Audit Tests:
- I2.1: Vector DB initialization, duplicate upserts, dimension consistency, and similarity search
- I2.2: Chunking & embedding pipeline with empty/edge case document handling
- I2.3: Agent Shared Memory layer with DB fallback
"""

import asyncio
import pytest
from backend.services.vector_db.chunker import ProcurementTextChunker
from backend.services.vector_db.embeddings import EmbeddingService
from backend.services.vector_db.vector_store import VectorStoreService
from backend.services.shared_memory.memory_service import AgentSharedMemoryService


def test_chunker_sliding_window():
    chunker = ProcurementTextChunker()
    text = (
        "Section 1: Supplier Compliance Requirements.\n"
        "All vendors must submit ISO 9001 certification and proof of tax clearance.\n\n"
        "Section 2: Pricing and Payment Terms.\n"
        "Payment will be processed net 30 days after invoice verification and goods delivery receipt."
    )
    chunks = chunker.chunk_document(
        text=text,
        document_id="DOC-TEST-001",
        metadata={"supplier_id": "SUP-101"},
        chunk_size=100,
        chunk_overlap=20
    )

    assert len(chunks) > 0
    assert chunks[0].document_id == "DOC-TEST-001"
    assert chunks[0].metadata["supplier_id"] == "SUP-101"
    assert "chunk_id" in chunks[0].__dict__


def test_empty_document_and_query_handling():
    chunker = ProcurementTextChunker()
    service = EmbeddingService(model_name="all-MiniLM-L6-v2")
    store = VectorStoreService(embedder=service)

    # Empty text chunking
    assert chunker.chunk_document("", document_id="EMPTY-1") == []
    assert chunker.chunk_document("   ", document_id="EMPTY-2") == []

    # Empty embedding calls
    assert service.embed_batch([]) == []
    assert len(service.embed_text("")) == service.get_dimension()

    # Empty store upserts & search
    assert store.upsert_chunks([]) == {"status": "EMPTY", "upserted_count": 0}
    assert store.similarity_search("") == []
    assert store.similarity_search(query_text=None, query_vector=None) == []


def test_embedding_service():
    service = EmbeddingService(model_name="all-MiniLM-L6-v2")
    single_emb = service.encode_single("ISO 9001 quality certificate compliance")
    assert isinstance(single_emb, list)
    assert len(single_emb) == service.get_dimension()

    batch_emb = service.encode_batch(["Payment terms net 30", "Delivery schedule within 14 days"])
    assert len(batch_emb) == 2
    assert len(batch_emb[0]) == service.get_dimension()


def test_vector_store_duplicate_upsert_deduplication():
    service = EmbeddingService(model_name="all-MiniLM-L6-v2")
    store = VectorStoreService(embedder=service)

    doc_text = "Supplier Gamma provides heavy machinery equipment with 3 years maintenance included."
    vec = service.encode_single(doc_text)

    record = {
        "id": "CHK-DUP-001",
        "values": vec,
        "metadata": {"text": doc_text, "supplier": "Gamma"}
    }

    # Upsert identical chunk twice
    store.upsert_vectors([record])
    store.upsert_vectors([record])

    results = store.similarity_search(query_text="heavy machinery maintenance", top_k=5)
    # Check that search results do not return duplicate items for same chunk_id
    matching_ids = [r["id"] for r in results if r["id"] == "CHK-DUP-001"]
    assert len(matching_ids) == 1


def test_agent_shared_memory():
    async def _run():
        memory = AgentSharedMemoryService()
        session_id = "SESS-PHASE2-TEST-99"

        # Set context
        await memory.set_context(
            session_id=session_id,
            key="ocr_extracted_rfq",
            value={"rfq_id": "RFQ-2026", "item": "Solar Panels", "qty": 500},
            agent_id="Paramita_P1.4"
        )

        # Get context
        rfq_data = await memory.get_context(session_id=session_id, key="ocr_extracted_rfq")
        assert rfq_data is not None
        assert rfq_data["item"] == "Solar Panels"

        # Append logs
        await memory.append_agent_log(
            session_id=session_id,
            agent_name="ValidationEngine_I2",
            action="VERIFY_SUPPLIER_ELIGIBILITY",
            payload={"eligible": True, "score": 0.94}
        )

        full_session = await memory.get_session_memory(session_id=session_id)
        assert full_session["session_id"] == session_id
        assert "ocr_extracted_rfq" in full_session["context"]
        assert len(full_session["agent_logs"]) >= 1

        # Cleanup
        await memory.clear_session(session_id=session_id)

    asyncio.run(_run())
