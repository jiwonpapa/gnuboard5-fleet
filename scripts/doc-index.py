#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "docs" / "docs.db"


def collect_sources() -> list[Path]:
    files: set[Path] = set()
    for pattern_root in [ROOT / "docs", ROOT / ".agent"]:
        for path in pattern_root.rglob("*.md"):
            files.add(path)
    files.add(ROOT / "api" / "docs" / "openapi.yaml")
    return sorted(path for path in files if path.exists())


def extract_title(path: Path, text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return path.name


def extract_headings(text: str) -> str:
    headings = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            headings.append(stripped.lstrip("#").strip())
    return "\n".join(headings)


def classify_kind(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative == "api/docs/openapi.yaml":
        return "openapi"
    if relative.startswith(".agent/"):
        return "governance"
    if relative.startswith("docs/audits/"):
        return "audit"
    if relative.startswith("docs/planning/"):
        return "planning"
    return "markdown"


def rebuild_index(db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    cleanup_sidecars(db_path)
    if db_path.exists():
        db_path.unlink()

    connection = sqlite3.connect(db_path)
    try:
        connection.executescript(
            """
            PRAGMA journal_mode = DELETE;
            CREATE TABLE documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                headings TEXT NOT NULL,
                body TEXT NOT NULL
            );
            CREATE VIRTUAL TABLE documents_fts USING fts5(
                path UNINDEXED,
                title,
                headings,
                body,
                tokenize = 'unicode61'
            );
            """
        )

        rows = []
        for path in collect_sources():
            text = path.read_text(encoding="utf-8")
            relative_path = path.relative_to(ROOT).as_posix()
            title = extract_title(path, text)
            headings = extract_headings(text)
            kind = classify_kind(path)
            rows.append((relative_path, kind, title, headings, text))

        connection.executemany(
            "INSERT INTO documents(path, kind, title, headings, body) VALUES (?, ?, ?, ?, ?)",
            rows,
        )
        connection.executemany(
            "INSERT INTO documents_fts(path, title, headings, body) VALUES (?, ?, ?, ?)",
            [(path, title, headings, body) for path, _kind, title, headings, body in rows],
        )
        connection.commit()
        return len(rows)
    finally:
        connection.close()
        cleanup_sidecars(db_path)


def cleanup_sidecars(db_path: Path) -> None:
    for suffix in ("-shm", "-wal", "-journal"):
        sidecar = Path(f"{db_path}{suffix}")
        if sidecar.exists():
            sidecar.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the SQLite FTS index for project docs.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to the SQLite DB file")
    args = parser.parse_args()

    db_path = Path(args.db)
    count = rebuild_index(db_path)
    print(f"indexed {count} documents into {db_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
