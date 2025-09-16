"""
Administrative endpoints for vector store management.
"""

from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from ai_service.services.vector_store import vector_store
from .dependencies import verify_api_key

router = APIRouter()


@router.get("/vector-store/stats", dependencies=[Depends(verify_api_key)])
async def get_vector_store_stats() -> Dict[str, Any]:
    """Get vector store statistics."""
    try:
        return await vector_store.get_collection_stats()
    except Exception as e:
        logger.error(f"Failed to get vector store stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/vector-store/clear", dependencies=[Depends(verify_api_key)])
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


@router.delete("/vector-store/documents/{document_path:path}", dependencies=[Depends(verify_api_key)])
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
