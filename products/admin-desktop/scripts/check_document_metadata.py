#!/usr/bin/env python3
from __future__ import annotations

from datetime import date, timedelta
import re
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
TODAY = date.today()

REQUIRED_DOCS: dict[str, dict[str, object]] = {
    ".agent/Constitution.md": {
        "doc_type": "constitution",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "project constitution",
    },
    ".agent/sub-constitutions/document-governance.md": {
        "doc_type": "governance",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "document governance rules",
    },
    ".agent/workflows/document-management.md": {
        "doc_type": "workflow",
        "status": "active",
    },
    "specs/README.md": {
        "doc_type": "index",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "documentation index",
    },
    "specs/IMPLEMENTATION_ROADMAP.md": {
        "doc_type": "roadmap",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "implementation roadmap",
    },
    "specs/TODO.md": {
        "doc_type": "work_registry",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "work registry",
    },
    "specs/HISTORY.md": {
        "doc_type": "history",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "change history",
    },
    "specs/AUDIT_SYSTEM.md": {
        "doc_type": "governance",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "audit operating system",
    },
    "specs/AUDIT_STRATEGY.md": {
        "doc_type": "strategy",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "audit strategy",
    },
    "specs/DOCUMENT_SYSTEM.md": {
        "doc_type": "governance",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "document operating system",
    },
    "specs/foundation/README.md": {"doc_type": "context_entry", "status": "active"},
    "specs/foundation/DOCUMENT_METADATA_SCHEMA.md": {
        "doc_type": "schema",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "document metadata schema",
    },
    "specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md": {
        "doc_type": "policy",
        "status": "active",
        "source_of_truth": True,
        "canonical_for": "document lifecycle policy",
    },
    "specs/domains/README.md": {"doc_type": "context_entry", "status": "active"},
}

ACTIVE_DOC_GLOBS = [
    ".agent/sub-constitutions/*.md",
    ".agent/workflows/*.md",
    "specs/*.md",
    "specs/codex/*.md",
    "specs/foundation/*.md",
    "specs/domains/*.md",
    "specs/integration/*.md",
    "specs/audits/README.md",
]

REQUIRED_FIELDS = {
    "doc_type",
    "status",
    "owner",
    "source_of_truth",
    "ai_default_include",
    "last_reviewed",
    "review_cycle_days",
}

ALLOWED_DOC_TYPES = {
    "constitution",
    "governance",
    "strategy",
    "index",
    "roadmap",
    "work_registry",
    "history",
    "context_entry",
    "schema",
    "policy",
    "workflow",
    "support",
}

ALLOWED_STATUSES = {"draft", "active", "deprecated", "superseded", "archived"}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass
class MetadataResult:
    path: str
    metadata: dict[str, object]


def iter_active_scope_docs() -> list[Path]:
    docs: set[Path] = set()
    for pattern in ACTIVE_DOC_GLOBS:
        docs.update(path for path in PROJECT_ROOT.glob(pattern) if path.is_file())
    return sorted(docs)


def parse_scalar(raw: str) -> object:
    value = raw.strip().strip("'").strip('"')
    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if value.isdigit():
        return int(value)
    return value


def parse_frontmatter(path: Path) -> MetadataResult:
    text = path.read_text(encoding="utf-8")
    relative = path.relative_to(PROJECT_ROOT).as_posix()
    if not text.startswith("---\n"):
        raise ValueError(f"missing frontmatter: {relative}")

    lines = text.splitlines()
    metadata: dict[str, object] = {}
    closing_index = None
    for idx in range(1, len(lines)):
        line = lines[idx]
        if line.strip() == "---":
            closing_index = idx
            break
        if not line.strip():
            continue
        if ":" not in line:
            raise ValueError(f"invalid frontmatter line: {relative}: {line}")
        key, raw = line.split(":", 1)
        metadata[key.strip()] = parse_scalar(raw)

    if closing_index is None:
        raise ValueError(f"unterminated frontmatter: {relative}")

    return MetadataResult(path=relative, metadata=metadata)


