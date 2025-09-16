"""
Unit tests for the RAG (Retrieval-Augmented Generation) pipeline service.
Focuses on testing individual, isolated methods.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from types import SimpleNamespace

from ai_service.services.rag import RAGPipeline
from ai_service.models.document import DocumentChunk, DocumentMetadata
from ai_service.models.chat import ChatRequest
from ai_service.config.settings import settings
from ai_service.services.llm import llm_service
from ai_service.services.conversation_store import conversation_store

@pytest.fixture
def rag_pipeline() -> RAGPipeline:
    """
    Provides a RAGPipeline instance for testing.
    Dependencies like vector_store and llm_service are not used in these unit tests,
    so they don't need to be mocked.
    """
    return RAGPipeline()

class TestRAGPipelineUnit:
    """Unit tests for individual methods in RAGPipeline."""

    @pytest.mark.parametrize("query, expected_intent", [
        ("How do I configure my vite.config.js?", "configuration"),
        ("What's the difference between Vite and Webpack?", "comparison"),
        ("Tell me about the Vite 5.0 release", "version_release"),
        ("What is HMR?", "concept_learning"),
        ("How can I improve SEO performance?", "performance"),
        ("Just a general question.", "general")
    ])
    def test_analyze_query_intent(self, rag_pipeline, query, expected_intent):
        """Test intent analysis for various query types."""
        intent = rag_pipeline._analyze_query_intent(query)
        assert intent == expected_intent

    @pytest.mark.parametrize("intent, path, content, expected_boost", [
        # Configuration intent: path match -> boost
        ("configuration", "/docs/03-configuration/pluginAPI.md", "...", 0.2),
        # Configuration intent: path mismatch (version) -> penalty
        ("configuration", "/docs/05-version/announcing-vite4.md", "...", -0.3),
        # Comparison intent: path match -> boost
        ("comparison", "/docs/02-core-concepts/hmr.md", "...", 0.25),
        # Comparison intent: path mismatch (version) -> heavy penalty
        ("comparison", "/docs/05-version/announcing-vite3.md", "...", -0.4),
        # Version intent: path match -> boost
        ("version_release", "/docs/05-version/migration.md", "...", 0.2),
        # Concept learning: path match -> boost
        ("concept_learning", "/docs/01-getting-started/introduction.md", "...", 0.2),
        # Performance intent: path match -> boost
        ("performance", "/docs/04-seo-performance/seo-guide.md", "...", 0.2),
        # Content match: configuration keywords -> boost
        ("configuration", "/docs/other.md", "some text about vite.config", 0.05),
        # No match: general intent should not trigger boosts
        ("general", "/docs/other.md", "random content", 0.0)
    ])
    def test_calculate_intent_relevance_boost(
        self, rag_pipeline, intent, path, content, expected_boost
    ):
        """Test relevance boost calculation for various scenarios."""
        mock_chunk = MagicMock()
        # In the actual code, document_path is used, not source_path
        mock_chunk.document_path = path
        mock_chunk.title = "Test Title"
        mock_chunk.content = content
        
        boost = rag_pipeline._calculate_intent_relevance_boost(
            chunk=mock_chunk,
            query_intent=intent,
        )
        
        # Using pytest.approx for floating point comparison
        assert boost == pytest.approx(expected_boost, abs=1e-9)


class TestRAGPipelineConversationFlow:
    """Focused tests for conversation persistence logic."""

    def _build_sample_chunk(self) -> DocumentChunk:
        """Create a chunk with enough data for RAG pipeline tests."""
        return DocumentChunk(
            chunk_id="docs/sample.md#0",
            document_path="../../docs/sample.md",
            title="Sample Doc",
            content="Vite configuration basics.",
            chunk_index=0,
            start_char=0,
            end_char=25,
            heading="Intro",
            heading_level=2,
            metadata=DocumentMetadata(),
            word_count=4,
        )

    @pytest.mark.asyncio
    async def test_creates_new_conversation_when_missing(self, monkeypatch):
        """Pipeline should create and return a new conversation if id is invalid."""
        pipeline = RAGPipeline()
        chunk = self._build_sample_chunk()

        # Stub document retrieval and LLM response
        monkeypatch.setattr(
            pipeline,
            "_retrieve_documents",
            AsyncMock(return_value=[(chunk, 0.9)]),
        )
        monkeypatch.setattr(
            "ai_service.services.rag.llm_service.generate_response",
            AsyncMock(return_value="Mock answer"),
        )

        # Conversation store mocks
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.get_conversation",
            AsyncMock(return_value=None),
        )
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.get_messages",
            AsyncMock(return_value=[]),
        )
        new_conv = SimpleNamespace(
            id="new-conv-id",
            title="New conversation",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
        )
        create_conv_mock = AsyncMock(return_value=new_conv)
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.create_conversation",
            create_conv_mock,
        )
        append_mock = AsyncMock(return_value=1)
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.append_message",
            append_mock,
        )

        request = ChatRequest(question="Explain Vite", conversation_id="missing")
        response = await pipeline.process_chat_request(request)

        assert response.conversation_id == "new-conv-id"
        create_conv_mock.assert_awaited_once()
        assert append_mock.await_count == 2
        append_mock.assert_any_await("new-conv-id", role="user", content="Explain Vite")
        append_mock.assert_any_await("new-conv-id", role="assistant", content="Mock answer")

    @pytest.mark.asyncio
    async def test_reuses_existing_conversation(self, monkeypatch):
        """Pipeline should append to an existing conversation when it exists."""
        pipeline = RAGPipeline()
        chunk = self._build_sample_chunk()

        monkeypatch.setattr(
            pipeline,
            "_retrieve_documents",
            AsyncMock(return_value=[(chunk, 0.85)]),
        )
        monkeypatch.setattr(
            "ai_service.services.rag.llm_service.generate_response",
            AsyncMock(return_value="Follow-up answer"),
        )

        existing_conv = SimpleNamespace(id="existing-conv")
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.get_conversation",
            AsyncMock(return_value=existing_conv),
        )
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.get_messages",
            AsyncMock(
                return_value=[
                    SimpleNamespace(
                        role="user",
                        content="Hi",
                        created_at="2024-01-01T00:00:00Z",
                    ),
                    SimpleNamespace(
                        role="assistant",
                        content="Hello",
                        created_at="2024-01-01T00:00:10Z",
                    ),
                ]
            ),
        )
        create_conv_mock = AsyncMock()
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.create_conversation",
            create_conv_mock,
        )
        append_mock = AsyncMock(return_value=2)
        monkeypatch.setattr(
            "ai_service.services.rag.conversation_store.append_message",
            append_mock,
        )

        request = ChatRequest(
            question="Tell me more",
            conversation_id="existing-conv",
        )
        response = await pipeline.process_chat_request(request)

        assert response.conversation_id == "existing-conv"
        create_conv_mock.assert_not_called()
        append_mock.assert_any_await(
            "existing-conv", role="user", content="Tell me more"
        )

    @pytest.mark.asyncio
    async def test_live_conversation_with_real_llm(self, monkeypatch):
        """End-to-end conversation flow should work with actual LLM provider."""

        if not settings.api_key:
            pytest.skip("API_KEY not configured for live LLM test")

        pipeline = RAGPipeline()
        chunk = self._build_sample_chunk()

        # Force RAG to use a lightweight, deterministic context while keeping real LLM call
        monkeypatch.setattr(
            pipeline,
            "_retrieve_documents",
            AsyncMock(return_value=[(chunk, 0.92)]),
        )

        # Reset LLM service so it reuses the real credentials from .env
        llm_service._initialized = False
        llm_service.openai_client = None

        request = ChatRequest(question="请简要介绍一下 Vite。", include_sources=False)
        response = await pipeline.process_chat_request(request)

        assert response.answer.strip() != ""
        assert response.conversation_id

        # Cleanup the transient conversation created for the live test
        if response.conversation_id:
            await conversation_store.delete_conversation(response.conversation_id)
