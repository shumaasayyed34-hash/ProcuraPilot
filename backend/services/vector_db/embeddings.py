"""
Embedding Generator Pipeline (Phase 2 Task I2.2)
Generates vector embeddings using SentenceTransformers, OpenAI, or dense fallback encoder.
"""

import os
import hashlib
import logging
from typing import List, Optional
import numpy as np

logger = logging.getLogger("procurapilot.embeddings")


class EmbeddingService:
    """Configures embedding model and generates dense vector representations for document chunks."""

    def __init__(
        self,
        provider: str = os.getenv("EMBEDDING_PROVIDER", "sentence-transformers"),
        model_name: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
    ):
        self.provider = provider.lower()
        self.model_name = model_name
        self.st_model = None
        self.dimension = 384  # Default for all-MiniLM-L6-v2
        self._initialized = False

    def _ensure_model(self):
        if not self._initialized:
            self._initialized = True
            self._init_model()

    def _init_model(self):
        """Initializes selected embedding model with graceful fallback handling."""
        if self.provider == "sentence-transformers":
            try:
                from sentence_transformers import SentenceTransformer
                self.st_model = SentenceTransformer(self.model_name)
                self.dimension = self.st_model.get_sentence_embedding_dimension()
                logger.info(f"SentenceTransformers model '{self.model_name}' initialized (Dim: {self.dimension}).")
            except Exception as err:
                logger.warning(
                    f"Could not load SentenceTransformers ('{err}'). "
                    f"Falling back to deterministic dense vector encoder."
                )
                self.st_model = None
                self.dimension = 384

        elif self.provider == "openai":
            self.dimension = 1536
            logger.info("OpenAI embedding service selected (Dim: 1536).")

    def embed_text(self, text: str) -> List[float]:
        """Generates a dense vector embedding for a single text string."""
        self._ensure_model()
        vectors = self.embed_batch([text])
        return vectors[0] if vectors else [0.0] * self.dimension

    def encode_single(self, text: str) -> List[float]:
        return self.embed_text(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates dense vector embeddings for a list of text strings."""
        if not texts:
            return []
        self._ensure_model()
        return self._do_embed_batch(texts)

    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        return self.embed_batch(texts)

    def get_dimension(self) -> int:
        return self.dimension

    def _do_embed_batch(self, texts: List[str]) -> List[List[float]]:
        self._ensure_model()

        # 1. SentenceTransformers local execution
        if self.provider == "sentence-transformers" and self.st_model is not None:
            try:
                embeddings = self.st_model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as st_err:
                logger.error(f"SentenceTransformers encoding error: {st_err}")

        # 2. OpenAI Cloud Embeddings execution
        if self.provider == "openai" and os.getenv("OPENAI_API_KEY"):
            try:
                from openai import OpenAI
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                resp = client.embeddings.create(input=texts, model="text-embedding-3-small")
                return [data.embedding for data in resp.data]
            except Exception as oa_err:
                logger.error(f"OpenAI embedding API error: {oa_err}")

        # 3. Deterministic dense vector fallback for offline/test environments
        return [self._fallback_dense_vector(t, dim=self.dimension) for t in texts]

    def _fallback_dense_vector(self, text: str, dim: int = 384) -> List[float]:
        """Generates L2-normalized deterministic dense vector from text hash."""
        if not text:
            return [0.0] * dim

        # Use SHA-256 seed to build reproducible pseudo-random vector
        seed_bytes = hashlib.sha256(text.encode("utf-8")).digest()
        seed_int = int.from_bytes(seed_bytes[:4], "big")
        rng = np.random.RandomState(seed_int)

        raw_vec = rng.randn(dim).astype(np.float32)
        norm = np.linalg.norm(raw_vec)
        if norm > 0:
            raw_vec = raw_vec / norm

        return raw_vec.tolist()


embedding_service = EmbeddingService()
