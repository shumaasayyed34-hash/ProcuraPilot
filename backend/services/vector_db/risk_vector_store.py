"""
Risk Vector Store & Semantic Search Service (I4.3)
Generates and stores embeddings for supplier historical risk events,
compliance records, and news narratives; provides semantic search capabilities.
"""

import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np

from schemas.risk_schemas import HistoricalRiskRecord, RiskVectorSearchResult
from services.vector_db.embeddings import EmbeddingService, embedding_service

logger = logging.getLogger("procurapilot.risk_vector_store")

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "vector_indices"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
RISK_FAISS_INDEX_PATH = STORAGE_DIR / "risk_faiss_index.bin"
RISK_METADATA_STORE_PATH = STORAGE_DIR / "risk_metadata.json"


class RiskVectorStoreService:
    def __init__(self, embedder: EmbeddingService = embedding_service):
        self.embedder = embedder
        self.dimension = embedder.dimension
        self.faiss_index = None
        self.risk_records: Dict[str, Dict[str, Any]] = {}
        self.id_to_event_key: List[str] = []
        self.fallback_vectors: List[List[float]] = []

        self._init_faiss()

    def _init_faiss(self):
        """Initializes or loads dedicated FAISS index for risk records, falling back to NumPy matrix."""
        try:
            import faiss

            if RISK_FAISS_INDEX_PATH.exists() and RISK_METADATA_STORE_PATH.exists():
                loaded_index = faiss.read_index(str(RISK_FAISS_INDEX_PATH))
                if loaded_index.d != self.dimension:
                    logger.warning(
                        f"Risk FAISS dimension mismatch ({loaded_index.d} vs {self.dimension}). Rebuilding index."
                    )
                    self.faiss_index = faiss.IndexFlatIP(self.dimension)
                    self.risk_records = {}
                    self.id_to_event_key = []
                else:
                    self.faiss_index = loaded_index
                    with open(RISK_METADATA_STORE_PATH, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.risk_records = data.get("records", {})
                        self.id_to_event_key = data.get("id_map", [])
                    logger.info(f"Loaded existing Risk FAISS index with {self.faiss_index.ntotal} vectors.")
            else:
                self.faiss_index = faiss.IndexFlatIP(self.dimension)
                logger.info(f"Initialized new Risk FAISS IndexFlatIP (dim={self.dimension})")
        except Exception as e:
            logger.warning(f"FAISS not available for RiskVectorStore ({e}). Falling back to NumPy Cosine Index.")
            self.faiss_index = None
            if RISK_METADATA_STORE_PATH.exists():
                try:
                    with open(RISK_METADATA_STORE_PATH, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.risk_records = data.get("records", {})
                        self.id_to_event_key = data.get("id_map", [])
                        self.fallback_vectors = data.get("vectors", [])
                except Exception as read_err:
                    logger.warning(f"Could not load risk metadata fallback: {read_err}")

    def _save_store(self):
        """Persists FAISS index / fallback vectors and metadata store to disk."""
        try:
            if self.faiss_index is not None:
                import faiss
                faiss.write_index(self.faiss_index, str(RISK_FAISS_INDEX_PATH))

            with open(RISK_METADATA_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "records": self.risk_records,
                        "id_map": self.id_to_event_key,
                        "vectors": self.fallback_vectors,
                    },
                    f,
                    indent=2,
                )
            logger.info(f"Persisted Risk Vector Store ({len(self.id_to_event_key)} records) to disk.")
        except Exception as e:
            logger.error(f"Error saving Risk Vector store: {e}")

    def add_risk_event(
        self,
        supplier_id: str,
        title: str,
        description: str,
        severity_score: float = 50.0,
        event_type: str = "general_risk",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Embeds and indexes a new supplier risk event into FAISS or NumPy vector store."""
        event_id = f"RISK-EVT-{uuid.uuid4().hex[:8]}"
        full_text = f"Supplier ID: {supplier_id} | Type: {event_type} | Title: {title} | Narrative: {description}"

        vec = self.embedder.embed_text(full_text)
        vec_np = np.array(vec, dtype=np.float32)
        norm = np.linalg.norm(vec_np)
        if norm > 0:
            vec_np = vec_np / norm

        record_data = {
            "event_id": event_id,
            "supplier_id": str(supplier_id),
            "event_type": event_type,
            "title": title,
            "description": description,
            "severity_score": float(severity_score),
            "metadata": metadata or {},
        }

        if self.faiss_index is not None:
            if event_id in self.risk_records:
                idx = self.id_to_event_key.index(event_id)
                self.id_to_event_key[idx] = event_id
            else:
                self.faiss_index.add(np.array([vec_np], dtype=np.float32))
                self.id_to_event_key.append(event_id)
        else:
            vec_list = vec_np.tolist()
            if event_id in self.risk_records:
                idx = self.id_to_event_key.index(event_id)
                self.id_to_event_key[idx] = event_id
                self.fallback_vectors[idx] = vec_list
            else:
                self.fallback_vectors.append(vec_list)
                self.id_to_event_key.append(event_id)

        self.risk_records[event_id] = record_data
        self._save_store()

        return event_id

    def search_supplier_risk_history(
        self,
        supplier_id: Optional[str] = None,
        query: str = "supplier compliance delivery financial risks",
        top_k: int = 5,
    ) -> List[RiskVectorSearchResult]:
        """Performs semantic vector search over historical risk records."""
        results: List[RiskVectorSearchResult] = []

        total_records = self.faiss_index.ntotal if self.faiss_index is not None else len(self.fallback_vectors)
        if total_records == 0:
            return results

        query_vec = self.embedder.embed_text(query)
        query_np = np.array(query_vec, dtype=np.float32)
        norm = np.linalg.norm(query_np)
        if norm > 0:
            query_np = query_np / norm

        # Fetch candidate matches
        if self.faiss_index is not None:
            if supplier_id:
                search_k = total_records if total_records <= 500 else min(top_k * 20, total_records)
            else:
                search_k = min(top_k * 3, total_records)
            scores_raw, indices_raw = self.faiss_index.search(np.array([query_np], dtype=np.float32), search_k)
            scores = scores_raw[0]
            indices = indices_raw[0]
        else:
            matrix = np.array(self.fallback_vectors, dtype=np.float32)
            sim_scores = np.dot(matrix, query_np)
            sorted_indices = np.argsort(sim_scores)[::-1]
            indices = sorted_indices
            scores = sim_scores[sorted_indices]

        for i, idx in enumerate(indices):
            if idx < 0 or idx >= len(self.id_to_event_key):
                continue

            evt_id = self.id_to_event_key[idx]
            rec = self.risk_records.get(evt_id)
            if not rec:
                continue

            # Filter by supplier_id if specified
            if supplier_id and str(rec.get("supplier_id")) != str(supplier_id):
                continue

            sim_score = float(scores[i])
            sim_score = max(0.0, min(1.0, (sim_score + 1.0) / 2.0 if sim_score < 0 else sim_score))

            results.append(
                RiskVectorSearchResult(
                    event_id=rec["event_id"],
                    supplier_id=rec["supplier_id"],
                    event_type=rec["event_type"],
                    title=rec["title"],
                    description=rec["description"],
                    severity_score=rec["severity_score"],
                    similarity_score=round(sim_score, 4),
                )
            )

            if len(results) >= top_k:
                break

        return results


risk_vector_store = RiskVectorStoreService()
