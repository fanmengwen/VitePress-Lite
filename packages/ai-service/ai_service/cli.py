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


async def _run_ingest(args) -> int:
    """Run incremental ingestion according to CLI args."""
    ingester = DocumentIngester(args.docs_path)
    if args.file:
        processed = await ingester.ingest_single_file(args.file)
        logger.info(
            f"✅ Processed {args.file} | title={processed.metadata.title} | chunks={len(processed.chunks)} | words={processed.word_count}"
        )
        return 0
    else:
        result = await ingester.ingest_all_documents(
            clear_existing=args.clear,
            include_patterns=args.include,
            exclude_patterns=args.exclude,
        )
        logger.info("📊 Ingestion Results:")
        logger.info(f"   - Documents processed: {result.documents_processed}")
        logger.info(f"   - Chunks created: {result.chunks_created}")
        logger.info(f"   - Vectors stored: {result.vectors_stored}")
        logger.info(f"   - Processing time: {result.processing_time_seconds:.2f}s")
        logger.info(f"   - Success rate: {result.success_rate:.1f}%")
        if result.errors:
            logger.warning(f"   - Errors: {len(result.errors)}")
            for error in result.errors[:5]:
                logger.warning(f"     • {error}")
        return 0


def build_parser() -> argparse.ArgumentParser:
    """Build the unified CLI parser with subcommands."""
    parser = argparse.ArgumentParser(description="AI Service CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ingest subcommand
    ingest = subparsers.add_parser("ingest", help="Ingest documentation into vector DB (incremental)")
    ingest.add_argument("--docs-path", type=str, default=None, help="Path to documentation directory")
    ingest.add_argument("--clear", action="store_true", help="Clear existing documents before ingestion")
    ingest.add_argument("--file", type=str, help="Process a single file only")
    ingest.add_argument("--include", nargs="+", default=["*.md"], help="File patterns to include")
    ingest.add_argument("--exclude", nargs="+", default=["README.md", ".*"], help="File patterns to exclude")
    ingest.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    # Serve command
    serve_parser = subparsers.add_parser(
        "serve",
        help="Start the FastAPI server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    serve_parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
    serve_parser.add_argument("--port", type=int, default=8000, help="Server port")
    serve_parser.add_argument("--workers", type=int, help="Number of uvicorn workers")

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
    _configure_logging(args.verbose if 'verbose' in args else False)

    if args.command == 'ingest':
        logger.info("Starting document ingestion...")
        ingester = DocumentIngester(docs_path=args.docs_path)
        asyncio.run(ingester.ingest_all_documents())
        logger.info("Document ingestion finished.")
        return 0
        
    elif args.command == 'serve':
        logger.info("Starting FastAPI server...")
        serve_main(host=args.host, port=args.port, workers=args.workers)
        return 0
        
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


