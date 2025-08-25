"""
RAG (Retrieval-Augmented Generation) pipeline service.
Combines vector search, context building, and LLM generation.
"""

from typing import List, Dict, Any, Tuple, Optional
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
        self.system_prompt_template = """你是 Vite 专家助手。基于提供的文档回答问题，用中文回复，简洁准确。

文档内容：
{context}

对话历史：
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
            # 使用优化的检索参数
            top_k = min(3, settings.retrieval_top_k)  # 最多检索3个文档
            relevant_chunks = await self._retrieve_documents(
                request.question,
                top_k=top_k
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
        """Retrieve relevant documents from vector store with smart filtering."""
        
        similarity_threshold = similarity_threshold or settings.similarity_threshold
        
        try:
            # 智能查询意图识别
            query_intent = self._analyze_query_intent(query)
            metadata_filter = self._build_metadata_filter(query_intent)
            
            # 执行语义搜索
            results = await vector_store.search_similar(
                query=query,
                top_k=top_k * 2,  # 获取更多结果用于后续过滤
                similarity_threshold=similarity_threshold,
                metadata_filter=metadata_filter
            )
            
            # 基于查询意图进行二次过滤
            filtered_results = self._post_filter_results(results, query_intent, query)
            
            # 限制最终结果数量
            final_results = filtered_results[:top_k]
            
            logger.info(f"Query intent: {query_intent}, Retrieved {len(final_results)}/{len(results)} relevant chunks")
            return final_results
            
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
    
    def _analyze_query_intent(self, query: str) -> str:
        """分析查询意图，识别用户想要查找的内容类型."""
        query_lower = query.lower()
        
        # 配置相关关键词
        config_keywords = ['配置', 'config', '设置', 'setting', '选项', 'option', 
                          'vite.config', 'alias', '别名', '代理', 'proxy', '环境变量']
        
        # 版本发布相关关键词  
        version_keywords = ['版本', 'version', '发布', 'release', '更新', 'update', 
                           'announcing', '新特性', 'feature', '变更', 'change']
        
        # 概念学习相关关键词
        concept_keywords = ['是什么', '什么是', 'what is', '如何', 'how', '为什么', 'why',
                           '原理', 'principle', '机制', 'mechanism']
        
        # 性能优化相关关键词
        performance_keywords = ['性能', 'performance', '优化', 'optimization', 'seo',
                              '速度', 'speed', '快', 'fast']
        
        # 匹配意图
        if any(keyword in query_lower for keyword in config_keywords):
            return 'configuration'
        elif any(keyword in query_lower for keyword in version_keywords):
            return 'version_release'
        elif any(keyword in query_lower for keyword in concept_keywords):
            return 'concept_learning'
        elif any(keyword in query_lower for keyword in performance_keywords):
            return 'performance'
        else:
            return 'general'
    
    def _build_metadata_filter(self, query_intent: str) -> Optional[Dict[str, Any]]:
        """根据查询意图构建元数据过滤条件."""
        
        # ChromaDB 使用简单的键值对过滤，暂时禁用复杂过滤
        # 将在后续的二次过滤中实现精确匹配
        return None  # 使用后续的二次过滤替代元数据预过滤
    
    def _post_filter_results(
        self, 
        results: List[Tuple[DocumentChunk, float]], 
        query_intent: str,
        original_query: str
    ) -> List[Tuple[DocumentChunk, float]]:
        """基于查询意图对检索结果进行二次过滤."""
        
        if not results:
            return results
            
        filtered_results = []
        
        for chunk, score in results:
            # 基于查询意图的相关性评分调整
            relevance_boost = self._calculate_intent_relevance_boost(chunk, query_intent, original_query)
            adjusted_score = min(score + relevance_boost, 1.0)
            
            # 基于调整后的分数重新过滤
            if adjusted_score >= settings.similarity_threshold:
                filtered_results.append((chunk, adjusted_score))
        
        # 按调整后的分数重新排序
        filtered_results.sort(key=lambda x: x[1], reverse=True)
        
        return filtered_results
    
    def _calculate_intent_relevance_boost(
        self, 
        chunk: DocumentChunk, 
        query_intent: str,
        original_query: str
    ) -> float:
        """根据文档与查询意图的匹配度计算相关性提升分数."""
        
        boost = 0.0
        query_lower = original_query.lower()
        
        # 文档路径匹配加分
        doc_path = chunk.document_path.lower()
        title_lower = chunk.title.lower()
        
        if query_intent == 'configuration':
            if '03-configuration' in doc_path or 'config' in title_lower or '配置' in title_lower:
                boost += 0.2
            # 如果查询配置但匹配到版本发布文档，大幅降分
            if '05-version' in doc_path and 'announcing' in doc_path:
                boost -= 0.3
                
        elif query_intent == 'version_release':
            if '05-version' in doc_path:
                boost += 0.2
            # 版本查询匹配到配置文档，适度降分
            if '03-configuration' in doc_path:
                boost -= 0.1
                
        elif query_intent == 'concept_learning':
            if '01-getting-started' in doc_path or '02-core-concepts' in doc_path:
                boost += 0.2
                
        elif query_intent == 'performance':
            if '04-seo-performance' in doc_path:
                boost += 0.2
        
        # 内容关键词匹配加分
        content_lower = chunk.content.lower()
        if query_intent == 'configuration':
            config_content_keywords = ['vite.config', 'defineconfig', 'plugins', 'alias', 'proxy']
            matches = sum(1 for keyword in config_content_keywords if keyword in content_lower)
            boost += matches * 0.05
        
        return boost

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