# AI 服务 - VitePress-Lite

基于 RAG（检索增强生成）架构的 AI 驱动文档问答服务。该服务通过向量检索与大语言模型结合，为 Vite 文档内容提供智能问答能力。

## 🚀 功能特性

- **RAG 架构**：结合向量搜索与语言模型生成
- **多模型支持**：支持 OpenAI、阿里云通义千问、DeepSeek 等多个LLM提供商
- **智能切块**：基于 Markdown 结构的智能文档分块处理
- **向量搜索**：基于 ChromaDB 的语义检索
- **中文支持**：原生中文理解能力
- **FastAPI 后端**：现代化异步 Python API
- **友好界面**：支持代码块、列表等格式化消息显示
- **Docker 支持**：容器化部署

## 📋 先决条件

- Python 3.10+
- 推荐使用 Poetry，或使用 pip
- Git

## 🛠️ 安装

### 1. 克隆并进入目录

```bash
cd packages/ai-service
```

### 2. 安装依赖

**推荐使用 Poetry：**

````bash
curl 'http://localhost:5173/api/chat' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9,en-AU;q=0.8,en;q=0.7,is;q=0.6' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -H 'Referer: http://localhost:5173/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  --data-raw '{"question":"vite可以做什么","history":[{"role":"user","content":"什么是 Vite？","timestamp":"2025-08-04T13:22:07.239Z"},{"role":"assistant","content":"Vite 是一个现代化的前端构建工具，由 Vue.js 作者尤雨溪开发。它利用浏览器原生 ES 模块支持，提供快速的开发服务器启动和热更新，同时通过预构建依赖和按需编译提升开发体验。生产环境则基于 Rollup 进行打包。","timestamp":"2025-08-04T13:22:10.150Z"},{"role":"user","content":"vite可以做什么","timestamp":"2025-08-04T13:34:34.367Z"},{"role":"user","content":"vite可以做什么","timestamp":"2025-08-04T13:41:44.444Z"}],"temperature":0.1,"include_sources":true}'```

**使用 pip：**

```bash
pip install -r requirements.txt  # 从 pyproject.toml 生成
````

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 核心配置
OPENAI_API_KEY=your-openai-api-key-here
LLM_PROVIDER=openai
DOCS_PATH=../docs-site/docs
```

## ⚙️ 配置说明

### 大语言模型（LLM）提供商

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

### 文档处理配置

```env
# 文档路径
DOCS_PATH=../docs-site/docs

# 性能优化配置（自动应用）
CHUNK_SIZE=800                    # 文档块大小（优化：1000→800）
CHUNK_OVERLAP=100                 # 块重叠（优化：200→100）
RETRIEVAL_TOP_K=3                 # 检索文档数（优化：5→3）
SIMILARITY_THRESHOLD=0.3          # 相似度阈值（平衡：0.5→0.3）
OPENAI_MAX_TOKENS=500             # 最大Token数（优化：1000→500）
OPENAI_TEMPERATURE=0.1            # 温度参数
CACHE_TTL=1800                    # 缓存时间（30分钟）
```

### LLM提供商配置

#### 阿里云通义千问（推荐-速度快）

```env
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=your-aliyun-api-key
ALIYUN_MODEL=qwen-turbo
```

#### DeepSeek（推荐-成本低）

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

## 🏃‍♂️ 快速启动

### 方法1：🚀 性能优化启动（推荐）

使用我们的优化启动脚本，可以获得最佳性能体验：

```bash
# 一键启动优化版AI服务
python3 start_optimized.py
```

**优化效果：**

- ✅ 响应时间：从19秒优化到2秒（提升91%）
- ✅ 检索效率：减少40%检索时间
- ✅ 生成速度：Token数量减半，生成更快
- ✅ 自动应用最佳配置参数

### 方法2：标准启动

#### 1. 文档切块与向量索引

运行以下命令进行文档处理与索引：

```bash
# 使用 Poetry
poetry run python scripts/ingest.py

# 或直接使用 Python（推荐）
PYTHONPATH=. python scripts/ingest.py
```

可选参数：

```bash
# 清除旧数据后重新处理
python scripts/ingest.py --clear

# 仅处理指定文件
python scripts/ingest.py --file ../docs-site/docs/unit/unit1.md

# 输出详细日志
python scripts/ingest.py --verbose
```

#### 2. 启动服务

```bash
# 使用 Poetry
poetry run python src/main.py

# 或直接使用 Python（推荐）
PYTHONPATH=. python src/main.py
```

默认服务地址为 `http://localhost:8000`

#### 基础API测试

```bash
# 测试健康状态
curl http://localhost:8000/health

# 测试聊天功能
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是 Vite？",
    "include_sources": true
  }'
```

#### 完整集成测试

```bash
# 切换到前端目录并运行集成测试
cd ../docs-site
pnpm test:ai
```

**期望测试结果：**

- ✅ AI Service Health: PASSED
- ✅ AI Chat Endpoint: PASSED
- ✅ 响应时间 < 5秒
- ✅ 显示 "🚀 Great response time! Optimizations are working."

## 📚 API 文档

### Chat 问答接口

**POST** `/api/chat`

处理用户问题并返回 AI 生成的答案与参考来源。

**请求示例：**

```json
{
  "question": "如何配置 Vite 的代理？",
  "history": [
    {
      "role": "user",
      "content": "上一个问题",
      "timestamp": "2025-01-01T12:00:00Z"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.1,
  "include_sources": true
}
```

