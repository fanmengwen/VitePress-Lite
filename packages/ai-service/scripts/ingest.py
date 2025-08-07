#!/usr/bin/env python3
"""
Document ingestion script for processing markdown files.
Processes documentation files and stores them in the vector database.
"""

import asyncio
import sys
import time
from pathlib import Path
from typing import List, Optional
import argparse
from loguru import logger

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config.settings import settings
from src.models.document import ProcessedDocument, IngestionResult, DocumentChunk
from src.utils.preprocessing import default_preprocessor
from src.utils.chunking import default_chunker, ChunkingConfig
from src.services.vector_store import vector_store
from src.services.embedding import embedding_service


class DocumentIngester:
    """Document ingestion service for processing and storing markdown files."""
    
    def __init__(self, docs_path: Optional[str] = None):
        self.docs_path = Path(docs_path or settings.docs_path)
        self.chunking_config = ChunkingConfig(
            max_chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )
        
        # Statistics
        self.stats = {
            "files_found": 0,
            "files_processed": 0,
            "files_skipped": 0,
            "chunks_created": 0,
            "vectors_stored": 0,
            "errors": []
        }
    
    async def ingest_all_documents(
        self, 
        clear_existing: bool = False,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None
    ) -> IngestionResult:
        """
        Ingest all markdown documents from the docs directory.
        
        Args:
            clear_existing: Whether to clear existing documents first
            include_patterns: File patterns to include (e.g., ['*.md'])
            exclude_patterns: File patterns to exclude
            
        Returns:
            Ingestion result with statistics
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
        batch_size = 10  # Process 10 files at a time
        all_chunks = []
        
        for i in range(0, len(markdown_files), batch_size):
            batch = markdown_files[i:i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(markdown_files) + batch_size - 1)//batch_size}")
            
            batch_chunks = await self._process_file_batch(batch)
            all_chunks.extend(batch_chunks)
            
            # Store chunks in vector database
            if batch_chunks:
                stored_count = await vector_store.add_documents(batch_chunks)
                self.stats["vectors_stored"] += stored_count
                logger.info(f"Stored {stored_count} chunks from batch")
        
        processing_time = time.time() - start_time
        logger.info(f"Document ingestion completed in {processing_time:.2f} seconds")
        
        return self._create_result(start_time)
    
    async def ingest_single_file(self, file_path: str) -> ProcessedDocument:
        """
        Ingest a single markdown file.
        
        Args:
            file_path: Path to the markdown file
            
        Returns:
            Processed document with chunks
        """
        await self._initialize_services()
        
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not file_path_obj.suffix.lower() == '.md':
            raise ValueError(f"File must be a markdown file: {file_path}")
        
        logger.info(f"Processing single file: {file_path}")
        
        # Process the file
        processed_doc = await self._process_single_file(file_path_obj)
        
        # Store in vector database
        if processed_doc.chunks:
            stored_count = await vector_store.add_documents(processed_doc.chunks)
            logger.info(f"Stored {stored_count} chunks from {file_path}")
        
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
        exclude_patterns: Optional[List[str]] = None
    ) -> List[Path]:
        """Find all markdown files in the docs directory."""
        
        if not self.docs_path.exists():
            logger.error(f"Documentation path does not exist: {self.docs_path}")
            return []
        
        # Default patterns
        include_patterns = include_patterns or ["*.md"]
        exclude_patterns = exclude_patterns or ["README.md", ".*"]
        
        markdown_files = []
        
        for pattern in include_patterns:
            found_files = list(self.docs_path.rglob(pattern))
            markdown_files.extend(found_files)
        
        # Filter out excluded patterns
        filtered_files = []
        for file_path in markdown_files:
            should_exclude = False
            
            for exclude_pattern in exclude_patterns:
                if file_path.name.startswith('.') or file_path.match(exclude_pattern):
                    should_exclude = True
                    break
            
            if not should_exclude:
                filtered_files.append(file_path)
        
        # Remove duplicates and sort
        unique_files = list(set(filtered_files))
        unique_files.sort()
        
        return unique_files
    
    async def _process_file_batch(self, files: List[Path]) -> List[DocumentChunk]:
        """Process a batch of files and return all chunks."""
        tasks = [self._process_single_file(file_path) for file_path in files]
        processed_docs = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_chunks = []
        
        for i, result in enumerate(processed_docs):
            if isinstance(result, Exception):
                error_msg = f"Failed to process {files[i]}: {result}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)
                self.stats["files_skipped"] += 1
            else:
                all_chunks.extend(result.chunks)
                self.stats["files_processed"] += 1
                self.stats["chunks_created"] += len(result.chunks)
        
        return all_chunks
    
    async def _process_single_file(self, file_path: Path) -> ProcessedDocument:
        """Process a single markdown file."""
        try:
            logger.debug(f"Processing file: {file_path}")
            
            # Read and preprocess file
            content, metadata = default_preprocessor.process_file(file_path)
            
            # Skip unpublished documents
            if not metadata.published:
                logger.info(f"Skipping unpublished document: {file_path}")
                return ProcessedDocument(
                    document_path=str(file_path),
                    metadata=metadata,
                    raw_content=content,
                    chunks=[],
                    file_size=file_path.stat().st_size,
                    word_count=len(content.split())
                )
            
            # Create chunks
            chunks = default_chunker.chunk_document(
                content=content,
                document_path=str(file_path),
                metadata=metadata
            )
            
            logger.debug(f"Created {len(chunks)} chunks from {file_path}")
            
            return ProcessedDocument(
                document_path=str(file_path),
                metadata=metadata,
                raw_content=content,
                chunks=chunks,
                file_size=file_path.stat().st_size,
                word_count=len(content.split())
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
            skipped_files=[f"Skipped {self.stats['files_skipped']} files"]
        )


async def main():
    """Main CLI interface for document ingestion."""
    parser = argparse.ArgumentParser(description="Ingest documentation files into vector database")
    
    parser.add_argument(
        "--docs-path",
        type=str,
        default=None,
        help="Path to documentation directory"
    )
    
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing documents before ingestion"
    )
    
    parser.add_argument(
        "--file",
        type=str,
        help="Process a single file instead of the entire directory"
    )
    
    parser.add_argument(
        "--include",
        nargs="+",
        default=["*.md"],
        help="File patterns to include"
    )
    
    parser.add_argument(
        "--exclude",
        nargs="+",
        default=["README.md", ".*"],
        help="File patterns to exclude"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = "DEBUG" if args.verbose else "INFO"
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True
    )
    
    # Create ingester
    ingester = DocumentIngester(args.docs_path)
    
    try:
        if args.file:
            # Process single file
            logger.info(f"Processing single file: {args.file}")
            processed_doc = await ingester.ingest_single_file(args.file)
            
            logger.info(f"✅ Successfully processed {args.file}")
            logger.info(f"   - Title: {processed_doc.metadata.title}")
            logger.info(f"   - Chunks: {len(processed_doc.chunks)}")
            logger.info(f"   - Word count: {processed_doc.word_count}")
            
        else:
            # Process all files
            result = await ingester.ingest_all_documents(
                clear_existing=args.clear,
                include_patterns=args.include,
                exclude_patterns=args.exclude
            )
            
            # Print results
            logger.info("📊 Ingestion Results:")
            logger.info(f"   - Documents processed: {result.documents_processed}")
            logger.info(f"   - Chunks created: {result.chunks_created}")
            logger.info(f"   - Vectors stored: {result.vectors_stored}")
            logger.info(f"   - Processing time: {result.processing_time_seconds:.2f}s")
            logger.info(f"   - Success rate: {result.success_rate:.1f}%")
            
            if result.errors:
                logger.warning(f"   - Errors: {len(result.errors)}")
                for error in result.errors[:5]:  # Show first 5 errors
                    logger.warning(f"     • {error}")
                if len(result.errors) > 5:
                    logger.warning(f"     ... and {len(result.errors) - 5} more errors")
        
        logger.info("🎉 Document ingestion completed successfully!")
        
    except KeyboardInterrupt:
        logger.warning("❌ Ingestion cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Ingestion failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 