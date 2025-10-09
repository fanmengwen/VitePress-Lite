"""
Chat and vector search endpoints.
"""

import json
import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from ai_service.models.chat import (
    ChatRequest,
    ChatResponse,
    VectorSearchRequest,
    VectorSearchResponse,
)
from ai_service.services.rag import rag_pipeline

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
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

@router.post("/vector-search", response_model=VectorSearchResponse)
async def vector_search(request: VectorSearchRequest) -> VectorSearchResponse:
    """Progressive UI: vector search first."""
    start = time.time()
    try:
        # reuse rag internal retrieval
        results = await rag_pipeline._retrieve_documents(
            request.query,
            top_k=request.top_k,
        )
        sources = rag_pipeline._create_source_references(results)
        took_ms = int((time.time() - start) * 1000)
        return VectorSearchResponse(sources=sources, took_ms=took_ms)
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        return VectorSearchResponse(sources=[], took_ms=int((time.time() - start) * 1000))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """Stream chat response chunks for progressive UI."""

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    async def event_generator():
        async for event in rag_pipeline.stream_chat(request):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    headers = {"Cache-Control": "no-cache"}
    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers=headers,
    )
