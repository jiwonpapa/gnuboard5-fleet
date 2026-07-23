#!/usr/bin/env python3
"""Prove site_id, base_url and token remain atomic across concurrent site switches."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TEST_NAME = (
    "app_state::tests::sites::"
    "active_request_context_keeps_site_base_url_and_token_atomic_during_switch"
)


def evaluate_sources(sources: dict[str, str]) -> list[str]:
    failures: list[str] = []
    required = {
        "app_state/active_request_context.rs": (
            "ActiveApiContext",
            "acquire_active_request_context",
            "actual_site_id",
            "actual_base_url",
        ),
        "app_state/site_catalog_service.rs": (
            "active_request_context.write().await",
            "set_base_url",
            "set_active_site_id",
            "ActiveApiContext::from_site",
        ),
        "commands/session.rs": ("acquire_active_request_context", "load_required_session"),
        "commands/auth/session.rs": ("acquire_active_request_context",),
        "commands/auth/health.rs": ("acquire_active_request_context",),
        "app_state/dev_bootstrap_service.rs": ("acquire_active_request_context",),
        "app_state/tests/sites.rs": (TEST_NAME.rsplit("::", 1)[-1], "token-a", "token-b"),
    }
    for name, tokens in required.items():
        source = sources.get(name)
        if source is None:
            failures.append(f"missing source: {name}")
            continue
        for token in tokens:
            if token not in source:
                failures.append(f"{name}: missing atomic-context binding {token}")

    sync_source = sources.get("app_state/site_catalog_service.rs", "")
    lock_at = sync_source.find("active_request_context.write().await")
    base_at = sync_source.find("set_base_url", lock_at + 1)
    site_at = sync_source.find("set_active_site_id", base_at + 1)
    commit_at = sync_source.find("ActiveApiContext::from_site", site_at + 1)
    if min(lock_at, base_at, site_at, commit_at) < 0 or not (
        lock_at < base_at < site_at < commit_at
    ):
        failures.append(
            "site context mutation must hold one write lock across base_url, site_id and binding commit"
        )

    command_source = sources.get("commands/session.rs", "")
    if command_source.find("let _request_context") > command_source.find(
        "let session = load_required_session"
    ):
        failures.append("remote command must capture context before loading the site token")
    auth_source = sources.get("commands/auth/session.rs", "")
    if auth_source.count("acquire_active_request_context") < 4:
        failures.append("all four auth commands must capture the active request context")
    return failures


def load_sources() -> dict[str, str]:
    base = ROOT / "g5-admin/src-tauri/src"
    paths = (
        "app_state/active_request_context.rs",
        "app_state/site_catalog_service.rs",
        "commands/session.rs",
        "commands/auth/session.rs",
        "commands/auth/health.rs",
        "app_state/dev_bootstrap_service.rs",
        "app_state/tests/sites.rs",
    )
    return {name: (base / name).read_text(encoding="utf-8") for name in paths}


def main() -> None:
    failures = evaluate_sources(load_sources())
    test_stdout: list[str] = []
    if not failures:
        completed = subprocess.run(
            (
                "cargo",
                "test",
                "-p",
                "g5-admin-desktop",
                "--lib",
                TEST_NAME,
                "--",
                "--exact",
            ),
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        test_stdout = [
            line
            for line in (completed.stdout + "\n" + completed.stderr).splitlines()
            if line.strip()
        ][-20:]
        if completed.returncode != 0:
            failures.append(f"multisite concurrency test failed with {completed.returncode}")

    summary: dict[str, Any] = {
        "status": "fail" if failures else "pass",
        "binding_source_count": len(load_sources()),
        "concurrency_test": TEST_NAME,
        "test_output_tail": test_stdout,
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
