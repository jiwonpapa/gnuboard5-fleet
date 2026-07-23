#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from audit_harness.execution import CheckResult, CheckSpec, run_check  # noqa: E402
from audit_harness.paths import (  # noqa: E402
    resolve_openapi_manifest_path,
    resolve_openapi_path,
    resolve_php_root,
)

AUDIT_ID = "API_PIPELINE_AUDIT_V1"
RUST_ROOT = Path(__file__).resolve().parents[1]
CAPABILITY_CHECK_BINDINGS: dict[str, tuple[str, ...]] = {
    "php_declared_route_graph": (
        "php.route_openapi_graph",
        "php.route_graph_mutations",
        "harness.mutation_regressions",
    ),
    "php_runtime_route_table": (
        "cap.php_runtime_route_table",
        "harness.mutation_regressions",
    ),
    "php_handler_contract_binding": (
        "cap.php_handler_contract_binding",
        "harness.mutation_regressions",
    ),
    "openapi_operation": (
        "php.route_openapi_graph",
        "cross.operation_dto_graph",
        "harness.mutation_regressions",
    ),
    "openapi_request_response_schema": (
        "cap.openapi_request_response_schema",
        "harness.mutation_regressions",
    ),
    "rust_wire_client": (
        "cross.operation_dto_graph",
        "cap.rust_wire_client_semantics",
        "harness.mutation_regressions",
    ),
    "tauri_command_operation_edge": (
        "cross.operation_dto_graph",
        "harness.mutation_regressions",
    ),
    "tauri_ipc_registry": (
        "rust.ipc_ownership",
        "cap.tauri_ipc_registry_ast",
        "harness.mutation_regressions",
    ),
    "frontend_api_target": (
        "rust.ipc_ownership",
        "cap.frontend_api_target_edge",
        "harness.mutation_regressions",
    ),
    "frontend_field_consumer": (
        "rust.field_consumer_parity",
        "cap.frontend_field_consumer_semantics",
        "harness.mutation_regressions",
    ),
    "frontend_fixture_render_rehydrate": (
        "rust.fixture_render_rehydrate",
        "harness.mutation_regressions",
    ),
    "frontend_live_write_readback": (
        "harness.live_domain_registry",
        "cap.frontend_api_target_edge",
        "cap.rust_wire_client_semantics",
        "cap.frontend_live_write_readback",
        "rust.live_admin_domain_roundtrip",
        "harness.mutation_regressions",
    ),
    "multisite_request_context": (
        "cap.multisite_request_context",
        "harness.mutation_regressions",
    ),
    "live_provider_identity": (
        "php.live_domain_pipeline",
        "cap.live_provider_identity",
        "harness.mutation_regressions",
    ),
}
STATIC_CAPABILITY_PROBE_IDS = frozenset(
    {
        "cap.php_runtime_route_table",
        "cap.php_handler_contract_binding",
        "cap.openapi_request_response_schema",
        "cap.rust_wire_client_semantics",
        "cap.tauri_ipc_registry_ast",
        "cap.frontend_api_target_edge",
        "cap.frontend_field_consumer_semantics",
        "cap.multisite_request_context",
    }
)
FULL_CAPABILITY_PROBE_IDS = frozenset(
    {
        "cap.frontend_live_write_readback",
        "cap.live_provider_identity",
    }
)
CAPABILITY_PROBE_REASONS = {
    "cap.php_runtime_route_table": "effective Slim runtime route table probe is not implemented",
    "cap.php_handler_contract_binding": "handler to request/response contract binding probe is not implemented",
    "cap.openapi_request_response_schema": "operation-level parameter/body/status schema fingerprint probe is not implemented",
    "cap.rust_wire_client_semantics": "operation-specific OpenAPI to Rust serde wire semantics probe is not complete",
    "cap.tauri_ipc_registry_ast": "generate_handler import-reachability AST probe is not implemented",
    "cap.frontend_api_target_edge": "frontend wrapper to invoke command to method/path edge probe is not implemented",
    "cap.frontend_field_consumer_semantics": "required/default/options/option_source UI semantics probe is not implemented",
    "cap.frontend_live_write_readback": "live base URL and authenticated access token are required",
    "cap.multisite_request_context": "multisite site_id/base_url/token concurrency mutation is not implemented",
    "cap.live_provider_identity": "live base URL and admin inspect secret are required",
}
CAPABILITY_PROBE_COMMANDS: dict[str, tuple[str, ...]] = {
    "cap.php_runtime_route_table": (
        "python3",
        str(RUST_ROOT / "scripts/check_php_runtime_capabilities.py"),
        "--mode",
        "runtime-route",
    ),
    "cap.php_handler_contract_binding": (
        "python3",
        str(RUST_ROOT / "scripts/check_php_runtime_capabilities.py"),
        "--mode",
        "handler-binding",
    ),
    "cap.openapi_request_response_schema": (
        "python3",
        str(RUST_ROOT / "scripts/check_openapi_request_response_schema.py"),
    ),
    "cap.tauri_ipc_registry_ast": (
        "python3",
        str(RUST_ROOT / "scripts/check_tauri_ipc_registry_ast.py"),
    ),
    "cap.frontend_api_target_edge": (
        "python3",
        str(RUST_ROOT / "scripts/check_frontend_api_target_edges.py"),
    ),
    "cap.rust_wire_client_semantics": (
        "python3",
        str(RUST_ROOT / "scripts/check_rust_openapi_wire.py"),
    ),
    "cap.frontend_field_consumer_semantics": (
        "python3",
        str(RUST_ROOT / "scripts/check_frontend_field_consumer_semantics.py"),
    ),
    "cap.multisite_request_context": (
        "python3",
        str(RUST_ROOT / "scripts/check_multisite_request_context.py"),
    ),
}
STATIC_REQUIRED_CHECK_IDS = frozenset(
    {
        "harness.scope_capabilities",
        "php.route_openapi_graph",
        "php.route_graph_mutations",
        "php.schema_contract",
        "php.domain_manifest",
        "cross.operation_dto_graph",
        "rust.field_consumer_parity",
        "rust.ipc_ownership",
        "harness.mutation_regressions",
        "harness.current_run_artifacts",
        "harness.capability_bindings",
    }
) | STATIC_CAPABILITY_PROBE_IDS
FULL_REQUIRED_CHECK_IDS = STATIC_REQUIRED_CHECK_IDS | frozenset(
    {
        "harness.live_domain_registry",
        "php.live_domain_pipeline",
        "rust.live_admin_domain_roundtrip",
        "rust.fixture_render_rehydrate",
    }
) | FULL_CAPABILITY_PROBE_IDS


