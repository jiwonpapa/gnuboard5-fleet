#!/usr/bin/env python3
"""Prepare and verify the Rust/Tauri consumer dependency cache.

Preparation is the only mode allowed to resolve dependencies. Verification is
strictly offline and binds the prepared state to the current clean Git commit,
the JavaScript/Rust/Python dependency inputs, exact tool and venv versions, and
the local executables required by the audit pipeline.
"""

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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

ROOT = Path(__file__).resolve().parents[2]
DESKTOP_RELATIVE = Path("products/admin-desktop")
WEB_RELATIVE = DESKTOP_RELATIVE / "g5-admin"
CARGO_MANIFEST_RELATIVE = DESKTOP_RELATIVE / "Cargo.toml"
PACKAGE_JSON_RELATIVE = WEB_RELATIVE / "package.json"
BUN_LOCK_RELATIVE = WEB_RELATIVE / "bun.lock"
CARGO_LOCK_RELATIVE = DESKTOP_RELATIVE / "Cargo.lock"
PYTHON_REQUIREMENTS_RELATIVE = DESKTOP_RELATIVE / "scripts/requirements-audit.txt"
MANIFEST_RELATIVE = Path(".cache/runtime/admin-desktop-consumers.manifest.json")
PYTHON_VENV_RELATIVE = Path(".cache/runtime/python-audit")
REQUIRED_LOCAL_BINS = ("tsc", "eslint", "vitest")
SCHEMA_VERSION = 1
MANIFEST_KIND = "g5-fleet-admin-desktop-consumers"
PINNED_REQUIREMENT = re.compile(
    r"^(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)=="
    r"(?P<version>[A-Za-z0-9][A-Za-z0-9.!+_-]*)$"
)
SYSTEM_PYTHON_PROBE = (
    "import json,platform,sys;"
    "print(json.dumps({'version':sys.version.split()[0],"
    "'executable':sys.executable,'implementation':platform.python_implementation()},"
    "sort_keys=True))"
)
VENV_PYTHON_PROBE = (
    "import importlib.metadata,json,pathlib,sys,yaml;"
    "print(json.dumps({'version':sys.version.split()[0],"
    "'executable':sys.executable,'prefix':sys.prefix,'base_prefix':sys.base_prefix,"
    "'pyyaml_metadata_version':importlib.metadata.version('PyYAML'),"
    "'yaml_version':yaml.__version__,'yaml_file':str(pathlib.Path(yaml.__file__).resolve())},"
    "sort_keys=True))"
)


