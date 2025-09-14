"""
Pytest configuration and fixtures for AI service testing.
"""

import asyncio
import pytest
import tempfile
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

from ai_service.config.settings import Settings
from ai_service.models.document import DocumentMetadata, DocumentChunk
from ai_service.services.embedding import EmbeddingService
from ai_service.services.vector_store import VectorStoreService
from ai_service.services.llm import LLMService
from ai_service.services.rag import RAGPipeline


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_settings():
    """Create test settings with temporary paths."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Settings(
            environment="testing",
            chromadb_path=f"{temp_dir}/chroma_test",
            docs_path=f"{temp_dir}/docs",
            llm_provider="openai",
            openai_api_key="test-key",
            embedding_model="all-MiniLM-L6-v2",
            log_level="DEBUG"
        )


@pytest.fixture
def sample_document_metadata():
    """Create sample document metadata."""
    return DocumentMetadata(
        title="Test Document",
        author="Test Author",
        date="2025-01-01",
        published=True,
        excerpt="Test excerpt",
        tags=["test", "documentation"]
    )


@pytest.fixture
def sample_document_chunk(sample_document_metadata):
    """Create sample document chunk."""
    return DocumentChunk(
        chunk_id="test-doc.md#0",
        document_path="test-doc.md",
        title="Test Document",
        content="This is a test document content about Vite configuration.",
        chunk_index=0,
        start_char=0,
        end_char=50,
        heading="Configuration",
        heading_level=2,
        metadata=sample_document_metadata,
        word_count=10
    )


@pytest.fixture
def sample_chunks(sample_document_metadata):
    """Create multiple sample document chunks."""
    chunks = []
    contents = [
        "Vite is a build tool that provides fast development server.",
        "HMR (Hot Module Replacement) updates modules without full reload.",
        "Proxy configuration allows forwarding API requests to backend.",
        "Dependencies are pre-bundled using esbuild for performance.",
        "Plugin system extends Vite functionality with custom logic."
    ]
    
    for i, content in enumerate(contents):
        chunk = DocumentChunk(
            chunk_id=f"test-doc.md#{i}",
            document_path="test-doc.md",
            title="Test Document",
            content=content,
            chunk_index=i,
            start_char=i * 100,
            end_char=(i + 1) * 100,
            heading=f"Section {i + 1}",
            heading_level=2,
            metadata=sample_document_metadata,
            word_count=len(content.split())
        )
        chunks.append(chunk)
    
    return chunks


@pytest.fixture
async def mock_embedding_service():
    """Create mock embedding service."""
    service = AsyncMock(spec=EmbeddingService)
    service.initialize.return_value = None
    service.embed_text.return_value = [0.1] * 384  # Mock 384-dim embedding
    service.embed_batch.return_value = [[0.1] * 384, [0.2] * 384]
    service.get_dimension.return_value = 384
    service.compute_similarity.return_value = 0.8
    return service


@pytest.fixture
async def mock_vector_store():
    """Create mock vector store service."""
    service = AsyncMock(spec=VectorStoreService)
    service.initialize.return_value = None
    service.add_documents.return_value = 5
    service.search_similar.return_value = []
    service.get_collection_stats.return_value = {
        "total_documents": 10,
        "unique_authors": 2,
        "unique_titles": 5,
        "collection_name": "test_collection"
    }
    service.clear_collection.return_value = True
    service.delete_documents.return_value = 3
    return service


@pytest.fixture
async def mock_llm_service():
    """Create mock LLM service."""
    service = AsyncMock(spec=LLMService)
    service.initialize.return_value = None
    service.generate_response.return_value = "This is a test response about Vite configuration."
    service.check_health.return_value = {
        "status": "healthy",
        "provider": "openai",
        "model": "gpt-3.5-turbo"
    }
    service.close.return_value = None
    return service


@pytest.fixture
async def mock_rag_pipeline():
    """Create mock RAG pipeline."""
    from ai_service.models.chat import ChatResponse, SourceReference
    
    pipeline = AsyncMock(spec=RAGPipeline)
    
    # Mock response
    mock_response = ChatResponse(
        answer="Test answer about Vite configuration",
        sources=[
            SourceReference(
                title="Test Document",
                file_path="test-doc.md",
                chunk_index=0,
                similarity_score=0.85,
                content_preview="Vite configuration preview..."
            )
        ],
        confidence_score=0.9,
        response_time_ms=500
    )
    
    pipeline.process_chat_request.return_value = mock_response
    pipeline.get_system_info.return_value = {
        "vector_store": {"total_documents": 10},
        "llm_service": {"status": "healthy"},
        "config": {"retrieval_top_k": 5}
    }
    
    return pipeline


@pytest.fixture
def test_markdown_content():
    """Create test markdown content."""
    return """---
title: "Test Vite Guide"
author: "test@example.com"
date: "2025-01-01"
published: true
tags: ["vite", "configuration"]
---

# Vite Configuration Guide

## Server Configuration

Vite provides a development server with hot module replacement.

```javascript
export default {
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
}
```

## Build Configuration

The build process uses Rollup for production optimization.

### Advanced Options

You can customize the build with various options:

- **chunk splitting**: Optimize bundle size
- **tree shaking**: Remove unused code
- **minification**: Compress output files
"""


@pytest.fixture
def test_docs_directory(test_markdown_content):
    """Create temporary docs directory with test files."""
    with tempfile.TemporaryDirectory() as temp_dir:
        docs_path = Path(temp_dir) / "docs"
        docs_path.mkdir()
        
        # Create test markdown files
        (docs_path / "guide.md").write_text(test_markdown_content)
        (docs_path / "readme.md").write_text("# README\nThis is a readme file.")
        
        # Create subdirectory
        unit_dir = docs_path / "unit"
        unit_dir.mkdir()
        (unit_dir / "unit1.md").write_text(test_markdown_content)
        
        yield docs_path


@pytest.fixture
def test_client():
    """Create test client for FastAPI app."""
    from fastapi.testclient import TestClient
    from ai_service.main import app
    
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_openai_response():
    """Create mock OpenAI API response."""
    class MockChoice:
        def __init__(self, content):
            self.message = MagicMock()
            self.message.content = content
    
    class MockResponse:
        def __init__(self, content):
            self.choices = [MockChoice(content)]
    
    return MockResponse("This is a mock OpenAI response about Vite configuration.")


# Pytest configuration
pytest_plugins = []


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test to run with asyncio"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    ) 
