#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CONNECTOR = ROOT / "connectors/gnuboard5-php"
SOURCE_FILES = (
    ".env.example",
    "LICENSE",
    "NOTICE",
    "README.md",
    "SECURITY.md",
    "composer.json",
    "composer.lock",
)
SOURCE_DIRECTORIES = ("api", "resources")
UNSAFE_MODE_BITS = stat.S_IWGRP | stat.S_IWOTH | stat.S_ISUID | stat.S_ISGID


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(*args: str, cwd: Path) -> str:
    completed = subprocess.run(
        args,
        cwd=cwd,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(f"command failed ({' '.join(args)}): {detail}")
    return completed.stdout.strip()


def validate_source(path: Path, base: Path) -> None:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"connector source is missing or unsafe: {path}")
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(base.resolve(strict=True)):
        raise RuntimeError(f"connector source escaped package root: {path}")
    if stat.S_IMODE(path.stat().st_mode) & UNSAFE_MODE_BITS:
        raise RuntimeError(f"connector source has unsafe permissions: {path}")


def copy_sources(destination: Path) -> None:
    for relative in SOURCE_FILES:
        source = CONNECTOR / relative
        validate_source(source, CONNECTOR)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target, follow_symlinks=False)
        target.chmod(0o644)
    for relative in SOURCE_DIRECTORIES:
        source_root = CONNECTOR / relative
        if source_root.is_symlink() or not source_root.is_dir():
            raise RuntimeError(f"connector source directory is missing or unsafe: {relative}")
        for source in sorted(source_root.rglob("*")):
            if source.is_dir():
                if source.is_symlink():
                    raise RuntimeError(f"connector source symlink is forbidden: {source}")
                continue
            validate_source(source, CONNECTOR)
            target = destination / source.relative_to(CONNECTOR)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target, follow_symlinks=False)
            target.chmod(0o644)


def production_packages(lock: dict[str, Any]) -> list[dict[str, Any]]:
    rows = lock.get("packages")
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("composer.lock production package inventory is missing")
    packages: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise RuntimeError("composer.lock contains an invalid production package")
        name = row.get("name")
        version = row.get("version")
        if not isinstance(name, str) or not name or not isinstance(version, str) or not version:
            raise RuntimeError("composer.lock production package identity is invalid")
        if row.get("type") == "composer-plugin":
            raise RuntimeError("Composer plugins are forbidden in the connector release")
        packages.append(row)
    return packages


def write_sbom(path: Path, version: str, packages: list[dict[str, Any]]) -> None:
    components = []
    for row in sorted(packages, key=lambda item: str(item["name"])):
        licenses = row.get("license")
        component: dict[str, Any] = {
            "type": "library",
            "name": row["name"],
            "version": row["version"],
            "purl": f"pkg:composer/{row['name']}@{row['version']}",
        }
        if isinstance(licenses, list):
            component["licenses"] = [
                {"license": {"id": license_id}}
                for license_id in licenses
                if isinstance(license_id, str) and license_id
            ]
        components.append(component)
    payload = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid.UUID(bytes=hashlib.sha256(version.encode()).digest()[:16])}",
        "version": 1,
        "metadata": {
            "component": {
                "type": "application",
                "name": "gnuboard5-fleet-connector",
                "version": version,
            }
        },
        "components": components,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def package_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise RuntimeError(f"package symlink is forbidden: {path}")
        if path.is_file():
            validate_source(path, root)
            files.append(path)
    return files