def load_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot read valid JSON: {path}") from error
    if not isinstance(payload, dict):
        raise RuntimeError(f"JSON root must be an object: {path}")
    return payload


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(
    *args: str,
    cwd: Path,
    timeout_seconds: int = 1800,
    environment: Mapping[str, str] | None = None,
) -> str:
    command_environment = os.environ.copy()
    if environment:
        command_environment.update(environment)
    try:
        completed = subprocess.run(
            args,
            cwd=cwd,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
            env=command_environment,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(f"command could not run ({' '.join(args)}): {error}") from error
    if completed.returncode != 0:
        detail = "\n".join(
            part for part in (completed.stdout.strip(), completed.stderr.strip()) if part
        )
        raise RuntimeError(f"command failed ({' '.join(args)}): {detail}")
    return completed.stdout.strip()


def repository_head(root: Path) -> str:
    head = run("git", "rev-parse", "--verify", "HEAD^{commit}", cwd=root)
    if not head or len(head) != 40:
        raise RuntimeError(f"invalid Git HEAD: {head!r}")
    return head


def require_clean_repository(root: Path) -> None:
    status = run(
        "git",
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        cwd=root,
    )
    if status:
        preview = "\n".join(status.splitlines()[:20])
        raise RuntimeError(f"repository must be clean before dependency preparation:\n{preview}")


def safe_file(root: Path, relative: Path) -> Path:
    lexical_root = root.absolute()
    candidate = lexical_root / relative
    cursor = lexical_root
    if lexical_root.is_symlink():
        raise RuntimeError(f"repository root symlink is forbidden: {lexical_root}")
    for part in relative.parts:
        if part in {"", ".", ".."}:
            raise RuntimeError(f"unsafe repository-relative path: {relative}")
        cursor /= part
        if cursor.is_symlink():
            raise RuntimeError(f"source symlink is forbidden: {relative}")
    try:
        resolved_root = lexical_root.resolve(strict=True)
        resolved = candidate.resolve(strict=True)
    except OSError as error:
        raise RuntimeError(f"required dependency input is missing: {relative}") from error
    if not resolved.is_relative_to(resolved_root) or not resolved.is_file():
        raise RuntimeError(f"dependency input escaped or is not a regular file: {relative}")
    return resolved


def ensure_safe_cache_parent(root: Path, manifest: Path) -> None:
    lexical_root = root.absolute()
    lexical_parent = manifest.parent.absolute()
    try:
        relative = lexical_parent.relative_to(lexical_root)
    except ValueError as error:
        raise RuntimeError(f"cache manifest escaped repository root: {manifest}") from error
    cursor = lexical_root
    if cursor.is_symlink():
        raise RuntimeError(f"repository root symlink is forbidden: {cursor}")
    for part in relative.parts:
        cursor /= part
        if cursor.is_symlink():
            raise RuntimeError(f"cache path symlink is forbidden: {cursor}")
        if cursor.exists() and not cursor.is_dir():
            raise RuntimeError(f"cache path component is not a directory: {cursor}")


def input_inventory(root: Path) -> dict[str, dict[str, str]]:
    rows = (
        ("package_json", PACKAGE_JSON_RELATIVE),
        ("bun_lock", BUN_LOCK_RELATIVE),
        ("cargo_lock", CARGO_LOCK_RELATIVE),
        ("python_audit_requirements", PYTHON_REQUIREMENTS_RELATIVE),
    )
    return {
        key: {"path": relative.as_posix(), "sha256": sha256_file(safe_file(root, relative))}
        for key, relative in rows
    }


def tool_version(executable: str, root: Path) -> str:
    value = run(executable, "--version", cwd=root, timeout_seconds=30)
    if not value or "\n" in value:
        raise RuntimeError(f"invalid tool version from {executable!r}: {value!r}")
    return value


def parse_single_line_json(value: str, label: str) -> dict[str, Any]:
    if not value or "\n" in value:
        raise RuntimeError(f"invalid {label} probe output: {value!r}")
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"invalid {label} probe JSON") from error
    if not isinstance(payload, dict):
        raise RuntimeError(f"invalid {label} probe payload")
    return payload


def system_python_inventory(root: Path, python: str) -> dict[str, str]:
    payload = parse_single_line_json(
        run(python, "-c", SYSTEM_PYTHON_PROBE, cwd=root, timeout_seconds=30),
        "system Python",
    )
    version = payload.get("version")
    executable = payload.get("executable")
    implementation = payload.get("implementation")
    if not all(isinstance(value, str) and value for value in (version, executable, implementation)):
        raise RuntimeError("system Python probe has missing identity fields")
    executable_path = Path(executable)
    try:
        resolved = executable_path.resolve(strict=True)
    except OSError as error:
        raise RuntimeError("system Python executable is missing") from error
    if not resolved.is_file() or not os.access(resolved, os.X_OK):
        raise RuntimeError("system Python executable is not a usable regular file")
    return {
        "command": python,
        "version": version,
        "executable": str(resolved),
        "implementation": implementation,
    }


def tool_inventory(
    root: Path,
    bun: str,
    cargo: str,
    python: str,
) -> dict[str, dict[str, str]]:
    return {
        "bun": {"command": bun, "version": tool_version(bun, root)},
        "cargo": {"command": cargo, "version": tool_version(cargo, root)},
        "python": system_python_inventory(root, python),
    }


def declared_bun_version(root: Path) -> str:
    package = load_json(safe_file(root, PACKAGE_JSON_RELATIVE))
    package_manager = package.get("packageManager")
    if not isinstance(package_manager, str) or not package_manager.startswith("bun@"):
        raise RuntimeError("package.json packageManager must pin an exact bun@ version")
    version = package_manager.removeprefix("bun@")
    if not version or any(character.isspace() for character in version):
        raise RuntimeError("package.json packageManager has an invalid Bun version")
    return version


def require_declared_bun(root: Path, tools: dict[str, dict[str, str]]) -> None:
    declared = declared_bun_version(root)
    actual = tools["bun"]["version"]
    if actual != declared:
        raise RuntimeError(f"Bun version mismatch: package.json={declared} executable={actual}")


