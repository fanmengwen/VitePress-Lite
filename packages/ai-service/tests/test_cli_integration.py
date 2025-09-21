"""
Extended CLI integration tests for AI service.
Tests actual CLI command execution and functionality.
"""

import subprocess
import tempfile
import pytest
import json
import time
import os
from pathlib import Path
from typing import Dict, Any
import sqlite3
import sys

# Add project to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestCLIIntegration:
    """Integration tests for CLI commands."""
    
    @pytest.fixture
    def service_dir(self):
        """Get the service directory for running commands."""
        return Path(__file__).parent.parent
    
    def run_cli_command(self, command: list, service_dir: Path, timeout: int = 60) -> Dict[str, Any]:
        """Helper method to run CLI commands and capture output."""
        full_command = ["poetry", "run", "ai-service"] + command
        
        try:
            result = subprocess.run(
                full_command,
                cwd=service_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": "Command timed out",
                "success": False,
                "timeout": True
            }
    
    def test_cli_help_command(self, service_dir):
        """Test CLI help command."""
        result = self.run_cli_command([], service_dir)
        
        assert result["success"]
        assert "AI Service CLI" in result["stdout"]
        assert "ingest" in result["stdout"]
        assert "serve" in result["stdout"]
        assert "migrate" in result["stdout"]
    
    def test_cli_command_help(self, service_dir):
        """Test individual command help."""
        commands = ["ingest", "serve", "migrate"]
        
        for command in commands:
            result = self.run_cli_command([command, "--help"], service_dir)
            assert result["success"], f"Help for {command} failed: {result['stderr']}"
            assert command in result["stdout"]
    
    def test_migrate_command_execution(self, service_dir):
        """Test migrate command execution."""
        result = self.run_cli_command(["migrate", "--verbose"], service_dir)
        
        assert result["success"], f"Migrate failed: {result['stderr']}"
        assert "Running migrations" in result["stderr"]
        
        # Check that database file exists
        db_path = service_dir / "data" / "conversations.sqlite3"
        assert db_path.exists(), "Database file was not created"
        
        # Verify database structure
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        assert "conversations" in tables
        assert "messages" in tables
        
        conn.close()
    
    def test_migrate_command_with_custom_paths(self, service_dir):
        """Test migrate command with custom database path."""
        with tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False) as temp_db:
            temp_db_path = temp_db.name
        
        try:
            # Remove the file so migrate can create it
            os.unlink(temp_db_path)
            
            result = self.run_cli_command(
                ["migrate", "--db-path", temp_db_path, "--verbose"], 
                service_dir
            )
            
            assert result["success"], f"Custom migrate failed: {result['stderr']}"
            assert temp_db_path in result["stderr"]
            
            # Verify custom database was created
            assert os.path.exists(temp_db_path)
            
        finally:
            # Cleanup
            if os.path.exists(temp_db_path):
                os.unlink(temp_db_path)
    
    def test_ingest_command_execution(self, service_dir):
        """Test ingest command execution."""
        # Ensure migrate has been run first
        migrate_result = self.run_cli_command(["migrate"], service_dir)
        assert migrate_result["success"]
        
        # Run ingest
        result = self.run_cli_command(["ingest"], service_dir, timeout=120)
        
        assert result["success"], f"Ingest failed: {result['stderr']}"
        assert "Starting document ingestion" in result["stderr"]
        assert "Document ingestion finished" in result["stderr"]
        
        # Check that vector database was created
        chroma_path = service_dir / "data" / "chroma_db"
        assert chroma_path.exists(), "ChromaDB directory was not created"
        
        # Verify some files were processed
        assert "Prepared" in result["stderr"] and "markdown files" in result["stderr"]
    
    def test_ingest_command_incremental(self, service_dir):
        """Test that ingest command is incremental (doesn't reprocess unchanged files)."""
        # Run ingest first time
        result1 = self.run_cli_command(["ingest"], service_dir, timeout=120)
        assert result1["success"]
        
        # Run ingest second time (should be faster - incremental)
        start_time = time.time()
        result2 = self.run_cli_command(["ingest"], service_dir, timeout=60)
        end_time = time.time()
        
        assert result2["success"]
        
        # Second run should complete relatively quickly since files haven't changed
        duration = end_time - start_time
        assert duration < 30, f"Incremental ingest took too long: {duration:.1f}s"
    
    def test_serve_command_startup(self, service_dir):
        """Test that serve command starts up properly."""
        # Use timeout to prevent hanging
        result = self.run_cli_command(
            ["serve", "--host", "127.0.0.1", "--port", "8999"],
            service_dir,
            timeout=15
        )
        
        # Command should timeout (because it would run indefinitely)
        # but we should see startup messages
        assert "timeout" in result or "Starting FastAPI server" in result["stderr"]
        assert result["returncode"] != 0 or "timeout" in result  # Expected to timeout or be killed
        
        # Should see service initialization
        if result["stderr"]:
            assert any(phrase in result["stderr"] for phrase in [
                "Starting AI service",
                "FastAPI server",
                "Uvicorn running"
            ])
    
    def test_serve_command_with_parameters(self, service_dir):
        """Test serve command with custom parameters."""
        result = self.run_cli_command(
            ["serve", "--host", "0.0.0.0", "--port", "8998", "--workers", "1"],
            service_dir,
            timeout=10
        )
        
        # Should start up with custom parameters
        assert "timeout" in result or "Starting FastAPI server" in result["stderr"]
    
    def test_invalid_command(self, service_dir):
        """Test CLI with invalid command."""
        result = self.run_cli_command(["invalid-command"], service_dir)
        
        assert not result["success"]
        assert result["returncode"] != 0


