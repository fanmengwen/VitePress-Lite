#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Dependencies already installed during build stage
echo "Dependencies are ready..."

# Run migrations to ensure conversation store schema is ready.
echo "Applying conversation store migrations..."
python -m ai_service migrate

# Run the data ingestion script to refresh the vector database.
echo "Running data ingestion..."
python -m ai_service ingest

# Now, execute the main command (passed from Dockerfile's CMD).
echo "Starting AI service..."
exec "$@"