def pinned_python_requirements(root: Path) -> dict[str, str]:
    path = safe_file(root, PYTHON_REQUIREMENTS_RELATIVE)
    requirements: dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = PINNED_REQUIREMENT.fullmatch(line)
        if not match:
            raise RuntimeError(
                "Python audit requirements must use exact name==version pins "
                f"({PYTHON_REQUIREMENTS_RELATIVE}:{line_number})"
            )
        normalized = re.sub(r"[-_.]+", "-", match.group("name")).lower()
        if normalized in requirements:
            raise RuntimeError(f"duplicate Python audit requirement: {match.group('name')}")
        requirements[normalized] = match.group("version")
    if not requirements:
        raise RuntimeError("Python audit requirements are empty")
    if "pyyaml" not in requirements:
        raise RuntimeError("Python audit requirements must pin PyYAML exactly")
    return requirements


def python_venv_path(root: Path) -> Path:
    venv = root / PYTHON_VENV_RELATIVE
    # Check every cache component including the venv directory itself.
    ensure_safe_cache_parent(root, venv / ".identity")
    if venv.is_symlink():
        raise RuntimeError(f"Python audit venv symlink is forbidden: {venv}")
    return venv


def reset_python_venv(root: Path) -> Path:
    venv = python_venv_path(root)
    if venv.exists():
        if not venv.is_dir():
            raise RuntimeError(f"Python audit venv path is not a directory: {venv}")
        shutil.rmtree(venv)
    return venv


def venv_python_executable(root: Path) -> Path:
    venv = python_venv_path(root)
    if not venv.is_dir() or venv.is_symlink():
        raise RuntimeError("Python audit venv is missing or unsafe")
    candidates = (
        venv / "Scripts/python.exe",
        venv / "bin/python",
        venv / "bin/python3",
    )
    selected = next((path for path in candidates if path.exists()), None)
    if selected is None:
        raise RuntimeError("Python audit venv executable is missing")
    try:
        resolved = selected.resolve(strict=True)
    except OSError as error:
        raise RuntimeError("Python audit venv executable is broken") from error
    if not resolved.is_file() or not os.access(resolved, os.X_OK):
        raise RuntimeError("Python audit venv executable is not usable")
    return selected


def python_venv_inventory(root: Path, expected_pyyaml: str) -> dict[str, str]:
    venv = python_venv_path(root)
    executable = venv_python_executable(root)
    payload = parse_single_line_json(
        run(str(executable), "-c", VENV_PYTHON_PROBE, cwd=root, timeout_seconds=30),
        "Python audit venv",
    )
    required_fields = (
        "version",
        "executable",
        "prefix",
        "base_prefix",
        "pyyaml_metadata_version",
        "yaml_version",
        "yaml_file",
    )
    if not all(isinstance(payload.get(key), str) and payload[key] for key in required_fields):
        raise RuntimeError("Python audit venv probe has missing identity fields")

    resolved_venv = venv.resolve(strict=True)
    try:
        probed_executable = Path(payload["executable"]).resolve(strict=True)
        probed_prefix = Path(payload["prefix"]).resolve(strict=True)
        yaml_file = Path(payload["yaml_file"]).resolve(strict=True)
    except OSError as error:
        raise RuntimeError("Python audit venv probe returned a missing path") from error
    if probed_executable != executable.resolve(strict=True):
        raise RuntimeError("Python audit venv executed an unexpected interpreter")
    if probed_prefix != resolved_venv or Path(payload["base_prefix"]).resolve() == resolved_venv:
        raise RuntimeError("Python audit interpreter is not isolated in the expected venv")
    if not yaml_file.is_relative_to(resolved_venv) or not yaml_file.is_file():
        raise RuntimeError("PyYAML import escaped the Python audit venv")
    if payload["pyyaml_metadata_version"] != expected_pyyaml:
        raise RuntimeError(
            "PyYAML installed version mismatch: "
            f"expected={expected_pyyaml} actual={payload['pyyaml_metadata_version']}"
        )
    if payload["yaml_version"] != expected_pyyaml:
        raise RuntimeError(
            "PyYAML import version mismatch: "
            f"expected={expected_pyyaml} actual={payload['yaml_version']}"
        )
    mode = stat.S_IMODE(executable.resolve(strict=True).stat().st_mode)
    return {
        "path": PYTHON_VENV_RELATIVE.as_posix(),
        "python_path": executable.relative_to(root).as_posix(),
        "python_resolved_path": str(executable.resolve(strict=True)),
        "python_version": payload["version"],
        "python_sha256": sha256_file(executable.resolve(strict=True)),
        "python_mode": f"{mode:04o}",
        "pyyaml_version": expected_pyyaml,
        "yaml_path": yaml_file.relative_to(root).as_posix(),
        "yaml_sha256": sha256_file(yaml_file),
    }


