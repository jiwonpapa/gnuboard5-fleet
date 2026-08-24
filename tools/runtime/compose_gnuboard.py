#!/usr/bin/env python3
"""Build and verify the non-vendored GnuBoard5 + PHP connector runtime."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from tools.upstream import sync_gnuboard  # noqa: E402

RUNTIME_RELATIVE = Path(".cache/composed/gnuboard5-php")
MANIFEST_RELATIVE = Path(".cache/composed/gnuboard5-php.manifest.json")
UPSTREAM_LOCKED_REF = "refs/g5-fleet/upstreams/gnuboard5"
REGULAR_GIT_MODES = {"100644", "100755"}
UNSAFE_PERMISSION_BITS = stat.S_IWGRP | stat.S_IWOTH | stat.S_ISUID | stat.S_ISGID | stat.S_ISVTX
RUNTIME_GENERATED_FILES = {".phpunit.result.cache"}
RUNTIME_GENERATED_PREFIXES = ("output/",)


@dataclass(frozen=True)
class SourceEntry:
    path: str
    mode: str
    object_id: str
    sha256: str
    source_path: Path


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"JSON root must be an object: {path}")
    return payload


def run(*args: str, cwd: Path, timeout_seconds: int = 1800) -> str:
    try:
        completed = subprocess.run(
            args,
            cwd=cwd,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            f"command timed out after {timeout_seconds}s ({' '.join(args)})"
        ) from error
    if completed.returncode != 0:
        detail = "\n".join(
            part for part in (completed.stdout.strip(), completed.stderr.strip()) if part
        )
        raise RuntimeError(f"command failed ({' '.join(args)}): {detail}")
    return completed.stdout.strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git_blob_and_sha256(path: Path, object_format: str) -> tuple[str, str]:
    if object_format not in {"sha1", "sha256"}:
        raise RuntimeError(f"unsupported Git object format: {object_format}")
    object_digest = hashlib.new(object_format)
    content_digest = hashlib.sha256()
    object_digest.update(f"blob {path.stat().st_size}\0".encode("ascii"))
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            object_digest.update(chunk)
            content_digest.update(chunk)
    return object_digest.hexdigest(), content_digest.hexdigest()


def safe_relative(value: str) -> str:
    if not value or "\x00" in value or "\\" in value:
        raise RuntimeError(f"unsafe source path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise RuntimeError(f"unsafe source path: {value!r}")
    return path.as_posix()


def ensure_regular_source(root: Path, relative: str) -> Path:
    root = root.resolve(strict=True)
    relative = safe_relative(relative)
    candidate = root / relative
    cursor = root
    for part in PurePosixPath(relative).parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise RuntimeError(f"source symlink is forbidden: {relative}")
    try:
        resolved = candidate.resolve(strict=True)
    except OSError as error:
        raise RuntimeError(f"source file is missing: {relative}") from error
    if not resolved.is_relative_to(root) or not resolved.is_file():
        raise RuntimeError(f"source path escaped or is not a regular file: {relative}")
    return resolved


def ensure_safe_directory_chain(root: Path, directory: Path) -> None:
    """Reject symlink or non-directory components below the repository root."""
    lexical_root = root.absolute()
    lexical_directory = directory.absolute()
    if lexical_root.is_symlink():
        raise RuntimeError(f"repository root symlink is forbidden: {lexical_root}")
    try:
        relative = lexical_directory.relative_to(lexical_root)
    except ValueError as error:
        raise RuntimeError(f"cache path escaped repository root: {lexical_directory}") from error
    cursor = lexical_root
    for part in relative.parts:
        cursor /= part
        if cursor.is_symlink():
            raise RuntimeError(f"cache path symlink is forbidden: {cursor}")
        if cursor.exists() and not cursor.is_dir():
            raise RuntimeError(f"cache path component is not a directory: {cursor}")


def git_tree_entries(repository: Path, revision: str, source_root: Path) -> list[SourceEntry]:
    object_format = run("git", "rev-parse", "--show-object-format", cwd=repository)
    raw = subprocess.run(
        ("git", "ls-tree", "-r", "-z", "--full-tree", revision),
        cwd=repository,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if raw.returncode != 0:
        raise RuntimeError(
            f"git ls-tree failed for {revision}: {raw.stderr.decode(errors='replace').strip()}"
        )
    entries: list[SourceEntry] = []
    for record in raw.stdout.split(b"\0"):
        if not record:
            continue
        try:
            metadata, encoded_path = record.split(b"\t", 1)
            mode, object_type, object_id = metadata.decode("ascii").split(" ", 2)
            relative = safe_relative(encoded_path.decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as error:
            raise RuntimeError("invalid Git tree record") from error
        if object_type != "blob" or mode not in REGULAR_GIT_MODES:
            raise RuntimeError(
                f"non-regular or symlink Git entry is forbidden: {mode} {object_type} {relative}"
            )
        source_path = ensure_regular_source(source_root, relative)
        # Hash the checkout bytes as a Git blob in-process, independent of the
        # destination repository's .gitattributes. This keeps the exact Git
        # object check without spawning one process per file.
        actual_object, content_sha256 = git_blob_and_sha256(source_path, object_format)
        if actual_object != object_id:
            raise RuntimeError(
                f"source worktree differs from locked Git object: {relative} "
                f"expected={object_id} actual={actual_object}"
            )
        entries.append(
            SourceEntry(relative, mode, object_id, content_sha256, source_path)
        )
    if not entries:
        raise RuntimeError(f"Git source tree is empty: {revision}")
    return sorted(entries, key=lambda row: row.path)


def fingerprint_entries(entries: list[SourceEntry]) -> str:
    digest = hashlib.sha256()
    for entry in sorted(entries, key=lambda row: row.path):
        digest.update(f"{entry.mode}\0{entry.path}\0{entry.sha256}\n".encode("utf-8"))
    return digest.hexdigest()


def overlay_entries(upstream: list[SourceEntry], connector: list[SourceEntry]) -> dict[str, SourceEntry]:
    result = {entry.path: entry for entry in upstream}
    result.update({entry.path: entry for entry in connector})
    return result


def fingerprint_overlay(entries: dict[str, SourceEntry]) -> str:
    return fingerprint_entries(list(entries.values()))


def copy_overlay(entries: dict[str, SourceEntry], destination: Path) -> None:
    for relative, entry in sorted(entries.items()):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(entry.source_path, target, follow_symlinks=False)
        target.chmod(0o755 if entry.mode == "100755" else 0o644)
        os.utime(target, (0, 0), follow_symlinks=False)


def is_runtime_generated(relative: str) -> bool:
    return relative in RUNTIME_GENERATED_FILES or relative.startswith(
        RUNTIME_GENERATED_PREFIXES
    )


def filesystem_entries(
    root: Path,
    *,
    exclude_vendor: bool = False,
    exclude_runtime_generated: bool = False,
) -> list[SourceEntry]:
    if not root.is_dir() or root.is_symlink():
        raise RuntimeError(f"runtime directory is missing or unsafe: {root}")
    entries: list[SourceEntry] = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if exclude_vendor and (relative == "vendor" or relative.startswith("vendor/")):
            continue
        if path.is_symlink():
            raise RuntimeError(f"runtime symlink is forbidden: {relative}")
        permissions = stat.S_IMODE(path.lstat().st_mode)
        if permissions & UNSAFE_PERMISSION_BITS:
            raise RuntimeError(f"unsafe runtime permissions {permissions:04o}: {relative}")
        if exclude_runtime_generated and is_runtime_generated(relative):
            continue
        if path.is_dir():
            continue
        if not path.is_file():
            raise RuntimeError(f"non-regular runtime entry is forbidden: {relative}")
        entries.append(
            SourceEntry(
                relative,
                f"100{permissions:03o}",
                "filesystem",
                sha256_file(path),
                path,
            )
        )
    return entries


def expected_packages(lock: dict[str, Any]) -> dict[str, str]:
    packages: dict[str, str] = {}
    for section in ("packages", "packages-dev"):
        rows = lock.get(section)
        if not isinstance(rows, list):
            raise RuntimeError(f"composer.lock {section} must be an array")
        for row in rows:
            if not isinstance(row, dict):
                raise RuntimeError(f"composer.lock {section} has an invalid package")
            if row.get("type") == "composer-plugin":
                raise RuntimeError("Composer plugins are forbidden in the prepared audit runtime")
            name, version = row.get("name"), row.get("version")
            if not isinstance(name, str) or not isinstance(version, str) or not name or not version:
                raise RuntimeError("composer.lock package identity is invalid")
            if name in packages:
                raise RuntimeError(f"duplicate Composer locked package: {name}")
            packages[name] = version
    return packages


def installed_packages(runtime: Path) -> dict[str, str]:
    autoload = runtime / "vendor/autoload.php"
    installed_path = runtime / "vendor/composer/installed.json"
    if not autoload.is_file() or autoload.is_symlink():
        raise RuntimeError("prepared Composer autoload.php is missing or unsafe")
    payload = json.loads(installed_path.read_text(encoding="utf-8"))
    rows = payload.get("packages") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise RuntimeError("vendor/composer/installed.json package inventory is invalid")
    packages: dict[str, str] = {}
    for row in rows:
        if not isinstance(row, dict):
            raise RuntimeError("installed Composer package row is invalid")
        name, version = row.get("name"), row.get("version")
        if not isinstance(name, str) or not isinstance(version, str) or not name or not version:
            raise RuntimeError("installed Composer package identity is invalid")
        if name in packages:
            raise RuntimeError(f"duplicate installed Composer package: {name}")
        packages[name] = version
    return packages


def validate_dependencies(runtime: Path) -> tuple[dict[str, str], str]:
    locked = expected_packages(load_json(runtime / "composer.lock"))
    installed = installed_packages(runtime)
    if installed != locked:
        missing = sorted(set(locked) - set(installed))
        extra = sorted(set(installed) - set(locked))
        drift = sorted(name for name in set(locked) & set(installed) if locked[name] != installed[name])
        raise RuntimeError(
            "Composer dependency set mismatch: "
            f"missing={missing} extra={extra} version_drift={drift}"
        )
    vendor_entries = [
        entry for entry in filesystem_entries(runtime) if entry.path.startswith("vendor/")
    ]
    if not vendor_entries:
        raise RuntimeError("prepared Composer vendor tree is empty")
    return installed, fingerprint_entries(vendor_entries)


def select_inputs(root: Path) -> tuple[dict[str, Any], dict[str, Any], Path, list[SourceEntry], list[SourceEntry]]:
    lock = load_json(root / "UPSTREAMS.lock.json")
    upstream = sync_gnuboard.validate_lock(lock)
    version = upstream.get("version")
    commit = upstream.get("commit")
    tree = upstream.get("tree")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z._+-]+", version):
        raise RuntimeError("locked GnuBoard5 version is invalid")
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise RuntimeError("locked GnuBoard5 commit is invalid")
    if not isinstance(tree, str) or not re.fullmatch(r"[0-9a-f]{40}", tree):
        raise RuntimeError("locked GnuBoard5 tree is invalid")
    checkout = root / ".cache/upstream/gnuboard5" / f"v{version}"
    ensure_safe_directory_chain(root, checkout)
    sync_gnuboard.verify_checkout(checkout, upstream)
    upstream_entries = git_tree_entries(checkout, commit, checkout)

    provenance = load_json(root / "MIGRATION_PROVENANCE.json")
    sources = provenance.get("sources")
    if not isinstance(sources, list):
        raise RuntimeError("migration source inventory is missing")
    matches = [row for row in sources if isinstance(row, dict) and row.get("id") == "php-rest-api"]
    if len(matches) != 1:
        raise RuntimeError("migration provenance must have one php-rest-api source")
    connector = matches[0]
    import_source_commit, import_source_tree = connector.get("source_commit"), connector.get("source_tree")
    prefix = connector.get("destination_prefix")
    if not isinstance(import_source_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", import_source_commit):
        raise RuntimeError("PHP connector source commit is invalid")
    if not isinstance(import_source_tree, str) or not re.fullmatch(r"[0-9a-f]{40}", import_source_tree):
        raise RuntimeError("PHP connector source tree is invalid")
    if prefix != "connectors/gnuboard5-php":
        raise RuntimeError("PHP connector destination prefix mismatch")
    actual_source_tree = run("git", "rev-parse", f"{import_source_commit}^{{tree}}", cwd=root)
    if actual_source_tree != import_source_tree:
        raise RuntimeError("PHP connector source tree does not match provenance")
    if run("git", "status", "--porcelain", "--untracked-files=no", cwd=root):
        raise RuntimeError("destination tracked files must be clean before runtime composition")
    destination_commit = run("git", "rev-parse", "HEAD", cwd=root)
    destination_tree = run("git", "rev-parse", f"HEAD:{prefix}", cwd=root)
    connector_root = root / prefix
    if connector_root.is_symlink():
        raise RuntimeError("PHP connector root symlink is forbidden")
    connector_entries = git_tree_entries(root, f"HEAD:{prefix}", connector_root)
    current_connector = dict(connector)
    current_connector["destination_commit"] = destination_commit
    current_connector["destination_tree"] = destination_tree
    current_connector["import_source_commit"] = import_source_commit
    current_connector["import_source_tree"] = import_source_tree
    return upstream, current_connector, checkout, upstream_entries, connector_entries


def manifest_payload(
    root: Path,
    runtime: Path,
    upstream: dict[str, Any],
    connector: dict[str, Any],
    upstream_entries: list[SourceEntry],
    connector_entries: list[SourceEntry],
    overlay: dict[str, SourceEntry],
    composer_version: str,
) -> dict[str, Any]:
    installed, vendor_sha = validate_dependencies(runtime)
    runtime_entries = filesystem_entries(runtime, exclude_runtime_generated=True)
    connector_openapi = root / "connectors/gnuboard5-php/api/docs/openapi.yaml"
    composed_openapi = runtime / "api/docs/openapi.yaml"
    canonical_sha = sha256_file(connector_openapi)
    if sha256_file(composed_openapi) != canonical_sha:
        raise RuntimeError("composed OpenAPI is not identical to canonical connector OpenAPI")
    return {
        "schema": "g5-fleet.composed-runtime/v1",
        "status": "prepared",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "runtime": str(RUNTIME_RELATIVE),
        "inputs": {
            "upstream": {
                "version": upstream["version"],
                "commit": upstream["commit"],
                "tree": upstream["tree"],
                "files": len(upstream_entries),
                "fingerprint_sha256": fingerprint_entries(upstream_entries),
            },
            "connector": {
                "destination_commit": connector["destination_commit"],
                "destination_tree": connector["destination_tree"],
                "import_source_commit": connector["import_source_commit"],
                "import_source_tree": connector["import_source_tree"],
                "files": len(connector_entries),
                "fingerprint_sha256": fingerprint_entries(connector_entries),
            },
            "composer": {
                "lock_sha256": sha256_file(runtime / "composer.lock"),
                "version": composer_version,
                "packages": len(installed),
                "package_set_sha256": hashlib.sha256(
                    "\n".join(f"{name}={installed[name]}" for name in sorted(installed)).encode("utf-8")
                ).hexdigest(),
            },
        },
        "overlay": {
            "files": len(overlay),
            "collisions": len({entry.path for entry in upstream_entries} & {entry.path for entry in connector_entries}),
            "fingerprint_sha256": fingerprint_overlay(overlay),
        },
        "canonical_contract": {
            "connector_path": "connectors/gnuboard5-php/api/docs/openapi.yaml",
            "composed_path": f"{RUNTIME_RELATIVE.as_posix()}/api/docs/openapi.yaml",
            "sha256": canonical_sha,
        },
        "prepared": {
            "runtime_files": len(runtime_entries),
            "runtime_fingerprint_sha256": fingerprint_entries(runtime_entries),
            "vendor_fingerprint_sha256": vendor_sha,
        },
    }


def write_atomic(path: Path, encoded: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(encoded, encoding="utf-8")
    os.replace(temporary, path)


def prepare(root: Path, composer_bin: str = "composer") -> dict[str, Any]:
    ensure_safe_directory_chain(root, root / RUNTIME_RELATIVE.parent)
    upstream, connector, _checkout, upstream_entries, connector_entries = select_inputs(root)
    overlay = overlay_entries(upstream_entries, connector_entries)
    destination = root / RUNTIME_RELATIVE
    if destination.is_symlink():
        raise RuntimeError("composed runtime symlink is forbidden")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.parent / f".{destination.name}.{uuid.uuid4().hex}.tmp"
    if temporary.exists():
        raise RuntimeError(f"unexpected temporary path exists: {temporary}")
    temporary.mkdir()
    try:
        copy_overlay(overlay, temporary)
        composer_version = run(composer_bin, "--version", "--no-ansi", cwd=temporary)
        run(
            composer_bin,
            "install",
            "--no-interaction",
            "--no-progress",
            "--prefer-dist",
            "--optimize-autoloader",
            "--no-scripts",
            "--no-plugins",
            cwd=temporary,
        )
        payload = manifest_payload(
            root,
            temporary,
            upstream,
            connector,
            upstream_entries,
            connector_entries,
            overlay,
            composer_version,
        )
        backup = destination.parent / f".{destination.name}.{uuid.uuid4().hex}.old"
        if destination.exists():
            os.replace(destination, backup)
        try:
            os.replace(temporary, destination)
        except OSError:
            if backup.exists():
                os.replace(backup, destination)
            raise
        if backup.exists():
            shutil.rmtree(backup)
        write_atomic(root / MANIFEST_RELATIVE, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        return payload
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


def verify(root: Path) -> dict[str, Any]:
    ensure_safe_directory_chain(root, root / RUNTIME_RELATIVE.parent)
    manifest_path = root / MANIFEST_RELATIVE
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise RuntimeError("prepared runtime manifest is missing or unsafe; run `make prepare`")
    recorded = load_json(manifest_path)
    if recorded.get("schema") != "g5-fleet.composed-runtime/v1" or recorded.get("status") != "prepared":
        raise RuntimeError("prepared runtime manifest identity is invalid")
    upstream, connector, _checkout, upstream_entries, connector_entries = select_inputs(root)
    overlay = overlay_entries(upstream_entries, connector_entries)
    runtime = root / RUNTIME_RELATIVE
    if runtime.is_symlink() or not runtime.is_dir():
        raise RuntimeError("prepared composed runtime is missing or unsafe")
    actual_non_vendor = {
        entry.path: entry
        for entry in filesystem_entries(
            runtime,
            exclude_vendor=True,
            exclude_runtime_generated=True,
        )
    }
    expected_non_vendor = overlay
    if set(actual_non_vendor) != set(expected_non_vendor):
        missing = sorted(set(expected_non_vendor) - set(actual_non_vendor))[:20]
        stale = sorted(set(actual_non_vendor) - set(expected_non_vendor))[:20]
        raise RuntimeError(f"composed overlay file set mismatch: missing={missing} stale={stale}")
    for relative, expected in expected_non_vendor.items():
        actual = actual_non_vendor[relative]
        if (actual.mode, actual.sha256) != (expected.mode, expected.sha256):
            raise RuntimeError(f"composed overlay content/mode mismatch: {relative}")
    composer_version = recorded.get("inputs", {}).get("composer", {}).get("version")
    if not isinstance(composer_version, str) or not composer_version:
        raise RuntimeError("prepared Composer version evidence is missing")
    actual = manifest_payload(
        root,
        runtime,
        upstream,
        connector,
        upstream_entries,
        connector_entries,
        overlay,
        composer_version,
    )
    comparable_recorded = dict(recorded)
    comparable_actual = dict(actual)
    comparable_recorded.pop("generated_at", None)
    comparable_actual.pop("generated_at", None)
    for payload in (comparable_recorded, comparable_actual):
        connector_input = payload.get("inputs", {}).get("connector", {})
        if isinstance(connector_input, dict):
            # The prepared commit is provenance metadata. The exact connector
            # subtree tree/fingerprint below is the reproducibility boundary,
            # so unrelated repository commits must not force a Composer rebuild.
            connector_input.pop("destination_commit", None)
    if comparable_actual != comparable_recorded:
        raise RuntimeError("prepared runtime manifest/input fingerprints are stale")
    return actual


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare or offline-verify the composed GnuBoard5 PHP runtime")
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--root", default=str(ROOT), help=argparse.SUPPRESS)
    parser.add_argument("--composer-bin", default="composer", help=argparse.SUPPRESS)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    try:
        payload = verify(root) if args.verify_only else prepare(root, args.composer_bin)
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    except (OSError, KeyError, TypeError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"composed runtime {'verification' if args.verify_only else 'prepare'} failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
