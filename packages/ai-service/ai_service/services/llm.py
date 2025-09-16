import asyncio
from typing import List, Dict, Any, Optional, Union
import openai
from loguru import logger

from ai_service.config.settings import settings
from ai_service.models.chat import ChatMessage


class LLMService:
    """Service for generating responses using various LLM providers."""

    def __init__(self):
        self.openai_client: Optional[openai.AsyncOpenAI] = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize LLM client using settings-provided configuration."""
        if self._initialized:
            return

        try:
            config = settings.get_llm_config()
            logger.info("Initializing LLM service with unified configuration")
            await self._initialize_client(config)
            logger.info("LLM service initialized successfully")
        except ValueError as e:
            # API key not configured - service will start but LLM calls will fail
            logger.warning(f"LLM service not configured: {e}")
            logger.info("LLM service will be unavailable until API_KEY is configured")

        self._initialized = True

    async def _initialize_client(self, config: Dict[str, Any]) -> None:
        """Initialize OpenAI-compatible client with unified configuration."""
        api_key = config.get("api_key")
        base_url = config.get("base_url")

        if not api_key:
            raise ValueError("API key is required but not provided")

        # Set up client with generic configuration
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        self.openai_client = openai.AsyncOpenAI(**client_kwargs)

        # Test the connection with a simple call
        try:
            test_response = await self.openai_client.chat.completions.create(
                model=config.get("model"),
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
            )
            logger.info("LLM connection successful")
        except Exception as e:
            logger.warning(f"Could not verify LLM connection (this may be normal): {e}")
            # Don't raise exception as some providers may have limitations on test calls

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False,
    ) -> str:
        """
        Generate a response using the configured LLM.

        Args:
            messages: List of messages in chat format
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            stream: Whether to stream the response

        Returns:
            Generated response text
        """
        await self.initialize()

        if not self.openai_client:
            raise RuntimeError(
                "LLM service not available. Please configure API_KEY in .env file."
            )

        try:
            return await self._generate_response(
                messages, max_tokens, temperature, stream
            )
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise

    async def _generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int],
        temperature: Optional[float],
        stream: bool,
    ) -> str:
        """Generate response using OpenAI-compatible API."""
        if not self.openai_client:
            raise RuntimeError("LLM client not initialized")

        config = settings.get_llm_config()

        # Use configured defaults if not provided
        max_tokens = max_tokens or config["max_tokens"]
        temperature = temperature or config["temperature"]
        model = config["model"]

        try:
            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=stream,
            )

            if stream:
                # Handle streaming response
                full_response = ""
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        full_response += chunk.choices[0].delta.content
                return full_response
            else:
                return response.choices[0].message.content

        except openai.APIError as e:
            logger.error(f"LLM API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in LLM generation: {e}")
            raise

    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the LLM service."""
        try:
            await self.initialize()

            if not self.openai_client:
                return {"status": "unhealthy", "error": "API_KEY not configured"}

            config = settings.get_llm_config()

            try:
                # Simple test call
                response = await self.openai_client.chat.completions.create(
                    model=config["model"],
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=5,
                )
                return {"status": "healthy", "model": config["model"]}
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "model": config["model"],
                    "error": str(e),
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def close(self) -> None:
        """Close all connections."""
        # OpenAI client doesn't need explicit closing
        pass


# Global LLM service instance
llm_service = LLMService()
