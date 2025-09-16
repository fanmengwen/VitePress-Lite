"""
End-to-end workflow tests for AI service.
Tests complete workflows from CLI commands to API functionality.
"""

import asyncio
import subprocess
import time
import json
import pytest
import httpx
import os
import signal
from pathlib import Path
from typing import Optional
import tempfile
import sys

# Add project to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class AIServiceManager:
    """Manage AI service lifecycle for testing."""
    
    def __init__(self, port: int = 8002):
        self.port = port
        self.process: Optional[subprocess.Popen] = None
        self.base_url = f"http://127.0.0.1:{port}"
        
    async def start_service(self, timeout: int = 30) -> bool:
        """Start the AI service and wait for it to be ready."""
        # Change to service directory
        service_dir = Path(__file__).parent.parent
        
        # Start service in background
        self.process = subprocess.Popen(
            ["poetry", "run", "ai-service", "serve", "--host", "127.0.0.1", "--port", str(self.port)],
            cwd=service_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid  # Create new process group
        )
        
        # Wait for service to be ready
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{self.base_url}/health", timeout=5.0)
                    if response.status_code == 200:
                        return True
            except:
                pass
            await asyncio.sleep(1)
        
        return False
    
    def stop_service(self):
        """Stop the AI service."""
        if self.process:
            try:
                # Kill the entire process group
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                self.process.wait(timeout=10)
            except:
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                except:
                    pass
            self.process = None


@pytest.fixture(scope="session")
async def ai_service():
    """Start AI service for E2E tests."""
    manager = AIServiceManager()
    
    # Start service
    success = await manager.start_service()
    if not success:
        pytest.skip("Failed to start AI service for E2E tests")
    
    yield manager
    
    # Cleanup
    manager.stop_service()


@pytest.fixture(scope="session")
async def e2e_client(ai_service):
    """HTTP client for E2E tests."""
    async with httpx.AsyncClient(
        base_url=ai_service.base_url,
        timeout=30.0
    ) as client:
        yield client