def prepare_python_audit(root: Path, python: str) -> dict[str, str]:
    requirements = pinned_python_requirements(root)
    reset_python_venv(root)
    run(
        python,
        "-m",
        "venv",
        PYTHON_VENV_RELATIVE.as_posix(),
        cwd=root,
    )
    # Revalidate after invoking the interpreter: it must have created the exact
    # cache-local non-symlink venv requested above.
    python_venv_path(root)
    executable = venv_python_executable(root)
    run(
        str(executable),
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--no-deps",
        "--requirement",
        str(safe_file(root, PYTHON_REQUIREMENTS_RELATIVE)),
        cwd=root,
    )
    return python_venv_inventory(root, requirements["pyyaml"])


def local_bin_candidates(bin_root: Path, name: str) -> tuple[Path, ...]:
    suffixes = ("", ".exe", ".cmd", ".ps1") if os.name == "nt" else ("",)
    return tuple(bin_root / f"{name}{suffix}" for suffix in suffixes)


def local_bin_inventory(root: Path) -> dict[str, dict[str, str]]:
    node_modules = root / WEB_RELATIVE / "node_modules"
    if not node_modules.is_dir() or node_modules.is_symlink():
        raise RuntimeError("prepared node_modules is missing or unsafe")
    resolved_modules = node_modules.resolve(strict=True)
    bin_root = node_modules / ".bin"
    if not bin_root.is_dir() or bin_root.is_symlink():
        raise RuntimeError("prepared node_modules/.bin is missing or unsafe")

    inventory: dict[str, dict[str, str]] = {}
    for name in REQUIRED_LOCAL_BINS:
        selected = next((path for path in local_bin_candidates(bin_root, name) if path.exists()), None)
        if selected is None:
            raise RuntimeError(f"required local JavaScript binary is missing: {name}")
        try:
            resolved = selected.resolve(strict=True)
        except OSError as error:
            raise RuntimeError(f"required local JavaScript binary is broken: {name}") from error
        if not resolved.is_relative_to(resolved_modules) or not resolved.is_file():
            raise RuntimeError(f"required local JavaScript binary escaped node_modules: {name}")
        if os.name != "nt" and not os.access(resolved, os.X_OK):
            raise RuntimeError(f"required local JavaScript binary is not executable: {name}")
        mode = stat.S_IMODE(resolved.stat().st_mode)
        inventory[name] = {
            "path": selected.relative_to(root).as_posix(),
            "resolved_path": resolved.relative_to(root).as_posix(),
            "sha256": sha256_file(resolved),
            "mode": f"{mode:04o}",
        }
    return inventory


def invalidate_manifest(root: Path) -> Path:
    manifest = root / MANIFEST_RELATIVE
    ensure_safe_cache_parent(root, manifest)
    if manifest.is_symlink():
        raise RuntimeError(f"cache manifest symlink is forbidden: {manifest}")
    if manifest.exists():
        if not manifest.is_file():
            raise RuntimeError(f"cache manifest is not a regular file: {manifest}")
        manifest.unlink()
    return manifest