class TestCLIErrorHandling:
    """Test CLI error handling scenarios."""
    
    @pytest.fixture
    def service_dir(self):
        """Get the service directory for running commands."""
        return Path(__file__).parent.parent
    
    def run_cli_command(self, command: list, service_dir: Path, timeout: int = 30) -> Dict[str, Any]:
        """Helper method to run CLI commands."""
        full_command = ["poetry", "run", "ai-service"] + command
        
        try:
            result = subprocess.run(
                full_command,
                cwd=service_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": "Command timed out",
                "success": False
            }
    
    def test_migrate_with_invalid_directory(self, service_dir):
        """Test migrate command with invalid migration directory."""
        result = self.run_cli_command(
            ["migrate", "--dir", "/nonexistent/directory"],
            service_dir
        )
        
        # Should handle invalid directory gracefully
        assert not result["success"]
    
    def test_migrate_with_readonly_database_path(self, service_dir):
        """Test migrate command with read-only database path."""
        # Try to create database in read-only location
        result = self.run_cli_command(
            ["migrate", "--db-path", "/root/readonly.db"],
            service_dir
        )
        
        # Should fail gracefully with permission error
        assert not result["success"]
    
    def test_ingest_with_invalid_docs_path(self, service_dir):
        """Test ingest command with invalid docs path."""
        # Temporarily change DOCS_PATH to invalid location
        env = os.environ.copy()
        env["DOCS_PATH"] = "/nonexistent/docs"
        
        result = subprocess.run(
            ["poetry", "run", "ai-service", "ingest"],
            cwd=service_dir,
            capture_output=True,
            text=True,
            timeout=30,
            env=env
        )
        
        # Should handle invalid docs path gracefully
        assert result.returncode != 0 or "error" in result.stderr.lower()
    
    def test_serve_with_invalid_port(self, service_dir):
        """Test serve command with invalid port."""
        result = self.run_cli_command(
            ["serve", "--port", "99999"],  # Invalid port number
            service_dir,
            timeout=10
        )
        
        # Should either fail or timeout trying to bind to invalid port
        assert not result["success"] or "timeout" in result


