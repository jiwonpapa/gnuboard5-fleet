#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOC_DB_PATH = PROJECT_ROOT / ".cache" / "docs" / "docs.db"
DOC_SOURCES = [
    PROJECT_ROOT / "specs",
    PROJECT_ROOT / ".agent",
]


def iter_markdown_files() -> list[Path]:
    files: list[Path] = []
    for source in DOC_SOURCES:
        if not source.exists():
            continue
        files.extend(path for path in source.rglob("*.md") if path.is_file())

    root_readme = PROJECT_ROOT / "README.md"
    if root_readme.exists():
        files.append(root_readme)

    return sorted(set(files))


def extract_title(path: Path, body: str) -> str:
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return path.stem


def parse_frontmatter(body: str) -> dict[str, object]:
    if not body.startswith("---\n"):
        return {}

    lines = body.splitlines()
    metadata: dict[str, object] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if not line.strip() or ":" not in line:
            continue
        key, raw = line.split(":", 1)
        value = raw.strip().strip("'").strip('"')
        lowered = value.lower()
        if lowered == "true":
            metadata[key.strip()] = True
        elif lowered == "false":
            metadata[key.strip()] = False
        elif value.isdigit():
            metadata[key.strip()] = int(value)
        else:
            metadata[key.strip()] = value
    return metadata


def detect_kind(path: Path) -> str:
    relative = path.relative_to(PROJECT_ROOT).as_posix()

    if relative == "specs/IMPLEMENTATION_ROADMAP.md":
        return "roadmap"
    if relative == "specs/TODO.md":
        return "todo"
    if relative == "specs/HISTORY.md":
        return "history"
    if relative == "specs/README.md":
        return "index"
    if relative.startswith("specs/archive/"):
        return "archive"
    if relative.startswith("specs/audits/"):
        return "audit"
    if relative.startswith(".agent/"):
        return "governance"
    return "support"


def file_hash(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def rebuild_index(files: list[Path]) -> int:
    DOC_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-shm", "-wal"):
        stale_path = Path(f"{DOC_DB_PATH}{suffix}")
        if stale_path.exists():
            stale_path.unlink()

    with sqlite3.connect(DOC_DB_PATH) as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            DROP TABLE IF EXISTS docs;
            DROP TABLE IF EXISTS docs_fts;
            CREATE TABLE docs (
                path TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                kind TEXT NOT NULL,
                doc_type TEXT,
                status TEXT,
                owner TEXT,
                source_of_truth INTEGER NOT NULL DEFAULT 0,
                ai_default_include INTEGER NOT NULL DEFAULT 0,
                last_reviewed TEXT,
                sha256 TEXT NOT NULL,
                mtime REAL NOT NULL
            );
            CREATE VIRTUAL TABLE docs_fts
            USING fts5(path, title, body, kind);
            """
        )

        rows = []
        fts_rows = []
        for path in files:
            body = path.read_text(encoding="utf-8")
            relative = path.relative_to(PROJECT_ROOT).as_posix()
            title = extract_title(path, body)
            kind = detect_kind(path)
            metadata = parse_frontmatter(body)
            rows.append(
                (
                    relative,
                    title,
                    kind,
                    str(metadata.get("doc_type", "")),
                    str(metadata.get("status", "")),
                    str(metadata.get("owner", "")),
                    1 if metadata.get("source_of_truth") is True else 0,
                    1 if metadata.get("ai_default_include") is True else 0,
                    str(metadata.get("last_reviewed", "")),
                    file_hash(body),
                    path.stat().st_mtime,
                )
            )
            fts_rows.append((relative, title, body, kind))

        conn.executemany(
            """
            INSERT INTO docs(
                path, title, kind, doc_type, status, owner,
                source_of_truth, ai_default_include, last_reviewed, sha256, mtime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.executemany(
            "INSERT INTO docs_fts(path, title, body, kind) VALUES (?, ?, ?, ?)",
            fts_rows,
        )
        conn.commit()

    return len(files)


def main() -> int:
    files = iter_markdown_files()
    indexed = rebuild_index(files)
    print(f"Indexed {indexed} markdown files into {DOC_DB_PATH.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
