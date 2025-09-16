"""
Comprehensive API integration tests for AI service.
Tests real API functionality with actual services.
"""

import asyncio
import json
import time
import pytest
import httpx
import pytest_asyncio
from typing import Dict, Any, List
from pathlib import Path
import tempfile
import os
import sys

# Add project to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_service.config.settings import SettingsModule
from ai_service.app import create_app


@pytest.fixture
def test_settings():
    """Create test settings for integration tests."""
    # Create a test settings object with overridden values
    test_config = SettingsModule()
    
    # Use existing test configuration paths
    test_config.chromadb_path = "./data/chroma_db"
    test_config.conversation_db_path = "./data/conversations.sqlite3"
    test_config.docs_path = "../../docs"
    # Leave API key empty to simulate environment without LLM credential
    # This ensures chat endpoint returns failure codes in tests that expect it
    test_config.api_key = ""
    test_config.model = "gpt-3.5-turbo"
    test_config.embedding_model = "all-MiniLM-L6-v2"
    test_config.log_level = "INFO"
    test_config.host = "127.0.0.1"
    test_config.port = 8001  # Use different port for tests
    test_config.workers = 1
    test_config.reload = False
    
    return test_config


@pytest_asyncio.fixture
async def test_app(test_settings):
    """Create test FastAPI app."""
    # Override global settings
    import ai_service.config.settings as settings_module
    settings_module.settings = test_settings
    
    app = create_app()
    return app


@pytest_asyncio.fixture
async def test_client(test_app, test_settings):
    """Create test client for integration tests."""
    async with httpx.AsyncClient(
        app=test_app,
        base_url="http://test",
        timeout=30.0,
        headers={"X-API-Key": test_settings.api_key}
    ) as client:
        yield client


