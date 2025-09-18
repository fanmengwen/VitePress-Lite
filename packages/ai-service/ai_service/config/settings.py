"""
Configuration management for AI service.
All configuration values are read directly from .env file.
"""

import os
import json
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_bool(key: str, default: bool = False) -> bool:
    """Convert environment variable to boolean."""
    value = os.getenv(key, "").lower()
    if value in ("true", "1", "yes", "on"):
        return True
    elif value in ("false", "0", "no", "off"):
        return False
    return default

def get_int(key: str, default: int = 0) -> int:
    """Convert environment variable to integer."""
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default

def get_float(key: str, default: float = 0.0) -> float:
    """Convert environment variable to float."""
    try:
        return float(os.getenv(key, str(default)))
    except ValueError:
        return default

def get_list(key: str, default: List[str] = None) -> List[str]:
    """Convert environment variable to list (JSON format)."""
    if default is None:
        default = []
    
    value = os.getenv(key)
    if not value:
        return default
    
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        # Fallback to comma-separated values
        return [item.strip() for item in value.split(",") if item.strip()]

def get_str(key: str, default: str = "") -> str:
    """Get string environment variable with default."""
    return os.getenv(key, default)

class SettingsModule:
    """Configuration module that provides settings as attributes."""
    
    def __init__(self):
        # Project Config
        self.project_name = get_str("PROJECT_NAME", "VitePress-Lite AI Service")
        self.version = get_str("VERSION", "0.1.0")
        self.description = get_str("DESCRIPTION", "AI-powered documentation Q&A service using RAG")
        self.api_prefix = get_str("API_PREFIX", "/api")
        
        # Server Configuration
        self.host = get_str("HOST", "127.0.0.1")
        self.port = get_int("PORT", 8000)
        self.workers = get_int("WORKERS", 1)
        self.reload = get_bool("RELOAD", True)
        self.access_log = get_bool("ACCESS_LOG", True)
        
        # Middleware and Logging Control
        self.enable_trusted_host_middleware = get_bool("ENABLE_TRUSTED_HOST_MIDDLEWARE", False)
        self.enable_file_logging = get_bool("ENABLE_FILE_LOGGING", False)
        
        # LLM Configuration (Generic)
        self.api_key = get_str("API_KEY")
        self.model = get_str("MODEL", "gpt-3.5-turbo")
        self.base_url = get_str("BASE_URL")  # Optional, defaults to OpenAI if not set
        self.temperature = get_float("TEMPERATURE", 0.1)
        self.max_tokens = get_int("MAX_TOKENS", 1000)
        
        # Embedding Configuration
        self.embedding_model = get_str("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.embedding_dimension = get_int("EMBEDDING_DIMENSION", 384)
        
        # Vector Database Configuration
        self.vector_db_type = get_str("VECTOR_DB_TYPE", "chromadb")
        self.chromadb_path = get_str("CHROMADB_PATH", "./data/chroma_db")
        self.collection_name = get_str("COLLECTION_NAME", "vite_docs")
        
        # Conversation store configuration
        self.conversation_store = get_str("CONVERSATION_STORE", "sqlite")
        self.conversation_db_path = get_str("CONVERSATION_DB_PATH", "./data/conversations.sqlite3")
        
        # Document Processing
        self.docs_path = get_str("DOCS_PATH", "../../docs")
        self.chunk_size = get_int("CHUNK_SIZE", 1000)
        self.chunk_overlap = get_int("CHUNK_OVERLAP", 200)
        
        # RAG Configuration
        self.retrieval_top_k = get_int("RETRIEVAL_TOP_K", 5)
        self.similarity_threshold = get_float("SIMILARITY_THRESHOLD", 0.7)
        
        # API Configuration
        self.cors_origins = get_list(
            "CORS_ORIGINS",
            ["http://localhost:5173", "http://localhost:4173", "http://localhost:3001"],
        )
        
        # Security
        self.api_key_header = get_str("API_KEY_HEADER", "X-API-Key")
        
        # Logging
        self.log_file = get_str("LOG_FILE", "logs/ai-service.log")
        self.log_level = get_str("LOG_LEVEL", "INFO")
        self.log_rotation = get_str("LOG_ROTATION", "10 MB")
        self.log_retention = get_str("LOG_RETENTION", "10 days")
        self.log_format = get_str(
            "LOG_FORMAT",
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        )
        
        # Performance
        self.cache_ttl = get_int("CACHE_TTL", 3600)
        self.max_concurrent_requests = get_int("MAX_CONCURRENT_REQUESTS", 10)
    
    def get_llm_config(self) -> dict:
        if not self.api_key:
            raise ValueError("API_KEY is required in .env file")
        
        return {
            "api_key": self.api_key,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "base_url": self.base_url or None,  # Use OpenAI default if not specified
        }


# Global settings instance
settings = SettingsModule()
