"""
FastAPI application entry point.
Creates the application instance using the application factory.
"""

import uvicorn
from loguru import logger

from ai_service.app import create_app
from ai_service.config.settings import settings

app = create_app()


def setup_logging():
    """Configure logging for the application."""
    logger.remove()  # Remove default handler

    logger.add(
        sink=lambda msg: print(msg, end=""),
        format=settings.log_format,
        level=settings.log_level,
        colorize=True,
    )

    # Add file logging if enabled
    if settings.enable_file_logging:
        logger.add(
            settings.log_file,
            rotation=settings.log_rotation,
            retention=settings.log_retention,
            format=settings.log_format,
            level=settings.log_level,
        )


def main():
    """Main entry point for the application."""
    setup_logging()

    logger.info(f"Starting AI service on {settings.host}:{settings.port}")
    logger.info(
        f"LLM Provider: {settings.llm_provider if hasattr(settings, 'llm_provider') else 'Generic'}"
    )
    logger.info(f"Embedding Model: {settings.embedding_model}")

    uvicorn.run(
        "ai_service.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        workers=settings.workers,
        log_level=str(settings.log_level).lower(),
        access_log=settings.access_log,
    )


if __name__ == "__main__":
    main()