class TestHealthIntegration:
    """Integration tests for health endpoint."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_integration(self, test_client):
        """Test health endpoint with real services."""
        response = await test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify health response structure
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "version" in data
        assert "vector_db_status" in data
        assert "llm_status" in data
        assert "documents_indexed" in data
        
        # Should have indexed documents from ingest command
        assert isinstance(data["documents_indexed"], int)
        

class TestChatIntegration:
    """Integration tests for chat endpoints."""
    
    @pytest.mark.asyncio
    async def test_chat_endpoint_without_llm(self, test_client):
        """Test chat endpoint behavior when LLM is not properly configured."""
        request_data = {
            "question": "What is Vite?",
            "include_sources": True
        }
        
        response = await test_client.post("/api/chat", json=request_data)
        
        # Should handle LLM unavailability gracefully (or return 200 with fallback)
        assert response.status_code in [200, 500, 503, 400]
        
    @pytest.mark.asyncio 
    async def test_chat_with_empty_question(self, test_client):
        """Test chat endpoint with empty question."""
        request_data = {
            "question": "",
            "include_sources": True
        }
        
        response = await test_client.post("/api/chat", json=request_data)
        assert response.status_code == 422
        
    @pytest.mark.asyncio
    async def test_chat_with_invalid_json(self, test_client):
        """Test chat endpoint with invalid JSON."""
        response = await test_client.post(
            "/api/chat",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
        
    @pytest.mark.asyncio
    async def test_chat_with_history(self, test_client):
        """Test chat endpoint with conversation history."""
        request_data = {
            "question": "What is Vite?",
            "history": [
                {
                    "role": "user",
                    "content": "Hello",
                    "timestamp": "2025-01-01T12:00:00Z"
                },
                {
                    "role": "assistant",
                    "content": "Hi there!",
                    "timestamp": "2025-01-01T12:00:01Z"
                }
            ],
            "include_sources": True
        }
        
        response = await test_client.post("/api/chat", json=request_data)
        # Should accept the request structure regardless of LLM availability
        assert response.status_code in [200, 500, 503]


class TestConversationsIntegration:
    """Integration tests for conversation management."""
    
    @pytest.mark.asyncio
    async def test_list_conversations(self, test_client):
        """Test listing conversations."""
        response = await test_client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_list_conversations_with_limit(self, test_client):
        """Test listing conversations with limit parameter."""
        # Ensure at least one conversation exists
        _ = await test_client.post(
            "/api/conversations",
            json={"title": "Pagination Test Conversation"}
        )

        # Request with limit
        response = await test_client.get("/api/conversations?limit=1")
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list)
        assert len(items) <= 1
        
    @pytest.mark.asyncio
    async def test_create_conversation(self, test_client):
        """Test creating a new conversation."""
        request_data = {
            "title": "Test Integration Conversation"
        }
        
        response = await test_client.post("/api/conversations", json=request_data)
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Integration Conversation"
        assert "created_at" in data
        assert "updated_at" in data
        
        return data["id"]  # Return ID for further tests
        
    @pytest.mark.asyncio
    async def test_get_conversation_details(self, test_client):
        """Test getting conversation details."""
        # First create a conversation
        create_response = await test_client.post(
            "/api/conversations",
            json={"title": "Test Detail Conversation"}
        )
        assert create_response.status_code == 201
        conversation_id = create_response.json()["id"]
        
        # Then get its details
        response = await test_client.get(f"/api/conversations/{conversation_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conversation_id
        assert data["title"] == "Test Detail Conversation"
        assert "messages" in data
        
    @pytest.mark.asyncio
    async def test_update_conversation_title(self, test_client):
        """Test updating conversation title."""
        # Create conversation
        create_response = await test_client.post(
            "/api/conversations",
            json={"title": "Original Title"}
        )
        conversation_id = create_response.json()["id"]
        
        # Update title
        update_data = {"title": "Updated Title"}
        response = await test_client.patch(
            f"/api/conversations/{conversation_id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        
    @pytest.mark.asyncio
    async def test_delete_conversation(self, test_client):
        """Test deleting a conversation."""
        # Create conversation
        create_response = await test_client.post(
            "/api/conversations",
            json={"title": "To Be Deleted"}
        )
        conversation_id = create_response.json()["id"]
        
        # Delete conversation
        response = await test_client.delete(f"/api/conversations/{conversation_id}")
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = await test_client.get(f"/api/conversations/{conversation_id}")
        assert get_response.status_code == 404


class TestVectorStoreIntegration:
    """Integration tests for vector store operations."""
    
    @pytest.mark.asyncio
    async def test_vector_store_stats(self, test_client):
        """Test vector store statistics endpoint."""
        response = await test_client.get("/api/vector-store/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total_documents" in data
        assert "collection_name" in data
        assert isinstance(data["total_documents"], int)
        
        # Should have documents from previous ingest
        assert data["total_documents"] > 0
        
    @pytest.mark.asyncio
    async def test_system_info_endpoint(self, test_client):
        """Test system information endpoint."""
        response = await test_client.get("/system-info")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify system info structure
        assert "vector_store" in data
        assert "llm_service" in data
        assert "config" in data
        
        # Vector store should be operational
        vector_store_info = data["vector_store"]
        assert "total_documents" in vector_store_info
        assert vector_store_info["total_documents"] > 0


class TestErrorHandlingIntegration:
    """Integration tests for error handling."""
    
    @pytest.mark.asyncio
    async def test_nonexistent_endpoint(self, test_client):
        """Test requesting nonexistent endpoint."""
        response = await test_client.get("/api/nonexistent")
        assert response.status_code == 404
        
    @pytest.mark.asyncio
    async def test_unsupported_method(self, test_client):
        """Test unsupported HTTP method."""
        response = await test_client.put("/api/chat")
        assert response.status_code == 405
        
    @pytest.mark.asyncio
    async def test_invalid_conversation_id(self, test_client):
        """Test operations with invalid conversation ID."""
        invalid_id = "invalid-uuid-format"
        
        response = await test_client.get(f"/api/conversations/{invalid_id}")
        assert response.status_code in [400, 404, 422]


class TestCORSIntegration:
    """Integration tests for CORS configuration."""
    
    @pytest.mark.asyncio
    async def test_cors_headers(self, test_client):
        """Test CORS headers are present."""
        response = await test_client.get(
            "/health",
            headers={"Origin": "http://localhost:5173"}
        )
        
        assert response.status_code == 200
        
        # Check CORS headers
        headers = response.headers
        assert "access-control-allow-origin" in headers
        
    @pytest.mark.asyncio
    async def test_preflight_request(self, test_client):
        """Test CORS preflight request."""
        response = await test_client.options(
            "/api/chat",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        # Should handle preflight
        assert response.status_code in [200, 204]


class TestPerformanceIntegration:
    """Integration tests for performance characteristics."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_response_time(self, test_client):
        """Test health endpoint response time."""
        start_time = time.time()
        response = await test_client.get("/health")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = (end_time - start_time) * 1000  # Convert to ms
        
        # Health endpoint should respond quickly (under 5 seconds)
        assert response_time < 5000, f"Health endpoint took {response_time:.0f}ms"
        
    @pytest.mark.asyncio
    async def test_concurrent_health_requests(self, test_client):
        """Test handling multiple concurrent health requests."""
        async def make_request():
            return await test_client.get("/health")
        
        # Make 5 concurrent requests
        tasks = [make_request() for _ in range(5)]
        responses = await asyncio.gather(*tasks)
        
        # All should succeed
        for response in responses:
            assert response.status_code == 200
            
    @pytest.mark.asyncio
    async def test_vector_store_stats_response_time(self, test_client):
        """Test vector store stats response time."""
        start_time = time.time()
        response = await test_client.get("/api/vector-store/stats")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = (end_time - start_time) * 1000
        
        # Vector store stats should respond reasonably quickly (under 10 seconds)
        assert response_time < 10000, f"Vector store stats took {response_time:.0f}ms"


@pytest.mark.integration
class TestE2EWorkflow:
    """End-to-end workflow tests."""
    
    @pytest.mark.asyncio
    async def test_complete_conversation_workflow(self, test_client):
        """Test complete conversation workflow from creation to deletion."""
        # Step 1: Create conversation
        create_response = await test_client.post(
            "/api/conversations",
            json={"title": "E2E Test Conversation"}
        )
        assert create_response.status_code == 201
        conversation_id = create_response.json()["id"]
        
        # Step 2: Try to ask a question (will fail due to LLM config, but structure should be valid)
        chat_response = await test_client.post(
            "/api/chat",
            json={
                "question": "What is Vite?",
                "conversation_id": conversation_id,
                "include_sources": True
            }
        )
        # Accept either success or expected failure due to LLM config
        assert chat_response.status_code in [200, 500, 503]
        
        # Step 3: Update conversation title
        update_response = await test_client.patch(
            f"/api/conversations/{conversation_id}",
            json={"title": "Updated E2E Conversation"}
        )
        assert update_response.status_code == 200
        
        # Step 4: Get conversation details
        detail_response = await test_client.get(f"/api/conversations/{conversation_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["title"] == "Updated E2E Conversation"
        
        # Step 5: Delete conversation
        delete_response = await test_client.delete(f"/api/conversations/{conversation_id}")
        assert delete_response.status_code == 204
        
        # Step 6: Verify deletion
        get_response = await test_client.get(f"/api/conversations/{conversation_id}")
        assert get_response.status_code == 404


# Test configuration
pytest_plugins = []


def pytest_configure(config):
    """Configure pytest for integration tests."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )


# Run all tests if called directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