class TestCLIWorkflow:
    """Test complete CLI workflow scenarios."""
    
    @pytest.fixture
    def service_dir(self):
        """Get the service directory for running commands."""
        return Path(__file__).parent.parent
    
    def run_cli_command(self, command: list, service_dir: Path, timeout: int = 60) -> Dict[str, Any]:
        """Helper method to run CLI commands."""
        full_command = ["poetry", "run", "ai-service"] + command
        
        try:
            result = subprocess.run(
                full_command,
                cwd=service_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": "Command timed out",
                "success": False
            }
    
    def test_complete_setup_workflow(self, service_dir):
        """Test complete setup workflow: migrate -> ingest -> serve (briefly)."""
        
        # Step 1: Migrate
        migrate_result = self.run_cli_command(["migrate", "--verbose"], service_dir)
        assert migrate_result["success"], f"Migrate failed: {migrate_result['stderr']}"
        
        # Step 2: Ingest
        ingest_result = self.run_cli_command(["ingest"], service_dir, timeout=120)
        assert ingest_result["success"], f"Ingest failed: {ingest_result['stderr']}"
        
        # Step 3: Try to start server (will timeout, but should start)
        serve_result = self.run_cli_command(
            ["serve", "--host", "127.0.0.1", "--port", "8997"],
            service_dir,
            timeout=10
        )
        
        # Server should start up (timeout expected)
        assert "Starting FastAPI server" in serve_result["stderr"] or "timeout" in serve_result
    
    def test_workflow_with_data_verification(self, service_dir):
        """Test workflow and verify data was created correctly."""
        
        # Run migrate and ingest
        migrate_result = self.run_cli_command(["migrate"], service_dir)
        assert migrate_result["success"]
        
        ingest_result = self.run_cli_command(["ingest"], service_dir, timeout=120)
        assert ingest_result["success"]
        
        # Verify database exists and has tables
        db_path = service_dir / "data" / "conversations.sqlite3"
        assert db_path.exists()
        
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check table structure
        cursor.execute("PRAGMA table_info(conversations)")
        conv_columns = [row[1] for row in cursor.fetchall()]
        assert "id" in conv_columns
        assert "title" in conv_columns
        assert "created_at" in conv_columns
        
        cursor.execute("PRAGMA table_info(messages)")
        msg_columns = [row[1] for row in cursor.fetchall()]
        assert "conversation_id" in msg_columns
        assert "role" in msg_columns
        assert "content" in msg_columns
        
        conn.close()
        
        # Verify vector database exists
        chroma_path = service_dir / "data" / "chroma_db"
        assert chroma_path.exists()
        assert chroma_path.is_dir()
        
        # Should have some files in chroma directory
        chroma_files = list(chroma_path.glob("*"))
        assert len(chroma_files) > 0


class TestCLIPerformance:
    """Test CLI command performance."""
    
    @pytest.fixture
    def service_dir(self):
        """Get the service directory for running commands."""
        return Path(__file__).parent.parent
    
    def run_cli_command(self, command: list, service_dir: Path, timeout: int = 120) -> Dict[str, Any]:
        """Helper method to run CLI commands with timing."""
        full_command = ["poetry", "run", "ai-service"] + command
        
        start_time = time.time()
        try:
            result = subprocess.run(
                full_command,
                cwd=service_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            end_time = time.time()
            
            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0,
                "duration": end_time - start_time
            }
        except subprocess.TimeoutExpired:
            end_time = time.time()
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": "Command timed out",
                "success": False,
                "duration": end_time - start_time
            }
    
    def test_migrate_performance(self, service_dir):
        """Test migrate command performance."""
        result = self.run_cli_command(["migrate"], service_dir)
        
        assert result["success"]
        # Migrate should be fast (under 10 seconds)
        assert result["duration"] < 10, f"Migrate took {result['duration']:.1f}s"
    
    def test_ingest_performance(self, service_dir):
        """Test ingest command performance."""
        # Ensure migrate is done first
        migrate_result = self.run_cli_command(["migrate"], service_dir)
        assert migrate_result["success"]
        
        # Time the ingest
        result = self.run_cli_command(["ingest"], service_dir)
        
        assert result["success"]
        # First ingest might take longer, but should complete within reasonable time
        assert result["duration"] < 120, f"Ingest took {result['duration']:.1f}s"
        
        print(f"Ingest completed in {result['duration']:.1f} seconds")
    
    def test_repeated_migrate_performance(self, service_dir):
        """Test that repeated migrates are fast (no-op)."""
        # First migrate
        result1 = self.run_cli_command(["migrate"], service_dir)
        assert result1["success"]
        
        # Second migrate (should be no-op)
        result2 = self.run_cli_command(["migrate"], service_dir)
        assert result2["success"]
        
        # Second migrate should be faster
        assert result2["duration"] < result1["duration"] + 1  # Allow 1s tolerance


# Run tests if called directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