def file_fingerprint(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"path": str(path), "available": False}
    payload = path.read_bytes()
    return {
        "path": str(path),
        "available": True,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "size": len(payload),
        "mtime_ns": path.stat().st_mtime_ns,
    }


def repository_state(root: Path) -> dict[str, Any]:
    if not (root / ".git").exists():
        return {"root": str(root), "available": False}

    revision = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=str(root),
        text=True,
        capture_output=True,
        check=False,
    )
    worktree = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z"],
        cwd=str(root),
        text=False,
        capture_output=True,
        check=False,
    )
    diff = subprocess.run(
        ["git", "diff", "--binary", "HEAD", "--"],
        cwd=str(root),
        text=False,
        capture_output=True,
        check=False,
    )
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", "-z"],
        cwd=str(root),
        text=False,
        capture_output=True,
        check=False,
    )
    fingerprint = hashlib.sha256()
    if diff.returncode == 0:
        fingerprint.update(b"tracked-diff\0")
        fingerprint.update(diff.stdout)
    untracked_count = 0
    if untracked.returncode == 0:
        for raw_path in sorted(path for path in untracked.stdout.split(b"\0") if path):
            untracked_count += 1
            fingerprint.update(b"untracked\0" + raw_path + b"\0")
            candidate = root / os.fsdecode(raw_path)
            try:
                fingerprint.update(candidate.read_bytes())
            except OSError as error:
                fingerprint.update(f"<unreadable:{error}>".encode("utf-8"))
    return {
        "root": str(root),
        "available": revision.returncode == 0,
        "revision": revision.stdout.strip() if revision.returncode == 0 else None,
        "dirty": bool(worktree.stdout) if worktree.returncode == 0 else None,
        "status_sha256": (
            hashlib.sha256(worktree.stdout).hexdigest()
            if worktree.returncode == 0
            else None
        ),
        "worktree_fingerprint_sha256": (
            fingerprint.hexdigest()
            if diff.returncode == 0 and untracked.returncode == 0
            else None
        ),
        "untracked_file_count": untracked_count,
    }