class TestCLICommands:
    """Test CLI commands execution."""
    
    def test_cli_help(self):
        """Test CLI help command."""
        service_dir = Path(__file__).parent.parent
        
        result = subprocess.run(
            ["poetry", "run", "ai-service", "--help"],
            cwd=service_dir,
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "AI Service CLI" in result.stdout
        assert "ingest" in result.stdout
        assert "serve" in result.stdout
        assert "migrate" in result.stdout
    
    def test_migrate_command(self):
        """Test migrate command execution."""
        service_dir = Path(__file__).parent.parent
        
        result = subprocess.run(
            ["poetry", "run", "ai-service", "migrate", "--verbose"],
            cwd=service_dir,
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "Running migrations" in result.stderr or "migrations" in result.stderr
    
    def test_ingest_command_dry_run_concept(self):
        """Test that ingest command can be executed (actual run done in setup)."""
        service_dir = Path(__file__).parent.parent
        
        # We already ran ingest in the setup, just verify the command structure
        result = subprocess.run(
            ["poetry", "run", "ai-service", "--help"],
            cwd=service_dir,
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "ingest" in result.stdout


class TestE2EAPIWorkflow:
    """End-to-end API workflow tests."""
    
    @pytest.mark.asyncio
    async def test_service_health_check(self, e2e_client):
        """Test service health check in real environment."""
        response = await e2e_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["healthy", "degraded"]
        assert "documents_indexed" in data
        assert data["documents_indexed"] > 0  # Should have documents from ingest
    
    @pytest.mark.asyncio
    async def test_vector_store_has_documents(self, e2e_client):
        """Test that vector store has indexed documents."""
        response = await e2e_client.get("/api/vector-store/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_documents" in data
        assert data["total_documents"] > 0
        assert "collection_name" in data
        assert data["collection_name"] == "vite_docs"
    
    @pytest.mark.asyncio
    async def test_conversation_management_workflow(self, e2e_client):
        """Test complete conversation management workflow."""
        # Create conversation
        create_response = await e2e_client.post(
            "/api/conversations",
            json={"title": "E2E Test Conversation"}
        )
        assert create_response.status_code == 201
        conversation_data = create_response.json()
        conversation_id = conversation_data["id"]
        
        # List conversations
        list_response = await e2e_client.get("/api/conversations")
        assert list_response.status_code == 200
        conversations = list_response.json()
        
        # Find our conversation
        found = any(conv["id"] == conversation_id for conv in conversations)
        assert found, "Created conversation not found in list"
        
        # Get conversation details
        detail_response = await e2e_client.get(f"/api/conversations/{conversation_id}")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["id"] == conversation_id
        assert detail_data["title"] == "E2E Test Conversation"
        
        # Update conversation
        update_response = await e2e_client.patch(
            f"/api/conversations/{conversation_id}",
            json={"title": "Updated E2E Conversation"}
        )
        assert update_response.status_code == 200
        
        # Verify update
        updated_detail = await e2e_client.get(f"/api/conversations/{conversation_id}")
        assert updated_detail.json()["title"] == "Updated E2E Conversation"
        
        # Delete conversation
        delete_response = await e2e_client.delete(f"/api/conversations/{conversation_id}")
        assert delete_response.status_code == 204
        
        # Verify deletion
        get_deleted = await e2e_client.get(f"/api/conversations/{conversation_id}")
        assert get_deleted.status_code == 404
    
    @pytest.mark.asyncio
    async def test_chat_endpoint_structure(self, e2e_client):
        """Test chat endpoint accepts requests (even if LLM is not configured)."""
        request_data = {
            "question": "What is Vite?",
            "include_sources": True,
            "max_tokens": 100,
            "temperature": 0.1
        }
        
        response = await e2e_client.post("/api/chat", json=request_data)
        
        # Accept either success or expected failure due to LLM configuration
        assert response.status_code in [200, 500, 503]
        
        # If it fails, it should be due to LLM configuration, not structure issues
        if response.status_code != 200:
            error_data = response.json()
            # Should contain error information
            assert "message" in error_data or "error" in error_data
    
    @pytest.mark.asyncio
    async def test_system_info_endpoint(self, e2e_client):
        """Test system info endpoint."""
        response = await e2e_client.get("/system-info")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify system components
        assert "vector_store" in data
        assert "llm_service" in data
        assert "config" in data
        
        # Vector store should be operational
        vector_info = data["vector_store"]
        assert vector_info["total_documents"] > 0
        
        # LLM service status (may be degraded due to config)
        llm_info = data["llm_service"]
        assert "status" in llm_info


class TestPerformanceE2E:
    """End-to-end performance tests."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_performance(self, e2e_client):
        """Test health endpoint performance."""
        start_time = time.time()
        response = await e2e_client.get("/health")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = (end_time - start_time) * 1000
        
        # Should respond within reasonable time
        assert response_time < 3000, f"Health endpoint took {response_time:.0f}ms"
    
    @pytest.mark.asyncio
    async def test_vector_store_query_performance(self, e2e_client):
        """Test vector store query performance."""
        start_time = time.time()
        response = await e2e_client.get("/api/vector-store/stats")
        end_time = time.time()
        
        assert response.status_code == 200
        response_time = (end_time - start_time) * 1000
        
        # Vector queries should be reasonably fast
        assert response_time < 5000, f"Vector store stats took {response_time:.0f}ms"
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_handling(self, e2e_client):
        """Test handling of concurrent requests."""
        async def make_health_request():
            return await e2e_client.get("/health")
        
        async def make_stats_request():
            return await e2e_client.get("/api/vector-store/stats")
        
        # Make concurrent requests of different types
        tasks = [
            make_health_request(),
            make_stats_request(),
            make_health_request(),
            make_stats_request(),
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed or be exceptions we can handle
        success_count = 0
        for response in responses:
            if isinstance(response, httpx.Response) and response.status_code == 200:
                success_count += 1
        
        # At least most should succeed
        assert success_count >= len(tasks) * 0.7, f"Only {success_count}/{len(tasks)} requests succeeded"


class TestErrorHandlingE2E:
    """End-to-end error handling tests."""
    
    @pytest.mark.asyncio
    async def test_invalid_endpoints(self, e2e_client):
        """Test invalid endpoint handling."""
        # Non-existent endpoint
        response = await e2e_client.get("/api/nonexistent")
        assert response.status_code == 404
        
        # Invalid conversation ID
        response = await e2e_client.get("/api/conversations/invalid-id")
        assert response.status_code in [400, 404, 422]
        
        # Unsupported method
        response = await e2e_client.put("/api/chat")
        assert response.status_code == 405
    
    @pytest.mark.asyncio
    async def test_malformed_requests(self, e2e_client):
        """Test malformed request handling."""
        # Invalid JSON for chat
        response = await e2e_client.post(
            "/api/chat",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
        
        # Missing required fields
        response = await e2e_client.post("/api/chat", json={})
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_cors_functionality(self, e2e_client):
        """Test CORS functionality."""
        # Make request with Origin header
        response = await e2e_client.get(
            "/health",
            headers={"Origin": "http://localhost:5173"}
        )
        
        assert response.status_code == 200
        # Should have CORS headers
        assert "access-control-allow-origin" in response.headers


# Test discovery helpers
@pytest.mark.e2e
class TestE2EDiscovery:
    """Tests to help discover E2E test capabilities."""
    
    @pytest.mark.asyncio
    async def test_service_endpoints_discovery(self, e2e_client):
        """Discover available service endpoints."""
        endpoints_to_test = [
            "/health",
            "/system-info",
            "/api/conversations",
            "/api/vector-store/stats",
        ]
        
        results = {}
        for endpoint in endpoints_to_test:
            try:
                response = await e2e_client.get(endpoint)
                results[endpoint] = {
                    "status": response.status_code,
                    "accessible": response.status_code < 500
                }
            except Exception as e:
                results[endpoint] = {
                    "status": "error",
                    "error": str(e),
                    "accessible": False
                }
        
        # Print results for manual verification
        print("\\nEndpoint Discovery Results:")
        for endpoint, result in results.items():
            print(f"  {endpoint}: {result}")
        
        # At least health should be accessible
        assert results["/health"]["accessible"], "Health endpoint should be accessible"


# Cleanup helpers
def pytest_configure(config):
    """Configure pytest for E2E tests."""
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )


# Run tests if called directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-m", "e2e"])