def write_package_manifest(
    root: Path,
    version: str,
    revision: str,
    packages: list[dict[str, Any]],
) -> Path:
    files = package_files(root)
    payload = {
        "schema": "g5-fleet.php-connector-package/v1",
        "version": version,
        "revision": revision,
        "canonical_openapi_sha256": sha256(root / "api/docs/openapi.yaml"),
        "production_dependencies": len(packages),
        "files": [
            {
                "path": path.relative_to(root).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in files
        ],
    }
    manifest = root / "PACKAGE-MANIFEST.json"
    manifest.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def write_deterministic_tar(root: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.{os.getpid()}.tmp")
    if temporary.exists() or temporary.is_symlink():
        raise RuntimeError(f"unexpected package temporary exists: {temporary}")
    try:
        with temporary.open("xb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
                    for path in package_files(root):
                        relative = path.relative_to(root).as_posix()
                        info = archive.gettarinfo(str(path), arcname=relative)
                        info.uid = 0
                        info.gid = 0
                        info.uname = "root"
                        info.gname = "root"
                        info.mtime = 0
                        info.mode = 0o644
                        with path.open("rb") as handle:
                            archive.addfile(info, handle)
            raw.flush()
            os.fsync(raw.fileno())
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()


def build(version: str, output_dir: Path, composer: str) -> dict[str, Any]:
    if not re.fullmatch(r"[0-9A-Za-z._-]{1,64}", version):
        raise RuntimeError("invalid connector package version")
    revision = run("git", "rev-parse", "HEAD", cwd=ROOT)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError("release revision must be a full Git SHA")
    if run("git", "status", "--porcelain", "--untracked-files=no", cwd=ROOT):
        raise RuntimeError("tracked repository files must be clean before packaging")
    run("python3", "tools/runtime/compose_gnuboard.py", "--verify-only", cwd=ROOT)

    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    archive = output_dir / f"gnuboard5-fleet-connector-{version}.tar.gz"
    sbom = output_dir / f"gnuboard5-fleet-connector-{version}.cdx.json"
    with tempfile.TemporaryDirectory(prefix="g5-fleet-connector-") as temporary:
        package_root = Path(temporary) / "package"
        package_root.mkdir()
        copy_sources(package_root)
        lock = json.loads((package_root / "composer.lock").read_text(encoding="utf-8"))
        packages = production_packages(lock)
        build_metadata = package_root / "build/runtime/runtime.json"
        build_metadata.parent.mkdir(parents=True)
        build_metadata.write_text(
            json.dumps(
                {
                    "schema": "g5-fleet.connector-runtime/v1",
                    "mode": "prod",
                    "version": version,
                    "revision": revision,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        run(
            composer,
            "install",
            "--no-dev",
            "--no-interaction",
            "--no-progress",
            "--prefer-dist",
            "--optimize-autoloader",
            "--no-scripts",
            "--no-plugins",
            cwd=package_root,
        )
        installed = json.loads(
            (package_root / "vendor/composer/installed.json").read_text(encoding="utf-8")
        )
        installed_rows = installed.get("packages") if isinstance(installed, dict) else installed
        installed_names = {
            row.get("name")
            for row in installed_rows
            if isinstance(row, dict) and isinstance(row.get("name"), str)
        }
        expected_names = {str(row["name"]) for row in packages}
        if installed_names != expected_names:
            raise RuntimeError(
                "connector production dependency readback mismatch: "
                f"missing={sorted(expected_names - installed_names)} "
                f"extra={sorted(installed_names - expected_names)}"
            )
        write_sbom(package_root / "SBOM.cdx.json", version, packages)
        write_package_manifest(package_root, version, revision, packages)
        write_deterministic_tar(package_root, archive)
        shutil.copyfile(package_root / "SBOM.cdx.json", sbom)
        sbom.chmod(0o644)

    payload = {
        "schema": "g5-fleet.php-connector-artifacts/v1",
        "version": version,
        "revision": revision,
        "archive": {
            "path": str(archive),
            "sha256": sha256(archive),
            "bytes": archive.stat().st_size,
        },
        "sbom": {
            "path": str(sbom),
            "sha256": sha256(sbom),
            "bytes": sbom.stat().st_size,
        },
    }
    print(json.dumps(payload, ensure_ascii=False))
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the deterministic G5 Fleet PHP connector")
    parser.add_argument("--version", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--composer", default="composer")
    args = parser.parse_args()
    try:
        build(args.version, args.output_dir, args.composer)
        return 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"connector package failed: {error}", file=os.sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
