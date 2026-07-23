#!/usr/bin/env python3
"""Run current PHP Slim runtime and handler field-flow capability probes."""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from audit_harness.paths import resolve_php_root

ROOT = Path(__file__).resolve().parents[1]
PHP_ROOT = resolve_php_root(ROOT)


def evaluate_runtime_report(report: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if report.get("schema") != "gnuboard5.php.runtime-route-graph/v3":
        failures.append("runtime route graph schema mismatch")
    if report.get("status") != "passed" or report.get("certified") is not True:
        failures.append("runtime route graph is not passed and certified")
    stats = report.get("stats") if isinstance(report.get("stats"), dict) else {}
    exact = {
        "active_operation_count": 189,
        "protected_operation_count": 26,
        "audited_operation_count": 215,
        "admin_non_shop_operation_count": 184,
        "bootstrap_operation_count": 5,
        "active_handler_binding_count": 189,
        "protected_handler_binding_count": 26,
        "audited_handler_binding_count": 215,
        "active_missing_in_openapi_count": 0,
        "active_extra_in_openapi_count": 0,
        "protected_missing_in_openapi_count": 0,
        "protected_extra_in_openapi_count": 0,
        "active_security_mismatch_count": 0,
        "protected_security_mismatch_count": 0,
        "active_response_contract_mismatch_count": 0,
        "protected_response_contract_mismatch_count": 0,
        "active_unresolved_handler_count": 0,
        "protected_unresolved_handler_count": 0,
        "active_duplicate_operation_count": 0,
        "protected_duplicate_operation_count": 0,
        "blocking_finding_count": 0,
    }
    for key, expected in exact.items():
        if stats.get(key) != expected:
            failures.append(f"runtime stats.{key}: expected={expected} actual={stats.get(key)}")
    bindings = report.get("bindings")
    if not isinstance(bindings, list) or len(bindings) < 215:
        failures.append("runtime handler binding evidence is missing or truncated")
    return failures


def evaluate_handler_report(report: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if report.get("status") != "passed" or report.get("certified") is not True:
        failures.append("PHP handler field-flow report is not passed and certified")
    stats = report.get("stats") if isinstance(report.get("stats"), dict) else {}
    exact = {
        "active_operation_count": 189,
        "protected_operation_count": 26,
        "audited_operation_count": 215,
        "admin_non_shop_operation_count": 184,
        "bootstrap_operation_count": 5,
        "operation_report_count": 215,
        "passed_operation_count": 215,
        "failed_operation_count": 0,
        "finding_count": 0,
    }
    for key, expected in exact.items():
        if stats.get(key) != expected:
            failures.append(f"handler stats.{key}: expected={expected} actual={stats.get(key)}")
    operations = report.get("operations")
    if not isinstance(operations, list) or len(operations) != 215:
        failures.append("handler operation evidence must contain exactly 215 audited operations")
        return failures
    for operation in operations:
        if not isinstance(operation, dict):
            failures.append("handler operation row is not an object")
            continue
        edge = str(operation.get("operation") or "unknown")
        if operation.get("status") != "passed":
            failures.append(f"{edge}: handler field-flow status is not passed")
        for key in (
            "finding_rules",
            "missing_request_fields",
            "missing_response_fields",
            "undocumented_implementation_fields",
            "missing_required_layers",
            "request_semantics_unproven",
            "response_semantics_unproven",
            "dynamic_accesses",
        ):
            value = operation.get(key)
            if value not in (None, [], {}):
                failures.append(f"{edge}: non-empty {key}")
    layer_counts = stats.get("layer_reach_operation_counts") or {}
    if not isinstance(layer_counts, dict) or layer_counts.get("Controller", 0) < 200:
        failures.append("handler Controller layer reach is missing")
    if not isinstance(layer_counts, dict) or layer_counts.get("Service", 0) < 200:
        failures.append("handler Service layer reach is missing")
    if not isinstance(layer_counts, dict) or layer_counts.get("Repository", 0) < 200:
        failures.append("handler Repository layer reach is missing")
    return failures


def run(command: tuple[str, ...]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=PHP_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("runtime-route", "handler-binding"), required=True)
    args = parser.parse_args()
    failures: list[str] = []
    command_tails: list[str] = []
    stats: dict[str, Any] = {}

    with tempfile.TemporaryDirectory(prefix="g5-php-runtime-capability-") as directory:
        output = Path(directory)
        runtime_path = output / "runtime-route-graph.json"
        runtime = run(
            (
                "php",
                "scripts/extract_runtime_route_graph.php",
                "--consumer-scope",
                "api/docs/openapi.phase1-consumer-scope.json",
                "--output",
                str(runtime_path),
            )
        )
        command_tails.extend((runtime.stdout + "\n" + runtime.stderr).splitlines()[-20:])
        if runtime.returncode != 0 or not runtime_path.is_file():
            failures.append(f"runtime route extractor failed with {runtime.returncode}")
        else:
            runtime_report = json.loads(runtime_path.read_text(encoding="utf-8"))
            failures.extend(evaluate_runtime_report(runtime_report))
            stats = dict(runtime_report.get("stats") or {})

        if args.mode == "runtime-route" and not failures:
            tests = run(
                (
                    "vendor/bin/phpunit",
                    "tests/contract/RuntimeRouteGraphTest.php",
                )
            )
            command_tails.extend((tests.stdout + "\n" + tests.stderr).splitlines()[-20:])
            if tests.returncode != 0:
                failures.append(f"runtime route mutation tests failed with {tests.returncode}")

        if args.mode == "handler-binding" and not failures:
            handler_path = output / "handler-binding.json"
            handler_md = output / "handler-binding.md"
            handler = run(
                (
                    "php",
                    "scripts/check_openapi_field_bindings.php",
                    "--runtime-graph",
                    str(runtime_path),
                    "--output-json",
                    str(handler_path),
                    "--output-md",
                    str(handler_md),
                )
            )
            command_tails.extend((handler.stdout + "\n" + handler.stderr).splitlines()[-20:])
            if handler.returncode != 0 or not handler_path.is_file():
                failures.append(f"handler field-flow audit failed with {handler.returncode}")
            else:
                handler_report = json.loads(handler_path.read_text(encoding="utf-8"))
                failures.extend(evaluate_handler_report(handler_report))
                stats = dict(handler_report.get("stats") or {})
            tests = run(
                (
                    "vendor/bin/phpunit",
                    "tests/contract/OpenApiFieldBindingAuditTest.php",
                    "tests/contract/OpenApiProviderAuditWiringTest.php",
                )
            )
            command_tails.extend((tests.stdout + "\n" + tests.stderr).splitlines()[-20:])
            if tests.returncode != 0:
                failures.append(f"handler field-flow mutation tests failed with {tests.returncode}")

    summary = {
        "status": "fail" if failures else "pass",
        "mode": args.mode,
        "active_operations": stats.get("active_operation_count"),
        "protected_operations": stats.get("protected_operation_count"),
        "audited_operations": stats.get("audited_operation_count"),
        "command_output_tail": [line for line in command_tails if line.strip()][-30:],
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
