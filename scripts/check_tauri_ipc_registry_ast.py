#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


RUST_ROOT = Path(__file__).resolve().parents[1]
TAURI_SRC = RUST_ROOT / "g5-admin/src-tauri/src"
COMMANDS_ROOT = TAURI_SRC / "commands"


def strip_rust_comments(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"//[^\n]*", "", source)


def extract_generate_handler_paths(source: str) -> list[str]:
    cleaned = strip_rust_comments(source)
    match = re.search(r"tauri::generate_handler!\s*\[(.*?)\]", cleaned, re.S)
    if not match:
        return []
    return re.findall(
        r"crate::commands(?:::[A-Za-z_][A-Za-z0-9_]*)+::cmd_[A-Za-z0-9_]+",
        match.group(1),
    )


def resolve_command_source(command_path: str) -> tuple[Path | None, str]:
    parts = command_path.split("::")
    command = parts[-1]
    modules = parts[2:-1]
    candidate = COMMANDS_ROOT.joinpath(*modules).with_suffix(".rs")
    if candidate.is_file():
        return candidate, command
    candidate = COMMANDS_ROOT.joinpath(*modules, "mod.rs")
    if candidate.is_file():
        return candidate, command
    return None, command


def command_has_tauri_attribute(source: str, command: str) -> bool:
    cleaned = strip_rust_comments(source)
    return re.search(
        rf"#\s*\[\s*tauri::command[^\]]*\]\s*"
        rf"(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+{re.escape(command)}"
        rf"(?:\s*<[^>]+>)?\s*\(",
        cleaned,
        re.S,
    ) is not None


def main() -> None:
    failures: list[str] = []
    lib_source = strip_rust_comments((TAURI_SRC / "lib.rs").read_text(encoding="utf-8"))
    registry_source = strip_rust_comments(
        (COMMANDS_ROOT / "registry.rs").read_text(encoding="utf-8")
    )
    groups_path = COMMANDS_ROOT / "registry_groups.rs"
    groups_source = groups_path.read_text(encoding="utf-8")

    if not re.search(r"use\s+commands::registry::app_invoke_handler\s*;", lib_source):
        failures.append("lib.rs does not import commands::registry::app_invoke_handler")
    if not re.search(r"\.invoke_handler\(\s*app_invoke_handler!\(\)\s*\)", lib_source):
        failures.append("Tauri Builder does not invoke the reachable app_invoke_handler macro")
    if not re.search(
        r"crate::commands::registry_groups::all_command_handlers!\(\)", registry_source
    ):
        failures.append("app_invoke_handler does not reach registry_groups")

    command_paths = extract_generate_handler_paths(groups_source)
    if not command_paths:
        failures.append("reachable generate_handler registry returned zero commands")
    duplicates = sorted({path for path in command_paths if command_paths.count(path) > 1})
    if duplicates:
        failures.append(f"duplicate generate_handler commands: {duplicates}")

    unresolved: list[str] = []
    missing_attributes: list[str] = []
    for command_path in command_paths:
        source_path, command = resolve_command_source(command_path)
        if source_path is None:
            unresolved.append(command_path)
            continue
        if not command_has_tauri_attribute(source_path.read_text(encoding="utf-8"), command):
            missing_attributes.append(command_path)
    if unresolved:
        failures.append(f"unresolved registered command modules: {unresolved}")
    if missing_attributes:
        failures.append(f"registered functions without #[tauri::command]: {missing_attributes}")

    registry_files = sorted(COMMANDS_ROOT.glob("registry*.rs"))
    expected_registry_files = {COMMANDS_ROOT / "registry.rs", groups_path}
    orphan_registry_files = [
        str(path.relative_to(RUST_ROOT))
        for path in registry_files
        if path not in expected_registry_files
    ]
    if orphan_registry_files:
        failures.append(f"orphan registry group files: {orphan_registry_files}")

    summary = {
        "status": "fail" if failures else "pass",
        "registered_command_count": len(command_paths),
        "resolved_command_count": len(command_paths) - len(unresolved),
        "tauri_attribute_count": len(command_paths) - len(missing_attributes),
        "orphan_registry_files": orphan_registry_files,
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
