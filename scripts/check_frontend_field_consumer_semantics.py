#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import check_admin_domain_consumer_parity as parity


RUST_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    failures: list[str] = []
    reports = []
    for adapter in parity.SOURCE_GRAPH_ADAPTERS:
        report = parity.compare_source_graph_consumer(adapter)
        reports.append(report)
        if report.get("status") != "pass":
            failures.append(
                f"{adapter.domain}: missing_fields={report.get('missing_fields')} "
                f"missing_save={report.get('missing_save_fields')} "
                f"type_mismatches={report.get('type_mismatches')}"
            )

    legacy_type = (
        RUST_ROOT / "g5-admin/src/types/AdminFieldSchema.ts"
    ).read_text(encoding="utf-8")
    option_source_type = RUST_ROOT / "g5-admin/src/types/AdminFieldOptionSource.ts"
    runtime_guard = (
        RUST_ROOT / "g5-admin/src/features/schema/useAdminFieldSchema.ts"
    ).read_text(encoding="utf-8")
    if "option_source" not in legacy_type or not option_source_type.is_file():
        failures.append("Tauri presentation binding drops AdminFieldSchema.option_source")
    for token in (
        "input_type",
        "data_type",
        "required",
        "create_only",
        "readonly_on_update",
        "default_value",
        "options",
        "option_source",
        "validateAdminFieldSchema",
    ):
        if token not in runtime_guard:
            failures.append(f"runtime field metadata guard token missing: {token}")

    summary = {
        "status": "fail" if failures else "pass",
        "domain_count": len(reports),
        "field_count": sum(len(report.get("expected_fields") or []) for report in reports),
        "save_field_count": sum(len(report.get("save_fields") or []) for report in reports),
        "dynamic_option_source_count": sum(
            len(report.get("dynamic_option_sources") or []) for report in reports
        ),
        "runtime_directory_option_sources": sorted(
            {
                f"{report['domain']}:{field}"
                for report in reports
                for field in report.get("runtime_directory_option_sources") or []
            }
        ),
        "failures": failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
