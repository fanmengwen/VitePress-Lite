"""
FastAPI application for AI-powered documentation Q&A service.
Provides chat endpoints with RAG capabilities.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import uvicorn

from src.config.settings import settings
from src.models.chat import ChatRequest, ChatResponse, HealthResponse, ErrorResponse
from src.services.rag import rag_pipeline
from src.services.vector_store import vector_store
from src.services.embedding import embedding_service
from src.services.llm import llm_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting AI service...")
    
    try:
        # Initialize services
        await embedding_service.initialize()
        await vector_store.initialize()
        await llm_service.initialize()
        
        logger.info("All services initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    finally:
        # Shutdown
        logger.info("Shutting down AI service...")
        await llm_service.close()


# Create FastAPI application
app = FastAPI(
    title="VitePress-Lite AI Service",
    description="AI-powered documentation Q&A service using RAG",
    version="0.1.0",
    docs_url="/docs" if settings.is_development() else None,
    redoc_url="/redoc" if settings.is_development() else None,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Configure trusted hosts in production
if settings.is_production():
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1"]
    )


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler."""
    logger.error(f"Unhandled exception in {request.method} {request.url}: {exc}")
    
    error_response = ErrorResponse(
        error="internal_server_error",
        message="An unexpected error occurred",
        detail={"type": type(exc).__name__} if settings.is_development() else None
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTP exception handler."""
    error_response = ErrorResponse(
        error="http_error",
        message=exc.detail,
        detail={"status_code": exc.status_code}
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


# Dependency for API key authentication
async def verify_api_key(request: Request) -> None:
    """Verify API key if configured."""
    if not settings.api_key:
        return  # No API key required
    
    api_key = request.headers.get(settings.api_key_header)
    if not api_key or api_key != settings.api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check the health of all services."""
    try:
        # Get system info from RAG pipeline
        system_info = await rag_pipeline.get_system_info()
        
        # Determine overall status
        vector_status = "healthy"
        llm_status = "healthy"
        
        if "error" in system_info:
            vector_status = "unhealthy"
            llm_status = "unhealthy"
        else:
            vector_stats = system_info.get("vector_store", {})
            llm_health = system_info.get("llm_service", {})
            
            if "error" in vector_stats:
                vector_status = "unhealthy"
            
            if llm_health.get("status") != "healthy":
                llm_status = "unhealthy"
        
        # Count indexed documents
        documents_indexed = 0
        if vector_status == "healthy" and "vector_store" in system_info:
            documents_indexed = system_info["vector_store"].get("total_documents", 0)
        
        return HealthResponse(
            status="healthy" if vector_status == "healthy" and llm_status == "healthy" else "degraded",
            version="0.1.0",
            vector_db_status=vector_status,
            llm_status=llm_status,
            documents_indexed=documents_indexed
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            version="0.1.0",
            vector_db_status="unknown",
            llm_status="unknown",
            documents_indexed=0
        )


# System info endpoint
@app.get("/system-info", dependencies=[Depends(verify_api_key)])
async def get_system_info() -> Dict[str, Any]:
    """Get detailed system information."""
    try:
        return await rag_pipeline.get_system_info()
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Main chat endpoint
@app.post(f"{settings.api_prefix}/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    api_key_check: None = Depends(verify_api_key)
) -> ChatResponse:
    """
    Process a chat request using RAG pipeline.
    
    Args:
        request: Chat request with question and optional history
        
    Returns:
        Chat response with answer and sources
    """
    try:
        logger.info(f"Processing chat request: {request.question[:50]}...")
        
        # Validate request
        if not request.question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty"
            )
        
        # Process through RAG pipeline
        response = await rag_pipeline.process_chat_request(request)
        
        logger.info(f"Chat request processed successfully in {response.response_time_ms}ms")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )


# Vector store management endpoints (admin only)
@app.get(f"{settings.api_prefix}/vector-store/stats", dependencies=[Depends(verify_api_key)])
async def get_vector_store_stats() -> Dict[str, Any]:
    """Get vector store statistics."""
    try:
        return await vector_store.get_collection_stats()
    except Exception as e:
        logger.error(f"Failed to get vector store stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(f"{settings.api_prefix}/vector-store/clear", dependencies=[Depends(verify_api_key)])
async def clear_vector_store() -> Dict[str, str]:
    """Clear all documents from vector store."""
    try:
        success = await vector_store.clear_collection()
        if success:
            return {"message": "Vector store cleared successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear vector store")
    except Exception as e:
        logger.error(f"Failed to clear vector store: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(f"{settings.api_prefix}/vector-store/documents/{{document_path:path}}", dependencies=[Depends(verify_api_key)])
async def delete_document(document_path: str) -> Dict[str, Any]:
    """Delete a specific document from vector store."""
    try:
        deleted_count = await vector_store.delete_documents(document_path)
        return {
            "message": f"Deleted {deleted_count} chunks from document",
            "document_path": document_path,
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Configure logging
def setup_logging():
    """Configure logging for the application."""
    logger.remove()  # Remove default handler
    
    logger.add(
        sink=lambda msg: print(msg, end=""),
        format=settings.log_format,
        level=settings.log_level,
        colorize=True
    )
    
    # Add file logging in production
    if settings.is_production():
        logger.add(
            "logs/ai-service.log",
            rotation="10 MB",
            retention="10 days",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=settings.log_level
        )


def main():
    """Main entry point for the application."""
    setup_logging()
    
    logger.info(f"Starting AI service on {settings.host}:{settings.port}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"LLM Provider: {settings.llm_provider}")
    logger.info(f"Embedding Model: {settings.embedding_model}")
    
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload and settings.is_development(),
        workers=1 if settings.is_development() else settings.workers,
        log_level=settings.log_level.lower(),
        access_log=settings.is_development()
    )


if __name__ == "__main__":
    main() 