"""
Document ingestion service for processing markdown files with incremental updates.
Moves logic out of scripts/ into a reusable service and supports deduplicated upserts.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import List, Optional, Tuple
import hashlib
from loguru import logger

from ai_service.config.settings import settings
from ai_service.models.document import ProcessedDocument, IngestionResult, DocumentChunk
from ai_service.utils.preprocessing import default_preprocessor
from ai_service.utils.chunking import default_chunker, ChunkingConfig
from ai_service.services.vector_store import vector_store
from ai_service.services.embedding import embedding_service


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


class DocumentIngester:
    """Document ingestion service for processing and storing markdown files with upsert semantics."""

    def __init__(self, docs_path: Optional[str] = None):
        self.docs_path = Path(docs_path or settings.docs_path)
        self.chunking_config = ChunkingConfig(
            max_chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        # Statistics
        self.stats = {
            "files_found": 0,
            "files_processed": 0,
            "files_skipped": 0,
            "chunks_created": 0,
            "vectors_stored": 0,
            "errors": [],
        }

    async def ingest_all_documents(
        self,
        clear_existing: bool = False,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
    ) -> IngestionResult:
        """
        Ingest all markdown documents from the docs directory with incremental upsert.

        If the file content hash matches the stored hash, skip re-indexing.
        """
        start_time = time.time()

        logger.info(f"Starting document ingestion from: {self.docs_path}")

        # Initialize services
        await self._initialize_services()

        # Clear existing documents if requested
        if clear_existing:
            logger.info("Clearing existing documents...")
            await vector_store.clear_collection()

        # Find markdown files
        markdown_files = self._find_markdown_files(include_patterns, exclude_patterns)
        self.stats["files_found"] = len(markdown_files)

        logger.info(f"Found {len(markdown_files)} markdown files to process")

        if not markdown_files:
            logger.warning("No markdown files found!")
            return self._create_result(start_time)

        # Process files in batches
        batch_size = 10
        for i in range(0, len(markdown_files), batch_size):
            batch = markdown_files[i : i + batch_size]
            logger.info(
                f"Processing batch {i//batch_size + 1}/{(len(markdown_files) + batch_size - 1)//batch_size}"
            )

            await self._process_file_batch_upsert(batch)

        processing_time = time.time() - start_time
        logger.info(f"Document ingestion completed in {processing_time:.2f} seconds")

        return self._create_result(start_time)

    async def ingest_single_file(self, file_path: str) -> ProcessedDocument:
        """
        Ingest a single markdown file with upsert semantics.
        """
        await self._initialize_services()

        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not file_path_obj.suffix.lower() == ".md":
            raise ValueError(f"File must be a markdown file: {file_path}")

        logger.info(f"Processing single file: {file_path}")

        # Process the file
        processed_doc = await self._process_single_file(file_path_obj)

        # Compute file hash and upsert
        file_hash = compute_file_hash(
            file_path_obj, self.chunking_config, embedding_service.model_name
        )
        added = await vector_store.upsert_documents(
            processed_doc.document_path, processed_doc.chunks, file_hash
        )
        if added:
            self.stats["vectors_stored"] += added

        return processed_doc

    async def _initialize_services(self) -> None:
        """Initialize required services."""
        logger.info("Initializing services...")
        await embedding_service.initialize()
        await vector_store.initialize()
        logger.info("Services initialized")

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

    async def _process_file_batch_upsert(self, files: List[Path]) -> None:
        """Process a batch of files and perform upsert into the vector store."""
        tasks = [self._process_single_file(file_path) for file_path in files]
        processed_docs = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(processed_docs):
            file_path = str(files[i])
            if isinstance(result, Exception):
                error_msg = f"Failed to process {file_path}: {result}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)
                self.stats["files_skipped"] += 1
                continue

            # Skip unpublished documents entirely
            if not result.metadata.published or not result.chunks:
                logger.info(f"Skipping unpublished/empty document: {file_path}")
                self.stats["files_skipped"] += 1
                continue

            # Compute file hash and upsert (delete then add if changed)
            file_hash = compute_file_hash(
                Path(result.document_path), self.chunking_config, embedding_service.model_name
            )
            added = await vector_store.upsert_documents(
                result.document_path, result.chunks, file_hash
            )
            if added == 0:
                # Unchanged
                self.stats["files_skipped"] += 1
            else:
                self.stats["files_processed"] += 1
                self.stats["chunks_created"] += len(result.chunks)
                self.stats["vectors_stored"] += added

    async def _process_single_file(self, file_path: Path) -> ProcessedDocument:
        """Process a single markdown file into chunks."""
        try:
            logger.debug(f"Processing file: {file_path}")

            # Read and preprocess file
            content, metadata = default_preprocessor.process_file(file_path)

            # Create chunks (even if unpublished to return stats, but will skip upsert)
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

        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            raise

    def _create_result(self, start_time: float) -> IngestionResult:
        """Create ingestion result from statistics."""
        processing_time = time.time() - start_time

        return IngestionResult(
            documents_processed=self.stats["files_processed"],
            chunks_created=self.stats["chunks_created"],
            vectors_stored=self.stats["vectors_stored"],
            processing_time_seconds=processing_time,
            errors=self.stats["errors"],
            skipped_files=[f"Skipped {self.stats['files_skipped']} files"],
        )


