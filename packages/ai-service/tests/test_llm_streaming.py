from types import SimpleNamespace
from typing import List

import pytest

from ai_service.config.settings import settings
from ai_service.services.llm import LLMService


class _FakeStream:
    def __init__(self, tokens: List[str]):
        self._tokens = tokens
        self._iter = iter(tokens)

    def __aiter__(self):
        self._iter = iter(self._tokens)
        return self

    async def __anext__(self):
        try:
            token = next(self._iter)
        except StopIteration as exc:  # pragma: no cover - handled in tests
            raise StopAsyncIteration from exc
        return SimpleNamespace(
            choices=[SimpleNamespace(delta=SimpleNamespace(content=token))]
        )


class _FakeChatCompletions:
    def __init__(self, tokens: List[str], full_response: str):
        self._tokens = tokens
        self._full_response = full_response

    async def create(self, **kwargs):  # noqa: ANN003 - signature matches openai client
        if kwargs.get("stream"):
            return _FakeStream(self._tokens)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=self._full_response)
                )
            ]
        )


class _FakeChatNamespace:
    def __init__(self, completions: _FakeChatCompletions):
        self.completions = completions


class _FakeOpenAIClient:
    def __init__(self, tokens: List[str], full_response: str):
        self.chat = _FakeChatNamespace(
            _FakeChatCompletions(tokens=tokens, full_response=full_response)
        )


def _build_service(tokens: List[str], full_response: str, monkeypatch: pytest.MonkeyPatch) -> LLMService:
    service = LLMService()
    service._initialized = True
    service.openai_client = _FakeOpenAIClient(tokens=tokens, full_response=full_response)  # type: ignore[assignment]

    monkeypatch.setattr(
        settings,
        "get_llm_config",
        lambda: {
            "max_tokens": 128,
            "temperature": 0.2,
            "model": "fake-model",
        },
    )

    return service


@pytest.mark.asyncio
async def test_generate_response_stream_invokes_async_callback(monkeypatch: pytest.MonkeyPatch) -> None:
    tokens = ["Hel", "lo", " ", "world"]
    service = _build_service(tokens, "Hello world", monkeypatch)

    collected: List[str] = []

    async def on_token(token: str) -> None:
        collected.append(token)

    result = await service.generate_response(
        messages=[{"role": "user", "content": "Test?"}],
        stream=True,
        on_token=on_token,
    )

    assert result == "Hello world"
    assert collected == tokens


@pytest.mark.asyncio
async def test_generate_response_stream_supports_sync_callback(monkeypatch: pytest.MonkeyPatch) -> None:
    tokens = ["foo", "bar"]
    service = _build_service(tokens, "foobar", monkeypatch)

    collected: List[str] = []

    def on_token(token: str) -> None:
        collected.append(token)

    result = await service.generate_response(
        messages=[{"role": "user", "content": "Hi"}],
        stream=True,
        on_token=on_token,
    )

    assert result == "foobar"
    assert collected == tokens


@pytest.mark.asyncio
async def test_stream_response_yields_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    tokens = ["a", "b", "c"]
    service = _build_service(tokens, "abc", monkeypatch)

    streamed: List[str] = []

    async for chunk in service.stream_response(
        messages=[{"role": "user", "content": "Hello"}]
    ):
        streamed.append(chunk)

    assert streamed == tokens
