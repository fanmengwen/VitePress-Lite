# VitePress-Lite

> 基于 Vue 3 + Vite 的现代化文档平台，提供 Express API 与 AI（RAG）问答服务

## 🎯 项目概述

VitePress-Lite 采用“**文件为源，数据库为本**”的混合架构：

- 自定义 Vite 插件将 Markdown 实时转换为 Vue 组件
- API Server 管理用户与内容（Prisma）
- AI Service 基于 RAG 为文档提供智能问答

## 🏗️ 目录结构（Monorepo）

```
VitePress-Lite/
├── docs/                       # Markdown 源文件（系统真源）
├── packages/
│   ├── docs-site/              # 🎨 前端文档站点（Vite + Vue 3）
│   │   ├── plugins/            # 自定义 Vite 插件（MD → Vue SFC, 虚拟路由）
│   │   └── src/                # Vue 应用源码
│   └── api-server/             # 🛠️ 后端 API（Express + Prisma）
│       ├── prisma/             # Prisma schema / 迁移 / 同步脚本
│       └── src/                # 应用代码
└── packages/ai-service/        # 🤖 AI（FastAPI + ChromaDB + LLM）
```

## 🚀 技术栈

- **前端**：Vue 3 + TypeScript + Vite + 自定义插件
- **后端**：Node.js + Express + Prisma（SQLite 默认 / PostgreSQL 可选）
- **AI**：FastAPI + ChromaDB + Sentence-Transformers + OpenAI/通义/DeepSeek
- **工程化**：pnpm workspace + 并行构建 + 开发代理 + Docker（可选）

## ⚡ 快速开始（开发）

### 1) 环境准备

- Node.js >= 18
- pnpm >= 8
- Python 3.10+（用于 AI 服务）

### 2) 安装依赖

```bash
pnpm install
```

### 3) 配置环境变量

- API Server：复制 `packages/api-server/env.example` 为 `.env`（默认 SQLite 即可）
  - PostgreSQL（可选）：使用 `db:postgresql:*` 脚本
- AI Service：在 `packages/ai-service` 下创建 `.env`（至少设置 LLM 提供商与 API Key）
  - 关键变量：`LLM_PROVIDER`、`OPENAI_API_KEY` 或对应提供商的 Key

### 4) 初始化数据库并同步文档

```bash
# 生成 Prisma Client
pnpm --filter api-server db:generate

# 迁移数据库（SQLite 默认）
pnpm --filter api-server db:migrate

# 同步 docs/ Markdown → 数据库
pnpm --filter api-server db:sync

# 播种示例数据（可选）
pnpm --filter api-server db:seed
```

### 5) 启动服务

打开两个终端：

```bash
# 终端 A：前端 + API（并行）
pnpm dev

# 终端 B：AI 服务（优化启动）
pnpm dev:ai            # 等同于：cd packages/ai-service && python start_optimized.py
```

访问：

- 📖 文档站点：http://localhost:5173
- 🔌 API 服务：http://localhost:3001（Swagger：/api-docs）
- 🤖 AI 服务：http://localhost:8000（/health, /system-info, /api/chat）

### 一键准备（基于当前代码）

```bash
pnpm install && \
pnpm --filter api-server db:generate && \
pnpm --filter api-server db:migrate && \
pnpm --filter api-server db:sync && \
pnpm --filter api-server db:seed && \
pnpm --filter docs-site build && \
python3 packages/ai-service/start_optimized.py
```

提示：如果你使用 PostgreSQL，请将 `db:migrate` 替换为 `--filter api-server db:postgresql:migrate`。

## 🔄 日常更新流程

- **更新 Markdown 文档**（`docs/`）
  - API 数据同步：`pnpm db:sync`
  - AI 向量索引：`pnpm ai:ingest`（或 `pnpm ai:ingest-clear` 全量重建）
- **更新前端代码**：HMR 实时生效（`pnpm dev`）
- **更新后端代码**：`pnpm dev:api`（tsx watch）自动重启
- **检查 AI 服务健康**：`curl http://localhost:8000/health`

## 🔌 本地端口与代理

- 前端 Dev 服务器（5173）代理规则（见 `packages/docs-site/vite.config.ts`）：
  - `/api/chat`、`/api/vector-store`、`/health`、`/system-info` → `http://localhost:8000`（AI）
  - 其他 `/api/*` → `http://localhost:3001`（API Server）

## 📜 常用脚本（根目录）

```bash
# 开发
pnpm dev              # 并行启动前端与 API（不含 AI）
pnpm dev:docs         # 仅前端
pnpm dev:api          # 仅 API
pnpm dev:ai           # 仅 AI（优化启动）

# 构建 / 预览
pnpm build            # 构建所有包
pnpm build:docs       # 构建前端
pnpm build:api        # 构建 API
pnpm preview          # 预览前端构建

# 数据库
pnpm db:generate
pnpm db:migrate
pnpm db:sync
pnpm db:seed
pnpm db:studio

# AI 向量索引
pnpm ai:ingest        # 处理/索引 docs/
pnpm ai:ingest-clear  # 清空后重建
```

## 📚 深入了解

- 前端实现详解：`packages/docs-site/README.md`
- 后端 API 指南：`packages/api-server/README.md`
- AI 服务说明：`packages/ai-service/README.md`

## 🚢 生产部署

- 参见 `PRODUCTION_DEPLOYMENT.md`、`DOCKER_GUIDE.md` 与根目录 `docker-compose*.yml`
- 快速预览生产构建：`pnpm start:production`

## 许可证

MIT License
