"""
Unified CLI entrypoint for AI service.
Provides commands for ingestion (incremental) and serving the API.
"""

import asyncio
from typing import Optional, List
import sys
import argparse
from loguru import logger

from ai_service.services.ingestion import DocumentIngester
from ai_service.main import main as serve_main
from ai_service.migrations import run_migrations
from ai_service.config.settings import settings


def _configure_logging(verbose: bool) -> None:
    """Configure loguru logging based on verbosity flag."""
    logger.remove()
    level = "DEBUG" if verbose else "INFO"
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=level,
        colorize=True,
    )


def build_parser() -> argparse.ArgumentParser:
    """Build the unified CLI parser with subcommands."""
    parser = argparse.ArgumentParser(description="AI Service CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ingest subcommand (minimal interface; path resolved from settings/env)
    subparsers.add_parser(
        "ingest", help="Ingest documentation into vector DB (incremental)"
    )

    # Serve command
    serve_parser = subparsers.add_parser(
        "serve",
        help="Start the FastAPI server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    serve_parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
    serve_parser.add_argument("--port", type=int, default=8000, help="Server port")
    serve_parser.add_argument("--workers", type=int, help="Number of uvicorn workers")

    # Migrate command
    migrate_parser = subparsers.add_parser(
        "migrate",
        help="Run database migrations",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    migrate_parser.add_argument(
        "--db-path",
        type=str,
        default=None,
        help="Path to SQLite database file for conversations",
    )
    migrate_parser.add_argument(
        "--dir",
        dest="migration_dir",
        type=str,
        default=None,
        help="Directory containing migration SQL files",
    )
    migrate_parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose logging"
    )

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entry point."""
    if argv is None:
        argv = sys.argv[1:]

    parser = build_parser()

    # If no arguments are provided, print help and exit
    if not argv:
        parser.print_help()
        return 0

    args = parser.parse_args(argv)
    _configure_logging(getattr(args, "verbose", False))

    if args.command == "ingest":
        logger.info("Starting document ingestion...")
        ingester = DocumentIngester()
        asyncio.run(ingester.run_ingestion())
        logger.info("Document ingestion finished.")
        return 0

    elif args.command == "serve":
        logger.info("Starting FastAPI server...")
        # Update settings with CLI arguments
        if args.host:
            settings.host = args.host
        if args.port:
            settings.port = args.port
        if args.workers:
            settings.workers = args.workers
        serve_main()
        return 0

    elif args.command == "migrate":
        db_path = args.db_path or settings.conversation_db_path
        # Resolve default migration directory to project root /migration
        from pathlib import Path

        default_dir = Path(__file__).resolve().parents[1] / "migration"
        migration_dir = Path(args.migration_dir) if args.migration_dir else default_dir
        logger.info(f"Running migrations on {db_path} from {migration_dir}")
        applied = run_migrations(str(db_path), str(migration_dir))
        logger.info(f"Applied {applied} migration(s)")
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