def build_checks(
    rust_root: Path,
    php_root: Path,
    artifact_root: Path,
    static_only: bool,
    legacy_base_url: str,
    live_base_url: str,
    inspect_secret: str,
    access_token: str,
    audit_run_id: str = "",
    live_resolve_ip: str = "",
) -> list[CheckSpec]:
    checks = [
        CheckSpec(
            id="harness.scope_capabilities",
            title="API pipeline required capability self-audit",
            command=(
                "python3",
                str(rust_root / "scripts/check_api_pipeline_scope.py"),
                "--mode",
                "static" if static_only else "full",
            ),
            cwd=rust_root,
        ),
        CheckSpec(
            id="php.route_openapi_graph",
            title="PHP declared reachable route graph and OpenAPI parity",
            command=("bash", "scripts/docs-check.sh", "--provider-contract-only"),
            cwd=php_root,
        ),
        CheckSpec(
            id="php.route_graph_mutations",
            title="PHP route graph removal and method-drift mutation regressions",
            command=(
                str(php_root / "vendor/bin/phpunit"),
                str(php_root / "tests/contract/DocsCheckRouteGraphTest.php"),
            ),
            cwd=php_root,
        ),
        CheckSpec(
            id="php.schema_contract",
            title="PHP admin schema field contract",
            command=("composer", "run", "audit:schema-contract"),
            cwd=php_root,
        ),
        CheckSpec(
            id="php.domain_manifest",
            title="PHP non-shop admin domain manifest completeness",
            command=("composer", "run", "audit:domain-manifest"),
            cwd=php_root,
        ),
        CheckSpec(
            id="cross.operation_dto_graph",
            title="PHP OpenAPI to Rust operation and DTO graph",
            command=(
                "python3",
                str(rust_root / "scripts/run_integrated_audit.py"),
                "--rust-root",
                str(rust_root),
                "--php-root",
                str(php_root),
                "--output-json",
                str(artifact_root / "integrated-audit.json"),
                "--output-md",
                str(artifact_root / "integrated-audit.md"),
                "--audit-run-id",
                audit_run_id,
            ),
            cwd=rust_root,
        ),
        CheckSpec(
            id="rust.field_consumer_parity",
            title="Rust and Tauri field consumer parity for every active domain",
            command=(
                "python3",
                str(rust_root / "scripts/run_all_admin_domain_consumer_parity.py"),
                "--output-dir",
                str(artifact_root / "field-consumer"),
                "--audit-run-id",
                audit_run_id,
            ),
            cwd=rust_root,
        ),
        CheckSpec(
            id="rust.ipc_ownership",
            title="Frontend apiTarget and Tauri IPC bilateral ownership",
            command=(
                "python3",
                str(rust_root / "scripts/check_active_crate_boundaries.py"),
                "--registry-only",
            ),
            cwd=rust_root,
        ),
        CheckSpec(
            id="harness.mutation_regressions",
            title="API pipeline harness fail-closed regression suite",
            command=(
                "python3",
                "-m",
                "unittest",
                "discover",
                "-s",
                "scripts/tests",
                "-p",
                "test_*.py",
            ),
            cwd=rust_root,
        ),
    ]

    for probe_id in sorted(STATIC_CAPABILITY_PROBE_IDS):
        command = CAPABILITY_PROBE_COMMANDS.get(probe_id)
        checks.append(
            CheckSpec(
                id=probe_id,
                title=(
                    "Rust canonical OpenAPI wire semantics"
                    if command is not None
                    else f"Incomplete capability probe: {probe_id.removeprefix('cap.')}"
                ),
                command=command or ("capability-probe", probe_id),
                cwd=rust_root,
                blocked_reason=(
                    None if command is not None else CAPABILITY_PROBE_REASONS[probe_id]
                ),
            )
        )

    if static_only:
        return checks

    checks.append(
        CheckSpec(
            id="harness.live_domain_registry",
            title="Fail-closed 17-domain live mutation and cleanup strategy registry",
            command=(
                "python3",
                str(rust_root / "scripts/check_live_domain_certification_registry.py"),
                "--output-json",
                str(artifact_root / "live-domain-registry.json"),
                "--audit-run-id",
                audit_run_id,
            ),
            cwd=rust_root,
            live_only=True,
        )
    )
    php_live_missing: list[str] = []
    if not legacy_base_url:
        php_live_missing.append("ADMIN_LEGACY_BASE_URL")
    if not live_base_url:
        php_live_missing.append("G5_LIVE_API_BASE_URL")
    if not inspect_secret:
        php_live_missing.append("ADMIN_SCHEMA_INSPECT_SECRET")
    php_live_command = [
        "python3",
        str(php_root / "scripts/run_all_admin_domain_pipelines.py"),
        "--strict-choice-options",
        "--playwright-smoke",
        f"--output-dir={artifact_root / 'php-live-domain-pipeline'}",
        f"--audit-run-id={audit_run_id}",
    ]
    if legacy_base_url:
        php_live_command.append(f"--base-url={legacy_base_url}")
    if live_base_url:
        php_live_command.append(f"--live-base-url={live_base_url}")
    checks.append(
        CheckSpec(
            id="php.live_domain_pipeline",
            title="PHP legacy form, generated schema, live contract, and browser parity",
            command=tuple(php_live_command),
            cwd=php_root,
            live_only=True,
            blocked_reason=(
                "missing live certification inputs: " + ", ".join(php_live_missing)
                if php_live_missing
                else None
            ),
        )
    )

    render_missing: list[str] = []
    if not live_base_url:
        render_missing.append("G5_LIVE_API_BASE_URL")
    if not inspect_secret:
        render_missing.append("ADMIN_SCHEMA_INSPECT_SECRET")
    render_command = [
        "python3",
        str(rust_root / "scripts/run_all_admin_domain_consumer_render_parity.py"),
    ]
    if live_base_url:
        render_command.append(f"--live-base-url={live_base_url}")
    render_command.extend(["--output-dir", str(artifact_root / "render-consumer")])
    render_command.extend(["--audit-run-id", audit_run_id])
    checks.append(
        CheckSpec(
            id="rust.fixture_render_rehydrate",
            title="Tauri UI live-fixture render and mocked save/rehydrate parity",
            command=tuple(render_command),
            cwd=rust_root,
            live_only=True,
            blocked_reason=(
                "missing live certification inputs: " + ", ".join(render_missing)
                if render_missing
                else None
            ),
        )
    )
    live_write_missing: list[str] = []
    if not live_base_url:
        live_write_missing.append("G5_LIVE_API_BASE_URL")
    if not access_token:
        live_write_missing.append("G5_LIVE_ACCESS_TOKEN")
    live_roundtrip_command = [
        "cargo",
        "run",
        "--quiet",
        "-p",
        "g5-admin-api-client",
        "--example",
        "live_admin_domain_roundtrip",
        "--",
        "--base-url",
        live_base_url,
        "--output-json",
        str(artifact_root / "live-admin-domain-roundtrip.json"),
        "--audit-run-id",
        audit_run_id,
    ]
    if live_resolve_ip:
        live_roundtrip_command.extend(["--resolve-ip", live_resolve_ip])
    checks.append(
        CheckSpec(
            id="rust.live_admin_domain_roundtrip",
            title="Production Rust wire client 17-domain live readback and cleanup",
            command=tuple(live_roundtrip_command),
            cwd=rust_root,
            live_only=True,
            blocked_reason=(
                "missing live certification inputs: " + ", ".join(live_write_missing)
                if live_write_missing
                else None
            ),
        )
    )
    checks.append(
        CheckSpec(
            id="cap.frontend_live_write_readback",
            title="Rust wire client live config write, readback, and rollback",
            command=(
                "cargo",
                "run",
                "--quiet",
                "-p",
                "g5-admin-api-client",
                "--example",
                "live_config_roundtrip",
                "--",
                "--base-url",
                live_base_url,
                "--output-json",
                str(artifact_root / "live-config-roundtrip.json"),
            ),
            cwd=rust_root,
            live_only=True,
            blocked_reason=(
                "missing live certification inputs: " + ", ".join(live_write_missing)
                if live_write_missing
                else None
            ),
        )
    )
    identity_missing: list[str] = []
    if not live_base_url:
        identity_missing.append("G5_LIVE_API_BASE_URL")
    if not inspect_secret:
        identity_missing.append("ADMIN_SCHEMA_INSPECT_SECRET")
    checks.append(
        CheckSpec(
            id="cap.live_provider_identity",
            title="Live provider revision, contract SHA, health, and site identity",
            command=(
                "python3",
                str(rust_root / "scripts/check_live_provider_identity.py"),
                "--live-base-url",
                live_base_url,
                "--php-root",
                str(php_root),
                "--output-json",
                str(artifact_root / "live-provider-identity.json"),
                "--audit-run-id",
                audit_run_id,
            ),
            cwd=rust_root,
            live_only=True,
            blocked_reason=(
                "missing live certification inputs: " + ", ".join(identity_missing)
                if identity_missing
                else None
            ),
        )
    )
    return checks


