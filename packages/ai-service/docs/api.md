## VitePress-Lite AI 服务 API 文档

> 面向前后端联调的接口说明，涵盖所有可用端点、认证方式、请求/响应结构与示例。

### 基础信息
- 基础地址（Base URL）：`http://localhost:8000`
- 统一前缀（Prefix）：`/api`（仅 Chat / Conversations / Admin 模块使用）
- 返回格式：`application/json`（ORJSON）
- 版本：`0.1.0`

### 认证方式（API Key）
- 开关：通过 `.env` 中的 `API_KEY` 是否配置决定。
- 认证头：`X-API-Key: <你的密钥>`（可通过 `API_KEY_HEADER` 自定义，默认即为 `X-API-Key`）。
- 影响范围：
  - 需要 API Key：`/api/chat`、`/api/vector-store/*`（Admin）、`/system-info`
  - 不需要 API Key：`/health`、`/api/vector-search`、`/api/conversations/*`

当 `API_KEY` 未配置时，上述「需要 API Key」的接口也将无需认证。

### 通用错误响应结构（可能 4xx/5xx）
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred.",
  "detail": null,
  "timestamp": "2025-01-01T12:00:00",
  "request_id": "abc123"
}
```

---

## Health 模块（无前缀）

### GET /health
- **说明**：检查服务整体健康状态。
- **认证**：不需要
- **请求体**：无
- **响应体**（200）：
```json
{
  "status": "healthy | degraded | unhealthy",
  "timestamp": "2025-01-01T12:00:00",
  "version": "0.1.0",
  "vector_db_status": "healthy | unhealthy | unknown",
  "llm_status": "healthy | unhealthy | unknown",
  "documents_indexed": 123
}
```

### GET /system-info
- **说明**：获取系统详细信息（向量库、LLM、配置等）。
- **认证**：需要（若配置了 `API_KEY`）
- **请求体**：无
- **响应体**（200 示例）：
```json
{
  "vector_store": {
    "total_documents": 1200,
    "unique_authors": 3,
    "unique_titles": 200,
    "unique_tags": 20,
    "collection_name": "vite_docs",
    "embedding_dimension": 384
  },
  "llm_service": {
    "status": "healthy",
    "model": "gpt-3.5-turbo"
  },
  "config": {
    "retrieval_top_k": 5,
    "similarity_threshold": 0.7,
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "embedding_model": "all-MiniLM-L6-v2",
    "llm_provider": "openai"
  }
}
```

---

## Chat 模块（前缀 `/api`）

### POST /api/chat
- **说明**：基于 RAG 的问答接口，支持会话上下文与来源引用。
- **认证**：需要（若配置了 `API_KEY`）
- **请求体** `ChatRequest`：
  - `question` string 必填，1-1000 字符
  - `conversation_id` string 可选，用于继续既有会话
  - `history` ChatMessage[] 可选，若提供 `conversation_id` 则优先使用服务端已存历史
    - ChatMessage：`{ role: "user" | "assistant", content: string, timestamp?: string }`
  - `max_tokens` number 可选，1-2000
  - `temperature` number 可选，0.0-2.0
  - `include_sources` boolean 可选，默认 true

- **请求示例**：
```json
{
  "question": "Vite 的核心优势是什么？",
  "conversation_id": null,
  "history": [
    { "role": "user", "content": "什么是 Vite?" },
    { "role": "assistant", "content": "Vite 是一个前端构建工具..." }
  ],
  "max_tokens": 512,
  "temperature": 0.2,
  "include_sources": true
}
```

- **成功响应体** `ChatResponse`（200）：
```json
{
  "answer": "Vite 的核心优势包括快速冷启动、即时热更新...",
  "sources": [
    {
      "title": "Getting Started",
      "file_path": "01-getting-started/unit1.md",
      "chunk_index": 0,
      "similarity_score": 0.83,
      "content_preview": "Vite 是一个下一代前端构建工具..."
    }
  ],
  "confidence_score": 0.78,
  "response_time_ms": 123,
  "tokens_used": null,
  "conversation_id": "2f9d5c2a-2b2b-4a9e-9f4b-c9b2d9f1a1d0"
}
```

- **失败与校验**：
  - 400：`question` 为空
  - 401：未携带或携带错误 `X-API-Key`（在配置了 `API_KEY` 时）
  - 500：服务错误（见通用错误结构）

### POST /api/vector-search
- **说明**：仅返回向量检索结果（渐进式 UI，先出来源）。
- **认证**：不需要
- **请求体** `VectorSearchRequest`：
  - `query` string 必填
  - `top_k` number 可选，默认 3，范围 1-10
  - `similarity_threshold` number 可选，0.0-1.0（默认取服务配置）

- **请求示例**：
```json
{
  "query": "如何配置 vite 代理？",
  "top_k": 3
}
```

- **响应体** `VectorSearchResponse`（200）：
```json
{
  "sources": [
    {
      "title": "Configuration",
      "file_path": "03-configuration/setting.md",
      "chunk_index": 1,
      "similarity_score": 0.81,
      "content_preview": "代理可通过 server.proxy 进行设置..."
    }
  ],
  "took_ms": 42
}
```

---

## Conversations 会话模块（前缀 `/api`）

### GET /api/conversations
- **说明**：列出全部会话，按更新时间倒序。
- **认证**：不需要
- **查询参数**：
  - `limit` number 可选，默认 200，范围 1-500
  - `offset` number 可选，默认 0，范围 >= 0
- **请求体**：无
- **响应体**（200）：`ConversationInfo[]`
```json
[
  { "id": "uuid-1", "title": "My topic", "created_at": "2025-01-01T12:00:00Z", "updated_at": "2025-01-01T12:00:00Z" }
]
```

### POST /api/conversations
- **说明**：创建新会话。
- **认证**：不需要
- **请求体**（可选）：`{ "title"?: string }`
- **响应码**：201 Created
- **响应体**（201）：`ConversationInfo`
```json
{ "id": "uuid-1", "title": "My topic", "created_at": "2025-01-01T12:00:00Z", "updated_at": "2025-01-01T12:00:00Z" }
```

### GET /api/conversations/{conversation_id}
- **说明**：获取会话详情（含消息历史）。
- **认证**：不需要
- **路径参数**：
  - `conversation_id` string 必填
- **响应体**（200）：`ConversationDetail`
```json
{
  "id": "uuid-1",
  "title": "My topic",
  "messages": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好，请问..." }
  ]
}
```
- **错误**：404（会话不存在）

### PATCH /api/conversations/{conversation_id}
- **说明**：重命名会话。
- **认证**：不需要
- **路径参数**：`conversation_id` string 必填
- **请求体**：`{ "title": string }`
- **校验**：`title` 去首尾空格后需为非空，建议长度 <= 100
- **响应体**（200）：`{ "title": "Updated Title" }`
- **错误**：
  - 400：缺少或空白 `title`
  - 404：会话不存在

### DELETE /api/conversations/{conversation_id}
- **说明**：删除会话。
- **认证**：不需要
- **路径参数**：`conversation_id` string 必填
- **响应**：204 No Content（body 为空）
- **错误**：404（会话不存在）

---

## Admin 向量库管理（前缀 `/api`，默认需要 API Key）

### GET /api/vector-store/stats
- **说明**：获取向量集合统计信息。
- **认证**：需要（若配置了 `API_KEY`）
- **请求体**：无
- **响应体**（200 示例）：
```json
{
  "total_documents": 1200,
  "unique_authors": 3,
  "unique_titles": 200,
  "unique_tags": 20,
  "collection_name": "vite_docs",
  "embedding_dimension": 384
}
```

### DELETE /api/vector-store/clear
- **说明**：清空向量集合全部文档（危险操作）。
- **认证**：需要（若配置了 `API_KEY`）
- **请求体**：无
- **响应体**（200）：
```json
{ "message": "Vector store cleared successfully" }
```

### DELETE /api/vector-store/documents/{document_path}
- **说明**：按文档路径删除该文档对应的全部切片（chunks）。
- **认证**：需要（若配置了 `API_KEY`）
- **路径参数**：
  - `document_path` string 必填，路径匹配为 `:path`，请对 URL 进行编码（例如 `01-getting-started/unit1.md` → `01-getting-started%2Funit1.md`）。
- **响应体**（200 示例）：
```json
{
  "message": "Deleted 5 chunks from document",
  "document_path": "01-getting-started/unit1.md",
  "deleted_count": 5
}
```

---

## 附：数据模型摘要

- `ChatMessage`：`{ role: "user" | "assistant", content: string, timestamp?: string }`
- `ChatRequest`：`{ question: string, conversation_id?: string, history?: ChatMessage[], max_tokens?: number, temperature?: number, include_sources?: boolean }`
- `SourceReference`：`{ title: string, file_path: string, chunk_index: number, similarity_score: number, content_preview: string }`
- `ChatResponse`：`{ answer: string, sources: SourceReference[], confidence_score?: number, response_time_ms: number, tokens_used?: number, conversation_id?: string }`
- `VectorSearchRequest`：`{ query: string, top_k?: number, similarity_threshold?: number }`
- `VectorSearchResponse`：`{ sources: SourceReference[], took_ms: number }`
- `ConversationInfo`：`{ id: string, title: string, updated_at: string }`
- `ConversationDetail`：`{ id: string, title: string, messages: ChatMessage[] }`
- `HealthResponse`：`{ status: string, timestamp: string, version: string, vector_db_status: string, llm_status: string, documents_indexed: number }`

---

## 使用示例（cURL）

```bash
# 1) 健康检查
curl -s http://localhost:8000/health | jq

# 2) 提问（如配置了 API_KEY 则需携带）
curl -sX POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <YOUR_API_KEY>' \
  -d '{
    "question": "Vite 的核心优势是什么？",
    "include_sources": true
  }' | jq

# 3) 仅向量检索
curl -sX POST http://localhost:8000/api/vector-search \
  -H 'Content-Type: application/json' \
  -d '{ "query": "如何配置 vite 代理？" }' | jq

# 4) 获取系统信息（如配置了 API_KEY 则需携带）
curl -s http://localhost:8000/system-info -H 'X-API-Key: <YOUR_API_KEY>' | jq
```


