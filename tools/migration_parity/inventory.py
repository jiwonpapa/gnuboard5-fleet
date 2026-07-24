from __future__ import annotations

import hashlib
import json
import re
import tomllib
from pathlib import Path
from typing import Iterable

from .model import Finding, Inventory, InventoryItem


LEGACY_ROOT = Path("products/admin-desktop")
LEGACY_WEB_ROOT = LEGACY_ROOT / "g5-admin/src"
LEGACY_COMMAND_ROOT = LEGACY_ROOT / "g5-admin/src-tauri/src/commands"

_COMMAND_PATH_RE = re.compile(
    r"crate::commands(?:::[A-Za-z_][A-Za-z0-9_]*)+::cmd_[A-Za-z0-9_]+"
)
_TAURI_COMMAND_RE = re.compile(
    r"#\s*\[\s*tauri::command[^\]]*\]\s*"
    r"(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+"
    r"(?P<name>cmd_[A-Za-z0-9_]+)(?:\s*<[^>]+>)?\s*\(",
    re.S,
)
_TEST_FILE_RE = re.compile(r"\.(?:test|spec)\.(?:ts|tsx)$")
_RUST_TEST_RE = re.compile(
    r"#\s*\[\s*(?:tokio::)?test(?:\s*\([^\]]*\))?\s*\]\s*"
    r"(?:async\s+)?fn\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)",
    re.S,
)


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def category_fingerprint(items: Iterable[InventoryItem]) -> str:
    lines = [
        f"{item.item_id}\0{item.path}\0{item.sha256}"
        for item in sorted(items, key=lambda current: current.item_id)
    ]
    return sha256_bytes(("\n".join(lines) + "\n").encode("utf-8"))


