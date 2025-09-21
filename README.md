# VitePress-Lite

A containerized documentation platform with a RAG-powered AI assistant.

- **Frontend**: Vite + Vue 3
- **AI Service**: FastAPI + ChromaDB

## Core Features

- **Fully Containerized**: One command (`docker compose up`) to launch the entire stack.
- **RAG-Powered Q&A**: The AI assistant is grounded in the markdown content within the `/docs` directory.
- **Decoupled Services**: A clean separation between the frontend application and the backend AI service.
- **DX-Focused**: Hot-reloading for both the documentation content and frontend code.

## Monorepo Structure

```
VitePress-Lite/
├── docs/                 # Markdown source for the AI knowledge base
├── packages/
│  ├── docs-site/         # Vite + Vue 3 frontend application
│  └── ai-service/        # FastAPI RAG service
└── docker-compose.yml
```

## Quick Start (Docker)

Requirements: Docker and Docker Compose.

```bash
docker compose up --build -d
```

Endpoints after startup:
- docs-site: http://localhost:4173
- ai-service: http://localhost:8000

## Configuration

- Set AI provider credentials in `packages/ai-service/.env` (e.g., `LLM_PROVIDER`, `API_KEY`).
- The `./docs` directory is mounted into the AI container, allowing for live content updates.
- Vector and conversation data are persisted in the `ai_data` Docker volume.
- The AI service automatically runs database migrations and ingests documentation on startup.

## Service Health

```bash
# AI service
curl -s http://localhost:8000/health | cat

# Vector search via the site proxy
curl -s -X POST http://localhost:4173/api/vector-search \
  -H 'Content-Type: application/json' \
  -d '{"query":"hello"}' | cat
```

## Local Development

While Docker is the recommended approach for simplicity and consistency, traditional `pnpm` scripts are available for local development. See `package.json` for details.

## License

MIT
