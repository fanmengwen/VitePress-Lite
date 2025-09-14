"""
Chat API models for request/response validation.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ChatMessage(BaseModel):
    """Individual chat message."""
    
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")


class ChatRequest(BaseModel):
    """Chat API request model."""
    
    question: str = Field(
        ..., 
        min_length=1, 
        max_length=1000,
        description="User's question about the documentation"
    )
    history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Previous conversation history"
    )
    max_tokens: Optional[int] = Field(
        default=None,
        ge=1,
        le=2000,
        description="Maximum tokens in response"
    )
    temperature: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=2.0,
        description="LLM temperature override"
    )
    include_sources: bool = Field(
        default=True,
        description="Whether to include source references in response"
    )


class SourceReference(BaseModel):
    """Reference to source document."""
    
    title: str = Field(..., description="Document title")
    file_path: str = Field(..., description="Relative file path")
    chunk_index: int = Field(..., description="Chunk index within document")
    similarity_score: float = Field(..., description="Similarity score")
    content_preview: str = Field(..., description="Preview of relevant content")


class ChatResponse(BaseModel):
    """Chat API response model."""
    
    answer: str = Field(..., description="AI generated answer")
    sources: List[SourceReference] = Field(
        default=[],
        description="Source references used to generate answer"
    )
    confidence_score: Optional[float] = Field(
        default=None,
        description="Confidence score for the answer"
    )
    response_time_ms: int = Field(..., description="Response time in milliseconds")
    tokens_used: Optional[int] = Field(
        default=None,
        description="Number of tokens used in generation"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation identifier"
    )


# Vector search only request/response for progressive UI
class VectorSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Query text")
    top_k: int = Field(default=3, ge=1, le=10)
    similarity_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class VectorSearchResponse(BaseModel):
    sources: List[SourceReference] = Field(default_factory=list)
    took_ms: int = Field(..., description="Elapsed time in ms")


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = Field(..., description="Service version")
    vector_db_status: str = Field(..., description="Vector database status")
    llm_status: str = Field(..., description="LLM service status")
    documents_indexed: int = Field(..., description="Number of indexed documents")


class ErrorResponse(BaseModel):
    """Error response model."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = Field(
        default=None,
        description="Request identifier for debugging"
    ) 
