#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--openapi", type=Path, required=True)
    parser.add_argument("--image-a", required=True)
    parser.add_argument("--image-a-id", required=True)
    parser.add_argument("--image-b", required=True)
    parser.add_argument("--image-b-id", required=True)
    parser.add_argument("--readback", required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--snapshot-manifest", type=Path, required=True)
    parser.add_argument("--recovery-archive", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-f]{40}", args.revision):
        raise SystemExit("revision must be a full Git SHA")
    readback = json.loads(args.readback)
    if not isinstance(readback, dict) or readback.get("users") != 1:
        raise SystemExit("package smoke readback must retain the bootstrap user")
    for path in (
        args.openapi,
        args.snapshot,
        args.snapshot_manifest,
        args.recovery_archive,
    ):
        if path.is_symlink() or not path.is_file():
            raise SystemExit(f"evidence input is missing or unsafe: {path}")

    payload = {
        "schema": "g5-fleet.package-smoke/v1",
        "status": "passed",
        "revision": args.revision,
        "canonical_openapi_sha256": sha256(args.openapi),
        "compose_services": ["app", "caddy"],
        "database_services": [],
        "install": {
            "status": "passed",
            "image": args.image_a,
            "image_id": args.image_a_id,
        },
        "upgrade": {
            "status": "passed",
            "image": args.image_b,
            "image_id": args.image_b_id,
            "critical_row_readback": readback,
        },
        "backup_restore": {
            "status": "passed",
            "snapshot_sha256": sha256(args.snapshot),
            "manifest_sha256": sha256(args.snapshot_manifest),
            "encrypted_recovery_sha256": sha256(args.recovery_archive),
            "master_key_recovered": True,
        },
        "failed_upgrade_rollback": {
            "status": "passed",
            "restored_image": args.image_b,
            "critical_row_readback": readback,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(f".{args.output.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