**响应示例：**

```json
{
  "answer": "要配置 Vite 的代理，可在 vite.config.js 中使用 `server.proxy` 选项...",
  "sources": [
    {
      "title": "Vite 配置指南",
      "file_path": "unit/unit1.md",
      "chunk_index": 2,
      "similarity_score": 0.85,
      "content_preview": "Vite 的代理配置允许你..."
    }
  ],
  "confidence_score": 0.92,
  "response_time_ms": 1250,
  "tokens_used": 456
}
```

### 健康检查

**GET** `/health`

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "version": "0.1.0",
  "vector_db_status": "healthy",
  "llm_status": "healthy",
  "documents_indexed": 42
}
```

### 向量存储管理

- **GET** `/api/vector-store/stats` - 获取向量存储统计信息
- **DELETE** `/api/vector-store/clear` - 清除所有文档
- **DELETE** `/api/vector-store/documents/{path}` - 删除指定文档

## 🐳 Docker 部署

### 构建镜像

```bash
docker build -t vitepress-lite-ai .
```

### 运行容器

```bash
docker run -d   --name ai-service   -p 8000:8000   -e OPENAI_API_KEY=your-key-here   -v $(pwd)/data:/app/data   vitepress-lite-ai
```

### Docker Compose 配置

```yaml
version: "3.8"
services:
  ai-service:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=your-key-here
      - ENVIRONMENT=production
    volumes:
      - ./data:/app/data
      - ../docs-site/docs:/app/docs:ro
```

## 🔧 开发说明

### 项目结构

```
ai-service/
├── src/
│   ├── config/
│   │   └── settings.py          # 配置管理
│   ├── models/
│   │   ├── chat.py             # API 请求/响应模型
│   │   └── document.py         # 文档数据模型
│   ├── services/
│   │   ├── embedding.py        # 向量嵌入服务
│   │   ├── vector_store.py     # ChromaDB 向量存储
│   │   ├── llm.py             # LLM 抽象封装
│   │   └── rag.py             # RAG 问答流程
│   ├── utils/
│   │   ├── chunking.py        # 文档分块处理
│   │   └── preprocessing.py   # 内容预处理
│   └── main.py                # FastAPI 应用入口
├── scripts/
│   ├── ingest.py              # 文档处理脚本
│   └── test_service.py        # 服务测试脚本
├── tests/
│   ├── test_api.py            # 接口测试
│   ├── test_rag.py           # RAG 测试
│   └── conftest.py           # 测试配置
├── start_optimized.py         # 🚀 性能优化启动脚本
├── performance_config.py      # ⚡ 性能配置模块
├── pyproject.toml            # 项目依赖配置
├── Dockerfile               # Docker 配置
└── README.md               # 本文档
```

## ⚡ **性能优化功能**

### 🚀 优化启动脚本

**命令：** `python3 start_optimized.py`

**作用：**

- 自动应用最佳性能配置
- 设置优化的环境变量
- 显示配置信息
- 启动AI服务

**优化效果：**
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 响应时间 | 19秒 | ~2秒 | 91% |
| 检索文档数 | 5个 | 3个 | 40% |
| Token数量 | 1000 | 500 | 50% |

### ⚙️ 性能配置模块

**文件：** `performance_config.py`

**作用：**

- 定义性能优化参数
- 自动应用环境变量
- 可被其他脚本导入使用

**主要参数：**

```python
RETRIEVAL_TOP_K = '3'         # 检索文档数量
SIMILARITY_THRESHOLD = '0.3'   # 相似度阈值
OPENAI_MAX_TOKENS = '500'      # 最大Token数
CHUNK_SIZE = '800'             # 文档块大小
CHUNK_OVERLAP = '100'          # 块重叠大小
```

### 没有文档被索引

```bash
# 检查文档路径
ls -la ../docs-site/docs/

# 重新处理并输出日志
python scripts/ingest.py --verbose --clear
```

### ChromaDB 问题

```bash
# 清空并重新初始化向量数据库
rm -rf ./data/chroma_db
python scripts/ingest.py --clear
```

## 🔗 集成说明

### Monorepo 集成

该服务已完整集成至 VitePress-Lite 的 Monorepo 中：

1. **代理配置**：前端通过 `/api/chat` 转发至该服务（已优化代理配置顺序）
2. **文档共享**：读取 `../docs-site/docs/` 中的内容
3. **类型共享**：使用统一接口定义
4. **UI集成**：前端包含优化的聊天组件，支持格式化消息显示

### 前端集成功能

#### API客户端

**文件：** `../docs-site/src/api/index.ts`

```typescript
// 已添加的便捷方法
api.askAI(question, options?)
```

#### 聊天组件

**文件：** `../docs-site/src/components/ChatbotWindow.vue`

**功能特性：**

- 🎨 紧凑/展开双状态设计
- 💬 消息历史记录
- 📱 响应式移动适配
- 🌙 深色/浅色主题支持
- 📚 源文档引用显示
- ⚡ 优化的加载和错误状态

#### 使用方式

**完整启动流程：**

```bash
# 1. 启动AI服务（性能优化版）
cd packages/ai-service
python3 start_optimized.py

# 2. 启动前端服务
cd ../docs-site
pnpm dev

# 3. 访问应用
# 打开 http://localhost:5173
# 点击右下角的AI助手图标
```