def _relative(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def _strip_rust_comments(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"//[^\n]*", "", source)


def _resolve_command_source(root: Path, command_path: str) -> Path | None:
    parts = command_path.split("::")
    modules = parts[2:-1]
    command_root = root / LEGACY_COMMAND_ROOT
    direct = command_root.joinpath(*modules).with_suffix(".rs")
    if direct.is_file():
        return direct
    module = command_root.joinpath(*modules, "mod.rs")
    if module.is_file():
        return module
    return None


def _registered_tauri_commands(root: Path) -> tuple[list[InventoryItem], list[Finding]]:
    registry = root / LEGACY_COMMAND_ROOT / "registry_groups.rs"
    source = _strip_rust_comments(registry.read_text(encoding="utf-8"))
    paths = _COMMAND_PATH_RE.findall(source)
    items: list[InventoryItem] = []
    anomalies: list[Finding] = []

    duplicates = sorted({path for path in paths if paths.count(path) > 1})
    for command_path in duplicates:
        anomalies.append(
            Finding(
                "legacy.command.duplicate",
                "legacy invoke registry에 명령이 중복 등록되어 있습니다.",
                "tauri_commands",
                command_path,
            )
        )

    registered_names: set[str] = set()
    for command_path in sorted(set(paths)):
        command = command_path.rsplit("::", 1)[-1]
        registered_names.add(command)
        path = _resolve_command_source(root, command_path)
        if path is None:
            anomalies.append(
                Finding(
                    "legacy.command.unresolved",
                    "등록 명령의 Rust 구현 파일을 찾을 수 없습니다.",
                    "tauri_commands",
                    command_path,
                )
            )
            continue
        implementation = _strip_rust_comments(path.read_text(encoding="utf-8"))
        declared = {match.group("name") for match in _TAURI_COMMAND_RE.finditer(implementation)}
        if command not in declared:
            anomalies.append(
                Finding(
                    "legacy.command.attribute_missing",
                    "등록 명령 구현에 #[tauri::command]가 없습니다.",
                    "tauri_commands",
                    command_path,
                )
            )
        items.append(
            InventoryItem(
                item_id=command_path,
                path=_relative(root, path),
                sha256=sha256_file(path),
                metadata={"command": command},
            )
        )

    declared_commands: set[str] = set()
    for path in sorted((root / LEGACY_COMMAND_ROOT).rglob("*.rs")):
        source = _strip_rust_comments(path.read_text(encoding="utf-8"))
        declared_commands.update(
            match.group("name") for match in _TAURI_COMMAND_RE.finditer(source)
        )
    for command in sorted(declared_commands - registered_names):
        anomalies.append(
            Finding(
                "legacy.command.unregistered",
                "구현됐지만 invoke registry에 등록되지 않은 Tauri 명령입니다.",
                "tauri_commands",
                command,
            )
        )
    return items, anomalies


def _source_items(
    root: Path,
    paths: Iterable[Path],
    *,
    id_root: Path | None = None,
) -> list[InventoryItem]:
    items: list[InventoryItem] = []
    for path in sorted(paths):
        item_id = (
            path.resolve().relative_to(id_root.resolve()).as_posix()
            if id_root is not None
            else _relative(root, path)
        )
        items.append(
            InventoryItem(
                item_id=item_id,
                path=_relative(root, path),
                sha256=sha256_file(path),
            )
        )
    return items


def _rust_test_items(
    root: Path,
    search_root: Path,
    *,
    id_root: Path,
) -> list[InventoryItem]:
    items: list[InventoryItem] = []
    for path in sorted(search_root.rglob("*.rs")):
        source = _strip_rust_comments(path.read_text(encoding="utf-8"))
        relative_id = path.resolve().relative_to(id_root.resolve()).as_posix()
        for match in _RUST_TEST_RE.finditer(source):
            items.append(
                InventoryItem(
                    item_id=f"{relative_id}::{match.group('name')}",
                    path=_relative(root, path),
                    sha256=sha256_file(path),
                    metadata={"test": match.group("name")},
                )
            )
    return items


def build_legacy_inventory(root: Path) -> Inventory:
    command_items, anomalies = _registered_tauri_commands(root)
    web_root = root / LEGACY_WEB_ROOT
    pages = _source_items(
        root,
        web_root.glob("features/**/*Page.tsx"),
        id_root=web_root / "features",
    )
    tests = _source_items(
        root,
        (
            path
            for path in web_root.rglob("*")
            if path.is_file() and _TEST_FILE_RE.search(path.name)
        ),
        id_root=web_root,
    )
    rust_tests = _rust_test_items(
        root,
        root / LEGACY_ROOT,
        id_root=root / LEGACY_ROOT,
    )

    workspace_path = root / LEGACY_ROOT / "Cargo.toml"
    workspace = tomllib.loads(workspace_path.read_text(encoding="utf-8"))
    members: list[InventoryItem] = []
    for member in sorted(workspace["workspace"]["members"]):
        manifest_path = root / LEGACY_ROOT / member / "Cargo.toml"
        if not manifest_path.is_file():
            anomalies.append(
                Finding(
                    "legacy.workspace.manifest_missing",
                    "legacy workspace member의 Cargo.toml이 없습니다.",
                    "rust_workspace_members",
                    member,
                )
            )
            continue
        members.append(
            InventoryItem(
                item_id=member,
                path=_relative(root, manifest_path),
                sha256=sha256_file(manifest_path),
            )
        )

    return Inventory(
        categories={
            "tauri_commands": command_items,
            "react_pages": pages,
            "rust_workspace_members": members,
            "frontend_tests": tests,
            "rust_tests": rust_tests,
        },
        anomalies=anomalies,
    )


def _json_registry_items(
    root: Path,
    relative_path: str,
    collection_key: str,
    identifier,
) -> list[InventoryItem]:
    path = root / relative_path
    data = json.loads(path.read_text(encoding="utf-8"))
    file_hash = sha256_file(path)
    return [
        InventoryItem(
            item_id=identifier(entry),
            path=relative_path,
            sha256=file_hash,
            metadata=entry,
        )
        for entry in data[collection_key]
    ]


def build_active_inventory(root: Path) -> Inventory:
    anomalies: list[Finding] = []
    routes = _json_registry_items(
        root,
        "apps/admin-server/contracts/routes.json",
        "routes",
        lambda route: f"{route['method'].upper()} {route['path']}",
    )
    operations = _json_registry_items(
        root,
        "contracts/core-operations.json",
        "operations",
        lambda operation: operation["operation_id"],
    )

    workspace_path = root / "Cargo.toml"
    workspace = tomllib.loads(workspace_path.read_text(encoding="utf-8"))
    members: list[InventoryItem] = []
    for member in sorted(workspace["workspace"]["members"]):
        manifest_path = root / member / "Cargo.toml"
        if not manifest_path.is_file():
            anomalies.append(
                Finding(
                    "active.workspace.manifest_missing",
                    "활성 workspace member의 Cargo.toml이 없습니다.",
                    "active_workspace_members",
                    member,
                )
            )
            continue
        members.append(
            InventoryItem(
                item_id=member,
                path=_relative(root, manifest_path),
                sha256=sha256_file(manifest_path),
            )
        )

    web_root = root / "apps/admin-web/src"
    pages = _source_items(
        root,
        web_root.glob("**/*Page.tsx"),
        id_root=web_root,
    )
    tests = _source_items(
        root,
        (
            path
            for path in web_root.rglob("*")
            if path.is_file() and _TEST_FILE_RE.search(path.name)
        ),
        id_root=web_root,
    )
    active_rust_tests: list[InventoryItem] = []
    for relative_root in ("apps/admin-server", "crates"):
        active_rust_tests.extend(
            _rust_test_items(
                root,
                root / relative_root,
                id_root=root,
            )
        )

    return Inventory(
        categories={
            "server_routes": routes,
            "core_operations": operations,
            "active_workspace_members": members,
            "web_pages": pages,
            "web_tests": tests,
            "rust_tests": active_rust_tests,
        },
        anomalies=anomalies,
    )
