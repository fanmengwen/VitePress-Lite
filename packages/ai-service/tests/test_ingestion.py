"""
Tests for incremental ingestion and upsert behavior.
"""

import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from ai_service.services.ingestion import DocumentIngester, compute_file_hash
from ai_service.utils.chunking import ChunkingConfig


@pytest.mark.asyncio
async def test_compute_file_hash_changes_on_content(tmp_path: Path):
    file_path = tmp_path / "doc.md"
    file_path.write_text("# Title\n\nHello", encoding="utf-8")
    cfg = ChunkingConfig(max_chunk_size=1000, chunk_overlap=200)
    h1 = compute_file_hash(file_path, cfg, "model-A")

    # Change content -> different hash
    file_path.write_text("# Title\n\nHello world", encoding="utf-8")
    h2 = compute_file_hash(file_path, cfg, "model-A")
    assert h1 != h2

    # Change model -> different hash
    h3 = compute_file_hash(file_path, cfg, "model-B")
    assert h2 != h3


@pytest.mark.asyncio
async def test_ingest_single_file_uses_upsert(tmp_path: Path, monkeypatch):
    # Prepare docs
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    md = docs_dir / "a.md"
    md.write_text("---\npublished: true\n---\n\n# A\ncontent", encoding="utf-8")

    ingester = DocumentIngester(str(docs_dir))

    # Mock services
    mock_upsert = AsyncMock(return_value=2)
    with patch("ai_service.services.vector_store.vector_store.upsert_documents", mock_upsert), \
         patch("ai_service.services.embedding.embedding_service.initialize", AsyncMock()), \
         patch("ai_service.services.vector_store.vector_store.initialize", AsyncMock()):
        processed = await ingester.ingest_single_file(str(md))
        assert processed.metadata.published is True
        mock_upsert.assert_awaited()


@pytest.mark.asyncio
async def test_ingest_all_documents_skips_unchanged(tmp_path: Path, monkeypatch):
    # Create docs
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    md1 = docs_dir / "a.md"
    md2 = docs_dir / "b.md"
    md1.write_text("---\npublished: true\n---\n\n# A\ncontent A", encoding="utf-8")
    md2.write_text("---\npublished: true\n---\n\n# B\ncontent B", encoding="utf-8")

    ingester = DocumentIngester(str(docs_dir))

    async def upsert_side_effect(path, chunks, file_hash):
        # Simulate that md1 unchanged (return 0), md2 changed (return len)
        if Path(path).name == "a.md":
            return 0
        return len(chunks)

    with patch("ai_service.services.vector_store.vector_store.upsert_documents", AsyncMock(side_effect=upsert_side_effect)) as mock_upsert, \
         patch("ai_service.services.embedding.embedding_service.initialize", AsyncMock()), \
         patch("ai_service.services.vector_store.vector_store.initialize", AsyncMock()):
        result = await ingester.ingest_all_documents(clear_existing=False)

    # One file skipped, one processed
    assert result.documents_processed == 1
    assert any("Skipped" in s for s in result.skipped_files)
    assert result.vectors_stored > 0


