#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

from archive_old_audits import iter_expired_files
from check_document_metadata import PROJECT_ROOT, parse_frontmatter


ENTRYPOINT_RULES = {
    "specs/README.md": [
        "specs/*.md",
        "specs/integration/*.md",
    ],
    "specs/foundation/README.md": [
        "specs/foundation/*.md",
    ],
    "specs/domains/README.md": [
        "specs/domains/*.md",
    ],
}

INACTIVE_STATUSES = {"deprecated", "superseded", "archived"}
SELF_SSOT_PATTERN = re.compile(r"^\s*이 문서는 .*SSOT(?:입니다|이다)\.?\s*$", re.MULTILINE)
LINK_PATTERN = re.compile(r"\[[^\]]+\]\(([^)#]+\.md)(?:#[^)]+)?\)")


def iter_markdown_docs() -> list[Path]:
    docs: set[Path] = set()
    for base in (PROJECT_ROOT / ".agent", PROJECT_ROOT / "specs"):
        if base.exists():
            docs.update(path for path in base.rglob("*.md") if path.is_file())
    return sorted(docs)


def load_metadata() -> dict[str, dict[str, object]]:
    metadata: dict[str, dict[str, object]] = {}
    for path in iter_markdown_docs():
        try:
            result = parse_frontmatter(path)
        except ValueError:
            continue
        metadata[result.path] = result.metadata
    return metadata


def resolve_link(source: Path, raw_target: str) -> str | None:
    target = raw_target.strip()
    if not target:
        return None
    if target.startswith("/Users/"):
        try:
            return Path(target).resolve().relative_to(PROJECT_ROOT).as_posix()
        except ValueError:
            return None

    resolved = (source.parent / target).resolve()
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return None


def check_expired_audits() -> list[str]:
    failures: list[str] = []
    expired = iter_expired_files(retention_days=7)
    for path, file_date in expired:
        failures.append(
            f"expired dated audit still active: {path.relative_to(PROJECT_ROOT).as_posix()} (date={file_date.isoformat()})"
        )
    return failures


def check_entrypoint_coverage(metadata_index: dict[str, dict[str, object]]) -> list[str]:
    warnings: list[str] = []
    for entrypoint_rel, patterns in ENTRYPOINT_RULES.items():
        entrypoint = PROJECT_ROOT / entrypoint_rel
        entry_text = entrypoint.read_text(encoding="utf-8")

        candidates: set[Path] = set()
        for pattern in patterns:
            candidates.update(path for path in PROJECT_ROOT.glob(pattern) if path.is_file())

        for doc in sorted(candidates):
            rel = doc.relative_to(PROJECT_ROOT).as_posix()
            if rel == entrypoint_rel or doc.name == "README.md":
                continue

            metadata = metadata_index.get(rel)
            if not metadata or metadata.get("status") != "active":
                continue

            if doc.name not in entry_text:
                warnings.append(
                    f"entrypoint coverage missing: {rel} is active but not listed in {entrypoint_rel}"
                )
    return warnings


def check_self_claimed_ssot(metadata_index: dict[str, dict[str, object]]) -> list[str]:
    failures: list[str] = []
    for rel, metadata in metadata_index.items():
        if metadata.get("source_of_truth") is True:
            continue
        path = PROJECT_ROOT / rel
        text = path.read_text(encoding="utf-8")
        if SELF_SSOT_PATTERN.search(text):
            failures.append(
                f"support document self-claims SSOT: {rel} (source_of_truth=false)"
            )
    return failures


def check_inactive_references(metadata_index: dict[str, dict[str, object]]) -> list[str]:
    warnings: list[str] = []
    for rel, metadata in metadata_index.items():
        if metadata.get("status") != "active":
            continue

        source = PROJECT_ROOT / rel
        text = source.read_text(encoding="utf-8")
        for raw_target in LINK_PATTERN.findall(text):
            target_rel = resolve_link(source, raw_target)
            if not target_rel:
                continue
            target_meta = metadata_index.get(target_rel)
            if not target_meta:
                continue
            if target_meta.get("status") in INACTIVE_STATUSES:
                warnings.append(
                    f"active document references inactive doc: {rel} -> {target_rel} ({target_meta.get('status')})"
                )
    return warnings


def main() -> int:
    metadata_index = load_metadata()
    failures: list[str] = []
    warnings: list[str] = []

    failures.extend(check_expired_audits())
    failures.extend(check_self_claimed_ssot(metadata_index))
    warnings.extend(check_entrypoint_coverage(metadata_index))
    warnings.extend(check_inactive_references(metadata_index))

    for message in failures:
        print(f"FAIL: {message}")
    for message in warnings:
        print(f"WARN: {message}")

    if failures:
        return 1

    print(
        f"PASS: document hygiene verified ({len(failures)} failures, {len(warnings)} warnings)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
