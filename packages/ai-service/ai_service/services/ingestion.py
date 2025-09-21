"""
Document ingestion service for processing markdown files with incremental upserts.

Design goals:
- Encourage dependency injection for external services (embedding, vector store)
- Prefer stateless orchestration; return results instead of mutating instance state
- Keep clear responsibilities and readable control flow
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import List, Optional, Tuple
from dataclasses import dataclass
import hashlib
from loguru import logger

from ai_service.config.settings import settings
from ai_service.models.document import ProcessedDocument, IngestionResult, DocumentChunk
from ai_service.utils.preprocessing import default_preprocessor
from ai_service.utils.chunking import default_chunker, ChunkingConfig
from ai_service.services.vector_store import vector_store, VectorStoreService
from ai_service.services.embedding import embedding_service, EmbeddingService


def compute_file_hash(
    file_path: Path,
    chunking_config: ChunkingConfig,
    embedding_model_name: str,
) -> str:
    """Compute a stable hash for the file content and relevant processing config.
    Include chunking and embedding model so changes trigger re-index.
    """
    content_bytes = file_path.read_bytes()
    hasher = hashlib.sha256()
    hasher.update(content_bytes)
    hasher.update(str(chunking_config.max_chunk_size).encode("utf-8"))
    hasher.update(str(chunking_config.chunk_overlap).encode("utf-8"))
    hasher.update(str(chunking_config.respect_headings).encode("utf-8"))
    hasher.update(embedding_model_name.encode("utf-8"))
    return hasher.hexdigest()


def _process_file_to_document(file_path: Path) -> ProcessedDocument:
    """Convert a markdown file into a ProcessedDocument with chunks."""
    logger.debug(f"Processing file: {file_path}")

    content, metadata = default_preprocessor.process_file(file_path)

    chunks: List[DocumentChunk] = []
    if metadata.published:
        chunks = default_chunker.chunk_document(
            content=content,
            document_path=str(file_path),
            metadata=metadata,
        )

    logger.debug(f"Created {len(chunks)} chunks from {file_path}")

    return ProcessedDocument(
        document_path=str(file_path),
        metadata=metadata,
        raw_content=content,
        chunks=chunks,
        file_size=file_path.stat().st_size,
        word_count=len(content.split()),
    )


class DocumentIngester:
    def __init__(
        self,
        docs_path: Optional[str] = None,
        *,
        embedding: Optional[EmbeddingService] = None,
        vector: Optional[VectorStoreService] = None,
        chunking_config: Optional[ChunkingConfig] = None,
    ) -> None:
        self.docs_path = Path(docs_path or settings.docs_path)
        self.embedding = embedding or embedding_service
        self.vector = vector or vector_store
        self.chunking_config = chunking_config or ChunkingConfig(
            max_chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        # Execution controls resolved from settings only
        self.file_paths: Optional[List[str]] = None
        self.include_patterns: Optional[List[str]] = None
        self.exclude_patterns: Optional[List[str]] = None

    @dataclass
    class IngestionPlan:
        docs_path: Path
        files: List[Path]

    async def prepare(self) -> "DocumentIngester.IngestionPlan":
        """Prepare ingestion by initializing dependencies and resolving markdown files."""
        logger.info("Initializing services...")
        await self.embedding.initialize()
        await self.vector.initialize()
        logger.info("Services initialized")

        files = self._find_markdown_files(self.include_patterns, self.exclude_patterns)

        logger.info(f"Prepared {len(files)} markdown files for ingestion")
        return DocumentIngester.IngestionPlan(docs_path=self.docs_path, files=files)

    def _find_markdown_files(
        self,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
    ) -> List[Path]:
        """Find all markdown files in the docs directory."""

        if not self.docs_path.exists():
            logger.error(f"Documentation path does not exist: {self.docs_path}")
            return []

        include_patterns = include_patterns or ["*.md"]
        exclude_patterns = exclude_patterns or ["README.md", ".*"]

        markdown_files: List[Path] = []
        for pattern in include_patterns:
            markdown_files.extend(self.docs_path.rglob(pattern))

        # Filter out excluded patterns
        filtered_files: List[Path] = []
        for file_path in markdown_files:
            should_exclude = False
            for exclude_pattern in exclude_patterns:
                if file_path.name.startswith(".") or file_path.match(exclude_pattern):
                    should_exclude = True
                    break
            if not should_exclude:
                filtered_files.append(file_path)

        # Remove duplicates and sort
        unique_files = list(set(filtered_files))
        unique_files.sort()
        return unique_files

    async def run_ingestion(self) -> IngestionResult:
        """Execute full-directory ingestion with incremental upsert semantics."""

        start_time = time.time()
        logger.info(f"Starting document ingestion from: {self.docs_path}")

        plan = await self.prepare()

        stats = {
            "files_found": len(plan.files),
            "files_processed": 0,
            "files_skipped": 0,
            "chunks_created": 0,
            "vectors_stored": 0,
            "errors": [],
        }

        if not plan.files:
            logger.warning("No markdown files found!")
            return self._create_result(start_time, stats)

        batch_size = max(1, int(getattr(settings, "max_concurrent_requests", 10)))
        total_batches = (len(plan.files) + batch_size - 1) // batch_size
        for i in range(0, len(plan.files), batch_size):
            batch = plan.files[i : i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{total_batches}")

            batch_stats = await self._process_file_batch_upsert(batch)
            stats["files_processed"] += batch_stats["files_processed"]
            stats["files_skipped"] += batch_stats["files_skipped"]
            stats["chunks_created"] += batch_stats["chunks_created"]
            stats["vectors_stored"] += batch_stats["vectors_stored"]
            stats["errors"].extend(batch_stats["errors"])

        processing_time = time.time() - start_time
        logger.info(f"Document ingestion completed in {processing_time:.2f} seconds")

        return self._create_result(start_time, stats)

    def _create_result(self, start_time: float, stats: dict) -> IngestionResult:
        """Create ingestion result from local aggregation statistics."""
        processing_time = time.time() - start_time
        return IngestionResult(
            documents_processed=stats["files_processed"],
            chunks_created=stats["chunks_created"],
            vectors_stored=stats["vectors_stored"],
            processing_time_seconds=processing_time,
            errors=stats["errors"],
            skipped_files=[f"Skipped {stats['files_skipped']} files"],
        )

    async def _process_file_batch_upsert(self, files: List[Path]) -> dict:
        """Process a batch of files and perform upsert into the vector store.

        Returns an aggregation dict for this batch.
        """
        tasks = [
            asyncio.to_thread(_process_file_to_document, file_path)
            for file_path in files
        ]
        processed_docs = await asyncio.gather(*tasks, return_exceptions=True)

        stats = {
            "files_processed": 0,
            "files_skipped": 0,
            "chunks_created": 0,
            "vectors_stored": 0,
            "errors": [],
        }

        for i, result in enumerate(processed_docs):
            file_path = str(files[i])
            if isinstance(result, Exception):
                error_msg = f"Failed to process {file_path}: {result}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)
                stats["files_skipped"] += 1
                continue

            # Skip unpublished or empty
            if not result.metadata.published or not result.chunks:
                logger.info(f"Skipping unpublished/empty document: {file_path}")
                stats["files_skipped"] += 1
                continue

            file_hash = compute_file_hash(
                Path(result.document_path),
                self.chunking_config,
                self.embedding.model_name,
            )
            added = await self.vector.upsert_documents(
                result.document_path, result.chunks, file_hash
            )
            if added == 0:
                stats["files_skipped"] += 1
            else:
                stats["files_processed"] += 1
                stats["chunks_created"] += len(result.chunks)
                stats["vectors_stored"] += added

        return stats
