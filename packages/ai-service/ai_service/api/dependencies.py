"""
Shared dependencies for API routes.
"""

from fastapi import Request, HTTPException

import ai_service.config.settings as settings_module


async def verify_api_key(request: Request) -> None:
    """Verify API key if configured."""
    settings = settings_module.settings
    if not settings.api_key:
        return  # No API key required
    
    api_key = request.headers.get(settings.api_key_header)
    if not api_key or api_key != settings.api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )
