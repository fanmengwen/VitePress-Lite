"""
Health check and system information endpoints.
"""

from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from ai_service.models.chat import HealthResponse
from ai_service.services.rag import rag_pipeline
from .dependencies import verify_api_key

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
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


@router.get("/system-info", dependencies=[Depends(verify_api_key)])
async def get_system_info() -> Dict[str, Any]:
    """Get detailed system information."""
    try:
        return await rag_pipeline.get_system_info()
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