def summarize(results: list[CheckResult], static_only: bool) -> dict[str, Any]:
    failures = [
        result.id
        for result in results
        if result.status not in {"passed", "blocked"}
    ]
    blocked = [result.id for result in results if result.status == "blocked"]
    check_ids = [result.id for result in results]
    required_check_ids = (
        STATIC_REQUIRED_CHECK_IDS if static_only else FULL_REQUIRED_CHECK_IDS
    )
    if not results:
        failures.append("harness.no_checks_executed")
    duplicate_ids = sorted(
        {check_id for check_id in check_ids if check_ids.count(check_id) > 1}
    )
    if duplicate_ids:
        failures.extend(f"harness.duplicate_check:{check_id}" for check_id in duplicate_ids)
    missing_check_ids = sorted(required_check_ids - set(check_ids))
    unexpected_check_ids = sorted(set(check_ids) - required_check_ids)
    failures.extend(
        f"harness.missing_check:{check_id}" for check_id in missing_check_ids
    )
    failures.extend(
        f"harness.unexpected_check:{check_id}" for check_id in unexpected_check_ids
    )
    if failures:
        status = "failed"
    elif blocked:
        status = "blocked"
    elif static_only:
        status = "static_passed_not_certified"
    else:
        status = "passed"
    return {
        "status": status,
        "certified": status == "passed" and not static_only,
        "static_only": static_only,
        "passed": sum(1 for result in results if result.status == "passed"),
        "failed": len(failures),
        "blocked": len(blocked),
        "failure_checks": failures,
        "blocked_checks": blocked,
    }


def evaluate_capability_bindings(
    scope_path: Path,
    results: list[CheckResult],
    *,
    static_only: bool,
) -> CheckResult:
    started = time.monotonic()
    failures: list[str] = []
    try:
        payload = json.loads(scope_path.read_text(encoding="utf-8"))
        contract = payload.get("audit_contract")
        raw_capabilities = contract.get("capabilities") if isinstance(contract, dict) else None
    except (OSError, json.JSONDecodeError) as error:
        raw_capabilities = None
        failures.append(f"scope capability parse failure: {error}")
    if not isinstance(raw_capabilities, list):
        raw_capabilities = []
        failures.append("scope capabilities must be a list")

    capabilities = {
        str(item.get("id") or ""): item
        for item in raw_capabilities
        if isinstance(item, dict) and str(item.get("id") or "")
    }
    if set(capabilities) != set(CAPABILITY_CHECK_BINDINGS):
        failures.append("scope capability inventory does not match aggregate bindings")
    results_by_id = {result.id: result for result in results}
    if len(results_by_id) != len(results):
        failures.append("duplicate child check ids prevent capability binding")

    for capability_id, expected_check_ids in CAPABILITY_CHECK_BINDINGS.items():
        capability = capabilities.get(capability_id)
        if not isinstance(capability, dict):
            continue
        capability_mode = capability.get("mode")
        if capability_mode == "full" and static_only:
            continue
        raw_check_ids = capability.get("required_check_ids")
        actual_check_ids = (
            tuple(str(check_id) for check_id in raw_check_ids)
            if isinstance(raw_check_ids, list)
            else ()
        )
        if actual_check_ids != expected_check_ids:
            failures.append(f"{capability_id}: required_check_ids binding mismatch")
        if capability.get("status") != "implemented":
            failures.append(
                f"{capability_id}: capability is not implemented ({capability.get('status')})"
            )
        for check_id in expected_check_ids:
            result = results_by_id.get(check_id)
            if result is None:
                failures.append(f"{capability_id}: missing bound check {check_id}")
            elif result.status != "passed" or result.returncode != 0:
                failures.append(
                    f"{capability_id}: bound check did not pass: {check_id} "
                    f"status={result.status} returncode={result.returncode}"
                )

    duration_ms = int((time.monotonic() - started) * 1000)
    return CheckResult(
        id="harness.capability_bindings",
        title="Capability to executable check binding",
        status="passed" if not failures else "failed",
        command="internal capability binding validation",
        cwd=str(scope_path.parent),
        returncode=0 if not failures else 1,
        duration_ms=duration_ms,
        stdout_tail=[] if failures else ["all applicable capability bindings passed"],
        stderr_tail=failures[-80:],
        reason=None if not failures else "capability binding failure",
    )


def live_probe_artifact_failures(
    payload: dict[str, Any],
    *,
    expected_schema: str,
    expected_audit_run_id: str,
    required_true_paths: tuple[tuple[str, ...], ...],
) -> list[str]:
    failures: list[str] = []
    if payload.get("schema") != expected_schema:
        failures.append("schema mismatch")
    if payload.get("audit_run_id") != expected_audit_run_id:
        failures.append("stale or mismatched audit_run_id")
    if payload.get("status") != "passed":
        failures.append("status is not passed")
    for path in required_true_paths:
        current: Any = payload
        for key in path:
            current = current.get(key) if isinstance(current, dict) else None
        if current is not True:
            failures.append(".".join(path) + " is not true")
    return failures


