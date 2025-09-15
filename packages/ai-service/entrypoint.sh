#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Dependencies already installed during build stage
echo "Dependencies are ready..."

# Run the data ingestion script.
# This ensures the vector database is up-to-date on startup.
echo "Running data ingestion..."
python -m ai_service ingest

# Now, execute the main command (passed from Dockerfile's CMD).
echo "Starting AI service..."
exec "$@"
