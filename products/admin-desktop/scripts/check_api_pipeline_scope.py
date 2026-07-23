#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

AUDIT_ID = "API_PIPELINE_AUDIT_V1"
RUST_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCOPE = RUST_ROOT / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
VALID_MODES = {"static", "full"}
VALID_STATUSES = {"implemented", "partial", "missing"}
EXPECTED_OPERATION_COUNTS = {
    "openapi_total": 312,
    "admin_total": 210,
    "shop_provider_only": 26,
    "admin_non_shop_exact": 184,
    "bootstrap": 5,
    "active_total_exact": 189,
}
EXPECTED_BOOTSTRAP_OPERATIONS = {
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/refresh"),
    ("GET", "/health"),
    ("GET", "/members/me"),
}
EXPECTED_SCHEMA_DOMAINS = {
    "boards",
    "config",
    "contents",
    "faq-masters",
    "faqs",
    "groups",
    "mails",
    "members",
    "menus",
    "points",
    "polls",
    "popups",
    "sms-contacts",
    "sms-messages",
    "sms-templates",
    "system",
    "theme",
}
REQUIRED_HARD_FAIL_STATES = {
    "missing",
    "extra",
    "mismatch",
    "scanner_zero",
    "blocked",
    "skipped",
    "stale",
    "child_process_failed",
}
REQUIRED_LAYERS = {
    "php_declared_route_graph",
    "php_runtime_route_table",
    "php_handler_contract_binding",
    "openapi_operation",
    "openapi_request_response_schema",
    "rust_wire_client",
    "tauri_command_operation_edge",
    "tauri_ipc_registry",
    "frontend_api_target",
    "frontend_field_consumer",
    "frontend_fixture_render_rehydrate",
    "frontend_live_write_readback",
    "multisite_request_context",
    "live_provider_identity",
}
V1_CAPABILITY_STATUSES = {
    "php_declared_route_graph": "implemented",
    "php_runtime_route_table": "implemented",
    "php_handler_contract_binding": "implemented",
    "openapi_operation": "implemented",
    "openapi_request_response_schema": "implemented",
    "rust_wire_client": "implemented",
    "tauri_command_operation_edge": "implemented",
    "tauri_ipc_registry": "implemented",
    "frontend_api_target": "implemented",
    "frontend_field_consumer": "implemented",
    "frontend_fixture_render_rehydrate": "partial",
    "frontend_live_write_readback": "partial",
    "multisite_request_context": "implemented",
    "live_provider_identity": "implemented",
}
EXPECTED_CAPABILITY_CHECK_BINDINGS = {
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


def load_contract(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("scope root must be an object")
    contract = payload.get("audit_contract")
    if not isinstance(contract, dict):
        raise ValueError("audit_contract must be an object")
    return contract


def evaluate_contract(contract: dict[str, Any], mode: str) -> dict[str, Any]:
    failures: list[str] = []
    if contract.get("id") != AUDIT_ID:
        failures.append(
            f"audit contract id mismatch: expected={AUDIT_ID!r} actual={contract.get('id')!r}"
        )

    expected_provider_contract = "connectors/gnuboard5-php/api/docs/openapi.yaml"
    if contract.get("provider_contract") != expected_provider_contract:
        failures.append(
            "provider_contract must point to " + expected_provider_contract
        )

    prefixes = contract.get("included_path_prefixes")
    if prefixes != ["/admin/"]:
        failures.append("included_path_prefixes must equal ['/admin/']")

    raw_bootstrap = contract.get("included_operations")
    bootstrap_operations: list[tuple[str, str]] = []
    if isinstance(raw_bootstrap, list):
        for operation in raw_bootstrap:
            if not isinstance(operation, dict):
                failures.append("included_operations entries must be objects")
                continue
            bootstrap_operations.append(
                (
                    str(operation.get("method") or "").upper(),
                    str(operation.get("path") or ""),
                )
            )
    else:
        failures.append("included_operations must be a list")
    if (
        len(bootstrap_operations) != len(EXPECTED_BOOTSTRAP_OPERATIONS)
        or set(bootstrap_operations) != EXPECTED_BOOTSTRAP_OPERATIONS
    ):
        failures.append("included_operations must equal the five bootstrap operations")

    path_equivalents = contract.get("path_equivalents", {})
    if path_equivalents not in ({}, None):
        failures.append(
            "path_equivalents must be empty; aliases cannot collapse distinct OpenAPI operations"
        )

    counts = contract.get("expected_operation_counts")
    if not isinstance(counts, dict):
        failures.append("expected_operation_counts must be an object")
        counts = {}
    for key, expected in EXPECTED_OPERATION_COUNTS.items():
        if counts.get(key) != expected:
            failures.append(f"expected_operation_counts.{key} must equal {expected}")

    raw_domains = contract.get("expected_schema_domains")
    schema_domains = (
        [str(domain) for domain in raw_domains]
        if isinstance(raw_domains, list)
        else []
    )
    if not isinstance(raw_domains, list):
        failures.append("expected_schema_domains must be a list")
    if len(schema_domains) != len(set(schema_domains)):
        failures.append("expected_schema_domains contains duplicates")
    if set(schema_domains) != EXPECTED_SCHEMA_DOMAINS:
        failures.append("expected_schema_domains must equal the 17-domain v1 inventory")

    required_layers = contract.get("required_layers")
    if not isinstance(required_layers, list) or not required_layers:
        failures.append("required_layers must be a non-empty list")
        required_layers = []
    required_values = [str(value) for value in required_layers]
    required_ids = set(required_values)
    if len(required_values) != len(required_ids):
        failures.append("required_layers contains duplicates")
    missing_required_layers = sorted(REQUIRED_LAYERS - required_ids)
    if missing_required_layers:
        failures.append(
            "required_layers missing: " + ", ".join(missing_required_layers)
        )

    raw_hard_fail_states = contract.get("hard_fail_states")
    hard_fail_states = (
        {str(value) for value in raw_hard_fail_states}
        if isinstance(raw_hard_fail_states, list)
        else set()
    )
    if not isinstance(raw_hard_fail_states, list):
        failures.append("hard_fail_states must be a list")
    missing_hard_fail_states = sorted(REQUIRED_HARD_FAIL_STATES - hard_fail_states)
    if missing_hard_fail_states:
        failures.append(
            "hard_fail_states missing: " + ", ".join(missing_hard_fail_states)
        )

    freshness = contract.get("freshness")
    if not isinstance(freshness, dict):
        failures.append("freshness must be an object")
    else:
        if freshness.get("require_live_provider_for_certification") is not True:
            failures.append("freshness must require live provider for certification")
        if freshness.get("require_current_run_artifacts") is not True:
            failures.append("freshness must require current-run artifacts")
        if freshness.get("allow_summarize_existing_for_certification") is not False:
            failures.append("summarize-existing cannot certify")

    raw_capabilities = contract.get("capabilities")
    if not isinstance(raw_capabilities, list):
        failures.append("capabilities must be a list")
        raw_capabilities = []

    capabilities: dict[str, dict[str, Any]] = {}
    duplicates: set[str] = set()
    for raw in raw_capabilities:
        if not isinstance(raw, dict):
            failures.append("capability entries must be objects")
            continue
        capability_id = str(raw.get("id") or "").strip()
        capability_mode = str(raw.get("mode") or "").strip()
        status = str(raw.get("status") or "").strip()
        if not capability_id:
            failures.append("capability id must not be empty")
            continue
        if capability_id in capabilities:
            duplicates.add(capability_id)
        if capability_mode not in VALID_MODES:
            failures.append(f"{capability_id}: invalid mode={capability_mode!r}")
        if status not in VALID_STATUSES:
            failures.append(f"{capability_id}: invalid status={status!r}")
        expected_status = V1_CAPABILITY_STATUSES.get(capability_id)
        if expected_status is not None and status != expected_status:
            failures.append(
                f"{capability_id}: v1 measured status must remain {expected_status!r}; "
                f"actual={status!r}"
            )
        if status == "implemented" and not str(raw.get("evidence") or "").strip():
            failures.append(f"{capability_id}: implemented capability needs evidence")
        if status in {"partial", "missing"} and not str(
            raw.get("exit_criteria") or ""
        ).strip():
            failures.append(f"{capability_id}: incomplete capability needs exit_criteria")
        raw_check_ids = raw.get("required_check_ids")
        check_ids = (
            tuple(str(check_id) for check_id in raw_check_ids)
            if isinstance(raw_check_ids, list)
            else ()
        )
        expected_check_ids = EXPECTED_CAPABILITY_CHECK_BINDINGS.get(capability_id)
        if expected_check_ids is None:
            failures.append(f"{capability_id}: capability has no executable binding")
        elif check_ids != expected_check_ids:
            failures.append(f"{capability_id}: required_check_ids binding mismatch")
        capabilities[capability_id] = raw

    if duplicates:
        failures.append("duplicate capabilities: " + ", ".join(sorted(duplicates)))
    missing_capabilities = sorted(required_ids - set(capabilities))
    if missing_capabilities:
        failures.append("required capabilities missing: " + ", ".join(missing_capabilities))

    applicable = {
        capability_id: raw
        for capability_id, raw in capabilities.items()
        if raw.get("mode") == "static" or mode == "full"
    }
    incomplete = {
        capability_id: str(raw.get("status"))
        for capability_id, raw in applicable.items()
        if raw.get("status") != "implemented"
    }
    for capability_id, status in sorted(incomplete.items()):
        failures.append(f"{capability_id}: capability status={status}")

    return {
        "audit_id": contract.get("id"),
        "mode": mode,
        "required_layer_count": len(required_ids),
        "capability_count": len(capabilities),
        "applicable_capability_count": len(applicable),
        "implemented_applicable_count": sum(
            1 for raw in applicable.values() if raw.get("status") == "implemented"
        ),
        "incomplete": incomplete,
        "failures": failures,
        "status": "pass" if not failures else "fail",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", default=str(DEFAULT_SCOPE))
    parser.add_argument("--mode", choices=sorted(VALID_MODES), default="full")
    args = parser.parse_args()

    try:
        report = evaluate_contract(load_contract(Path(args.scope)), args.mode)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL: invalid API pipeline scope: {error}")
        return 1

    print(f"audit_id={report['audit_id']}")
    print(f"mode={report['mode']}")
    print(f"required_layers={report['required_layer_count']}")
    print(f"capabilities={report['capability_count']}")
    print(f"implemented_applicable={report['implemented_applicable_count']}")
    print(f"status={report['status']}")
    for failure in report["failures"]:
        print(f"FAIL {failure}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
