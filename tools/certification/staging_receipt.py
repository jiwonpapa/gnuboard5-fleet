#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
VERSION_PATTERN = re.compile(r"[0-9A-Za-z._-]{1,64}")
PROVIDER_PATTERN = re.compile(r"[A-Za-z0-9._:-]{3,200}")
REVISION_PATTERN = re.compile(r"[0-9a-f]{40}")
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
PLATFORM_PATTERN = re.compile(r"linux/(amd64|arm64)")


def load_json(path: Path) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"receipt input is missing or unsafe: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"receipt JSON root must be an object: {path}")
    return payload


def parse_json(value: str, label: str) -> dict[str, Any]:
    payload = json.loads(value)
    if not isinstance(payload, dict):
        raise RuntimeError(f"{label} must be a JSON object")
    return payload


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_provider(provider_id: str) -> None:
    if not PROVIDER_PATTERN.fullmatch(provider_id):
        raise RuntimeError("staging provider_id is invalid")


def validate_release(release: dict[str, Any]) -> None:
    if (
        release.get("schema") != "g5-fleet.package-release/v1"
        or release.get("status") != "passed"
        or not VERSION_PATTERN.fullmatch(str(release.get("version", "")))
        or not REVISION_PATTERN.fullmatch(str(release.get("revision", "")))
        or not str(release.get("image_id", "")).startswith("sha256:")
        or not PLATFORM_PATTERN.fullmatch(str(release.get("platform", "")))
    ):
        raise RuntimeError("staging release evidence is invalid")


def deployment_receipt(
    provider_id: str,
    release: dict[str, Any],
    version_readback: dict[str, Any],
    runtime_image_id: str,
    runtime_platform: str,
) -> dict[str, Any]:
    validate_provider(provider_id)
    validate_release(release)
    if (
        version_readback.get("schema") != "g5-fleet.version/v1"
        or version_readback.get("image_version") != release["version"]
        or version_readback.get("build_revision") != release["revision"]
        or runtime_image_id != release["image_id"]
        or runtime_platform != release["platform"]
    ):
        raise RuntimeError(
            "staging deployment image/platform/version/revision readback mismatch"
        )
    return {
        "schema": "g5-fleet.staging-deployment/v1",
        "status": "passed",
        "provider_id": provider_id,
        "revision": release["revision"],
        "image_id": release["image_id"],
        "platform": release["platform"],
        "version": release["version"],
        "runtime_readback": version_readback,
    }


def rollback_receipt(
    provider_id: str,
    release: dict[str, Any],
    snapshot: Path,
    manifest: dict[str, Any],
    restored_readback: dict[str, Any],
    failed_version: str,
) -> dict[str, Any]:
    validate_provider(provider_id)
    validate_release(release)
    if not VERSION_PATTERN.fullmatch(failed_version) or failed_version == release["version"]:
        raise RuntimeError("failed staging version is invalid")
    if snapshot.is_symlink() or not snapshot.is_file():
        raise RuntimeError(f"staging snapshot is missing or unsafe: {snapshot}")
    snapshot_sha256 = sha256(snapshot)
    if (
        manifest.get("schema") != "g5-fleet.backup/v1"
        or manifest.get("method") != "sqlite-vacuum-into"
        or manifest.get("snapshot_sha256") != snapshot_sha256
        or manifest.get("server_version") != release["version"]
        or manifest.get("git_sha") != release["revision"]
        or manifest.get("readback") != restored_readback
        or not SHA256_PATTERN.fullmatch(snapshot_sha256)
    ):
        raise RuntimeError("staging rollback snapshot/readback mismatch")
    return {
        "schema": "g5-fleet.staging-rollback/v1",
        "status": "passed",
        "provider_id": provider_id,
        "failed_version": failed_version,
        "rollback_from_failed_upgrade": True,
        "restored_revision": release["revision"],
        "restored_version": release["version"],
        "snapshot_sha256": snapshot_sha256,
        "backup_restore_readback": True,
        "critical_row_readback": restored_readback,
    }


def write_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.chmod(0o600)
    os.replace(temporary, path)


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    deployment = subparsers.add_parser("deployment")
    deployment.add_argument("--provider-id", required=True)
    deployment.add_argument(
        "--release",
        type=Path,
        default=ROOT / ".cache/evidence/package-release.json",
    )
    deployment.add_argument("--version-readback-json", required=True)
    deployment.add_argument("--runtime-image-id", required=True)
    deployment.add_argument("--runtime-platform", required=True)
    deployment.add_argument("--output", type=Path, required=True)

    rollback = subparsers.add_parser("rollback")
    rollback.add_argument("--provider-id", required=True)
    rollback.add_argument(
        "--release",
        type=Path,
        default=ROOT / ".cache/evidence/package-release.json",
    )
    rollback.add_argument("--snapshot", type=Path, required=True)
    rollback.add_argument("--manifest", type=Path, required=True)
    rollback.add_argument("--restored-readback-json", required=True)
    rollback.add_argument("--failed-version", required=True)
    rollback.add_argument("--output", type=Path, required=True)

    args = parser.parse_args()
    release = load_json(args.release)
    if args.command == "deployment":
        payload = deployment_receipt(
            args.provider_id,
            release,
            parse_json(args.version_readback_json, "version readback"),
            args.runtime_image_id,
            args.runtime_platform,
        )
    else:
        payload = rollback_receipt(
            args.provider_id,
            release,
            args.snapshot,
            load_json(args.manifest),
            parse_json(args.restored_readback_json, "restored readback"),
            args.failed_version,
        )
    write_atomic(args.output, payload)
    print(f"STAGING_{args.command.upper()}_RECEIPT_PASS output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
