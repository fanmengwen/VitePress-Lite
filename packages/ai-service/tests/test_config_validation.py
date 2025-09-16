"""
Configuration validation tests for AI service.
Tests various configuration scenarios and validation logic.
"""

import os
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch
import sys

# Add project to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_service.config.settings import SettingsModule, get_bool, get_int, get_float, get_list, get_str


class TestConfigurationHelpers:
    """Test configuration helper functions."""
    
    def test_get_bool_valid_values(self):
        """Test get_bool with valid boolean values."""
        with patch.dict(os.environ, {"TEST_BOOL_TRUE": "true"}):
            assert get_bool("TEST_BOOL_TRUE") is True
            
        with patch.dict(os.environ, {"TEST_BOOL_FALSE": "false"}):
            assert get_bool("TEST_BOOL_FALSE") is False
            
        with patch.dict(os.environ, {"TEST_BOOL_1": "1"}):
            assert get_bool("TEST_BOOL_1") is True
            
        with patch.dict(os.environ, {"TEST_BOOL_0": "0"}):
            assert get_bool("TEST_BOOL_0") is False
            
        with patch.dict(os.environ, {"TEST_BOOL_YES": "yes"}):
            assert get_bool("TEST_BOOL_YES") is True
            
        with patch.dict(os.environ, {"TEST_BOOL_NO": "no"}):
            assert get_bool("TEST_BOOL_NO") is False
    
    def test_get_bool_default_values(self):
        """Test get_bool with default values."""
        # Non-existent key should return default
        assert get_bool("NONEXISTENT_BOOL", default=True) is True
        assert get_bool("NONEXISTENT_BOOL", default=False) is False
        
        # Invalid value should return default
        with patch.dict(os.environ, {"INVALID_BOOL": "invalid"}):
            assert get_bool("INVALID_BOOL", default=True) is True
    
    def test_get_int_valid_values(self):
        """Test get_int with valid integer values."""
        with patch.dict(os.environ, {"TEST_INT": "42"}):
            assert get_int("TEST_INT") == 42
            
        with patch.dict(os.environ, {"TEST_INT_NEG": "-10"}):
            assert get_int("TEST_INT_NEG") == -10
    
    def test_get_int_invalid_values(self):
        """Test get_int with invalid values."""
        with patch.dict(os.environ, {"INVALID_INT": "not_a_number"}):
            assert get_int("INVALID_INT", default=100) == 100
            
        # Non-existent key should return default
        assert get_int("NONEXISTENT_INT", default=50) == 50
    
    def test_get_float_valid_values(self):
        """Test get_float with valid float values."""
        with patch.dict(os.environ, {"TEST_FLOAT": "3.14"}):
            assert get_float("TEST_FLOAT") == 3.14
            
        with patch.dict(os.environ, {"TEST_FLOAT_INT": "42"}):
            assert get_float("TEST_FLOAT_INT") == 42.0
    
    def test_get_float_invalid_values(self):
        """Test get_float with invalid values."""
        with patch.dict(os.environ, {"INVALID_FLOAT": "not_a_float"}):
            assert get_float("INVALID_FLOAT", default=1.5) == 1.5
    
    def test_get_list_json_format(self):
        """Test get_list with JSON format."""
        with patch.dict(os.environ, {"TEST_LIST_JSON": '["item1", "item2", "item3"]'}):
            result = get_list("TEST_LIST_JSON")
            assert result == ["item1", "item2", "item3"]
    
    def test_get_list_comma_separated(self):
        """Test get_list with comma-separated format."""
        with patch.dict(os.environ, {"TEST_LIST_CSV": "item1,item2,item3"}):
            result = get_list("TEST_LIST_CSV")
            assert result == ["item1", "item2", "item3"]
    
    def test_get_list_invalid_json(self):
        """Test get_list with invalid JSON falls back to CSV."""
        with patch.dict(os.environ, {"TEST_LIST_INVALID": "item1,item2"}):
            result = get_list("TEST_LIST_INVALID")
            assert result == ["item1", "item2"]
    
    def test_get_str_basic(self):
        """Test get_str basic functionality."""
        with patch.dict(os.environ, {"TEST_STRING": "hello_world"}):
            assert get_str("TEST_STRING") == "hello_world"
            
        # Non-existent key should return default
        assert get_str("NONEXISTENT_STRING", default="default_value") == "default_value"


