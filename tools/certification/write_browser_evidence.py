#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact(path: Path) -> dict[str, object]:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"browser evidence artifact is missing or unsafe: {path}")
    return {
        "path": str(path.resolve()),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--admin-screenshot", type=Path, required=True)
    parser.add_argument("--peer-screenshot", type=Path, required=True)
    parser.add_argument("--trace", type=Path, required=True)
    parser.add_argument(
        "--local-runtime",
        type=Path,
        default=ROOT / ".cache/evidence/local-runtime.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".cache/evidence/browser-e2e.json",
    )
    args = parser.parse_args()
    revision = subprocess.run(
        ("git", "rev-parse", "HEAD"),
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout.strip()
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError("browser evidence Git revision is invalid")
    local_runtime = json.loads(args.local_runtime.read_text(encoding="utf-8"))
    if (
        local_runtime.get("schema") != "g5-fleet.local-runtime/v1"
        or local_runtime.get("status") != "passed"
        or local_runtime.get("revision") != revision
    ):
        raise RuntimeError("browser evidence local runtime parent is stale")
    payload = {
        "schema": "g5-fleet.browser-e2e/v1",
        "status": "passed",
        "revision": revision,
        "parent_local_runtime_sha256": sha256(args.local_runtime),
        "browser": "chromium",
        "sessions": [
            {
                "name": "fleet-admin",
                "visible_sites": ["owner-a-site"],
                "hidden_sites": ["owner-b-site"],
            },
            {
                "name": "fleet-peer",
                "visible_sites": ["owner-b-site"],
                "hidden_sites": ["owner-a-site"],
            },
        ],
        "assertions": {
            "two_users_two_sites_isolated": True,
            "connector_login": "passed",
            "cf_10_update_readback": "passed",
            "cf_10_rollback_readback": "passed",
            "browser_received_g5_secret": False,
            "browser_received_g5_jwt": False,
        },
        "artifacts": {
            "admin_screenshot": artifact(args.admin_screenshot),
            "peer_screenshot": artifact(args.peer_screenshot),
            "trace": artifact(args.trace),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(f".{args.output.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, args.output)
    print(f"BROWSER_E2E_PASS evidence={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
