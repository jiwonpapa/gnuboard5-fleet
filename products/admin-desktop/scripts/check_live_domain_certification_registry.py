#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from audit_harness.paths import resolve_openapi_manifest_path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "specs/integration/LIVE_DOMAIN_CERTIFICATION.json"
DEFAULT_SCOPE = ROOT / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
DEFAULT_OPENAPI_MANIFEST = resolve_openapi_manifest_path(ROOT)
SCHEMA = "gnuboard5.rust.live-domain-certification-registry/v1"
PHASES = (
    "baseline",
    "setup",
    "mutate",
    "readback",
    "cleanup",
    "unavailable_probe",
)
MUTATING_MODES = {
    "reversible_entity",
    "reversible_snapshot",
    "reversible_ledger",
    "optional_reversible_entity",
    "optional_reversible_snapshot",
}
OPTIONAL_MODES = {
    "optional_reversible_entity",
    "optional_reversible_snapshot",
    "read_only_external_guard",
}
EXTERNAL_DELIVERY_OPERATIONS = {
    "adminCreateMailTest",
    "adminCreateSmsMessage",
    "adminResendAllSmsBatch",
    "adminResendSmsFailures",
    "adminSendMail",
    "adminSendTestMail",
    "adminSystemSendMailTest",
    "adminSystemSendMemberMail",
}


def load_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return payload


def expected_domains(scope: dict[str, Any]) -> set[str]:
    raw = scope.get("audit_contract", {}).get("expected_schema_domains", [])
    if not isinstance(raw, list):
        return set()
    return {str(item) for item in raw if isinstance(item, str) and item}


def openapi_operation_ids(manifest: dict[str, Any]) -> set[str]:
    raw = manifest.get("operations", [])
    if not isinstance(raw, list):
        return set()
    return {
        str(item.get("operation_id"))
        for item in raw
        if isinstance(item, dict)
        and isinstance(item.get("operation_id"), str)
        and str(item.get("operation_id"))
        and not str(item.get("path") or "").startswith("/admin/shop/")
    }


def dependency_failures(rows: dict[str, dict[str, Any]]) -> list[str]:
    failures: list[str] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(domain: str, trail: tuple[str, ...]) -> None:
        if domain in visiting:
            failures.append("dependency cycle: " + " -> ".join((*trail, domain)))
            return
        if domain in visited:
            return
        visiting.add(domain)
        raw_dependencies = rows[domain].get("depends_on", [])
        dependencies = raw_dependencies if isinstance(raw_dependencies, list) else []
        for dependency in dependencies:
            if not isinstance(dependency, str) or dependency not in rows:
                failures.append(f"{domain}: unknown dependency={dependency!r}")
                continue
            visit(dependency, (*trail, domain))
        visiting.remove(domain)
        visited.add(domain)

    for domain in sorted(rows):
        visit(domain, ())
    return failures