class TestSettingsModule:
    """Test SettingsModule configuration."""
    
    def test_default_settings(self):
        """Test default settings values."""
        settings = SettingsModule()
        
        # Basic settings
        assert settings.project_name == "VitePress-Lite AI Service"
        assert settings.version == "0.1.0"
        assert settings.host == "127.0.0.1"
        assert settings.port == 8000
        assert settings.workers == 1
        
        # LLM settings
        assert settings.model == "gpt-3.5-turbo"
        assert settings.temperature == 0.1
        assert settings.max_tokens == 1000
        
        # Vector DB settings
        assert settings.vector_db_type == "chromadb"
        assert settings.collection_name == "vite_docs"
        
        # RAG settings
        assert settings.retrieval_top_k == 5
        assert settings.similarity_threshold == 0.3
    
    def test_environment_override(self):
        """Test that environment variables override defaults."""
        env_vars = {
            "PROJECT_NAME": "Custom AI Service",
            "PORT": "9000",
            "WORKERS": "4",
            "MODEL": "gpt-4",
            "TEMPERATURE": "0.5",
            "RETRIEVAL_TOP_K": "10"
        }
        
        with patch.dict(os.environ, env_vars):
            settings = SettingsModule()
            
            assert settings.project_name == "Custom AI Service"
            assert settings.port == 9000
            assert settings.workers == 4
            assert settings.model == "gpt-4"
            assert settings.temperature == 0.5
            assert settings.retrieval_top_k == 10
    
    def test_cors_origins_configuration(self):
        """Test CORS origins configuration."""
        # Test default
        settings = SettingsModule()
        default_origins = ["http://localhost:5173", "http://localhost:3001"]
        assert settings.cors_origins == default_origins
        
        # Test override with JSON
        cors_json = '["http://localhost:8080", "http://example.com"]'
        with patch.dict(os.environ, {"CORS_ORIGINS": cors_json}):
            settings = SettingsModule()
            assert settings.cors_origins == ["http://localhost:8080", "http://example.com"]
    
    def test_boolean_settings(self):
        """Test boolean settings configuration."""
        bool_env = {
            "RELOAD": "false",
            "ACCESS_LOG": "false",
            "ENABLE_TRUSTED_HOST_MIDDLEWARE": "true",
            "ENABLE_FILE_LOGGING": "true"
        }
        
        with patch.dict(os.environ, bool_env):
            settings = SettingsModule()
            
            assert settings.reload is False
            assert settings.access_log is False
            assert settings.enable_trusted_host_middleware is True
            assert settings.enable_file_logging is True
    
    def test_path_settings(self):
        """Test path-related settings."""
        path_env = {
            "CHROMADB_PATH": "/custom/chroma",
            "DOCS_PATH": "/custom/docs",
            "CONVERSATION_DB_PATH": "/custom/conversations.db",
            "LOG_FILE": "/custom/logs/app.log"
        }
        
        with patch.dict(os.environ, path_env):
            settings = SettingsModule()
            
            assert settings.chromadb_path == "/custom/chroma"
            assert settings.docs_path == "/custom/docs"
            assert settings.conversation_db_path == "/custom/conversations.db"
            assert settings.log_file == "/custom/logs/app.log"
    
    def test_llm_config_with_api_key(self):
        """Test LLM configuration when API key is provided."""
        with patch.dict(os.environ, {"API_KEY": "test-api-key-123"}):
            settings = SettingsModule()
            
            config = settings.get_llm_config()
            
            assert config["api_key"] == "test-api-key-123"
            assert config["model"] == "gpt-3.5-turbo"
            assert config["temperature"] == 0.1
            assert config["max_tokens"] == 1000
            assert config["base_url"] is None
    
    def test_llm_config_without_api_key(self):
        """Test LLM configuration fails when API key is missing."""
        # Make sure API_KEY is not set
        with patch.dict(os.environ, {}, clear=False):
            if "API_KEY" in os.environ:
                del os.environ["API_KEY"]
            
            settings = SettingsModule()
            
            with pytest.raises(ValueError, match="API_KEY is required"):
                settings.get_llm_config()
    
    def test_llm_config_with_base_url(self):
        """Test LLM configuration with custom base URL."""
        env_vars = {
            "API_KEY": "test-api-key",
            "BASE_URL": "https://custom-api.example.com/v1"
        }
        
        with patch.dict(os.environ, env_vars):
            settings = SettingsModule()
            
            config = settings.get_llm_config()
            
            assert config["base_url"] == "https://custom-api.example.com/v1"


