# AI 服务 (VitePress-Lite)

本项目为 VitePress-Lite 文档提供基于检索增强生成 (Retrieval-Augmented Generation, RAG) 的后端服务，旨在为文档内容提供智能问答能力。

## 核心功能

- **RAG 架构**: 采用先进的 RAG 管道，为用户问题提供精准、上下文感知的回答。
- **多 LLM 支持**: 内置对 OpenAI, 阿里云通义千问, DeepSeek 等多种大语言模型的支持，具备良好的扩展性。
- **向量检索**: 使用 ChromaDB 进行高效的语义向量检索，快速定位相关文档片段。
- **FastAPI 后端**: 基于现代、高性能的异步 Python Web 框架 FastAPI 构建。
- **增量索引**: 智能处理文档更新，仅对新增或变更的文件进行处理，优化索引效率。
- **Docker 化**: 提供完整的 Docker 支持，确保开发与生产环境的一致性。

## 技术栈

- **语言**: Python 3.10+
- **框架**: FastAPI, Pydantic
- **依赖管理**: Poetry
- **向量数据库**: ChromaDB
- **模型**: Sentence-Transformers (用于 Embedding), OpenAI/Qwen/DeepSeek (用于 LLM)
- **测试**: Pytest, HTTPX

## 环境准备

在开始之前，请确保您的开发环境已安装以下工具：

- Python 3.10 或更高版本
- [Poetry](https://python-poetry.org/) (Python 依赖管理工具)

## 快速开始

请遵循以下步骤来安装、配置并启动服务。

### 1. 安装依赖

进入 AI 服务目录并使用 Poetry 安装项目依赖。开发环境建议包含 "dev" 依赖组，以便进行测试和开发。

```bash
cd packages/ai-service
poetry install --with dev
```

### 2. 环境配置

服务配置通过根目录下的 `.env` 文件进行管理。您可以复制 `.env.example` 文件（如果存在）或手动创建。

一个最小化的 `.env` 文件至少需要包含 LLM 提供商的相关凭证：

```env
# .env

# LLM 提供商配置 (选择其一: openai, qwen, deepseek)
LLM_PROVIDER=openai
# 根据选择的提供商，配置对应的 API Key
OPENAI_API_KEY="sk-..."

# (可选) 自定义文档路径，默认为 ../../docs
# DOCS_PATH=../../docs
```

### 3. 初始化

在首次启动服务前，需要执行数据库迁移和文档索引。

```bash
# 1. 执行数据库迁移
poetry run ai-service migrate

# 2. 索引文档内容 (将 docs/ 目录下的文档处理并存入向量数据库)
poetry run ai-service ingest
```

`ingest` 命令支持增量更新，仅处理自上次运行以来发生变化的文件。

### 4. 启动服务

完成初始化后，即可启动 FastAPI 服务。

```bash
poetry run ai-service serve
```

服务默认将在 `http://localhost:8000` 启动。您可以通过访问 `http://localhost:8000/health` 来检查服务健康状态。

## 项目测试

本项目采用 `pytest` 进行测试，测试套件覆盖了单元测试、集成测试和端到端 (E2E) 测试。

### 运行测试

请确保已安装 `dev` 依赖组 (`poetry install --with dev`)。

#### 1. 运行单元与组件测试

这些测试不依赖外部服务，可以快速执行以验证核心逻辑。

```bash
poetry run pytest tests/
```

为了更精确地运行，可以排除需要运行服务的集成测试和E2E测试：

```bash
poetry run pytest tests/ --ignore=tests/integration_test.py --ignore=tests/test_api_integration.py --ignore=tests/test_e2e_workflow.py
```

#### 2. 运行集成测试

集成测试需要服务在后台运行。

```bash
# 终端 A: 启动服务
poetry run ai-service serve --port 8001

# 终端 B: 运行集成测试脚本
# 注意: integration_test.py 是一个独立的测试脚本
poetry run python tests/integration_test.py --url http://localhost:8001 --test all
```

#### 3. 运行完整的 `pytest` 套件 (包含API集成测试)

```bash
# 终端 A: 启动服务
poetry run ai-service serve --port 8001

# 终端 B: 运行 pytest 测试
# 注意: 这会运行 test_api_integration.py 等文件
poetry run pytest tests/test_api_integration.py
```

_注意：完整的测试指南请参阅 `TESTING.md` 文件。_

## 命令行接口 (CLI)

服务的所有核心操作都通过 `ai-service` 命令行工具进行。

- `ai-service migrate`: 执行数据库迁移。
- `ai-service ingest`: 索引文档。支持 `--clear` 参数以强制重建索引。
- `ai-service serve`: 启动 API 服务。支持 `--host`, `--port`, `--workers` 等参数。

使用 `--help` 查看更多详情：

```bash
poetry run ai-service --help
poetry run ai-service ingest --help
```

## Docker 部署

项目根目录的 `docker-compose.yml` 文件提供了最便捷的部署方式，能够一键启动包括 AI 服务在内的所有组件。

```bash
# 于项目根目录执行
docker-compose up --build
```

容器的入口脚本 (`entrypoint.sh`) 会自动处理依赖安装、数据库迁移和初次数据索引。

如需在容器运行时手动同步文档更新，可执行：

```bash
docker-compose exec ai-service ai-service ingest
```
