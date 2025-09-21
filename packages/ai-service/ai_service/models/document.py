"""
Document models for processing and storing documentation content.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from pathlib import Path

from ai_service.config.settings import settings


class DocumentMetadata(BaseModel):
    """Metadata extracted from document frontmatter."""
    
    title: Optional[str] = Field(default=None, description="Document title")
    author: Optional[str] = Field(default=None, description="Document author")
    date: Optional[str] = Field(default=None, description="Document date")
    published: Optional[bool] = Field(default=True, description="Publication status")
    excerpt: Optional[str] = Field(default=None, description="Document excerpt")
    tags: List[str] = Field(default=[], description="Document tags")
    extra: Dict[str, Any] = Field(default={}, description="Additional metadata")


class DocumentChunk(BaseModel):
    """A chunk of document content with metadata."""
    
    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_path: str = Field(..., description="Source document path")
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Chunk content")
    chunk_index: int = Field(..., description="Index of chunk within document")
    start_char: int = Field(..., description="Start character position")
    end_char: int = Field(..., description="End character position")
    heading: Optional[str] = Field(default=None, description="Section heading")
    heading_level: Optional[int] = Field(default=None, description="Heading level (1-6)")
    metadata: DocumentMetadata = Field(..., description="Document metadata")
    word_count: int = Field(..., description="Number of words in chunk")
    created_at: datetime = Field(default_factory=datetime.now)
    
    @property
    def file_name(self) -> str:
        """Get the filename from document path."""
        return Path(self.document_path).name
    
    @property
    def relative_path(self) -> str:
        """Get relative path for UI display."""
        docs_root = Path(settings.docs_path)
        try:
            docs_root_resolved = docs_root.resolve()
        except Exception:
            docs_root_resolved = docs_root

        doc_path = Path(self.document_path)
        try:
            doc_path_resolved = doc_path.resolve()
        except Exception:
            doc_path_resolved = doc_path

        try:
            relative = doc_path_resolved.relative_to(docs_root_resolved)
            return relative.as_posix()
        except Exception:
            doc_str = str(self.document_path).replace("\\", "/")
            root_str = str(docs_root_resolved).rstrip("/").replace("\\", "/")
            if doc_str.startswith(root_str):
                trimmed = doc_str[len(root_str):].lstrip("/")
                if trimmed:
                    return trimmed
            return doc_path.name

class ProcessedDocument(BaseModel):
    """A fully processed document with chunks."""
    
    document_path: str = Field(..., description="Source document path")
    metadata: DocumentMetadata = Field(..., description="Document metadata")
    raw_content: str = Field(..., description="Raw markdown content")
    chunks: List[DocumentChunk] = Field(..., description="Document chunks")
    processed_at: datetime = Field(default_factory=datetime.now)
    file_size: int = Field(..., description="File size in bytes")
    word_count: int = Field(..., description="Total word count")
    
    @property
    def chunk_count(self) -> int:
        """Get number of chunks."""
        return len(self.chunks)


class VectorDocument(BaseModel):
    """Document representation in vector database."""
    
    id: str = Field(..., description="Document ID in vector DB")
    chunk_id: str = Field(..., description="Original chunk ID")
    embedding: Optional[List[float]] = Field(default=None, description="Embedding vector")
    metadata: Dict[str, Any] = Field(..., description="Searchable metadata")
    
    class Config:
        # Allow arbitrary types for embedding
        arbitrary_types_allowed = True


class IngestionResult(BaseModel):
    """Result of document ingestion process."""
    
    documents_processed: int = Field(..., description="Number of documents processed")
    chunks_created: int = Field(..., description="Number of chunks created")
    vectors_stored: int = Field(..., description="Number of vectors stored")
    processing_time_seconds: float = Field(..., description="Total processing time")
    errors: List[str] = Field(default=[], description="Processing errors")
    skipped_files: List[str] = Field(default=[], description="Skipped files")
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        total = self.documents_processed + len(self.skipped_files)
        return (self.documents_processed / total * 100) if total > 0 else 0.0 
