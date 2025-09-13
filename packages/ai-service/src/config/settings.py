"""
Configuration management for AI service.
Supports multiple LLM providers and vector storage options.
"""

from typing import Literal, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Main application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Server Configuration
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of workers")
    reload: bool = Field(default=True, description="Auto-reload on changes")
    
    # Environment
    environment: Literal["development", "testing", "production"] = Field(
        default="development", description="Application environment"
    )
    
    # LLM Configuration
    llm_provider: Literal["auto", "openai", "aliyun", "deepseek", "local", "ollama"] = Field(
        default="auto", description="LLM provider to use (auto selects by available API keys)"
    )
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(
        default=None, description="OpenAI API key"
    )
    openai_model: str = Field(
        default="gpt-3.5-turbo", description="OpenAI model name"
    )
    openai_temperature: float = Field(
        default=0.1, description="LLM temperature for consistency"
    )
    openai_max_tokens: int = Field(
        default=1000, description="Maximum tokens in response"
    )
    
    # 阿里云通义千问配置
    aliyun_api_key: Optional[str] = Field(
        default=None, description="阿里云通义千问 API Key"
    )
    aliyun_model: str = Field(
        default="qwen-turbo", description="阿里云模型名称"
    )
    aliyun_base_url: str = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1", 
        description="阿里云 API Base URL"
    )
    
    # DeepSeek 配置
    deepseek_api_key: Optional[str] = Field(
        default=None, description="DeepSeek API Key"
    )
    deepseek_model: str = Field(
        default="deepseek-chat", description="DeepSeek 模型名称"
    )
    deepseek_base_url: str = Field(
        default="https://api.deepseek.com/v1", 
        description="DeepSeek API Base URL"
    )
    
    
    # Embedding Configuration
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2", 
        description="Sentence transformer model for embeddings"
    )
    embedding_dimension: int = Field(
        default=384, description="Embedding vector dimension"
    )
    
    # Vector Database Configuration
    vector_db_type: Literal["chromadb", "faiss"] = Field(
        default="chromadb", description="Vector database type"
    )
    chromadb_path: str = Field(
        default="./data/chroma_db", description="ChromaDB storage path"
    )
    collection_name: str = Field(
        default="vite_docs", description="Vector collection name"
    )
    
    # Document Processing
    docs_path: str = Field(
        default="../../docs", description="Path to documentation files"
    )
    chunk_size: int = Field(
        default=1000, description="Document chunk size in characters"
    )
    chunk_overlap: int = Field(
        default=200, description="Overlap between chunks"
    )
    
    # RAG Configuration
    retrieval_top_k: int = Field(
        default=5, description="Number of relevant chunks to retrieve"
    )
    similarity_threshold: float = Field(
        default=0.7, description="Minimum similarity score for retrieval"
    )
    
    # API Configuration
    api_prefix: str = Field(default="/api", description="API route prefix")
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3001"],
        description="Allowed CORS origins"
    )
    
    # Security
    api_key_header: str = Field(
        default="X-API-Key", description="API key header name"
    )
    api_key: Optional[str] = Field(
        default=None, description="Optional API key for authentication"
    )
    
    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO", description="Logging level"
    )
    log_format: str = Field(
        default="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        description="Log format string"
    )
    
    # Performance
    cache_ttl: int = Field(
        default=3600, description="Cache TTL in seconds"
    )
    max_concurrent_requests: int = Field(
        default=10, description="Maximum concurrent requests"
    )
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"
    
    def get_llm_config(self) -> dict:
        """Get LLM configuration based on provider."""
        provider = self.llm_provider

        # Auto-select provider by available API keys
        if provider == "auto":
            if self.aliyun_api_key:
                provider = "aliyun"
            elif self.deepseek_api_key:
                provider = "deepseek"
            elif self.openai_api_key:
                provider = "openai"
            else:
                raise ValueError("No LLM API key configured. Set ALIYUN_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY in .env")

        if provider == "openai":
            return {
                "provider": "openai",
                "api_key": self.openai_api_key,
                "model": self.openai_model,
                "temperature": self.openai_temperature,
                "max_tokens": self.openai_max_tokens,
                "base_url": None,  # 使用默认 OpenAI URL
            }
        elif provider == "aliyun":
            return {
                "provider": "aliyun",
                "api_key": self.aliyun_api_key,
                "model": self.aliyun_model,
                "temperature": self.openai_temperature,
                "max_tokens": self.openai_max_tokens,
                "base_url": self.aliyun_base_url,
            }
        elif provider == "deepseek":
            return {
                "provider": "deepseek",
                "api_key": self.deepseek_api_key,
                "model": self.deepseek_model,
                "temperature": self.openai_temperature,
                "max_tokens": self.openai_max_tokens,
                "base_url": self.deepseek_base_url,
            }
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")


# Global settings instance
settings = Settings() 