def live_domain_roundtrip_artifact_failures(
    payload: dict[str, Any],
    registry: dict[str, Any],
    expected_domains: set[str],
    expected_audit_run_id: str,
) -> list[str]:
    failures = live_probe_artifact_failures(
        payload,
        expected_schema="gnuboard5.rust.live-admin-domain-roundtrip/v1",
        expected_audit_run_id=expected_audit_run_id,
        required_true_paths=(
            ("proof", "production_api_client"),
            ("proof", "canonical_wire_validation"),
            ("proof", "current_run"),
            ("proof", "mutation_method_preflight"),
            ("proof", "all_domains_accounted_for"),
            ("proof", "all_operations_accounted_for"),
            ("proof", "all_requests_attributed"),
            ("proof", "all_mutations_read_back"),
            ("proof", "all_cleanup_verified"),
        ),
    )
    proof = payload.get("proof")
    if not isinstance(proof, dict):
        proof = {}
    if proof.get("external_delivery_operations_executed") != 0:
        failures.append("external delivery operation count is not zero")

    raw_registry_rows = registry.get("domains")
    registry_rows = (
        [row for row in raw_registry_rows if isinstance(row, dict)]
        if isinstance(raw_registry_rows, list)
        else []
    )
    planned_by_domain: dict[str, set[str]] = {}
    excluded_operations: set[str] = set()
    for row in registry_rows:
        domain = str(row.get("domain") or "")
        operations = row.get("operations")
        if not domain or not isinstance(operations, dict):
            continue
        planned_by_domain[domain] = {
            str(operation_id)
            for raw_phase in operations.values()
            if isinstance(raw_phase, list)
            for operation_id in raw_phase
            if isinstance(operation_id, str) and operation_id
        }
        raw_excluded = row.get("excluded_irreversible_operations")
        if isinstance(raw_excluded, list):
            excluded_operations.update(
                str(operation_id)
                for operation_id in raw_excluded
                if isinstance(operation_id, str) and operation_id
            )

    planned_operations = {
        operation_id
        for domain_operations in planned_by_domain.values()
        for operation_id in domain_operations
    }

    def operation_set(key: str) -> set[str]:
        raw = payload.get(key)
        values = (
            [str(item) for item in raw if isinstance(item, str) and item]
            if isinstance(raw, list)
            else []
        )
        if not isinstance(raw, list) or len(values) != len(raw):
            failures.append(f"{key} must be a string list")
        if len(values) != len(set(values)):
            failures.append(f"{key} contains duplicates")
        return set(values)

    preflight_operations = operation_set("preflight_operation_ids")
    executed_operations = operation_set("executed_operation_ids")
    unavailable_accounted_operations = operation_set(
        "unavailable_accounted_operation_ids"
    )
    unknown_executed = sorted(executed_operations - planned_operations)
    if unknown_executed:
        failures.append(
            "executed operation IDs are not in the registry plan: "
            + ", ".join(unknown_executed)
        )
    unknown_preflight = sorted(preflight_operations - planned_operations)
    if unknown_preflight:
        failures.append(
            "preflight operation IDs are not in the registry plan: "
            + ", ".join(unknown_preflight)
        )
    unsafe_executed = sorted(executed_operations & excluded_operations)
    if unsafe_executed:
        failures.append(
            "excluded irreversible operations were executed: "
            + ", ".join(unsafe_executed)
        )
    unsafe_preflight = sorted(preflight_operations & excluded_operations)
    if unsafe_preflight:
        failures.append(
            "excluded irreversible operations were used by preflight: "
            + ", ".join(unsafe_preflight)
        )
    overlapping_accounting = sorted(
        executed_operations & unavailable_accounted_operations
    )
    if overlapping_accounting:
        failures.append(
            "operation IDs cannot be both executed and unavailable-accounted: "
            + ", ".join(overlapping_accounting)
        )
    if planned_operations != executed_operations | unavailable_accounted_operations:
        failures.append("planned operation IDs are not fully current-run accounted")

    raw_rows = payload.get("domains")
    rows = (
        [row for row in raw_rows if isinstance(row, dict)]
        if isinstance(raw_rows, list)
        else []
    )
    rows_by_domain: dict[str, dict[str, Any]] = {}
    duplicates: set[str] = set()
    for row in rows:
        domain = str(row.get("domain") or "")
        if domain in rows_by_domain:
            duplicates.add(domain)
        if domain:
            rows_by_domain[domain] = row
    if duplicates:
        failures.append("duplicate live domains: " + ", ".join(sorted(duplicates)))
    if set(rows_by_domain) != expected_domains:
        failures.append("live domain inventory mismatch")
    if payload.get("expected_domain_count") != len(expected_domains):
        failures.append("expected_domain_count mismatch")
    if payload.get("domain_count") != len(rows):
        failures.append("domain_count does not match domain rows")

    domain_executed_operations: set[str] = set()
    domain_accounted_operations: set[str] = set()
    for domain, row in sorted(rows_by_domain.items()):
        if row.get("status") != "passed":
            failures.append(f"{domain}: status is not passed")
        if row.get("baseline_verified") is not True:
            failures.append(f"{domain}: baseline is not verified")
        if row.get("readback_verified") is not True:
            failures.append(f"{domain}: readback is not verified")
        if row.get("cleanup_required") is True and row.get("cleanup_verified") is not True:
            failures.append(f"{domain}: required cleanup is not verified")
        if row.get("no_external_delivery") is not True:
            failures.append(f"{domain}: external delivery guard is not true")
        raw_planned = row.get("planned_operation_ids")
        planned = (
            {str(item) for item in raw_planned if isinstance(item, str) and item}
            if isinstance(raw_planned, list)
            else set()
        )
        if not isinstance(raw_planned, list) or len(raw_planned) != len(planned):
            failures.append(f"{domain}: planned operation IDs are missing or duplicated")
        if planned != planned_by_domain.get(domain, set()):
            failures.append(f"{domain}: planned operation IDs do not match registry")
        raw_executed = row.get("executed_operation_ids")
        executed_values = (
            [str(item) for item in raw_executed if isinstance(item, str) and item]
            if isinstance(raw_executed, list)
            else []
        )
        domain_executed = set(executed_values)
        if not isinstance(raw_executed, list) or len(executed_values) != len(raw_executed):
            failures.append(f"{domain}: executed operation IDs must be a string list")
        if len(executed_values) != len(domain_executed):
            failures.append(f"{domain}: executed operation IDs contain duplicates")
        if not domain_executed.issubset(planned):
            failures.append(f"{domain}: executed operation IDs are outside the domain plan")
        raw_accounted = row.get("unavailable_accounted_operation_ids")
        accounted_values = (
            [str(item) for item in raw_accounted if isinstance(item, str) and item]
            if isinstance(raw_accounted, list)
            else []
        )
        accounted = set(accounted_values)
        if not isinstance(raw_accounted, list) or len(accounted_values) != len(raw_accounted):
            failures.append(
                f"{domain}: unavailable-accounted operation IDs must be a string list"
            )
        if len(accounted_values) != len(accounted):
            failures.append(
                f"{domain}: unavailable-accounted operation IDs contain duplicates"
            )
        if not accounted.issubset(planned):
            failures.append(
                f"{domain}: unavailable-accounted operation IDs are outside the domain plan"
            )
        if domain_executed & accounted:
            failures.append(
                f"{domain}: operation IDs cannot be both executed and unavailable-accounted"
            )
        expected_accounted = (
            planned - domain_executed
            if row.get("optional_unavailable_verified") is True
            else set()
        )
        if accounted != expected_accounted:
            failures.append(
                f"{domain}: unavailable-accounted operation IDs do not match current-run execution"
            )
        if planned != domain_executed | accounted:
            failures.append(
                f"{domain}: planned operation IDs are not fully current-run accounted"
            )
        domain_executed_operations.update(domain_executed)
        domain_accounted_operations.update(accounted)
    if domain_executed_operations != executed_operations:
        failures.append("top-level executed operation IDs do not match domain rows")
    if domain_accounted_operations != unavailable_accounted_operations:
        failures.append(
            "top-level unavailable-accounted operation IDs do not match domain rows"
        )
    return failures