def validate_metadata(result: MetadataResult) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    metadata = result.metadata

    missing = sorted(REQUIRED_FIELDS - metadata.keys())
    if missing:
        errors.append(f"{result.path}: missing metadata fields: {', '.join(missing)}")
        return errors, warnings

    doc_type = metadata["doc_type"]
    if doc_type not in ALLOWED_DOC_TYPES:
        errors.append(f"{result.path}: invalid doc_type '{doc_type}'")

    status = metadata["status"]
    if status not in ALLOWED_STATUSES:
        errors.append(f"{result.path}: invalid status '{status}'")

    if not isinstance(metadata["source_of_truth"], bool):
        errors.append(f"{result.path}: source_of_truth must be boolean")
    if not isinstance(metadata["ai_default_include"], bool):
        errors.append(f"{result.path}: ai_default_include must be boolean")
    if not DATE_PATTERN.match(str(metadata["last_reviewed"])):
        errors.append(f"{result.path}: last_reviewed must be YYYY-MM-DD")
    if not isinstance(metadata["review_cycle_days"], int) or int(metadata["review_cycle_days"]) <= 0:
        errors.append(f"{result.path}: review_cycle_days must be a positive integer")

    if metadata["source_of_truth"] is True and status != "active":
        errors.append(f"{result.path}: source_of_truth=true requires status=active")
    if metadata["source_of_truth"] is True and not str(metadata.get("canonical_for", "")).strip():
        errors.append(f"{result.path}: source_of_truth=true requires canonical_for")

    if status in {"deprecated", "superseded", "archived"} and metadata["ai_default_include"] is not False:
        errors.append(
            f"{result.path}: status={status} requires ai_default_include=false"
        )

    if status == "draft" and metadata["source_of_truth"] is True:
        errors.append(f"{result.path}: draft 문서는 source_of_truth=true가 될 수 없다")

    if DATE_PATTERN.match(str(metadata["last_reviewed"])) and isinstance(metadata["review_cycle_days"], int):
        reviewed = date.fromisoformat(str(metadata["last_reviewed"]))
        due_date = reviewed + timedelta(days=int(metadata["review_cycle_days"]))
        if status == "active" and due_date < TODAY:
            warnings.append(
                f"{result.path}: document review overdue (last_reviewed={reviewed.isoformat()}, due={due_date.isoformat()})"
            )

    expected = REQUIRED_DOCS.get(result.path)
    if expected:
        for key, expected_value in expected.items():
            if metadata.get(key) != expected_value:
                errors.append(
                    f"{result.path}: expected {key}={expected_value!r}, got {metadata.get(key)!r}"
                )

    return errors, warnings


def validate_global_rules(results: list[MetadataResult]) -> list[str]:
    errors: list[str] = []
    canonical_index: dict[str, str] = {}

    for result in results:
        metadata = result.metadata
        status = metadata.get("status")
        source_of_truth = metadata.get("source_of_truth")
        canonical_for = str(metadata.get("canonical_for", "")).strip()

        if result.path.startswith("specs/archive/") and status != "archived":
            errors.append(f"{result.path}: archive path 문서는 status=archived 여야 한다")

        if result.path.startswith("specs/audits/") and result.path != "specs/audits/README.md":
            continue

        if source_of_truth is True:
            previous = canonical_index.get(canonical_for)
            if previous:
                errors.append(
                    f"duplicate canonical_for '{canonical_for}': {previous}, {result.path}"
                )
            else:
                canonical_index[canonical_for] = result.path

    return errors


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    checked = 0
    results: list[MetadataResult] = []

    active_docs = iter_active_scope_docs()
    for path in active_docs:
        relative = path.relative_to(PROJECT_ROOT).as_posix()
        try:
            result = parse_frontmatter(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        checked += 1
        results.append(result)
        metadata_errors, metadata_warnings = validate_metadata(result)
        errors.extend(metadata_errors)
        warnings.extend(metadata_warnings)

    for relative in REQUIRED_DOCS:
        if not (PROJECT_ROOT / relative).exists():
            errors.append(f"missing required document: {relative}")

    errors.extend(validate_global_rules(results))

    for warning in warnings:
        print(f"WARN: {warning}")

    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    print(f"PASS: document metadata verified ({checked} documents, warnings={len(warnings)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
