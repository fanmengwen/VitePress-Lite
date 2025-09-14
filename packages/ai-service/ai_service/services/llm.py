"""
LLM service with support for multiple providers (OpenAI, local models).
Includes fallback strategies and error handling.
"""

import asyncio
from typing import List, Dict, Any, Optional, Union
import httpx
import openai
from loguru import logger
import json

from ai_service.config.settings import settings
from ai_service.models.chat import ChatMessage


class LLMService:
    """Service for generating responses using various LLM providers."""
    
    def __init__(self):
        self.openai_client: Optional[openai.AsyncOpenAI] = None
        self.http_client: Optional[httpx.AsyncClient] = None
        self._initialized = False
        
    async def initialize(self) -> None:
        """Initialize LLM clients based on configuration."""
        if self._initialized:
            return
            
        config = settings.get_llm_config()
        provider = config["provider"]
        
        logger.info(f"Initializing LLM service with provider: {provider}")
        
        if provider in ["openai", "aliyun", "deepseek"]:
            await self._initialize_openai_compatible(config)
        elif provider in ["local", "ollama"]:
            await self._initialize_local(config)
        
        self._initialized = True
        logger.info("LLM service initialized successfully")
    
    async def _initialize_openai_compatible(self, config: Dict[str, Any]) -> None:
        """Initialize OpenAI-compatible client (OpenAI, 阿里云, DeepSeek)."""
        provider = config.get("provider")
        api_key = config.get("api_key")
        base_url = config.get("base_url")
        
        if not api_key:
            raise ValueError(f"{provider} API key is required but not provided")
        
        # 根据提供商设置客户端
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
            
        self.openai_client = openai.AsyncOpenAI(**client_kwargs)
        
        # Test the connection (某些提供商可能不支持 models.list)
        try:
            if provider == "openai":
                models = await self.openai_client.models.list()
                logger.info(f"{provider} connection successful. Available models: {len(models.data)}")
            else:
                # 对于阿里云和DeepSeek，直接测试chat接口
                test_response = await self.openai_client.chat.completions.create(
                    model=config.get("model"),
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=1
                )
                logger.info(f"{provider} connection successful")
        except Exception as e:
            logger.warning(f"Could not verify {provider} connection (this may be normal): {e}")
            # 不抛出异常，因为某些提供商的测试接口可能有限制
    
    async def _initialize_local(self, config: Dict[str, Any]) -> None:
        """Initialize local/Ollama client."""
        base_url = config.get("url")
        if not base_url:
            raise ValueError("Local model URL is required but not provided")
        
        self.http_client = httpx.AsyncClient(
            base_url=base_url,
            timeout=60.0
        )
        
        # Test the connection
        try:
            response = await self.http_client.get("/api/tags")
            if response.status_code == 200:
                models = response.json()
                logger.info(f"Local LLM connection successful. Available models: {len(models.get('models', []))}")
            else:
                logger.warning(f"Local LLM responded with status {response.status_code}")
        except Exception as e:
            logger.warning(f"Could not verify local LLM connection: {e}")
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False
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
        
        config = settings.get_llm_config()
        provider = config["provider"]
        
        try:
            if provider in ["openai", "aliyun", "deepseek"]:
                return await self._generate_openai_compatible_response(
                    messages, max_tokens, temperature, stream
                )
            elif provider in ["local", "ollama"]:
                return await self._generate_local_response(
                    messages, max_tokens, temperature, stream
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {provider}")
                
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            # Try fallback if configured
            if provider not in ["openai"] and settings.openai_api_key:
                logger.info("Attempting OpenAI fallback...")
                return await self._generate_openai_fallback(messages, max_tokens, temperature)
            raise
    
    async def _generate_openai_compatible_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int],
        temperature: Optional[float],
        stream: bool
    ) -> str:
        """Generate response using OpenAI-compatible API (OpenAI, 阿里云, DeepSeek)."""
        if not self.openai_client:
            raise RuntimeError("OpenAI-compatible client not initialized")
        
        config = settings.get_llm_config()
        provider = config["provider"]
        
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
                stream=stream
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
            logger.error(f"{provider} API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {provider} generation: {e}")
            raise
    
    async def _generate_local_response(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int],
        temperature: Optional[float],
        stream: bool
    ) -> str:
        """Generate response using local/Ollama API."""
        if not self.http_client:
            raise RuntimeError("Local LLM client not initialized")
        
        # Convert messages to prompt format for local models
        prompt = self._messages_to_prompt(messages)
        
        payload = {
            "model": settings.local_model_name,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "num_predict": max_tokens or 1000,
                "temperature": temperature or 0.1,
            }
        }
        
        try:
            if stream:
                return await self._handle_local_stream(payload)
            else:
                response = await self.http_client.post("/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("response", "")
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Local LLM HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in local LLM generation: {e}")
            raise
    
    async def _handle_local_stream(self, payload: Dict[str, Any]) -> str:
        """Handle streaming response from local LLM."""
        full_response = ""
        
        async with self.http_client.stream("POST", "/api/generate", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.strip():
                    try:
                        data = json.loads(line)
                        if "response" in data:
                            full_response += data["response"]
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
        
        return full_response
    
    async def _generate_openai_fallback(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int],
        temperature: Optional[float]
    ) -> str:
        """Fallback to OpenAI when local model fails."""
        try:
            # Initialize OpenAI client for fallback
            fallback_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
            
            response = await fallback_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                max_tokens=max_tokens or settings.openai_max_tokens,
                temperature=temperature or settings.openai_temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Fallback to OpenAI also failed: {e}")
            return "I apologize, but I'm currently unable to process your request due to technical difficulties. Please try again later."
    
    def _messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Convert chat messages to a single prompt for local models."""
        prompt_parts = []
        
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"Human: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        
        # Add final prompt for assistant response
        if not prompt_parts or not prompt_parts[-1].startswith("Assistant:"):
            prompt_parts.append("Assistant:")
        
        return "\n\n".join(prompt_parts)
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the LLM service."""
        try:
            await self.initialize()
            
            config = settings.get_llm_config()
            provider = config["provider"]
            
            if provider in ["openai", "aliyun", "deepseek"] and self.openai_client:
                try:
                    # Simple test call
                    config = settings.get_llm_config()
                    response = await self.openai_client.chat.completions.create(
                        model=config["model"],
                        messages=[{"role": "user", "content": "Hello"}],
                        max_tokens=5
                    )
                    return {
                        "status": "healthy",
                        "provider": provider,
                        "model": config["model"]
                    }
                except Exception as e:
                    return {
                        "status": "unhealthy",
                        "provider": provider,
                        "error": str(e)
                    }
            
            elif provider in ["local", "ollama"] and self.http_client:
                try:
                    response = await self.http_client.get("/api/tags")
                    if response.status_code == 200:
                        return {
                            "status": "healthy",
                            "provider": provider,
                            "model": settings.local_model_name
                        }
                    else:
                        return {
                            "status": "unhealthy",
                            "provider": provider,
                            "error": f"HTTP {response.status_code}"
                        }
                except Exception as e:
                    return {
                        "status": "unhealthy",
                        "provider": provider,
                        "error": str(e)
                    }
            
            return {
                "status": "unknown",
                "provider": provider,
                "error": "No client initialized"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def close(self) -> None:
        """Close all connections."""
        if self.http_client:
            await self.http_client.aclose()
        # OpenAI client doesn't need explicit closing


# Global LLM service instance
llm_service = LLMService() 
