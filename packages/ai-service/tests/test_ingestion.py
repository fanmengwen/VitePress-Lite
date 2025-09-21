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