def evaluate(
    registry: dict[str, Any],
    scope: dict[str, Any],
    manifest: dict[str, Any],
) -> dict[str, Any]:
    failures: list[str] = []
    if registry.get("schema") != SCHEMA:
        failures.append("registry schema mismatch")
    if registry.get("audit_id") != "API_PIPELINE_AUDIT_V1":
        failures.append("registry audit_id mismatch")

    policy = registry.get("policy")
    if not isinstance(policy, dict):
        failures.append("policy must be an object")
        policy = {}
    required_policy = {
        "allow_external_delivery": False,
        "require_readback_after_mutation": True,
        "require_cleanup_after_mutation": True,
        "require_current_run_artifact": True,
    }
    for key, value in required_policy.items():
        if policy.get(key) is not value:
            failures.append(f"policy.{key} must be {str(value).lower()}")
    raw_allowed_modes = policy.get("allowed_modes", [])
    allowed_modes = (
        {str(mode) for mode in raw_allowed_modes}
        if isinstance(raw_allowed_modes, list)
        else set()
    )
    expected_modes = MUTATING_MODES | {"read_only_external_guard"}
    if allowed_modes != expected_modes:
        failures.append("policy.allowed_modes does not match the v1 strategy inventory")

    raw_rows = registry.get("domains")
    domain_rows = [row for row in raw_rows if isinstance(row, dict)] if isinstance(raw_rows, list) else []
    rows: dict[str, dict[str, Any]] = {}
    duplicate_domains: set[str] = set()
    for row in domain_rows:
        domain = str(row.get("domain") or "")
        if domain in rows:
            duplicate_domains.add(domain)
        if domain:
            rows[domain] = row
    if duplicate_domains:
        failures.append("duplicate domains: " + ", ".join(sorted(duplicate_domains)))

    expected = expected_domains(scope)
    if set(rows) != expected:
        failures.append(
            "domain inventory mismatch: "
            f"expected={','.join(sorted(expected))} actual={','.join(sorted(rows))}"
        )
    if registry.get("expected_domain_count") != len(expected) or len(domain_rows) != len(expected):
        failures.append("expected_domain_count or domain row count mismatch")

    known_operations = openapi_operation_ids(manifest)
    if not known_operations:
        failures.append("OpenAPI operation scanner returned zero operations")

    mode_counts = {mode: 0 for mode in sorted(expected_modes)}
    executable_operations: set[str] = set()
    excluded_operations: set[str] = set()
    for domain, row in sorted(rows.items()):
        mode = str(row.get("mode") or "")
        if mode not in allowed_modes:
            failures.append(f"{domain}: unsupported mode={mode!r}")
        elif mode in mode_counts:
            mode_counts[mode] += 1

        dependencies = row.get("depends_on")
        if not isinstance(dependencies, list) or any(
            not isinstance(item, str) or not item for item in dependencies
        ):
            failures.append(f"{domain}: depends_on must be a string list")

        operations = row.get("operations")
        if not isinstance(operations, dict):
            failures.append(f"{domain}: operations must be an object")
            continue
        phase_values: dict[str, list[str]] = {}
        for phase in PHASES:
            raw_values = operations.get(phase)
            values = (
                [str(value) for value in raw_values]
                if isinstance(raw_values, list)
                and all(isinstance(value, str) and value for value in raw_values)
                else []
            )
            if not isinstance(raw_values, list) or len(values) != len(raw_values):
                failures.append(f"{domain}: operations.{phase} must be a string list")
            if len(values) != len(set(values)):
                failures.append(f"{domain}: operations.{phase} contains duplicates")
            phase_values[phase] = values
            executable_operations.update(values)
            for operation_id in values:
                if operation_id not in known_operations:
                    failures.append(f"{domain}: unknown OpenAPI operation={operation_id}")

        if not phase_values["baseline"]:
            failures.append(f"{domain}: baseline operation is required")
        if not phase_values["readback"]:
            failures.append(f"{domain}: readback operation is required")
        if mode in MUTATING_MODES:
            if not phase_values["mutate"]:
                failures.append(f"{domain}: mutating mode requires mutate operations")
            if not phase_values["cleanup"]:
                failures.append(f"{domain}: mutating mode requires cleanup operations")
        elif phase_values["mutate"] or phase_values["cleanup"]:
            failures.append(f"{domain}: read-only mode cannot declare mutate or cleanup")
        if mode in OPTIONAL_MODES and not phase_values["unavailable_probe"]:
            failures.append(f"{domain}: optional mode requires unavailable_probe")

        raw_excluded = row.get("excluded_irreversible_operations")
        excluded = (
            [str(value) for value in raw_excluded]
            if isinstance(raw_excluded, list)
            and all(isinstance(value, str) and value for value in raw_excluded)
            else []
        )
        if not isinstance(raw_excluded, list) or len(excluded) != len(raw_excluded):
            failures.append(f"{domain}: excluded_irreversible_operations must be a string list")
        excluded_operations.update(excluded)
        for operation_id in excluded:
            if operation_id not in known_operations:
                failures.append(f"{domain}: unknown excluded operation={operation_id}")
        if mode == "read_only_external_guard" and not excluded:
            failures.append(f"{domain}: external guard needs at least one excluded operation")

    failures.extend(dependency_failures(rows))
    unsafe_excluded = sorted(excluded_operations & executable_operations)
    if unsafe_excluded:
        failures.append(
            "excluded irreversible operations cannot execute: "
            + ", ".join(unsafe_excluded)
        )
    unsafe_executable = sorted(EXTERNAL_DELIVERY_OPERATIONS & executable_operations)
    if unsafe_executable:
        failures.append(
            "external delivery operations cannot execute: " + ", ".join(unsafe_executable)
        )
    missing_external_guards = sorted(
        (EXTERNAL_DELIVERY_OPERATIONS & known_operations) - excluded_operations
    )
    if missing_external_guards:
        failures.append(
            "external delivery operations missing explicit guard: "
            + ", ".join(missing_external_guards)
        )

    return {
        "schema": SCHEMA,
        "status": "passed" if not failures else "failed",
        "domain_count": len(rows),
        "operation_count": len(executable_operations),
        "excluded_operation_count": len(excluded_operations),
        "mode_counts": mode_counts,
        "failures": failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", default=str(DEFAULT_REGISTRY))
    parser.add_argument("--scope", default=str(DEFAULT_SCOPE))
    parser.add_argument(
        "--openapi-manifest",
        default=os.getenv("G5_OPENAPI_MANIFEST_PATH", str(DEFAULT_OPENAPI_MANIFEST)),
    )
    parser.add_argument("--output-json")
    parser.add_argument("--audit-run-id", default="")
    args = parser.parse_args()
    try:
        report = evaluate(
            load_object(Path(args.registry)),
            load_object(Path(args.scope)),
            load_object(Path(args.openapi_manifest)),
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL: live domain registry load error: {error}")
        return 1

    report["audit_run_id"] = args.audit_run_id

    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(f"domains={report['domain_count']}")
    print(f"operations={report['operation_count']}")
    print(f"excluded_operations={report['excluded_operation_count']}")
    print(f"status={report['status']}")
    for failure in report["failures"]:
        print(f"FAIL {failure}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
