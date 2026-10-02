"""
Vector Database Service (Phase 2 Task I2.1)
Manages FAISS (Local) and Pinecone (Cloud) Vector Database indices, document chunk upserts,
similarity search, and metadata querying.
"""

import json
import logging
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

from services.vector_db.chunker import DocumentChunk, ProcurementTextChunker, chunker
from services.vector_db.embeddings import EmbeddingService, embedding_service


logger = logging.getLogger("procurapilot.vectorstore")

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "vector_indices"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
FAISS_INDEX_PATH = STORAGE_DIR / "faiss_index.bin"
METADATA_STORE_PATH = STORAGE_DIR / "chunks_metadata.json"


class VectorStoreService:
    """Production vector database orchestrator for FAISS and Pinecone."""

    def __init__(
        self,
        embedder: EmbeddingService = embedding_service,
        use_pinecone: bool = False,
    ):
        self.embedder = embedder
        self.dimension = embedder.dimension
        self.use_pinecone = use_pinecone or bool(os.getenv("PINECONE_API_KEY"))
        
        self.faiss_index = None
        self.chunks_metadata: Dict[str, Dict[str, Any]] = {}
        self.id_to_chunk_key: List[str] = []

        self._init_faiss()

        if self.use_pinecone:
            self._init_pinecone()

    def _init_faiss(self):
        """Initializes or loads local FAISS L2/Cosine similarity index."""
        try:
            import faiss

            if FAISS_INDEX_PATH.exists() and METADATA_STORE_PATH.exists():
                loaded_index = faiss.read_index(str(FAISS_INDEX_PATH))
                if loaded_index.d != self.dimension:
                    logger.warning(
                        f"FAISS index dimension mismatch ({loaded_index.d} vs expected {self.dimension}). "
                        "Re-initializing new index."
                    )
                    self.faiss_index = faiss.IndexFlatIP(self.dimension)
                    self.chunks_metadata = {}
                    self.id_to_chunk_key = []
                else:
                    self.faiss_index = loaded_index
                    with open(METADATA_STORE_PATH, "r", encoding="utf-8") as f:
                        store_data = json.load(f)
                        self.chunks_metadata = store_data.get("chunks", {})
                        self.id_to_chunk_key = store_data.get("id_map", [])
                    logger.info(
                        f"Loaded existing FAISS index with {self.faiss_index.ntotal} vectors "
                        f"from {FAISS_INDEX_PATH}"
                    )
            else:
                # Use Inner Product (Cosine Similarity on L2 normalized vectors)
                self.faiss_index = faiss.IndexFlatIP(self.dimension)
                logger.info(f"Initialized new FAISS IndexFlatIP (Dim: {self.dimension}).")


        except ImportError:
            logger.warning("FAISS library not installed. Standard NumPy Cosine Index will be used.")
            self.faiss_index = None
            self._load_fallback_store()

    def _load_fallback_store(self):
        """Fallback local vector store using NumPy array matrix."""
        if METADATA_STORE_PATH.exists():
            with open(METADATA_STORE_PATH, "r", encoding="utf-8") as f:
                store_data = json.load(f)
                self.chunks_metadata = store_data.get("chunks", {})
                self.id_to_chunk_key = store_data.get("id_map", [])

    def _save_store(self):
        """Persists local index and metadata to disk."""
        if self.faiss_index is not None:
            try:
                import faiss
                faiss.write_index(self.faiss_index, str(FAISS_INDEX_PATH))
            except Exception as err:
                logger.error(f"Failed to write FAISS index to disk: {err}")

        store_data = {
            "chunks": self.chunks_metadata,
            "id_map": self.id_to_chunk_key,
        }
        with open(METADATA_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(store_data, f, indent=2, default=str)

    def _init_pinecone(self):
        """Attempts initialization of Pinecone client index."""
        try:
            from pinecone import Pinecone, ServerlessSpec

            api_key = os.getenv("PINECONE_API_KEY")
            index_name = os.getenv("PINECONE_INDEX_NAME", "procurapilot-index")
            pc = Pinecone(api_key=api_key)

            existing_indices = [idx.name for idx in pc.list_indexes()]
            if index_name not in existing_indices:
                pc.create_index(
                    name=index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
                logger.info(f"Created new Pinecone index: {index_name}")

            self.pinecone_index = pc.Index(index_name)
            logger.info(f"Connected to Pinecone index: {index_name}")

        except Exception as p_err:
            logger.warning(f"Could not connect to Pinecone ({p_err}). Cloud upsert disabled.")
            self.use_pinecone = False

    def upsert_chunks(self, document_chunks: List[DocumentChunk]) -> Dict[str, Any]:
        """Vectorizes and upserts document chunks into FAISS and optional Pinecone.
        
        Args:
            document_chunks: List of DocumentChunk objects.

        Returns:
            Dict summary of upsert status and vector counts.
        """
        if not document_chunks:
            return {"status": "EMPTY", "upserted_count": 0}

        texts = [chunk.text for chunk in document_chunks]
        embeddings = self.embedder.embed_batch(texts)

        # 1. FAISS / Local Vector Index Upsert
        vectors_np = np.array(embeddings, dtype=np.float32)

        # Normalize for Cosine Similarity Inner Product
        norms = np.linalg.norm(vectors_np, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vectors_np = vectors_np / norms

        if self.faiss_index is not None:
            self.faiss_index.add(vectors_np)

        for idx, chunk in enumerate(document_chunks):
            chunk_data = chunk.model_dump(mode="json")
            chunk_data["vector"] = embeddings[idx]  # Save vector representation
            self.chunks_metadata[chunk.chunk_id] = chunk_data
            if chunk.chunk_id not in self.id_to_chunk_key:
                self.id_to_chunk_key.append(chunk.chunk_id)

        self._save_store()


        # 2. Pinecone Cloud Index Upsert (if enabled)
        if self.use_pinecone and hasattr(self, "pinecone_index"):
            try:
                pinecone_vectors = []
                for idx, chunk in enumerate(document_chunks):
                    pinecone_vectors.append({
                        "id": chunk.chunk_id,
                        "values": embeddings[idx],
                        "metadata": {
                            "text": chunk.text[:1000],
                            "document_id": chunk.document_id,
                            "chunk_index": chunk.chunk_index,
                            **chunk.metadata,
                        },
                    })
                self.pinecone_index.upsert(vectors=pinecone_vectors)
                logger.info(f"Upserted {len(pinecone_vectors)} vectors to Pinecone.")
            except Exception as pc_err:
                logger.error(f"Pinecone upsert failure: {pc_err}")

        return {
            "status": "SUCCESS",
            "upserted_count": len(document_chunks),
            "document_id": document_chunks[0].document_id,
            "total_vectors_in_store": len(self.chunks_metadata),
        }

    def upsert_vectors(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Upsert raw vector records dictionary list into vector store."""
        if not records:
            return {"status": "EMPTY", "upserted_count": 0}

        chunks = []
        for idx, rec in enumerate(records):
            rec_id = rec.get("id", f"chk_{idx}")
            meta = rec.get("metadata", {})
            text = meta.get("text", "")
            doc_id = meta.get("document_id", "DOC_UNNAMED")
            chunks.append(DocumentChunk(
                chunk_id=rec_id,
                document_id=doc_id,
                chunk_index=idx,
                text=text,
                token_count=len(text.split()),
                metadata=meta
            ))
        return self.upsert_chunks(chunks)


    def index_document_text(
        self,
        document_id: str,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Helper to chunk text, generate embeddings, and upsert document into Vector DB."""
        chunks = chunker.split_text(text=text, document_id=document_id, metadata=metadata)
        return self.upsert_chunks(chunks)

    def similarity_search(
        self,
        query: Optional[Any] = None,
        query_vector: Optional[List[float]] = None,
        query_text: Optional[str] = None,
        top_k: int = 5,
        filter_document_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Queries the vector database for top-k relevant procurement text chunks."""
        q_vec = None
        if query_vector is not None:
            q_vec = query_vector
        elif query_text is not None and query_text.strip():
            q_vec = self.embedder.embed_text(query_text)
        elif query is not None:
            if isinstance(query, str) and query.strip():
                q_vec = self.embedder.embed_text(query)
            elif isinstance(query, (list, tuple, np.ndarray)) and len(query) > 0:
                q_vec = list(query)

        if q_vec is None or not self.chunks_metadata:
            return []


        q_np = np.array([q_vec], dtype=np.float32)
        norm = np.linalg.norm(q_np)
        if norm > 0:
            q_np = q_np / norm


        results = []
        seen_keys = set()

        # 1. Search using FAISS if available
        if self.faiss_index is not None and self.faiss_index.ntotal > 0:
            search_k = min(top_k * 3, self.faiss_index.ntotal)  # Fetch extra to filter
            scores, indices = self.faiss_index.search(q_np, search_k)

            for score, idx in zip(scores[0], indices[0]):
                if idx < 0 or idx >= len(self.id_to_chunk_key):
                    continue
                chunk_key = self.id_to_chunk_key[idx]
                if chunk_key in seen_keys:
                    continue

                chunk_info = self.chunks_metadata.get(chunk_key)

                if chunk_info:
                    if filter_document_id and chunk_info.get("document_id") != filter_document_id:
                        continue
                    
                    seen_keys.add(chunk_key)
                    item = chunk_info.copy()
                    item["id"] = item.get("chunk_id", chunk_key)
                    item["similarity_score"] = round(float(score), 4)
                    item["score"] = item["similarity_score"]
                    item.pop("vector", None)
                    results.append(item)

                if len(results) >= top_k:
                    break

            return results

        # 2. NumPy Cosine fallback search
        all_keys = list(self.chunks_metadata.keys())
        matrix_vecs = []
        valid_keys = []

        for k in all_keys:
            c = self.chunks_metadata[k]
            if filter_document_id and c.get("document_id") != filter_document_id:
                continue
            if "vector" in c:
                matrix_vecs.append(c["vector"])
                valid_keys.append(k)

        if not matrix_vecs:
            return []

        mat_np = np.array(matrix_vecs, dtype=np.float32)
        mat_norms = np.linalg.norm(mat_np, axis=1, keepdims=True)
        mat_norms[mat_norms == 0] = 1.0
        mat_np = mat_np / mat_norms

        sim_scores = np.dot(mat_np, q_np.T).flatten()
        top_indices = np.argsort(sim_scores)[::-1][:top_k * 2]

        for i in top_indices:
            key = valid_keys[i]
            if key in seen_keys:
                continue

            seen_keys.add(key)
            item = self.chunks_metadata[key].copy()
            item["id"] = item.get("chunk_id", key)
            item["similarity_score"] = round(float(sim_scores[i]), 4)
            item["score"] = item["similarity_score"]
            item.pop("vector", None)
            results.append(item)
            if len(results) >= top_k:
                break

        return results




vector_store_service = VectorStoreService()
