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

        self._init_faiss()

    def _init_faiss(self):
        """Initializes or loads dedicated FAISS index for risk records."""
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
            logger.error(f"Failed to initialize FAISS for RiskVectorStore: {e}")
            self.faiss_index = None

    def _save_store(self):
        """Persists FAISS index and metadata store to disk."""
        if self.faiss_index is None:
            return
        try:
            import faiss

            faiss.write_index(self.faiss_index, str(RISK_FAISS_INDEX_PATH))
            with open(RISK_METADATA_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "records": self.risk_records,
                        "id_map": self.id_to_event_key,
                    },
                    f,
                    indent=2,
                )
            logger.info(f"Persisted Risk FAISS index ({self.faiss_index.ntotal} records) to disk.")
        except Exception as e:
            logger.error(f"Error saving Risk FAISS store: {e}")

    def add_risk_event(
        self,
        supplier_id: str,
        title: str,
        description: str,
        severity_score: float = 50.0,
        event_type: str = "general_risk",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Embeds and indexes a new supplier risk event into FAISS vector store."""
        event_id = f"RISK-EVT-{uuid.uuid4().hex[:8]}"
        full_text = f"Supplier ID: {supplier_id} | Type: {event_type} | Title: {title} | Narrative: {description}"

        vec = self.embedder.embed_text(full_text)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

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
                # Update existing
                idx = self.id_to_event_key.index(event_id)
                self.id_to_event_key[idx] = event_id
            else:
                self.faiss_index.add(np.array([vec], dtype=np.float32))
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

        if self.faiss_index is None or self.faiss_index.ntotal == 0:
            return results

        query_vec = self.embedder.embed_text(query)
        norm = np.linalg.norm(query_vec)
        if norm > 0:
            query_vec = query_vec / norm

        # Fetch candidate matches from FAISS with expanded candidate pool for supplier filtering
        if supplier_id:
            search_k = self.faiss_index.ntotal if self.faiss_index.ntotal <= 500 else min(top_k * 20, self.faiss_index.ntotal)
        else:
            search_k = min(top_k * 3, self.faiss_index.ntotal)
        scores, indices = self.faiss_index.search(np.array([query_vec], dtype=np.float32), search_k)

        for i, idx in enumerate(indices[0]):
            if idx < 0 or idx >= len(self.id_to_event_key):
                continue

            evt_id = self.id_to_event_key[idx]
            rec = self.risk_records.get(evt_id)
            if not rec:
                continue

            # Filter by supplier_id if specified
            if supplier_id and str(rec.get("supplier_id")) != str(supplier_id):
                continue

            sim_score = float(scores[0][i])
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