def validate_current_run_artifacts(
    artifact_root: Path,
    static_only: bool,
    expected_domains: set[str],
    expected_audit_run_id: str = "",
    check_results: list[CheckResult] | None = None,
) -> CheckResult:
    started = time.monotonic()
    failures: list[str] = []
    results_by_id = {result.id: result for result in check_results or []}

    def require_child_binding(
        check_id: str,
        *,
        artifact_passed: bool,
    ) -> None:
        result = results_by_id.get(check_id)
        if result is None:
            failures.append(f"missing child result binding: {check_id}")
            return
        child_passed = result.status == "passed" and result.returncode == 0
        if child_passed != artifact_passed:
            failures.append(
                f"child/artifact status mismatch for {check_id}: "
                f"child_passed={child_passed} artifact_passed={artifact_passed}"
            )

    def load_object(relative_path: str) -> dict[str, Any] | None:
        path = artifact_root / relative_path
        if not path.is_file():
            failures.append(f"missing current-run artifact: {relative_path}")
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            failures.append(f"invalid JSON artifact {relative_path}: {error}")
            return None
        if not isinstance(payload, dict):
            failures.append(f"artifact root must be an object: {relative_path}")
            return None
        return payload

    provider = load_object("php-provider-legacy-inventory.json")
    if provider is not None:
        records = provider.get("records")
        paths = [
            str(record.get("path") or "")
            for record in records
            if isinstance(record, dict)
        ] if isinstance(records, list) else []
        if provider.get("schema") != "gnuboard5.php.provider-legacy-admin-inventory/v1":
            failures.append("provider inventory schema mismatch")
        if provider.get("audit_run_id") != expected_audit_run_id:
            failures.append("provider inventory audit_run_id mismatch")
        if not paths:
            failures.append("provider inventory scanner returned zero records")
        if len(paths) != len(set(paths)):
            failures.append("provider inventory contains duplicate paths")

    integrated = load_object("integrated-audit.json")
    if integrated is not None:
        status = integrated.get("summary", {}).get("status")
        if status not in {"passed", "passed_with_warnings", "failed"}:
            failures.append(f"integrated audit has invalid status: {status!r}")
        if integrated.get("audit_run_id") != expected_audit_run_id:
            failures.append("integrated audit_run_id mismatch")
        integrated_passed = status in {"passed", "passed_with_warnings"}
        require_child_binding(
            "cross.operation_dto_graph", artifact_passed=integrated_passed
        )
        if not integrated_passed:
            failures.append("integrated audit artifact reports a failed pipeline")

    def validate_domain_index(
        relative_path: str,
        check_id: str,
        require_certifying: bool = False,
    ) -> None:
        payload = load_object(relative_path)
        if payload is None:
            return
        if payload.get("audit_run_id") != expected_audit_run_id:
            failures.append(f"{relative_path} audit_run_id mismatch")
        raw_domains = payload.get("domains")
        domain_items = (
            [item for item in raw_domains if isinstance(item, dict)]
            if isinstance(raw_domains, list)
            else []
        )
        actual_domains = {
            str(item.get("domain") or "")
            for item in domain_items
            if str(item.get("domain") or "")
        }
        if actual_domains != expected_domains:
            failures.append(
                f"{relative_path} domain inventory mismatch: "
                f"expected={len(expected_domains)} actual={len(actual_domains)}"
            )
        if not isinstance(raw_domains, list) or len(raw_domains) != len(actual_domains):
            failures.append(f"{relative_path} contains duplicate or empty domains")
        allowed_statuses = {"pass", "fail", "blocked"}
        invalid_status_domains = [
            str(item.get("domain") or "<empty>")
            for item in domain_items
            if item.get("status") not in allowed_statuses
        ]
        if invalid_status_domains:
            failures.append(
                f"{relative_path} contains invalid domain statuses: "
                + ", ".join(invalid_status_domains)
            )
        stale = [
            str(item.get("domain") or "")
            for item in domain_items
            if item.get("current_run_report") is not True
        ]
        if stale:
            failures.append(
                f"{relative_path} contains non-current reports: {', '.join(stale)}"
            )
        recalculated_counts = {
            status: sum(1 for item in domain_items if item.get("status") == status)
            for status in sorted(allowed_statuses)
        }
        if payload.get("counts") != recalculated_counts:
            failures.append(f"{relative_path} top-level counts do not match domain rows")
        exit_codes: list[int] = []
        invalid_exit_domains: list[str] = []
        for item in domain_items:
            raw_exit = item.get("subprocess_exit_code")
            if raw_exit is None and isinstance(item.get("pipeline_result"), dict):
                raw_exit = item["pipeline_result"].get("returncode")
            if not isinstance(raw_exit, int):
                invalid_exit_domains.append(str(item.get("domain") or "<empty>"))
                continue
            exit_codes.append(raw_exit)
        if invalid_exit_domains:
            failures.append(
                f"{relative_path} contains missing/invalid child exit codes: "
                + ", ".join(invalid_exit_domains)
            )
        recalculated_nonzero = sum(code != 0 for code in exit_codes)
        if payload.get("subprocess_nonzero_count") != recalculated_nonzero:
            failures.append(
                f"{relative_path} subprocess_nonzero_count does not match domain rows"
            )
        if require_certifying:
            if payload.get("execution_mode") != "current_run":
                failures.append(f"{relative_path} is not a current-run index")
            if payload.get("certifying") is not True:
                failures.append(f"{relative_path} is marked non-certifying")
        artifact_passed = (
            recalculated_counts["fail"] == 0
            and recalculated_counts["blocked"] == 0
            and payload.get("domain_count_match") is True
            and not stale
            and not invalid_status_domains
            and not invalid_exit_domains
            and recalculated_nonzero == 0
            and (not require_certifying or payload.get("certifying") is True)
        )
        require_child_binding(check_id, artifact_passed=artifact_passed)
        if not artifact_passed:
            failures.append(f"{relative_path} reports failed or blocked domain checks")

    validate_domain_index(
        "field-consumer/index.json", "rust.field_consumer_parity"
    )
    if not static_only:
        validate_domain_index(
            "render-consumer/index.json", "rust.fixture_render_rehydrate"
        )
        validate_domain_index(
            "php-live-domain-pipeline/index.json",
            "php.live_domain_pipeline",
            require_certifying=True,
        )

        def validate_live_probe(
            relative_path: str,
            check_id: str,
            expected_schema: str,
            required_true_paths: tuple[tuple[str, ...], ...],
        ) -> None:
            payload = load_object(relative_path)
            if payload is None:
                require_child_binding(check_id, artifact_passed=False)
                return
            artifact_failures = live_probe_artifact_failures(
                payload,
                expected_schema=expected_schema,
                expected_audit_run_id=expected_audit_run_id,
                required_true_paths=required_true_paths,
            )
            artifact_passed = not artifact_failures
            require_child_binding(check_id, artifact_passed=artifact_passed)
            failures.extend(
                f"{relative_path}: {failure}" for failure in artifact_failures
            )

        validate_live_probe(
            "live-domain-registry.json",
            "harness.live_domain_registry",
            "gnuboard5.rust.live-domain-certification-registry/v1",
            (),
        )
        validate_live_probe(
            "live-config-roundtrip.json",
            "cap.frontend_live_write_readback",
            "gnuboard5.rust.live-config-roundtrip/v1",
            (
                ("proof", "rust_wire_client"),
                ("proof", "readback_verified"),
                ("proof", "rollback_verified"),
            ),
        )
        roundtrip_payload = load_object("live-admin-domain-roundtrip.json")
        if roundtrip_payload is None:
            require_child_binding("rust.live_admin_domain_roundtrip", artifact_passed=False)
        else:
            try:
                registry_payload = json.loads(
                    (RUST_ROOT / "specs/integration/LIVE_DOMAIN_CERTIFICATION.json").read_text(
                        encoding="utf-8"
                    )
                )
            except (OSError, json.JSONDecodeError):
                registry_payload = {}
            roundtrip_failures = live_domain_roundtrip_artifact_failures(
                roundtrip_payload,
                registry_payload if isinstance(registry_payload, dict) else {},
                expected_domains,
                expected_audit_run_id,
            )
            roundtrip_passed = not roundtrip_failures
            require_child_binding(
                "rust.live_admin_domain_roundtrip",
                artifact_passed=roundtrip_passed,
            )
            failures.extend(
                f"live-admin-domain-roundtrip.json: {failure}"
                for failure in roundtrip_failures
            )
        validate_live_probe(
            "live-provider-identity.json",
            "cap.live_provider_identity",
            "gnuboard5.rust.live-provider-identity/v1",
            (
                ("certified",),
                ("checks", "provider_revision_matches"),
                ("checks", "openapi_sha_matches"),
                ("checks", "site_identity_present"),
            ),
        )

    duration_ms = int((time.monotonic() - started) * 1000)
    return CheckResult(
        id="harness.current_run_artifacts",
        title="Current-run artifact integrity and child result binding",
        status="passed" if not failures else "failed",
        command="internal artifact validation",
        cwd=str(artifact_root),
        returncode=0 if not failures else 1,
        duration_ms=duration_ms,
        stdout_tail=[] if failures else ["all required current-run artifacts are valid"],
        stderr_tail=failures[-80:],
        reason=None if not failures else "current-run artifact integrity failure",
    )


