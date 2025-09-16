"""
Embedding service for converting text to vector representations.
Uses sentence-transformers with caching and batch processing.
"""

import asyncio
from typing import List, Union, Optional
from functools import lru_cache
import numpy as np
from sentence_transformers import SentenceTransformer
from loguru import logger

from ai_service.config.settings import settings


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.embedding_model
        self.model: Optional[SentenceTransformer] = None
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Initialize the embedding model."""
        if self.model is not None:
            return

        async with self._lock:
            if self.model is not None:
                return

            logger.info(f"Loading embedding model: {self.model_name}")

            # Load model in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None, self._load_model, self.model_name
            )

            logger.info(
                f"Embedding model loaded successfully. Dimension: {self.get_dimension()}"
            )

    def _load_model(self, model_name: str) -> SentenceTransformer:
        """Load the sentence transformer model."""
        return SentenceTransformer(model_name)

    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Input text to embed

        Returns:
            Embedding vector as list of floats
        """
        if not text.strip():
            return [0.0] * self.get_dimension()

        await self.initialize()

        # Run embedding in thread pool
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(None, self._generate_embedding, text)

        return embedding.tolist()

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Args:
            texts: List of input texts to embed

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        await self.initialize()

        # Filter out empty texts but keep track of indices
        non_empty_texts = []
        text_indices = []

        for i, text in enumerate(texts):
            if text.strip():
                non_empty_texts.append(text)
                text_indices.append(i)

        if not non_empty_texts:
            return [[0.0] * self.get_dimension()] * len(texts)

        # Generate embeddings for non-empty texts
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None, self._generate_batch_embeddings, non_empty_texts
        )

        # Reconstruct full results with zeros for empty texts
        result = []
        embedding_idx = 0

        for i, text in enumerate(texts):
            if text.strip():
                result.append(embeddings[embedding_idx].tolist())
                embedding_idx += 1
            else:
                result.append([0.0] * self.get_dimension())

        return result

    def _generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for single text."""
        return self.model.encode(text, convert_to_numpy=True)

    def _generate_batch_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for batch of texts."""
        return self.model.encode(texts, convert_to_numpy=True, batch_size=32)

    def get_dimension(self) -> int:
        """Get the embedding dimension."""
        if self.model is None:
            return settings.embedding_dimension
        return self.model.get_sentence_embedding_dimension()

    def get_model_info(self) -> dict:
        """Get information about the embedding model."""
        return {
            "model_name": self.model_name,
            "dimension": self.get_dimension(),
            "max_seq_length": getattr(self.model, "max_seq_length", None)
            if self.model
            else None,
            "is_loaded": self.model is not None,
        }

    async def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Cosine similarity score between 0 and 1
        """
        embeddings = await self.embed_batch([text1, text2])

        # Convert to numpy arrays
        emb1 = np.array(embeddings[0])
        emb2 = np.array(embeddings[1])

        # Compute cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

        # Ensure similarity is between 0 and 1
        return max(0.0, min(1.0, float(similarity)))

    @lru_cache(maxsize=1000)
    def _cached_embed_text_sync(self, text: str) -> tuple:
        """Cached synchronous embedding for frequently used texts."""
        if self.model is None:
            raise RuntimeError("Model not initialized")

        embedding = self._generate_embedding(text)
        return tuple(embedding.tolist())

    async def embed_with_cache(self, text: str) -> List[float]:
        """
        Generate embedding with caching for frequently used texts.

        Args:
            text: Input text to embed

        Returns:
            Embedding vector as list of floats
        """
        await self.initialize()

        # Use cached version for better performance
        try:
            embedding_tuple = self._cached_embed_text_sync(text)
            return list(embedding_tuple)
        except Exception as e:
            logger.warning(f"Cache failed, falling back to regular embedding: {e}")
            return await self.embed_text(text)


# Global embedding service instance
embedding_service = EmbeddingService()
