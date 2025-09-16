"""
Simple SQLite migration runner.

Run SQL files in the provided migration directory in lexicographical order.
Tracks applied migrations in `schema_migrations` table.
"""

import os
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List


def _ensure_migrations_table(conn: sqlite3.Connection) -> None:
    """Create the migrations tracking table if it does not exist."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def _get_applied_versions(conn: sqlite3.Connection) -> set[str]:
    """Fetch the set of applied migration versions."""
    rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
    return {r[0] for r in rows}


def _discover_migration_files(migration_dir: str) -> List[Path]:
    """Discover .sql migration files in the directory, sorted ascending."""
    directory = Path(migration_dir)
    if not directory.exists():
        raise FileNotFoundError(f"Migration directory does not exist: {directory}")
    files = [
        p for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".sql"
    ]
    files.sort(key=lambda p: p.name)
    return files


def _extract_version(file_path: Path) -> str:
    """Extract version identifier from file name (prefix before first underscore or full name)."""
    name = file_path.name
    if "_" in name:
        return name.split("_", 1)[0]
    return name


def run_migrations(db_path: str, migration_dir: str) -> int:
    """Apply pending migrations.

    Args:
        db_path: Path to SQLite database file.
        migration_dir: Directory containing .sql files.

    Returns:
        Number of migrations applied in this run.
    """
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path, check_same_thread=False) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        _ensure_migrations_table(conn)
        applied = _get_applied_versions(conn)

        files = _discover_migration_files(migration_dir)
        applied_count = 0

        for file_path in files:
            version = _extract_version(file_path)
            if version in applied:
                continue

            sql = file_path.read_text(encoding="utf-8")
            # Use executescript to run multiple statements
            conn.executescript(sql)
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (version, datetime.utcnow().isoformat(timespec="seconds") + "Z"),
            )
            conn.commit()
            applied_count += 1

        return applied_count
