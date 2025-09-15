"""
Lightweight SQLite-backed conversation store.

This module provides minimal CRUD operations for conversations and messages,
optimized for simplicity and clarity. It intentionally avoids external ORM
dependencies to keep the service portable. All operations are wrapped with
async helpers to integrate smoothly with the rest of the async codebase.
"""

from __future__ import annotations

import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import asyncio


def _utcnow_iso() -> str:
    """Return current UTC time in ISO 8601 format."""
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


@dataclass
class Conversation:
    id: str
    title: str
    created_at: str
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Message:
    id: int
    conversation_id: str
    role: str
    content: str
    created_at: str


class ConversationStore:
    """SQLite-based store for conversations and messages."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    # --- low level helpers ---
    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    async def initialize(self) -> None:
        """Create tables and indices if missing."""
        def _init():
            with self._connect() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS conversations (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        metadata TEXT
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversation_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_messages_conv_created
                    ON messages(conversation_id, created_at);
                    """
                )
                conn.commit()
        await asyncio.to_thread(_init)

    # --- conversation operations ---
    async def create_conversation(self, title: Optional[str] = None) -> Conversation:
        """Create a new conversation."""
        new_id = str(uuid.uuid4())
        now = _utcnow_iso()
        safe_title = title or "New conversation"

        def _create() -> Conversation:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (new_id, safe_title, now, now),
                )
                conn.commit()
            return Conversation(id=new_id, title=safe_title, created_at=now, updated_at=now)

        return await asyncio.to_thread(_create)

    async def rename_conversation(self, conversation_id: str, title: str) -> bool:
        def _rename() -> bool:
            with self._connect() as conn:
                cur = conn.execute(
                    "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                    (title, _utcnow_iso(), conversation_id),
                )
                conn.commit()
                return cur.rowcount > 0
        return await asyncio.to_thread(_rename)

    async def delete_conversation(self, conversation_id: str) -> bool:
        def _delete() -> bool:
            with self._connect() as conn:
                cur = conn.execute(
                    "DELETE FROM conversations WHERE id = ?",
                    (conversation_id,),
                )
                conn.commit()
                return cur.rowcount > 0
        return await asyncio.to_thread(_delete)

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        def _get() -> Optional[Conversation]:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
                    (conversation_id,),
                ).fetchone()
                if not row:
                    return None
                return Conversation(
                    id=row["id"],
                    title=row["title"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
        return await asyncio.to_thread(_get)

    async def list_conversations(self, limit: int = 100) -> List[Conversation]:
        def _list() -> List[Conversation]:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT id, title, created_at, updated_at FROM conversations ORDER BY datetime(updated_at) DESC LIMIT ?",
                    (limit,),
                ).fetchall()
                return [
                    Conversation(
                        id=r["id"], title=r["title"], created_at=r["created_at"], updated_at=r["updated_at"]
                    )
                    for r in rows
                ]
        return await asyncio.to_thread(_list)

    # --- message operations ---
    async def append_message(self, conversation_id: str, role: str, content: str) -> int:
        now = _utcnow_iso()
        def _append() -> int:
            with self._connect() as conn:
                cur = conn.execute(
                    "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                    (conversation_id, role, content, now),
                )
                conn.execute(
                    "UPDATE conversations SET updated_at = ? WHERE id = ?",
                    (now, conversation_id),
                )
                conn.commit()
                return int(cur.lastrowid)
        return await asyncio.to_thread(_append)

    async def get_messages(self, conversation_id: str, limit: Optional[int] = None) -> List[Message]:
        def _get() -> List[Message]:
            with self._connect() as conn:
                sql = (
                    "SELECT id, conversation_id, role, content, created_at FROM messages "
                    "WHERE conversation_id = ? ORDER BY datetime(created_at) ASC"
                )
                rows = conn.execute(sql, (conversation_id,)).fetchall()
                msgs = [
                    Message(
                        id=r["id"],
                        conversation_id=r["conversation_id"],
                        role=r["role"],
                        content=r["content"],
                        created_at=r["created_at"],
                    )
                    for r in rows
                ]
                if limit is not None and limit > 0:
                    return msgs[-limit:]
                return msgs
        return await asyncio.to_thread(_get)


# Global store instance (path configured via settings at import time)
from ai_service.config.settings import settings  # noqa: E402

conversation_store = ConversationStore(settings.conversation_db_path)


