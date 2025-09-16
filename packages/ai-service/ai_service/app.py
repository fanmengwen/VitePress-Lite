"""
FastAPI application factory.
Creates and configures the main application instance.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import ORJSONResponse
from loguru import logger

from ai_service.config.settings import settings
from ai_service.models.chat import ErrorResponse
from ai_service.services.embedding import embedding_service
from ai_service.services.vector_store import vector_store
from ai_service.services.llm import llm_service

# Import routers
from ai_service.api import health, chat, conversations, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting AI service...")
    
    try:
        # Initialize services
        await embedding_service.initialize()
        await vector_store.initialize()
        await llm_service.initialize()
        
        logger.info("All services initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    finally:
        # Shutdown
        logger.info("Shutting down AI service...")
        await llm_service.close()


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application instance.
    
    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title=settings.project_name,
        description=settings.description,
        version=settings.version,
        lifespan=lifespan,
        default_response_class=ORJSONResponse
    )

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

    # Configure trusted hosts if enabled
    if settings.enable_trusted_host_middleware:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["localhost", "127.0.0.1"]
        )

    # Register exception handlers
    register_exception_handlers(app)

    # Include routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(chat.router, prefix=settings.api_prefix, tags=["Chat"])
    app.include_router(conversations.router, prefix=settings.api_prefix, tags=["Conversations"])
    app.include_router(admin.router, prefix=settings.api_prefix, tags=["Admin"])

    return app


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers."""
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        """Global exception handler."""
        request_id = request.state.request_id if hasattr(request.state, "request_id") else "unknown"
        logger.error(f"Unhandled exception in {request.method} {request.url}: {exc}", request_id=request_id)
        
        error_content = ErrorResponse(
            error="InternalServerError",
            message="An unexpected error occurred.",
            request_id=request_id
        ).model_dump()

        return ORJSONResponse(
            status_code=500,
            content=error_content,
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> ORJSONResponse:
        """HTTP exception handler."""
        request_id = request.state.request_id if hasattr(request.state, "request_id") else "unknown"
        
        error_content = ErrorResponse(
            error=exc.__class__.__name__,
            message=exc.detail,
            request_id=request_id
        ).model_dump()
        
        return ORJSONResponse(
            status_code=exc.status_code,
            content=error_content,
            headers=exc.headers
        )
