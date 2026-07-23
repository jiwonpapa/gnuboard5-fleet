#!/usr/bin/env python3
from __future__ import annotations

import sys

from php_structure_findings import collect_findings, collect_metrics


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def main() -> int:
    findings = collect_findings()
    metrics = collect_metrics()
    failures = [finding for finding in findings if finding.severity == "failure"]
    warnings = [finding for finding in findings if finding.severity == "warning"]

    print("[php_structure_audit]")
    print(f"root_orchestrators=3")
    print(f"service_repository_files={metrics['service_repository_count']}")
    print(f"integration_contract_reference_files={metrics['integration_contract_reference_count']}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(metrics['top_service_repository']) + 1}")

    print_section("notes")
    top_entries = metrics["top_service_repository"]
    if top_entries:
        for item in top_entries[:10]:
            print(f"NOTE top_service_repository {item['lines']:>4} {item['path']}")
    else:
        print("none")
    print(
        "NOTE thresholds root_warning=220 root_failure=320 service_repo_warning=320 service_repo_failure=480"
    )

    print_section("evidence")
    print("EVIDENCE root_orchestrators: `api/routes/v1.php`, `api/routes/v1/admin.php`, `api/container.php`")
    print("EVIDENCE scan_root: `api/v1`")
    print(f"EVIDENCE service_repository_count={metrics['service_repository_count']}")
    print(f"EVIDENCE integration_contract_reference_files={metrics['integration_contract_reference_count']}")
    print(f"EVIDENCE gateway_usage_rule_registry=`{metrics['gateway_rule_registry']}`")
    print(f"EVIDENCE gateway_usage_rule_registry_available={metrics['gateway_rule_registry_available']}")
    print(f"EVIDENCE local_only_gateway_rules={metrics['local_only_rule_count']}")
    print(f"EVIDENCE shared_inventory_gateway_rules={metrics['shared_inventory_rule_count']}")

    print_section("warnings")
    if warnings:
        for finding in warnings:
            print(f"WARN {finding.rule} {finding.path} :: {finding.detail}")
    else:
        print("none")

    print_section("failures")
    if failures:
        for finding in failures:
            print(f"FAIL {finding.rule} {finding.path} :: {finding.detail}")
        print("FAIL: active php structure audit")
        return 1

    print("none")
    print("PASS: active php structure audit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