def render_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        f"# {AUDIT_ID}",
        "",
        f"- run_id: `{report['run_id']}`",
        f"- status: `{summary['status']}`",
        f"- certified: `{str(summary['certified']).lower()}`",
        f"- mode: `{'static' if summary['static_only'] else 'full'}`",
        f"- passed: `{summary['passed']}`",
        f"- failed: `{summary['failed']}`",
        f"- blocked: `{summary['blocked']}`",
        "",
        "## Checks",
        "",
    ]
    for result in report["checks"]:
        lines.append(
            f"- `{result['id']}`: `{result['status']}` "
            f"returncode=`{result['returncode']}` duration_ms=`{result['duration_ms']}`"
        )
        if result.get("reason"):
            lines.append(f"  - reason: {result['reason']}")
    lines.extend(
        [
            "",
            "## Contract",
            "",
            "- active exact operations: `189` (`184` non-shop admin + `5` bootstrap)",
            "- required chain: `PHP runtime route -> OpenAPI -> Rust wire client -> Tauri command edge -> IPC -> frontend field -> real save/readback`",
            "- hard-fail states: `missing, extra, mismatch, scanner_zero, blocked, skipped, stale, child_process_failed`",
            "- archived Flutter/Web and shop API consumer surfaces are excluded.",
            "- declared-route and fixture/mock checks are never reported as runtime/live proof.",
            "- `adm/shop_admin` remains included in PHP legacy inventory classification.",
        ]
    )
    return "\n".join(lines) + "\n"


