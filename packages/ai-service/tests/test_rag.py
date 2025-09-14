"""
Unit tests for the RAG (Retrieval-Augmented Generation) pipeline service.
Focuses on testing individual, isolated methods.
"""

import pytest
from unittest.mock import MagicMock
from ai_service.services.rag import RAGPipeline

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

    @pytest.mark.parametrize("intent, path, content, query, expected_boost", [
        # Configuration intent: path match -> boost
        ("configuration", "/docs/03-configuration/pluginAPI.md", "...", "config query", 0.2),
        # Configuration intent: path mismatch (version) -> penalty
        ("configuration", "/docs/05-version/announcing-vite4.md", "...", "config query", -0.3),
        # Comparison intent: path match -> boost
        ("comparison", "/docs/02-core-concepts/hmr.md", "...", "compare", 0.25),
        # Comparison intent: path mismatch (version) -> heavy penalty
        ("comparison", "/docs/05-version/announcing-vite3.md", "...", "compare", -0.4),
        # Version intent: path match -> boost
        ("version_release", "/docs/05-version/migration.md", "...", "version query", 0.2),
        # Concept learning: path match -> boost
        ("concept_learning", "/docs/01-getting-started/introduction.md", "...", "concept query", 0.2),
        # Performance intent: path match -> boost
        ("performance", "/docs/04-seo-performance/seo-guide.md", "...", "performance query", 0.2),
        # Content match: configuration keywords -> boost
        ("configuration", "/docs/other.md", "some text about vite.config", "config query", 0.05),
        # No match: general intent should not trigger boosts
        ("general", "/docs/other.md", "random content", "any query", 0.0)
    ])
    def test_calculate_intent_relevance_boost(
        self, rag_pipeline, intent, path, content, query, expected_boost
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
            original_query=query
        )
        
        # Using pytest.approx for floating point comparison
        assert boost == pytest.approx(expected_boost, abs=1e-9)
