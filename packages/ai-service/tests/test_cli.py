"""
Tests for the command-line interface (CLI).
"""

import pytest
from unittest.mock import patch, MagicMock

# Import the main CLI function
from ai_service import cli

@patch('ai_service.cli.serve_main')
def test_cli_serve_command(mock_serve_main):
    """Test that `serve` command calls the correct function."""
    
    # Simulate command-line arguments: `ai-service serve --host 0.0.0.0 --port 8001`
    test_args = ['serve', '--host', '0.0.0.0', '--port', '8001']
    
    cli.main(test_args)
    
    # Verify that the serve function was called with the correct arguments
    mock_serve_main.assert_called_once_with(host='0.0.0.0', port=8001, workers=None)

@patch('ai_service.cli.DocumentIngester')
@patch('asyncio.run')
def test_cli_ingest_command(mock_asyncio_run, MockDocumentIngester):
    """Test that `ingest` command constructs ingester (no args) and runs ingestion."""

    mock_ingester_instance = MockDocumentIngester.return_value

    # Minimal interface: `ai-service ingest`
    test_args = ['ingest']

    cli.main(test_args)

    # Verify DocumentIngester was initialized without arguments
    MockDocumentIngester.assert_called_once_with()

    # Verify that asyncio.run was used to execute the run_ingestion method
    mock_asyncio_run.assert_called_once_with(mock_ingester_instance.run_ingestion())

def test_cli_no_command():
    """Test running CLI with no command, should print help and exit cleanly."""
    # Simulate no command-line arguments
    test_args = []
    
    exit_code = cli.main(test_args)
    
    # Expect a clean exit (argparse prints help and exits)
    assert exit_code == 0
