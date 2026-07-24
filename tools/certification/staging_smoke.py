#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
import ssl
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def load_json(path: Path) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"staging input is missing or unsafe: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"staging JSON root must be an object: {path}")
    return payload


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def https_json(base_url: str, path: str) -> dict[str, Any]:
    base = urlsplit(base_url)
    if (
        base.scheme != "https"
        or not base.hostname
        or base.username
        or base.password
        or base.query
        or base.fragment
    ):
        raise RuntimeError("staging base_url must be a credential-free HTTPS origin")
    connection = http.client.HTTPSConnection(
        base.hostname,
        base.port or 443,
        timeout=15,
        context=ssl.create_default_context(),
    )
    try:
        connection.request(
            "GET",
            path,
            headers={"accept": "application/json", "user-agent": "g5-fleet-certification/1"},
        )
        response = connection.getresponse()
        body = response.read()
    finally:
        connection.close()
    if response.status != 200:
        raise RuntimeError(f"staging {path} returned HTTP {response.status}")
    payload = json.loads(body)
    if not isinstance(payload, dict):
        raise RuntimeError(f"staging {path} response must be an object")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".cache/evidence/staging.json",
    )
    args = parser.parse_args()
    config = load_json(args.config)
    if config.get("schema") != "g5-fleet.staging-input/v1":
        raise RuntimeError("staging input schema mismatch")
    provider_id = config.get("provider_id")
    if not isinstance(provider_id, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{3,200}", provider_id):
        raise RuntimeError("staging provider_id is invalid")
    revision = subprocess.run(
        ("git", "rev-parse", "HEAD"),
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout.strip()
    release = load_json(ROOT / ".cache/evidence/package-release.json")
    if release.get("revision") != revision:
        raise RuntimeError("staging package release evidence is stale")

    deployment_path = Path(str(config.get("deployment_receipt", "")))
    rollback_path = Path(str(config.get("rollback_receipt", "")))
    if not deployment_path.is_absolute() or not rollback_path.is_absolute():
        raise RuntimeError("staging receipt paths must be absolute")
    deployment = load_json(deployment_path)
    rollback = load_json(rollback_path)
    if (
        deployment.get("schema") != "g5-fleet.staging-deployment/v1"
        or deployment.get("status") != "passed"
        or deployment.get("provider_id") != provider_id
        or deployment.get("revision") != revision
        or deployment.get("image_id") != release.get("image_id")
        or deployment.get("version") != release.get("version")
    ):
        raise RuntimeError("staging deployment receipt identity mismatch")
    if (
        rollback.get("schema") != "g5-fleet.staging-rollback/v1"
        or rollback.get("status") != "passed"
        or rollback.get("provider_id") != provider_id
        or rollback.get("restored_revision") != revision
        or rollback.get("restored_version") != release.get("version")
        or rollback.get("backup_restore_readback") is not True
        or not re.fullmatch(r"[0-9a-f]{64}", str(rollback.get("snapshot_sha256", "")))
    ):
        raise RuntimeError("staging rollback receipt mismatch")

    base_url = str(config.get("base_url", "")).rstrip("/")
    ready = https_json(base_url, "/readyz")
    meta = https_json(base_url, "/api/v1/meta")
    if (
        ready.get("status") != "ready"
        or meta.get("build_revision") != revision
        or meta.get("image_version") != release.get("version")
    ):
        raise RuntimeError("staging runtime revision/version/readiness mismatch")

    payload = {
        "schema": "g5-fleet.staging/v1",
        "status": "passed",
        "revision": revision,
        "openapi_sha256": release.get("canonical_openapi_sha256"),
        "provider": {
            "id": provider_id,
            "base_url": base_url,
        },
        "deployment": {
            "status": "passed",
            "image_id": release["image_id"],
            "version": release["version"],
            "receipt_sha256": sha256(deployment_path),
        },
        "smoke": {
            "status": "passed",
            "ready": ready,
            "meta": meta,
        },
        "rollback": {
            "status": "passed",
            "snapshot_sha256": rollback["snapshot_sha256"],
            "backup_restore_readback": True,
            "receipt_sha256": sha256(rollback_path),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(f".{args.output.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, args.output)
    print(f"STAGING_PASS evidence={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