def write_manifest(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        temporary.chmod(0o600)
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def prepare(
    root: Path,
    bun: str = "bun",
    cargo: str = "cargo",
    python: str = sys.executable,
) -> dict[str, Any]:
    root = root.resolve(strict=True)
    # Invalidate previous proof before any validation or dependency mutation,
    # and reject an attacker-controlled cache path before invoking tools.
    manifest_path = invalidate_manifest(root)
    python_venv_path(root)
    require_clean_repository(root)
    head = repository_head(root)
    before = input_inventory(root)
    tools = tool_inventory(root, bun, cargo, python)
    require_declared_bun(root, tools)
    pinned_python_requirements(root)

    run(
        bun,
        "install",
        "--frozen-lockfile",
        "--ignore-scripts",
        cwd=root / WEB_RELATIVE,
    )
    run(
        cargo,
        "fetch",
        "--locked",
        "--manifest-path",
        "Cargo.toml",
        cwd=root / DESKTOP_RELATIVE,
    )
    python_audit = prepare_python_audit(root, python)

    after = input_inventory(root)
    if after != before:
        raise RuntimeError("dependency preparation changed a package or lock input")
    require_clean_repository(root)
    bins = local_bin_inventory(root)
    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "kind": MANIFEST_KIND,
        "status": "prepared",
        "prepared_at": datetime.now(timezone.utc).isoformat(),
        "repository": {"head": head},
        "inputs": after,
        "tools": tools,
        "local_bins": bins,
        "python_audit": python_audit,
        "commands": {
            "bun_install": [
                "bun",
                "install",
                "--frozen-lockfile",
                "--ignore-scripts",
            ],
            "cargo_fetch": [
                "cargo",
                "fetch",
                "--locked",
                "--manifest-path",
                "Cargo.toml",
            ],
            "cargo_verify": [
                "cargo",
                "metadata",
                "--locked",
                "--offline",
                "--format-version",
                "1",
                "--manifest-path",
                "Cargo.toml",
            ],
            "python_venv": [
                "python",
                "-m",
                "venv",
                PYTHON_VENV_RELATIVE.as_posix(),
            ],
            "python_install": [
                "venv-python",
                "-m",
                "pip",
                "install",
                "--disable-pip-version-check",
                "--no-deps",
                "--requirement",
                PYTHON_REQUIREMENTS_RELATIVE.as_posix(),
            ],
        },
    }
    write_manifest(manifest_path, payload)
    return payload


def verify(
    root: Path,
    bun: str = "bun",
    cargo: str = "cargo",
    python: str = sys.executable,
) -> dict[str, Any]:
    root = root.resolve(strict=True)
    manifest_path = root / MANIFEST_RELATIVE
    ensure_safe_cache_parent(root, manifest_path)
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise RuntimeError("consumer dependency manifest is missing or unsafe; run prepare first")
    require_clean_repository(root)
    manifest = load_json(manifest_path)
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise RuntimeError("consumer dependency manifest schema version mismatch")
    if manifest.get("kind") != MANIFEST_KIND or manifest.get("status") != "prepared":
        raise RuntimeError("consumer dependency manifest identity/status is invalid")

    head = repository_head(root)
    repository = manifest.get("repository")
    if not isinstance(repository, dict) or repository.get("head") != head:
        raise RuntimeError("consumer dependency manifest is stale for the current Git HEAD")

    inputs = input_inventory(root)
    if manifest.get("inputs") != inputs:
        raise RuntimeError("consumer dependency package/lock input drift detected")

    tools = tool_inventory(root, bun, cargo, python)
    require_declared_bun(root, tools)
    if manifest.get("tools") != tools:
        raise RuntimeError("consumer dependency tool version drift detected")

    bins = local_bin_inventory(root)
    if manifest.get("local_bins") != bins:
        raise RuntimeError("consumer dependency local binary drift detected")

    requirements = pinned_python_requirements(root)
    python_audit = python_venv_inventory(root, requirements["pyyaml"])
    if manifest.get("python_audit") != python_audit:
        raise RuntimeError("Python audit venv drift detected")

    run(
        cargo,
        "metadata",
        "--locked",
        "--offline",
        "--format-version",
        "1",
        "--manifest-path",
        "Cargo.toml",
        cwd=root / DESKTOP_RELATIVE,
        environment={"CARGO_NET_OFFLINE": "true"},
    )
    return {
        "status": "verified",
        "head": head,
        "manifest": MANIFEST_RELATIVE.as_posix(),
        "inputs": inputs,
        "tools": tools,
        "local_bins": bins,
        "python_audit": python_audit,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "verify"))
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--bun", default="bun")
    parser.add_argument("--cargo", default="cargo")
    parser.add_argument("--python", default=sys.executable)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = (
            prepare(args.root, args.bun, args.cargo, args.python)
            if args.mode == "prepare"
            else verify(args.root, args.bun, args.cargo, args.python)
        )
    except RuntimeError as error:
        print(f"consumer dependencies: FAIL: {error}", file=sys.stderr)
        return 1
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
