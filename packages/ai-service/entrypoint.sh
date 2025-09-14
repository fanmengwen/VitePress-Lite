#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Run poetry install to ensure dependencies are in sync,
# especially in a dev environment with mounted volumes.
echo "Synchronizing dependencies..."
poetry install --no-root

# Run the data ingestion script.
# This ensures the vector database is up-to-date on startup.
echo "Running data ingestion..."
python -m ai_service ingest

# Now, execute the main command (passed from Dockerfile's CMD).
echo "Starting AI service..."
exec "$@"