class TestConfigurationValidation:
    """Test configuration validation scenarios."""
    
    def test_valid_production_config(self):
        """Test a valid production-like configuration."""
        prod_env = {
            "PROJECT_NAME": "VitePress AI Production",
            "HOST": "0.0.0.0",
            "PORT": "8000",
            "WORKERS": "4",
            "RELOAD": "false",
            "API_KEY": "sk-prod-key-example",
            "MODEL": "gpt-4",
            "TEMPERATURE": "0.1",
            "MAX_TOKENS": "2000",
            "CHROMADB_PATH": "/data/chroma",
            "DOCS_PATH": "/app/docs",
            "LOG_LEVEL": "INFO",
            "ENABLE_FILE_LOGGING": "true",
            "CORS_ORIGINS": '["https://yourdomain.com"]'
        }
        
        with patch.dict(os.environ, prod_env):
            settings = SettingsModule()
            
            # Should not raise any errors
            assert settings.project_name == "VitePress AI Production"
            assert settings.host == "0.0.0.0"
            assert settings.workers == 4
            assert settings.reload is False
            
            # LLM config should work
            llm_config = settings.get_llm_config()
            assert llm_config["api_key"] == "sk-prod-key-example"
    
    def test_development_config(self):
        """Test a development configuration."""
        dev_env = {
            "HOST": "127.0.0.1",
            "PORT": "8000",
            "WORKERS": "1",
            "RELOAD": "true",
            "API_KEY": "test-dev-key",
            "LOG_LEVEL": "DEBUG",
            "ENABLE_FILE_LOGGING": "false"
        }
        
        with patch.dict(os.environ, dev_env):
            settings = SettingsModule()
            
            assert settings.host == "127.0.0.1"
            assert settings.workers == 1
            assert settings.reload is True
            assert settings.log_level == "DEBUG"
            assert settings.enable_file_logging is False
    
    def test_minimal_config(self):
        """Test minimal required configuration."""
        minimal_env = {
            "API_KEY": "minimal-test-key"
        }
        
        with patch.dict(os.environ, minimal_env, clear=True):
            settings = SettingsModule()
            
            # Should use defaults for everything else
            assert settings.host == "127.0.0.1"
            assert settings.port == 8000
            assert settings.model == "gpt-3.5-turbo"
            
            # LLM config should work with minimal setup
            llm_config = settings.get_llm_config()
            assert llm_config["api_key"] == "minimal-test-key"
    
    def test_invalid_numeric_values(self):
        """Test handling of invalid numeric values."""
        invalid_env = {
            "PORT": "not_a_number",
            "WORKERS": "invalid",
            "TEMPERATURE": "not_float",
            "MAX_TOKENS": "invalid_int"
        }
        
        with patch.dict(os.environ, invalid_env):
            settings = SettingsModule()
            
            # Should fall back to defaults when invalid values provided
            assert settings.port == 8000  # Falls back to actual default
            assert settings.workers == 1   # Falls back to actual default  
            assert settings.temperature == 0.1  # Falls back to actual default
            assert settings.max_tokens == 1000  # Falls back to actual default
    
    def test_edge_case_values(self):
        """Test edge case values."""
        edge_env = {
            "PORT": "0",
            "WORKERS": "-1",
            "TEMPERATURE": "2.0",
            "MAX_TOKENS": "100000",
            "RETRIEVAL_TOP_K": "0",
            "SIMILARITY_THRESHOLD": "1.1"
        }
        
        with patch.dict(os.environ, edge_env):
            settings = SettingsModule()
            
            # Values should be accepted as provided (validation handled elsewhere)
            assert settings.port == 0
            assert settings.workers == -1
            assert settings.temperature == 2.0
            assert settings.max_tokens == 100000
            assert settings.retrieval_top_k == 0
            assert settings.similarity_threshold == 1.1


class TestEnvironmentSpecificConfigs:
    """Test environment-specific configurations."""
    
    def test_docker_config(self):
        """Test Docker-specific configuration."""
        docker_env = {
            "HOST": "0.0.0.0",
            "PORT": "8000",
            "WORKERS": "1",
            "RELOAD": "false",
            "CHROMADB_PATH": "/data/chroma_db",
            "DOCS_PATH": "/app/docs",
            "CONVERSATION_DB_PATH": "/data/conversations.sqlite3",
            "LOG_LEVEL": "INFO",
            "ENABLE_FILE_LOGGING": "true",
            "LOG_FILE": "/var/log/ai-service.log"
        }
        
        with patch.dict(os.environ, docker_env):
            settings = SettingsModule()
            
            assert settings.host == "0.0.0.0"  # Docker needs to bind to all interfaces
            assert settings.chromadb_path == "/data/chroma_db"
            assert settings.docs_path == "/app/docs"
            assert settings.enable_file_logging is True
    
    def test_testing_config(self):
        """Test testing environment configuration."""
        test_env = {
            "HOST": "127.0.0.1",
            "PORT": "8999",
            "WORKERS": "1",
            "RELOAD": "false",
            "API_KEY": "test-key-for-testing",
            "LOG_LEVEL": "DEBUG",
            "ENABLE_FILE_LOGGING": "false",
            "CHROMADB_PATH": "/tmp/test_chroma",
            "CONVERSATION_DB_PATH": "/tmp/test_conversations.db"
        }
        
        with patch.dict(os.environ, test_env):
            settings = SettingsModule()
            
            assert settings.port == 8999  # Different port for testing
            assert settings.log_level == "DEBUG"
            assert settings.enable_file_logging is False
            assert "/tmp/" in settings.chromadb_path  # Temporary paths


# Run tests if called directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
