#!/usr/bin/env python3
"""Fail-closed audit for generated admin schema labels and defaults."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SchemaAudit:
    scanned_files: int
    raw_labels: tuple[tuple[str, str], ...]
    fixme_labels: tuple[tuple[str, str, str], ...]
    default_values: tuple[tuple[str, str, Any], ...]

    @property
    def passed(self) -> bool:
        return self.scanned_files > 0 and not self.raw_labels and not self.fixme_labels


def audit_generated_schemas(root: Path) -> SchemaAudit:
    paths = sorted(root.glob("*.json"))
    if not paths:
        raise ValueError(f"generated schema inventory is empty: {root}")

    raw_labels: list[tuple[str, str]] = []
    fixme_labels: list[tuple[str, str, str]] = []
    default_values: list[tuple[str, str, Any]] = []

    for path in paths:
        document = json.loads(path.read_text(encoding="utf-8"))
        sections = document.get("sections")
        if not isinstance(sections, list):
            raise ValueError(f"schema sections must be a list: {path}")

        for section in sections:
            fields = section.get("fields") if isinstance(section, dict) else None
            if not isinstance(fields, list):
                raise ValueError(f"schema fields must be a list: {path}")

            for field in fields:
                if not isinstance(field, dict):
                    raise ValueError(f"schema field must be an object: {path}")
                name = field.get("name")
                label = field.get("label")
                if not isinstance(name, str) or not name:
                    raise ValueError(f"schema field name must be a non-empty string: {path}")
                if not isinstance(label, str) or not label:
                    raise ValueError(f"schema field label must be a non-empty string: {path}:{name}")
                if label == name:
                    raw_labels.append((path.name, name))
                if label.startswith("FIXME_"):
                    fixme_labels.append((path.name, name, label))
                if "default_value" in field:
                    default_values.append((path.name, name, field["default_value"]))

    return SchemaAudit(
        scanned_files=len(paths),
        raw_labels=tuple(raw_labels),
        fixme_labels=tuple(fixme_labels),
        default_values=tuple(default_values),
    )


def print_report(audit: SchemaAudit) -> None:
    print("scanned_file_count=", audit.scanned_files)
    print("raw_label_count=", len(audit.raw_labels))
    print("fixme_label_count=", len(audit.fixme_labels))
    print("default_value_sample=")
    for default_item in audit.default_values[:20]:
        print(default_item)

    if audit.raw_labels:
        print("raw_label_hits=")
        for raw_item in audit.raw_labels[:20]:
            print(raw_item)
    if audit.fixme_labels:
        print("fixme_label_hits=")
        for fixme_item in audit.fixme_labels[:20]:
            print(fixme_item)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=Path,
        default=Path("api/v1/Admin/Schema/Data/generated"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        audit = audit_generated_schemas(args.root)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"schema_label_audit_error={error}")
        return 1
    print_report(audit)
    return 0 if audit.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
