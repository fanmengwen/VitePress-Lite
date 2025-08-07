"""
RAG (Retrieval-Augmented Generation) pipeline service.
Combines vector search, context building, and LLM generation.
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import time
from loguru import logger

from src.config.settings import settings
from src.models.chat import ChatRequest, ChatResponse, ChatMessage, SourceReference
from src.models.document import DocumentChunk
from src.services.vector_store import vector_store
from src.services.llm import llm_service


class RAGPipeline:
    """Complete RAG pipeline for question answering."""
    
    def __init__(self):
        self.system_prompt_template = """You are an expert AI assistant specializing in Vite and modern web development tools. You help developers understand Vite concepts, configuration, and best practices.

Your responses should be:
1. **Accurate**: Based only on the provided context
2. **Helpful**: Practical and actionable advice
3. **Clear**: Easy to understand explanations
4. **Concise**: Direct answers without unnecessary details
5. **Chinese-friendly**: Respond in Chinese when the question is in Chinese

If the context doesn't contain enough information to answer the question, say so honestly and suggest what type of information would be helpful.

Context from documentation:
{context}

Previous conversation:
{history}"""

    async def process_chat_request(self, request: ChatRequest) -> ChatResponse:
        """
        Process a chat request through the complete RAG pipeline.
        
        Args:
            request: Chat request with question and optional history
            
        Returns:
            Chat response with answer and sources
        """
        start_time = time.time()
        
        try:
            # Step 1: Retrieve relevant documents
            logger.info(f"Processing question: {request.question[:100]}...")
            relevant_chunks = await self._retrieve_documents(
                request.question,
                top_k=request.max_tokens or settings.retrieval_top_k
            )
            
            if not relevant_chunks:
                return self._create_no_context_response(request, start_time)
            
            # Step 2: Build context and conversation history
            context = self._build_context(relevant_chunks)
            history = self._build_history(request.history or [])
            
            # Step 3: Create system prompt
            system_prompt = self.system_prompt_template.format(
                context=context,
                history=history
            )
            
            # Step 4: Prepare messages for LLM
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.question}
            ]
            
            # Step 5: Generate response
            answer = await llm_service.generate_response(
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )
            
            # Step 6: Create source references
            sources = []
            if request.include_sources:
                sources = self._create_source_references(relevant_chunks)
            
            # Step 7: Calculate response metrics
            response_time_ms = int((time.time() - start_time) * 1000)
            confidence_score = self._calculate_confidence_score(relevant_chunks, answer)
            
            logger.info(f"Generated response in {response_time_ms}ms with {len(sources)} sources")
            
            return ChatResponse(
                answer=answer,
                sources=sources,
                confidence_score=confidence_score,
                response_time_ms=response_time_ms,
                tokens_used=None,  # Would need to track from LLM
                conversation_id=None  # Could implement conversation tracking
            )
            
        except Exception as e:
            logger.error(f"RAG pipeline failed: {e}")
            return self._create_error_response(request, str(e), start_time)
    
    async def _retrieve_documents(
        self, 
        query: str, 
        top_k: int = 5,
        similarity_threshold: float = None
    ) -> List[Tuple[DocumentChunk, float]]:
        """Retrieve relevant documents from vector store."""
        
        similarity_threshold = similarity_threshold or settings.similarity_threshold
        
        try:
            # Perform semantic search
            results = await vector_store.search_similar(
                query=query,
                top_k=top_k,
                similarity_threshold=similarity_threshold
            )
            
            logger.debug(f"Retrieved {len(results)} relevant chunks")
            return results
            
        except Exception as e:
            logger.error(f"Document retrieval failed: {e}")
            return []
    
    def _build_context(self, relevant_chunks: List[Tuple[DocumentChunk, float]]) -> str:
        """Build context string from relevant document chunks."""
        
        if not relevant_chunks:
            return "No relevant documentation found."
        
        context_parts = []
        
        for i, (chunk, score) in enumerate(relevant_chunks, 1):
            # Format each chunk with metadata
            chunk_text = f"""
Document {i}: {chunk.title}
{f"Section: {chunk.heading}" if chunk.heading else ""}
Source: {chunk.relative_path}
Relevance: {score:.2f}

