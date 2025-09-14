"""
Tests for FastAPI endpoints and API functionality.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from ai_service.main import app
from ai_service.models.chat import ChatRequest, ChatResponse


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check_success(self, test_client):
        """Test successful health check."""
        with patch('ai_service.services.rag.rag_pipeline.get_system_info') as mock_info:
            mock_info.return_value = {
                "vector_store": {"total_documents": 10},
                "llm_service": {"status": "healthy"}
            }
            
            response = test_client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["healthy", "degraded"]
            assert "version" in data
            assert "vector_db_status" in data
            assert "llm_status" in data
            assert "documents_indexed" in data
    
    def test_health_check_with_errors(self, test_client):
        """Test health check with service errors."""
        with patch('ai_service.services.rag.rag_pipeline.get_system_info') as mock_info:
            mock_info.return_value = {"error": "Service unavailable"}
            
            response = test_client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["degraded", "unhealthy"]
    
    def test_health_check_exception(self, test_client):
        """Test health check with exception."""
        with patch('ai_service.services.rag.rag_pipeline.get_system_info') as mock_info:
            mock_info.side_effect = Exception("Service error")
            
            response = test_client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"


class TestChatEndpoint:
    """Test chat API endpoint."""
    
    def test_chat_success(self, test_client):
        """Test successful chat request."""
        with patch('ai_service.services.rag.rag_pipeline.process_chat_request') as mock_process:
            # Mock successful response
            mock_response = ChatResponse(
                answer="Vite is a build tool that provides fast development server.",
                sources=[],
                confidence_score=0.85,
                response_time_ms=500
            )
            mock_process.return_value = mock_response
            
            request_data = {
                "question": "What is Vite?",
                "include_sources": True
            }
            
            response = test_client.post("/api/chat", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
            assert "sources" in data
            assert "confidence_score" in data
            assert "response_time_ms" in data
    
    def test_chat_empty_question(self, test_client):
        """Test chat with empty question."""
        request_data = {
            "question": "",
            "include_sources": True
        }
        
        response = test_client.post("/api/chat", json=request_data)
        
        assert response.status_code == 422  # Pydantic validation raises 422
        assert "input" in response.text
    
    def test_chat_whitespace_question(self, test_client):
        """Test chat with whitespace-only question."""
        request_data = {
            "question": "   \n\t  ",
            "include_sources": True
        }
        
        response = test_client.post("/api/chat", json=request_data)
        
        assert response.status_code == 400
    
    def test_chat_with_history(self, test_client):
        """Test chat with conversation history."""
        with patch('ai_service.services.rag.rag_pipeline.process_chat_request') as mock_process:
            mock_response = ChatResponse(
                answer="Based on our previous discussion about Vite...",
                sources=[],
                confidence_score=0.9,
                response_time_ms=600
            )
            mock_process.return_value = mock_response
            
            request_data = {
                "question": "How do I configure it?",
                "history": [
                    {
                        "role": "user",
                        "content": "What is Vite?",
                        "timestamp": "2025-01-01T12:00:00Z"
                    },
                    {
                        "role": "assistant", 
                        "content": "Vite is a build tool...",
                        "timestamp": "2025-01-01T12:00:01Z"
                    }
                ],
                "include_sources": True
            }
            
            response = test_client.post("/api/chat", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
    
    def test_chat_service_error(self, test_client):
        """Test chat with service error."""
        with patch('ai_service.services.rag.rag_pipeline.process_chat_request') as mock_process:
            mock_process.side_effect = Exception("RAG pipeline error")
            
            request_data = {
                "question": "What is Vite?",
                "include_sources": True
            }
            
            response = test_client.post("/api/chat", json=request_data)
            
            assert response.status_code == 500
            assert "Failed to process chat request" in response.json()["message"]
    
    def test_chat_validation_error(self, test_client):
        """Test chat with validation error."""
        # Missing required field
        request_data = {
            "include_sources": True
        }
        
        response = test_client.post("/api/chat", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_chat_custom_parameters(self, test_client):
        """Test chat with custom parameters."""
        with patch('ai_service.services.rag.rag_pipeline.process_chat_request') as mock_process:
            mock_response = ChatResponse(
                answer="Custom response",
                sources=[],
                confidence_score=0.7,
                response_time_ms=800
            )
            mock_process.return_value = mock_response
            
            request_data = {
                "question": "What is Vite?",
                "max_tokens": 500,
                "temperature": 0.3,
                "include_sources": False
            }
            
            response = test_client.post("/api/chat", json=request_data)
            
            assert response.status_code == 200
            # Verify the request was passed correctly
            mock_process.assert_called_once()
            call_args = mock_process.call_args[0][0]
            assert call_args.max_tokens == 500
            assert call_args.temperature == 0.3
            assert call_args.include_sources == False


class TestSystemInfoEndpoint:
    """Test system information endpoint."""
    
    def test_system_info_success(self, test_client):
        """Test successful system info request."""
        with patch('ai_service.services.rag.rag_pipeline.get_system_info') as mock_info:
            mock_info.return_value = {
                "vector_store": {
                    "total_documents": 42,
                    "unique_authors": 5,
                    "collection_name": "vite_docs"
                },
                "llm_service": {
                    "status": "healthy",
                    "provider": "openai"
                },
                "config": {
                    "retrieval_top_k": 5,
                    "similarity_threshold": 0.5
                }
            }
            
            response = test_client.get("/system-info")
            
            assert response.status_code == 200
            data = response.json()
            assert "vector_store" in data
            assert "llm_service" in data
            assert "config" in data
    
    def test_system_info_error(self, test_client):
        """Test system info with error."""
        with patch('ai_service.services.rag.rag_pipeline.get_system_info') as mock_info:
            mock_info.side_effect = Exception("System error")
            
            response = test_client.get("/system-info")
            
            assert response.status_code == 500


class TestVectorStoreEndpoints:
    """Test vector store management endpoints."""
    
    def test_vector_store_stats(self, test_client):
        """Test vector store statistics."""
        with patch('ai_service.services.vector_store.vector_store.get_collection_stats') as mock_stats:
            mock_stats.return_value = {
                "total_documents": 25,
                "unique_authors": 3,
                "unique_titles": 15,
                "collection_name": "vite_docs"
            }
            
            response = test_client.get("/api/vector-store/stats")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_documents"] == 25
    
    def test_clear_vector_store(self, test_client):
        """Test clearing vector store."""
        with patch('ai_service.services.vector_store.vector_store.clear_collection') as mock_clear:
            mock_clear.return_value = True
            
            response = test_client.delete("/api/vector-store/clear")
            
            assert response.status_code == 200
            data = response.json()
            assert "cleared successfully" in data["message"]
    
    def test_delete_document(self, test_client):
        """Test deleting specific document."""
        with patch('ai_service.services.vector_store.vector_store.delete_documents') as mock_delete:
            mock_delete.return_value = 3
            
            response = test_client.delete("/api/vector-store/documents/test-doc.md")
            
            assert response.status_code == 200
            data = response.json()
            assert data["deleted_count"] == 3
            assert data["document_path"] == "test-doc.md"


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_invalid_json(self, test_client):
        """Test request with invalid JSON."""
        response = test_client.post(
            "/api/chat",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    def test_unsupported_method(self, test_client):
        """Test unsupported HTTP method."""
        response = test_client.put("/api/chat")
        
        assert response.status_code == 405
    
    def test_nonexistent_endpoint(self, test_client):
        """Test request to nonexistent endpoint."""
        response = test_client.get("/api/nonexistent")
        
        assert response.status_code == 404


class TestCORSHeaders:
    """Test CORS configuration."""
    
    def test_cors_headers_present_on_get(self, test_client):
        """Test that CORS headers are present on a simple GET request."""
        headers = {"Origin": "http://localhost:5173"}
        response = test_client.get("/health", headers=headers)
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    
    def test_cors_allowed_origins(self, test_client):
        """Test CORS with allowed origin."""
        headers = {"Origin": "http://localhost:5173"}
        response = test_client.get("/health", headers=headers)
        
        assert response.status_code == 200


# Performance and integration tests
@pytest.mark.slow
class TestPerformance:
    """Test performance characteristics."""
    
    def test_concurrent_requests(self, test_client):
        """Test handling multiple concurrent requests."""
        import concurrent.futures
        import threading
        
        def make_request():
            with patch('ai_service.services.rag.rag_pipeline.process_chat_request') as mock_process:
                mock_response = ChatResponse(
                    answer="Concurrent response",
                    sources=[],
                    confidence_score=0.8,
                    response_time_ms=100
                )
                mock_process.return_value = mock_response
                
                return test_client.post("/api/chat", json={
                    "question": "What is Vite?",
                    "include_sources": True
                })
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [future.result() for future in futures]
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200


@pytest.mark.integration
class TestIntegration:
    """Integration tests requiring external services."""
    
    @pytest.mark.skip("Requires actual OpenAI API key")
    def test_real_openai_integration(self, test_client):
        """Test with real OpenAI API (skipped by default)."""
        request_data = {
            "question": "What is a simple test question?",
            "include_sources": True
        }
        
        response = test_client.post("/api/chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["answer"]) > 0 
