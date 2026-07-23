#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


RUST_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RUST_ROOT / "scripts"))
import run_integrated_audit as integrated  # noqa: E402


BOOTSTRAP_EDGES = {
    "cmd_system_health": ("GET", "/health"),
    "cmd_auth_login": ("POST", "/auth/login"),
    "cmd_auth_refresh": ("POST", "/auth/refresh"),
    "cmd_auth_logout": ("POST", "/auth/logout"),
    "cmd_member_me_get": ("GET", "/members/me"),
}


def normalize_path(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{param}", path)


def extract_braced_body(source: str, start: int) -> str | None:
    brace = source.find("{", start)
    if brace < 0:
        return None
    depth = 1
    quote: str | None = None
    escaped = False
    cursor = brace + 1
    while cursor < len(source):
        char = source[cursor]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in {'"', "'", "`"}:
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[brace + 1 : cursor]
        cursor += 1
    return None


def extract_frontend_wrappers() -> list[dict[str, str]]:
    root = RUST_ROOT / "g5-admin/src/api/client"
    pattern = re.compile(r"export\s+async\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(")
    invoke_pattern = re.compile(
        r"invokeCommand(?:<.*?>)?\(\s*[\"\'](cmd_[a-z0-9_]+)[\"\']", re.S
    )
    wrappers: list[dict[str, str]] = []
    for path in sorted(root.rglob("*.ts")):
        if "core" in path.parts or ".test." in path.name:
            continue
        source = path.read_text(encoding="utf-8")
        for match in pattern.finditer(source):
            body = extract_braced_body(source, match.end())
            if body is None:
                continue
            commands = invoke_pattern.findall(body)
            for command in commands:
                wrappers.append(
                    {
                        "wrapper": match.group(1),
                        "command": command,
                        "source": str(path.relative_to(RUST_ROOT)),
                    }
                )
    return wrappers


def extract_api_targets() -> dict[str, str]:
    root = RUST_ROOT / "g5-admin/src/api/client/core/api-target-registry-groups"
    targets: dict[str, str] = {}
    pattern = re.compile(r'["\'](cmd_[a-z0-9_]+)["\']\s*:\s*["\']([^"\']+)["\']')
    for path in sorted(root.rglob("*.ts")):
        for command, target in pattern.findall(path.read_text(encoding="utf-8")):
            if command in targets and targets[command] != target:
                raise ValueError(f"duplicate apiTarget with drift: {command}")
            targets[command] = target
    return targets


def evaluate_edges(
    wrappers: list[dict[str, str]],
    targets: dict[str, str],
    command_edges: dict[str, set[tuple[str, str]]],
) -> dict[str, object]:
    failures: list[str] = []
    wrapper_by_command: dict[str, list[dict[str, str]]] = {}
    for wrapper in wrappers:
        wrapper_by_command.setdefault(wrapper["command"], []).append(wrapper)
    edge_rows = []
    for command, operations in sorted(command_edges.items()):
        command_wrappers = wrapper_by_command.get(command, [])
        target = targets.get(command)
        normalized_target = normalize_path(target) if target else None
        operation_paths = {path for _, path in operations}
        errors: list[str] = []
        if len(command_wrappers) != 1:
            errors.append(f"wrapper_count={len(command_wrappers)}")
        if normalized_target is None:
            errors.append("apiTarget missing")
        elif normalized_target not in operation_paths:
            errors.append(
                f"apiTarget path mismatch target={normalized_target} operations={sorted(operation_paths)}"
            )
        if len(operations) != 1:
            errors.append(f"operation edge is not singular: {sorted(operations)}")
        if errors:
            failures.append(f"{command}: {'; '.join(errors)}")
        edge_rows.append(
            {
                "command": command,
                "wrapper": command_wrappers[0]["wrapper"] if len(command_wrappers) == 1 else None,
                "target": target,
                "operations": [
                    {"method": method, "path": path} for method, path in sorted(operations)
                ],
            }
        )

    active_commands = set(command_edges)
    orphan_active_targets = sorted(
        command for command in targets if command.startswith("cmd_admin_") and command not in active_commands
    )
    if orphan_active_targets:
        failures.append(f"orphan active admin apiTargets: {orphan_active_targets}")

    return {
        "status": "fail" if failures else "pass",
        "wrapper_count": len(wrappers),
        "active_edge_count": len(edge_rows),
        "api_target_count": len(targets),
        "orphan_active_targets": orphan_active_targets,
        "failures": failures,
        "edges": edge_rows,
    }


def main() -> None:
    wrappers = extract_frontend_wrappers()
    targets = extract_api_targets()
    metrics = integrated.extract_rust_admin_operation_metrics(RUST_ROOT)
    command_edges = {
        edge["command"]: {
            (operation["method"], normalize_path(operation["path"]))
            for operation in edge.get("operations", [])
        }
        for edge in metrics.get("command_operation_edges", [])
    }
    command_edges.update(
        {command: {(method, path)} for command, (method, path) in BOOTSTRAP_EDGES.items()}
    )
    summary = evaluate_edges(wrappers, targets, command_edges)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(1 if summary["status"] == "fail" else 0)


if __name__ == "__main__":
    main()