{chunk.content}
---"""
            context_parts.append(chunk_text.strip())
        
        return "\n\n".join(context_parts)
    
    def _build_history(self, history: List[ChatMessage]) -> str:
        """Build conversation history string."""
        
        if not history:
            return "No previous conversation."
        
        # Limit history to avoid token overflow
        recent_history = history[-5:]  # Last 5 messages
        
        history_parts = []
        for msg in recent_history:
            role_name = "User" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role_name}: {msg.content}")
        
        return "\n".join(history_parts)
    
    def _create_source_references(
        self, 
        relevant_chunks: List[Tuple[DocumentChunk, float]]
    ) -> List[SourceReference]:
        """Create source references from relevant chunks."""
        
        sources = []
        
        for chunk, score in relevant_chunks:
            # Create preview of content
            preview = chunk.content[:200]
            if len(chunk.content) > 200:
                preview += "..."
            
            source = SourceReference(
                title=chunk.title,
                file_path=chunk.relative_path,
                chunk_index=chunk.chunk_index,
                similarity_score=score,
                content_preview=preview
            )
            sources.append(source)
        
        return sources
    
    def _calculate_confidence_score(
        self, 
        relevant_chunks: List[Tuple[DocumentChunk, float]], 
        answer: str
    ) -> float:
        """Calculate confidence score for the generated answer."""
        
        if not relevant_chunks:
            return 0.0
        
        # Calculate based on similarity scores and number of sources
        avg_similarity = sum(score for _, score in relevant_chunks) / len(relevant_chunks)
        source_diversity = min(len(relevant_chunks) / 3.0, 1.0)  # Normalize to 0-1
        answer_length_factor = min(len(answer) / 500.0, 1.0)  # Longer answers might be more confident
        
        # Weighted combination
        confidence = (avg_similarity * 0.6 + source_diversity * 0.3 + answer_length_factor * 0.1)
        
        return round(min(confidence, 1.0), 2)
    
    def _create_no_context_response(self, request: ChatRequest, start_time: float) -> ChatResponse:
        """Create response when no relevant context is found."""
        
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Check if question is in Chinese
        is_chinese = any('\u4e00' <= char <= '\u9fff' for char in request.question)
        
        if is_chinese:
            answer = "抱歉，我在现有的 Vite 文档中没有找到与您的问题相关的信息。请尝试：\n\n" \
                     "1. 重新表述您的问题\n" \
                     "2. 使用更具体的关键词\n" \
                     "3. 查看官方 Vite 文档获取最新信息"
        else:
            answer = "I couldn't find relevant information in the Vite documentation to answer your question. " \
                     "Please try:\n\n" \
                     "1. Rephrasing your question\n" \
                     "2. Using more specific keywords\n" \
                     "3. Checking the official Vite documentation for the latest information"
        
        return ChatResponse(
            answer=answer,
            sources=[],
            confidence_score=0.0,
            response_time_ms=response_time_ms
        )
    
    def _create_error_response(self, request: ChatRequest, error: str, start_time: float) -> ChatResponse:
        """Create response when an error occurs."""
        
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Check if question is in Chinese
        is_chinese = any('\u4e00' <= char <= '\u9fff' for char in request.question)
        
        if is_chinese:
            answer = f"抱歉，处理您的问题时出现了技术错误。请稍后重试。\n\n错误详情：{error}"
        else:
            answer = f"I apologize, but I encountered a technical error while processing your question. " \
                     f"Please try again later.\n\nError details: {error}"
        
        return ChatResponse(
            answer=answer,
            sources=[],
            confidence_score=0.0,
            response_time_ms=response_time_ms
        )
    
    async def get_system_info(self) -> Dict[str, Any]:
        """Get information about the RAG system."""
        
        try:
            # Get vector store stats
            vector_stats = await vector_store.get_collection_stats()
            
            # Get LLM health
            llm_health = await llm_service.check_health()
            
            return {
                "vector_store": vector_stats,
                "llm_service": llm_health,
                "config": {
                    "retrieval_top_k": settings.retrieval_top_k,
                    "similarity_threshold": settings.similarity_threshold,
                    "chunk_size": settings.chunk_size,
                    "chunk_overlap": settings.chunk_overlap,
                    "embedding_model": settings.embedding_model,
                    "llm_provider": settings.llm_provider
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get system info: {e}")
            return {"error": str(e)}


# Global RAG pipeline instance
rag_pipeline = RAGPipeline() 