# AI Service for VitePress-Lite

This service provides a Retrieval-Augmented Generation (RAG) backend for the VitePress-Lite documentation, enabling intelligent Q&A capabilities over a given set of Markdown files.

## Core Features

- **RAG Architecture**: Leverages a robust RAG pipeline for accurate, context-aware answers.
- **Multi-LLM Support**: Out-of-the-box support for OpenAI, Aliyun Qwen, and DeepSeek models.
- **Vector Search**: Utilizes ChromaDB for efficient semantic search over document chunks.
- **FastAPI Backend**: Built on a modern, asynchronous Python web framework.
- **Incremental Ingestion**: Intelligently processes and updates the vector store only for new or modified documents.
- **Dockerized**: Fully containerized for consistent and reproducible deployments.

## Getting Started

### Prerequisites

- Python 3.10+
- [Poetry](https://python-poetry.org/) for dependency management.

### 1. Installation

Navigate to the service directory and install dependencies using Poetry:

```bash
cd packages/ai-service
poetry install
```

### 2. Configuration

Create a `.env` file from the example and configure your LLM provider and API key.

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# REQUIRED: Set your LLM provider and API key
LLM_PROVIDER=openai
OPENAI_API_KEY="sk-..."

# OPTIONAL: Path to your documentation files
# Defaults to ../../docs
# DOCS_PATH=../../docs
```

## Usage

The service has two main functions: ingesting documents into the vector store and running the API server. These are managed via a unified CLI.

### Local Development

#### 1. Ingest Documents

Process and vectorize the documentation files. This command is idempotent and will only process new or changed files.

```bash
poetry run python -m ai_service ingest
```

To force a complete re-ingestion, use the `--clear` flag:

```bash
poetry run python -m ai_service ingest --clear
```

#### 2. Run the Server

Start the FastAPI server.

```bash
poetry run python -m ai_service serve
```

The API will be available at `http://localhost:8000`.

### Conversations API (New)

- Start or continue chat

```http
POST /api/chat
{
  "question": "What is Vite?",
  "conversation_id": "optional-uuid"
}
```

Response includes `conversation_id` to continue the session.

- List conversations

```http
GET /api/conversations
```

- Create a conversation

```http
POST /api/conversations { "title": "My topic" }
```

- Get conversation detail

```http
GET /api/conversations/{id}
```

- Rename conversation

```http
PATCH /api/conversations/{id} { "title": "New title" }
```

- Delete conversation

```http
DELETE /api/conversations/{id}
```

### Docker

The simplest way to run all services, including the AI service, is through the root `docker-compose.yml` file.

```bash
# From the project root directory
docker compose up -d --build
```

This command builds the `ai-service` image and starts all services. The container's entrypoint script (`entrypoint.sh`) automatically handles dependency installation and initial data ingestion before starting the server.

#### Manual Data Sync

If you update the documentation files in the `docs/` directory while the container is running, you can trigger a manual data sync without restarting the service:

```bash
# From the project root directory
docker compose exec ai-service python -m ai_service ingest
```

## Testing

The project includes a comprehensive test suite using `
