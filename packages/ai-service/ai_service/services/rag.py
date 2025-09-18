"""
RAG (Retrieval-Augmented Generation) pipeline service.
Combine vector search, context building, and LLM generation into a cohesive flow.
"""

from typing import List, Dict, Any, Tuple, Optional
import time
from loguru import logger

from ai_service.config.settings import settings
from ai_service.models.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    SourceReference,
)
from ai_service.services.conversation_store import conversation_store
from ai_service.models.document import DocumentChunk
from ai_service.services.vector_store import vector_store
from ai_service.services.llm import llm_service

# Limit how many history messages are included to avoid excessive context
HISTORY_MAX_MESSAGES = 5


class RAGPipeline:
    """Complete RAG pipeline for question answering.

    Steps:
    1) Retrieve relevant chunks from vector store
    2) Build contextual prompt with optional recent history
    3) Generate answer using LLM
    4) Persist conversation messages (best-effort)
    """

    def __init__(self):
        self.system_prompt_template = """你是 Vite 专家助手。基于提供的文档回答问题，用中文回复，简洁准确。

文档内容：
{context}

对话历史：
{history}"""

    async def process_chat_request(self, request: ChatRequest) -> ChatResponse:
        """Process a chat request through the complete RAG pipeline.

        Args:
            request: Chat request with question and optional history

        Returns:
            ChatResponse with answer, optional sources, and runtime metrics
        """
        start_time = time.time()

        try:
            # Step 1: Retrieve releant documents
            logger.info(f"Processing question: {request.question[:100]}...")
            relevant_chunks = await self._retrieve_documents(
                request.question,
                top_k=settings.retrieval_top_k,
            )

            if not relevant_chunks:
                return self._create_no_context_response(request, start_time)

            # Step 2: Build context and conversation history
            context = self._build_context(relevant_chunks)

            # Prefer persisted history when conversation_id is provided
            persisted_messages: List[ChatMessage] = []
            active_conversation_id: Optional[str] = None

            if request.conversation_id:
                try:
                    existing_conversation = await conversation_store.get_conversation(
                        request.conversation_id
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to load conversation {}: {}",
                        request.conversation_id,
                        exc,
                    )
                    existing_conversation = None

                if existing_conversation:
                    active_conversation_id = existing_conversation.id
                    try:
                        # fetch last N messages from conversation store
                        raw_msgs = await conversation_store.get_messages(
                            existing_conversation.id, limit=10
                        )
                        for m in raw_msgs:
                            persisted_messages.append(
                                ChatMessage(
                                    role=m.role,
                                    content=m.content,
                                    timestamp=m.created_at,
                                )
                            )
                    except Exception as exc:
                        logger.warning(
                            "Failed to load messages for conversation {}: {}",
                            request.conversation_id,
                            exc,
                        )
                        persisted_messages = []
                else:
                    logger.info(
                        "Conversation {} not found; a new conversation will be created.",
                        request.conversation_id,
                    )

            effective_history = (
                persisted_messages if persisted_messages else (request.history or [])
            )
            history = self._build_history(effective_history)

            # Step 3: Create system prompt
            system_prompt = self.system_prompt_template.format(
                context=context, history=history
            )

            # Step 4: Prepare messages for LLM
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.question},
            ]

            # Step 5: Generate response
            answer = await llm_service.generate_response(
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )

            # Step 6: Create source references
            sources = []
            if request.include_sources:
                sources = self._create_source_references(relevant_chunks)

            # Step 7: Calculate response metrics
            response_time_ms = int((time.time() - start_time) * 1000)
            confidence_score = self._calculate_confidence_score(relevant_chunks, answer)

            logger.info(
                f"Generated response in {response_time_ms}ms with {len(sources)} sources"
            )

            # Step 8: Persist conversation
            conversation_id = active_conversation_id
            try:
                conversation_id = await self._ensure_conversation_exists(
                    conversation_id, request.question
                )
                # append user question and assistant answer
                await conversation_store.append_message(
                    conversation_id,
                    role="user",
                    content=request.question,
                )
                await conversation_store.append_message(
                    conversation_id,
                    role="assistant",
                    content=answer,
                    metadata={
                        "sources": [s.model_dump() for s in sources] if sources else [],
                    }
                    if sources
                    else None,
                )
            except Exception as exc:
                # Persistence errors should not break chat; continue without raising
                logger.warning(
                    "Failed to persist conversation {}: {}",
                    conversation_id,
                    exc,
                )

            return ChatResponse(
                answer=answer,
                sources=sources,
                confidence_score=confidence_score,
                response_time_ms=response_time_ms,
                tokens_used=None,
                conversation_id=conversation_id,
            )

        except Exception as e:
            logger.error(f"RAG pipeline failed: {e}")
            return self._create_error_response(request, str(e), start_time)

    async def _retrieve_documents(
        self, query: str,
        *,
        top_k: int = 3,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Retrieve relevant document chunks for a query with intent-aware filtering.

        The steps are:
        1) Analyze query intent to guide filtering strategy
        2) Perform semantic search in the vector store
        3) Apply a second-pass filter and scoring boost based on intent

        Args:
            query: Raw user query text

        Returns:
            List of tuples where each item contains a `DocumentChunk` and its similarity score.
        """
        similarity_threshold = settings.similarity_threshold
        max_results = max(1, min(top_k, 3))

        try:
            # Analyze query intent to tailor post-filtering strategy
            query_intent = self._analyze_query_intent(query)
            # Skip metadata pre-filtering for now; handle uniformly in post-filter stage
            metadata_filter = None

            # Execute semantic search
            results = await vector_store.search_similar(
                query=query,
                similarity_threshold=similarity_threshold,
                metadata_filter=metadata_filter,
            )

            # Apply post-filtering and score boosting based on query intent
            filtered_results = self._post_filter_results(results, query_intent)

            # only return up to max_results
            final_results = filtered_results[:max_results]

            logger.info(
                f"Query intent: {query_intent}, Retrieved {len(final_results)}/{len(results)} relevant chunks"
            )
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
        """Build conversation history string for inclusion in the system prompt."""

        if not history:
            return "No previous conversation."

        # Limit history to avoid token overflow
        recent_history = history[-HISTORY_MAX_MESSAGES:]

        history_parts = []
        for msg in recent_history:
            role_name = "User" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role_name}: {msg.content}")

        return "\n".join(history_parts)

    def _create_source_references(
        self, relevant_chunks: List[Tuple[DocumentChunk, float]]
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
                content_preview=preview,
            )
            sources.append(source)

        return sources

    def _calculate_confidence_score(
        self, relevant_chunks: List[Tuple[DocumentChunk, float]], answer: str
    ) -> float:
        """Calculate confidence score for the generated answer."""

        if not relevant_chunks:
            return 0.0

        # Calculate based on similarity scores and number of sources
        avg_similarity = sum(score for _, score in relevant_chunks) / len(
            relevant_chunks
        )
        source_diversity = min(len(relevant_chunks) / 3.0, 1.0)  # Normalize to 0-1
        answer_length_factor = min(
            len(answer) / 500.0, 1.0
        )  # Longer answers might be more confident

        # Weighted combination
        confidence = (
            avg_similarity * 0.6 + source_diversity * 0.3 + answer_length_factor * 0.1
        )

        return round(min(confidence, 1.0), 2)

    async def _ensure_conversation_exists(
        self, conversation_id: Optional[str], question: str
    ) -> str:
        """Ensure a valid conversation exists and return its identifier."""

        if conversation_id:
            return conversation_id

        title = (question or "").strip()[:50] or "New conversation"
        conv = await conversation_store.create_conversation(title=title)
        return conv.id

    def _create_no_context_response(
        self, request: ChatRequest, start_time: float
    ) -> ChatResponse:
        """Create response when no relevant context is found."""

        response_time_ms = int((time.time() - start_time) * 1000)

        if self._is_chinese(request.question):
            answer = (
                "抱歉，我在现有的 Vite 文档中没有找到与您的问题相关的信息。请尝试：\n\n"
                "1. 重新表述您的问题\n"
                "2. 使用更具体的关键词\n"
                "3. 查看官方 Vite 文档获取最新信息"
            )
        else:
            answer = (
                "I couldn't find relevant information in the Vite documentation to answer your question. "
                "Please try:\n\n"
                "1. Rephrasing your question\n"
                "2. Using more specific keywords\n"
                "3. Checking the official Vite documentation for the latest information"
            )

        return ChatResponse(
            answer=answer,
            sources=[],
            confidence_score=0.0,
            response_time_ms=response_time_ms,
        )

    def _analyze_query_intent(self, query: str) -> str:
        """Analyze user query to classify intent for downstream filtering.

        Returns one of: "configuration", "performance", "comparison",
        "version_release", "concept_learning", or "general".
        """
        query_lower = query.lower()

        # 配置相关关键词
        config_keywords = [
            "配置",
            "config",
            "设置",
            "setting",
            "选项",
            "option",
            "vite.config",
            "alias",
            "别名",
            "代理",
            "proxy",
            "环境变量",
        ]

        # 版本发布相关关键词
        version_keywords = [
            "版本",
            "version",
            "发布",
            "release",
            "更新",
            "update",
            "announcing",
            "新特性",
            "feature",
            "变更",
            "change",
        ]

        # 对比/比较相关关键词
        comparison_keywords = [
            "对比",
            "比较",
            "差异",
            "区别",
            "vs",
            "versus",
            "差别",
            "difference",
        ]

        # 概念学习相关关键词
        concept_keywords = [
            "是什么",
            "什么是",
            "what is",
            "如何",
            "how",
            "为什么",
            "why",
            "原理",
            "principle",
            "机制",
            "mechanism",
        ]

        # 性能优化相关关键词
        performance_keywords = [
            "性能",
            "performance",
            "优化",
            "optimization",
            "seo",
            "速度",
            "speed",
            "快",
            "fast",
        ]

        # 匹配意图 (调整顺序，将更具体的意图放在前面)
        if any(keyword in query_lower for keyword in config_keywords):
            return "configuration"
        elif any(keyword in query_lower for keyword in performance_keywords):
            return "performance"
        elif any(keyword in query_lower for keyword in comparison_keywords):
            return "comparison"
        elif any(keyword in query_lower for keyword in version_keywords):
            return "version_release"
        elif any(keyword in query_lower for keyword in concept_keywords):
            return "concept_learning"
        else:
            return "general"

    def _post_filter_results(
        self,
        results: List[Tuple[DocumentChunk, float]],
        query_intent: str,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Apply a second-pass filter and boost scores according to query intent.

        Args:
            results: Raw similarity results from the vector store
            query_intent: Intent classification for the query

        Returns:
            Re-scored and filtered results sorted by adjusted similarity score (desc).
        """

        if not results:
            return results

        filtered_results = []

        for chunk, score in results:
            # Adjust relevance score based on how well the chunk matches the intent
            relevance_boost = self._calculate_intent_relevance_boost(
                chunk, query_intent
            )
            adjusted_score = min(score + relevance_boost, 1.0)

            # 基于调整后的分数重新过滤
            if adjusted_score >= settings.similarity_threshold:
                filtered_results.append((chunk, adjusted_score))

        # 按调整后的分数重新排序
        filtered_results.sort(key=lambda x: x[1], reverse=True)

        return filtered_results

    def _calculate_intent_relevance_boost(
        self, chunk: DocumentChunk, query_intent: str
    ) -> float:
        """Calculate score boost based on how the chunk aligns with the intent.

        The boost is derived from:
        - Path-level matches (e.g., docs section folders)
        - Title/content keyword cues
        - Intent-specific penalties (e.g., avoid release notes for comparisons)
        """

        boost = 0.0

        # 文档路径匹配加分
        doc_path = chunk.document_path.lower()
        title_lower = chunk.title.lower()

        if query_intent == "configuration":
            if (
                "03-configuration" in doc_path
                or "config" in title_lower
                or "配置" in title_lower
            ):
                boost += 0.2
            # 如果查询配置但匹配到版本发布文档，大幅降分
            if "05-version" in doc_path and "announcing" in doc_path:
                boost -= 0.3

        elif query_intent == "comparison":
            # 比较类问题优先基础与核心概念文档
            if "01-getting-started" in doc_path or "02-core-concepts" in doc_path:
                boost += 0.25
            # 强烈惩罚版本发布/公告类文档
            if "05-version" in doc_path or "announcing" in doc_path:
                boost -= 0.4

            # 内容关键词微调：对比/差异相关字样小幅加分
            comparison_terms = ["对比", "比较", "差异", "区别", "difference", "vs", "versus"]
            content_lower = chunk.content.lower()
            matches = sum(
                1
                for term in comparison_terms
                if term in content_lower or term in title_lower
            )
            boost += min(matches * 0.05, 0.1)

            # 发布/变更类词汇小幅降分
            release_terms = [
                "release",
                "released",
                "announcing",
                "changelog",
                "breaking change",
                "变更",
                "发布",
            ]
            penalties = sum(
                1
                for term in release_terms
                if term in content_lower or term in title_lower
            )
            boost -= min(penalties * 0.05, 0.15)

        elif query_intent == "version_release":
            if "05-version" in doc_path:
                boost += 0.2
            # 版本查询匹配到配置文档，适度降分
            if "03-configuration" in doc_path:
                boost -= 0.1

        elif query_intent == "concept_learning":
            if "01-getting-started" in doc_path or "02-core-concepts" in doc_path:
                boost += 0.2
            # 概念类问题避免版本公告
            if "05-version" in doc_path or "announcing" in doc_path:
                boost -= 0.2

        elif query_intent == "performance":
            if "04-seo-performance" in doc_path:
                boost += 0.2

        # 内容关键词匹配加分
        content_lower = chunk.content.lower()
        if query_intent == "configuration":
            config_content_keywords = [
                "vite.config",
                "defineconfig",
                "plugins",
                "alias",
                "proxy",
            ]
            matches = sum(
                1 for keyword in config_content_keywords if keyword in content_lower
            )
            boost += matches * 0.05

        return boost

    def _create_error_response(
        self, request: ChatRequest, error: str, start_time: float
    ) -> ChatResponse:
        """Create response when an unexpected error occurs."""

        response_time_ms = int((time.time() - start_time) * 1000)

        if self._is_chinese(request.question):
            answer = f"抱歉，处理您的问题时出现了技术错误。请稍后重试。\n\n错误详情：{error}"
        else:
            answer = (
                f"I apologize, but I encountered a technical error while processing your question. "
                f"Please try again later.\n\nError details: {error}"
            )

        return ChatResponse(
            answer=answer,
            sources=[],
            confidence_score=0.0,
            response_time_ms=response_time_ms,
        )

    async def get_system_info(self) -> Dict[str, Any]:
        """Get high-level information about the RAG system for diagnostics."""

        try:
            # Get vector store stats
            vector_stats = await vector_store.get_collection_stats()

            # Get LLM health
            llm_health = await llm_service.check_health()

            return {
                "vector_store": vector_stats,
                "llm_service": llm_health,
                "config": {
                    "retrieval_top_k": 3,
                    "similarity_threshold": settings.similarity_threshold,
                    "chunk_size": settings.chunk_size,
                    "chunk_overlap": settings.chunk_overlap,
                    "embedding_model": settings.embedding_model,
                    "llm_provider": getattr(settings, "llm_provider", "generic"),
                },
            }

        except Exception as e:
            logger.error(f"Failed to get system info: {e}")
            return {"error": str(e)}

    def _is_chinese(self, text: str) -> bool:
        """Detect whether the input text contains CJK Unified Ideographs."""
        return any("\u4e00" <= ch <= "\u9fff" for ch in text)


# Global RAG pipeline instance
rag_pipeline = RAGPipeline()
