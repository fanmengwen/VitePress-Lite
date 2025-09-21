"""
AI Service package entry point.
Allows running: python -m ai_service [command]
"""

from ai_service.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
