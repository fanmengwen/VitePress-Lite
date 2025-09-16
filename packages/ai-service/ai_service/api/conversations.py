"""
Conversation management endpoints.
"""

from fastapi import APIRouter, HTTPException, Query

from ai_service.models.chat import ConversationInfo, ConversationDetail, ChatMessage
from ai_service.services.conversation_store import conversation_store

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationInfo])
async def list_conversations(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0)
) -> list[ConversationInfo]:
    """List conversations ordered by updated_at desc."""
    items = await conversation_store.list_conversations(limit=limit, offset=offset)
    return [
        ConversationInfo(
            id=i.id,
            title=i.title,
            created_at=i.created_at,
            updated_at=i.updated_at
        )
        for i in items
    ]


@router.post("/conversations", response_model=ConversationInfo, status_code=201)
async def create_conversation(payload: dict | None = None) -> ConversationInfo:
    """Create a new conversation."""
    title = None
    if isinstance(payload, dict):
        title = payload.get("title")
    c = await conversation_store.create_conversation(title=title)
    return ConversationInfo(id=c.id, title=c.title, created_at=c.created_at, updated_at=c.updated_at)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str) -> ConversationDetail:
    """Get conversation details with message history."""
    conv = await conversation_store.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = await conversation_store.get_messages(conversation_id)
    mapped = [
        ChatMessage(role=m.role, content=m.content, timestamp=m.created_at)
        for m in msgs
    ]
    return ConversationDetail(id=conv.id, title=conv.title, messages=mapped)


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, payload: dict) -> dict:
    """Rename a conversation."""
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required and must be non-empty")
    ok = await conversation_store.rename_conversation(conversation_id, title)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"title": title}


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str) -> None:
    """Delete a conversation."""
    ok = await conversation_store.delete_conversation(conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return None
