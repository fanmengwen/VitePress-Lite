#!/usr/bin/env python3
"""
Deprecated legacy ingest entrypoint.
This script now delegates to the unified CLI in src/cli.py for backward compatibility.
"""

import sys
from pathlib import Path

# Ensure package is in path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_service.cli import main as cli_main  # noqa: E402


if __name__ == "__main__":
    # Map legacy call to: python -m src.cli ingest [args]
    # We simply pass through CLI args, injecting the "ingest" subcommand.
    argv = ["ingest", *sys.argv[1:]]
    raise SystemExit(cli_main(argv))
