#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TODO_PATH = ROOT / "docs" / "TODO.md"
REGISTRY_PATH = ROOT / "docs" / "audits" / "BLOCKERS.toml"


def parse_todo_blocked_ids() -> list[str]:
    text = TODO_PATH.read_text(encoding="utf-8")
    match = re.search(r"^## Blocked\s*$([\s\S]*?)(?=^## |\Z)", text, re.MULTILINE)
    if match is None:
        return []

    blocked_section = match.group(1)
    return re.findall(r"^- `([^`]+)`", blocked_section, re.MULTILINE)


def load_registry() -> list[dict[str, str]]:
    data = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    blockers = data.get("blockers", [])
    if not isinstance(blockers, list):
        raise ValueError("docs/audits/BLOCKERS.toml must contain [[blockers]] entries")
    return blockers


def main() -> int:
    todo_ids = parse_todo_blocked_ids()
    blockers = load_registry()
    registry_ids = [str(entry.get("id", "")).strip() for entry in blockers]

    failures: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []
    evidence: list[str] = []

    if len(set(registry_ids)) != len(registry_ids):
        failures.append("registry has duplicate blocker ids")

    missing_in_registry = sorted(set(todo_ids) - set(registry_ids))
    missing_in_todo = sorted(set(registry_ids) - set(todo_ids))

    for blocker_id in missing_in_registry:
        failures.append(f"{blocker_id} exists in docs/TODO.md Blocked but not in docs/audits/BLOCKERS.toml")

    for blocker_id in missing_in_todo:
        failures.append(f"{blocker_id} exists in docs/audits/BLOCKERS.toml but not in docs/TODO.md Blocked")

    required_fields = ("id", "owner", "scope", "upstream", "summary", "next_action")
    for entry in blockers:
        blocker_id = str(entry.get("id", "")).strip() or "<missing-id>"
        for field in required_fields:
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                failures.append(f"{blocker_id} missing required field: {field}")

        if blocker_id != "<missing-id>":
            notes.append(
                f"{blocker_id} owner={entry.get('owner', '-')} scope={entry.get('scope', '-')} upstream={entry.get('upstream', '-')}"
            )

    evidence.append(f"todo: `{TODO_PATH.relative_to(ROOT).as_posix()}`")
    evidence.append(f"registry: `{REGISTRY_PATH.relative_to(ROOT).as_posix()}`")

    print("[blocker_registry]")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT).as_posix()}")
    print(f"blocked_todo_items={len(todo_ids)}")
    print(f"registry_entries={len(registry_ids)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")
    print()

    print("[notes]")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")
    print()

    print("[evidence]")
    for item in evidence:
        print(f"EVIDENCE {item}")
    print()

    print("[warnings]")
    if warnings:
        for warning in warnings:
            print(f"WARN {warning}")
    else:
        print("none")
    print()

    print("[failures]")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        print("FAIL: blocker registry audit")
        return 1

    print("none")
    print("PASS: blocker registry audit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
