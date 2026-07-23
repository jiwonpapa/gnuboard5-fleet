#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


def curl_config_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def fetch(url: str, *, headers: dict[str, str] | None = None) -> bytes:
    # macOS curl consumes the system trust store, including a locally trusted
    # staging CA. Sensitive headers are sent through stdin rather than argv.
    config = [
        "silent",
        "show-error",
        "fail",
        "max-time = 20",
        f'url = "{curl_config_value(url)}"',
    ]
    for name, value in (headers or {}).items():
        config.append(f'header = "{curl_config_value(f"{name}: {value}")}"')
    result = subprocess.run(
        ["curl", "--config", "-"],
        input="\n".join(config) + "\n",
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"curl failed for {urlsplit(url).path}: exit={result.returncode}"
        )
    return result.stdout.encode()


def decode_object(payload: bytes, label: str) -> dict[str, Any]:
    value = json.loads(payload)
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object")
    return value


def evaluate_identity(
    *,
    live_base_url: str,
    local_revision: str,
    local_openapi: bytes,
    health: dict[str, Any],
    runtime: dict[str, Any],
    live_openapi: bytes,
    inspect_config: dict[str, Any],
    audit_run_id: str,
) -> dict[str, Any]:
    runtime_revision = str(runtime.get("git_commit") or "").strip()
    config = inspect_config.get("data", inspect_config)
    if not isinstance(config, dict):
        config = {}
    identity_material = json.dumps(
        {
            "base_url": live_base_url.rstrip("/"),
            "cf_admin": config.get("cf_admin"),
            "cf_title": config.get("cf_title"),
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    local_sha = hashlib.sha256(local_openapi).hexdigest()
    live_sha = hashlib.sha256(live_openapi).hexdigest()
    checks = {
        "health_ok": health.get("status") == "ok",
        "g5_independent": health.get("g5_independent") is True,
        "provider_revision_matches": bool(runtime_revision)
        and local_revision.startswith(runtime_revision),
        "openapi_sha_matches": local_sha == live_sha,
        "site_identity_present": bool(config.get("cf_admin"))
        and bool(config.get("cf_title")),
    }
    passed = all(checks.values())
    return {
        "schema": "gnuboard5.rust.live-provider-identity/v1",
        "audit_run_id": audit_run_id,
        "status": "passed" if passed else "failed",
        "certified": passed,
        "checks": checks,
        "provider": {
            "local_revision": local_revision,
            "runtime_revision": runtime_revision,
            "local_openapi_sha256": local_sha,
            "live_openapi_sha256": live_sha,
            "site_identity_sha256": hashlib.sha256(identity_material).hexdigest(),
        },
    }


def write_atomic(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temporary.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporary, path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bind a live G5 provider identity to the local PHP contract input."
    )
    parser.add_argument("--live-base-url", required=True)
    parser.add_argument("--php-root", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--audit-run-id", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    secret = os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "").strip()
    if not secret:
        print("ADMIN_SCHEMA_INSPECT_SECRET is required", file=sys.stderr)
        return 1
    php_root = Path(args.php_root).resolve()
    openapi_path = php_root / "api/docs/openapi.yaml"
    live_base_url = args.live_base_url.rstrip("/")
    parsed = urlsplit(live_base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        print("--live-base-url must be an absolute HTTP(S) URL", file=sys.stderr)
        return 1
    origin = f"{parsed.scheme}://{parsed.netloc}"
    try:
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=php_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        report = evaluate_identity(
            live_base_url=live_base_url,
            local_revision=revision,
            local_openapi=openapi_path.read_bytes(),
            health=decode_object(fetch(f"{live_base_url}/health"), "health"),
            runtime=decode_object(
                fetch(f"{origin}/build/runtime/runtime.json"), "runtime"
            ),
            live_openapi=fetch(f"{origin}/api/docs/openapi.yaml"),
            inspect_config=decode_object(
                fetch(
                    f"{live_base_url}/admin-inspect/config",
                    headers={"X-G5-Admin-Inspect-Secret": secret},
                ),
                "admin inspect config",
            ),
            audit_run_id=args.audit_run_id,
        )
    except (
        OSError,
        ValueError,
        RuntimeError,
        subprocess.CalledProcessError,
        json.JSONDecodeError,
    ) as error:
        print(f"live provider identity check failed: {error}", file=sys.stderr)
        return 1
    write_atomic(Path(args.output_json).resolve(), report)
    if report["status"] != "passed":
        print("FAIL: live provider identity mismatch", file=sys.stderr)
        return 1
    print("PASS: live provider revision, OpenAPI SHA, health, and site identity")
    return 0


if __name__ == "__main__":
    sys.exit(main())