def write_report(report: dict[str, Any], json_path: Path, markdown_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    payloads = {
        json_path: json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        markdown_path: render_markdown(report),
    }
    for path, payload in payloads.items():
        temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_text(payload, encoding="utf-8")
        os.replace(temporary, path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the fail-closed PHP OpenAPI to Tauri consumption audit."
    )
    parser.add_argument("--rust-root", default=str(RUST_ROOT))
    parser.add_argument("--php-root")
    parser.add_argument("--static-only", action="store_true")
    parser.add_argument("--legacy-base-url")
    parser.add_argument("--live-base-url")
    parser.add_argument("--inspect-secret")
    parser.add_argument("--access-token")
    parser.add_argument("--live-resolve-ip")
    parser.add_argument("--output-json")
    parser.add_argument("--output-md")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rust_root = Path(args.rust_root).resolve()
    php_root = (
        Path(args.php_root).resolve()
        if args.php_root
        else resolve_php_root(rust_root)
    )
    legacy_base_url = (
        args.legacy_base_url or os.getenv("ADMIN_LEGACY_BASE_URL", "")
    ).strip()
    live_base_url = (
        args.live_base_url or os.getenv("G5_LIVE_API_BASE_URL", "")
    ).strip()
    inspect_secret = (
        args.inspect_secret or os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "")
    ).strip()
    access_token = (
        args.access_token or os.getenv("G5_LIVE_ACCESS_TOKEN", "")
    ).strip()
    live_resolve_ip = (
        args.live_resolve_ip or os.getenv("G5_LIVE_RESOLVE_IP", "")
    ).strip()
    secrets = tuple(secret for secret in (inspect_secret, access_token) if secret)

    default_output_dir = rust_root / "output/api-pipeline-audit"
    output_dir = (
        Path(args.output_json).resolve().parent
        if args.output_json
        else default_output_dir
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    output_json = Path(args.output_json).resolve() if args.output_json else output_dir / "latest.json"
    output_md = Path(args.output_md).resolve() if args.output_md else output_dir / "latest.md"
    run_id = (
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        + "-"
        + uuid.uuid4().hex[:12]
    )
    artifact_root = output_dir / "runs" / run_id
    artifact_root.mkdir(parents=True, exist_ok=False)
    provider_inventory_json = artifact_root / "php-provider-legacy-inventory.json"

    env = os.environ.copy()
    env["G5_PHP_ROOT"] = str(php_root)
    env["G5_OPENAPI_PATH"] = str(resolve_openapi_path(rust_root, php_root=php_root))
    env["G5_OPENAPI_MANIFEST_PATH"] = str(
        resolve_openapi_manifest_path(rust_root, php_root=php_root)
    )
    env["DOCS_CHECK_PROVIDER_CLASSIFICATION_OUTPUT"] = str(provider_inventory_json)
    env["API_PIPELINE_AUDIT_RUN_ID"] = run_id
    if inspect_secret:
        env["ADMIN_SCHEMA_INSPECT_SECRET"] = inspect_secret
    if access_token:
        env["G5_LIVE_ACCESS_TOKEN"] = access_token

    specs = build_checks(
        rust_root=rust_root,
        php_root=php_root,
        artifact_root=artifact_root,
        static_only=args.static_only,
        legacy_base_url=legacy_base_url,
        live_base_url=live_base_url,
        inspect_secret=inspect_secret,
        access_token=access_token,
        audit_run_id=run_id,
        live_resolve_ip=live_resolve_ip,
    )
    results: list[CheckResult] = []
    for spec in specs:
        print(f"==> {spec.id}: {spec.title}")
        result = run_check(spec, env=env, secrets=secrets)
        results.append(result)
        print(f"    {result.status}")

    expected_domains: set[str] = set()
    try:
        scope_payload = json.loads(
            (rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json").read_text(
                encoding="utf-8"
            )
        )
        raw_expected_domains = scope_payload.get("audit_contract", {}).get(
            "expected_schema_domains", []
        )
        if isinstance(raw_expected_domains, list):
            expected_domains = {
                str(domain) for domain in raw_expected_domains if str(domain)
            }
    except (OSError, json.JSONDecodeError, AttributeError):
        expected_domains = set()
    artifact_result = validate_current_run_artifacts(
        artifact_root=artifact_root,
        static_only=args.static_only,
        expected_domains=expected_domains,
        expected_audit_run_id=run_id,
        check_results=results,
    )
    results.append(artifact_result)
    print(f"==> {artifact_result.id}: {artifact_result.title}")
    print(f"    {artifact_result.status}")

    capability_result = evaluate_capability_bindings(
        rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json",
        results,
        static_only=args.static_only,
    )
    results.append(capability_result)
    print(f"==> {capability_result.id}: {capability_result.title}")
    print(f"    {capability_result.status}")

    summary = summarize(results, static_only=args.static_only)
    report = {
        "schema_version": 1,
        "audit_id": AUDIT_ID,
        "run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "repositories": {
            "php": repository_state(php_root),
            "rust": repository_state(rust_root),
        },
        "inputs": {
            "openapi": file_fingerprint(php_root / "api/docs/openapi.yaml"),
            "openapi_manifest": file_fingerprint(
                php_root / "api/docs/openapi.contract-manifest.json"
            ),
            "consumer_scope": file_fingerprint(
                rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
            ),
            "live_domain_registry": file_fingerprint(
                rust_root / "specs/integration/LIVE_DOMAIN_CERTIFICATION.json"
            ),
        },
        "artifacts": {
            "run_root": str(artifact_root),
            "php_provider_legacy_inventory": file_fingerprint(
                provider_inventory_json
            ),
            "integrated_audit": file_fingerprint(
                artifact_root / "integrated-audit.json"
            ),
            "field_consumer_index": file_fingerprint(
                artifact_root / "field-consumer/index.json"
            ),
            "render_consumer_index": file_fingerprint(
                artifact_root / "render-consumer/index.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
            "php_live_domain_pipeline_index": file_fingerprint(
                artifact_root / "php-live-domain-pipeline/index.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
            "live_config_roundtrip": file_fingerprint(
                artifact_root / "live-config-roundtrip.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
            "live_admin_domain_roundtrip": file_fingerprint(
                artifact_root / "live-admin-domain-roundtrip.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
            "live_domain_registry": file_fingerprint(
                artifact_root / "live-domain-registry.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
            "live_provider_identity": file_fingerprint(
                artifact_root / "live-provider-identity.json"
            )
            if not args.static_only
            else {"available": False, "reason": "not run in static-only mode"},
        },
        "checks": [asdict(result) for result in results],
    }
    write_report(report, output_json, output_md)
    print(f"report: {output_json}")
    print(f"status: {summary['status']}")
    return 0 if summary["status"] in {"passed", "static_passed_not_certified"} else 1


if __name__ == "__main__":
    sys.exit(main())
