# VitePress-Lite

> 轻量级的文档体验平台：Vite + Vue 3 前端、可选的 Express API、以及基于 FastAPI + ChromaDB 的 RAG AI 助手。

## 🧭 Monorepo 结构

```
VitePress-Lite/
├── docs/                         # Markdown 原始文档（知识库）
├── packages/
│   ├── docs-site/                # 前端站点（Vite + Vue 3 + 自定义插件）
│   ├── api-server/               # （可选）Express + Prisma API
│   └── ai-service/               # FastAPI + RAG AI 服务
└── docker-compose.yml            # 一键启动文档站点 + AI 服务
```

> **提示**：目前主要使用 docs-site 与 ai-service；`api-server` 仍保留，但默认不会在 Docker 方案中启动。

## ⚙️ 环境要求

### 必需
- Node.js >= 18.12
- pnpm >= 8
- Python 3.10+
- [Poetry](https://python-poetry.org/)（用于 AI 服务依赖管理）

### 可选
- Docker & Docker Compose（用于一键容器化）

## 🚀 本地开发（手动）

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **配置 AI 服务环境**
   ```bash
   cp packages/ai-service/.env packages/ai-service/.env.local  # 可选
   # 编辑 packages/ai-service/.env，至少设置：
   # LLM_PROVIDER=openai | aliyun | deepseek
   # API_KEY=...（对应厂商的 Key）
   ```

3. **初始化会话数据库 + 构建向量索引**
   ```bash
   pnpm ai:bootstrap         # 等价于 pnpm ai:migrate && pnpm ai:ingest
   ```

4. **启动文档站点 + AI 服务（同一终端自动并行）**
   ```bash
   pnpm dev:local            # 同时运行 pnpm dev:docs 与 pnpm dev:ai
   ```
   - 文档站点：http://localhost:5173
   - AI 服务：http://localhost:8000（/health, /api/chat, /api/vector-search）

5. **（可选）启动传统 API Server**
   ```bash
   pnpm dev:api
   ```
   默认不会被 docs-site 使用，可视业务需要决定是否开启。

6. **常用脚本速查**
   ```bash
   pnpm ai:migrate         # 仅执行会话数据库迁移
   pnpm ai:ingest          # 增量更新向量索引
   pnpm ai:ingest-clear    # 清空后重建索引
   pnpm dev:docs           # 仅运行文档站点
   pnpm dev:ai             # 仅运行 AI 服务（uvicorn）
   ```

> 更新 `docs/` 下文档后，记得运行 `pnpm ai:ingest` 以刷新向量数据库。

## 🐳 Docker 一键体验

1. **准备 AI 配置**
   - 编辑 `packages/ai-service/.env`，填好 LLM Provider 与 API Key。
   - 默认会将宿主机 `./docs` 挂载到容器内 `/app/docs`，并将向量库保存在 `ai_data` 卷下。

2. **构建镜像**
   ```bash
   docker compose build
   ```

3. **启动服务**
   ```bash
   docker compose up -d
   ```

   - 文档站点：http://localhost:4173
   - AI 服务：http://localhost:8000（直接暴露，方便调试）

4. **功能自检**
   ```bash
   # 向量检索
   curl -s -X POST http://localhost:4173/api/vector-search \
     -H 'Content-Type: application/json' \
     -d '{"query":"vite 是什么？"}'

   # 对话接口
   curl -s -X POST http://localhost:4173/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"question":"vite 是什么？"}'

   # 查看运行状态
   docker compose ps
   docker compose logs -f ai-service
   docker compose logs -f docs-site
   ```

5. **关闭并清理**
   ```bash
   docker compose down            # 停止容器
   docker compose down -v         # 若需删除卷（会清空向量索引/会话数据库）
   ```

> AI 服务容器在启动时会自动执行 `migrate` 与 `ingest`，确保知识库与会话存储状态一致。

## 📜 常用 npm/pnpm 脚本索引

| 脚本                      | 说明 |
| ------------------------- | ---- |
| `pnpm dev:local`          | 同时启动文档站点与 AI 服务（推荐） |
| `pnpm dev:docs`           | 仅启动前端文档站点 |
| `pnpm dev:ai`             | 仅启动 AI 服务（Poetry + uvicorn） |
| `pnpm ai:bootstrap`       | 会话数据库迁移 + 增量向量索引 |
| `pnpm ai:ingest[-clear]`  | 更新或重建向量索引 |
| `pnpm docker:build`       | `docker compose build` 快捷命令 |
| `pnpm docker:up`          | `docker compose up -d` 快捷命令 |
| `pnpm docker:down`        | `docker compose down` 快捷命令 |

## 🔁 内容与数据更新流程

1. 修改 `docs/` 下的 Markdown。
2. 运行 `pnpm ai:ingest` 刷新知识库。
3. 若在 Docker 中运行，可执行 `docker compose up -d --build` 重新构建镜像。

## 🤝 贡献

欢迎通过 Issue / PR 反馈问题或贡献功能。建议在提交前：
- 确保通过 `pnpm ai:ingest` 更新索引；
- 在本地使用 `pnpm dev:local` 验证；
- 如涉及容器化流程，使用 `docker compose build && docker compose up -d` 验证。

## 📄 许可证

MIT License
