#!/usr/bin/env python3
"""Fail-closed proof for the active Rust OpenAPI wire consumer."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import run_integrated_audit as integrated
from audit_harness.paths import resolve_php_root

ROOT = Path(__file__).resolve().parents[1]
PHP_ROOT = resolve_php_root(ROOT)


def require_source(path: Path, tokens: tuple[str, ...], failures: list[str]) -> None:
    if not path.is_file():
        failures.append(f"missing source: {path.relative_to(ROOT)}")
        return
    source = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in source:
            failures.append(f"{path.relative_to(ROOT)} missing runtime binding: {token}")


def main() -> int:
    failures: list[str] = []
    generation = subprocess.run(
        [sys.executable, str(ROOT / "scripts/generate_rust_openapi_wire.py"), "--check"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if generation.returncode != 0:
        failures.append(generation.stdout.strip() or generation.stderr.strip())

    openapi_fields = integrated.extract_openapi_schema_signatures(PHP_ROOT)
    rust_fields = integrated.extract_rust_ts_schema_signatures(ROOT)
    parity = integrated.compare_field_parity(openapi_fields, rust_fields)
    for key in (
        "mismatch_count",
        "signature_mismatch_count",
        "unverified_count",
        "missing_rust_schema_count",
    ):
        if parity.get(key) != 0:
            failures.append(f"wire field parity {key}={parity.get(key)}")
    if parity.get("compared_field_count", 0) < 1_600:
        failures.append(
            f"wire field scanner coverage regressed: {parity.get('compared_field_count', 0)}"
        )

    consumer_scope = integrated.load_active_consumer_scope_metrics(ROOT)
    all_operations = integrated.extract_php_openapi_operations(PHP_ROOT, {})
    active_operations = [
        operation
        for operation in all_operations
        if integrated.is_active_consumer_operation(
            operation["method"], operation["path"], consumer_scope
        )
        and not integrated.is_provider_only_path(operation["path"], consumer_scope)
    ]
    generated_path = ROOT / "g5-admin-models/src/openapi_wire/generated.rs"
    generated_source = generated_path.read_text(encoding="utf-8") if generated_path.is_file() else ""
    marker = 'pub const ACTIVE_CONTRACT_JSON: &str = r###"'
    if marker not in generated_source:
        failures.append("generated active contract manifest is missing")
        manifest = {}
    else:
        encoded = generated_source.split(marker, 1)[1].split('"###;', 1)[0]
        try:
            manifest = json.loads(encoded)
        except json.JSONDecodeError as error:
            failures.append(f"generated active contract manifest is invalid: {error}")
            manifest = {}
    generated_operations = manifest.get("operations", []) if isinstance(manifest, dict) else []
    if len(active_operations) != 189:
        failures.append(f"canonical active operation count={len(active_operations)} expected=189")
    if len(generated_operations) != 189:
        failures.append(f"generated active operation count={len(generated_operations)} expected=189")
    expected_edges = {(item["method"], item["path"]) for item in active_operations}
    generated_edges = {
        (
            str(item.get("method")),
            integrated.normalize_path(str(item.get("path"))),
        )
        for item in generated_operations
        if isinstance(item, dict)
    }
    if expected_edges != generated_edges:
        failures.append("generated active method/path set differs from canonical OpenAPI")

    require_source(
        ROOT / "g5-admin-api-client/src/lib.rs",
        (
            "TransportClient::new_with_wire_contract",
            "validate_active_request",
            "validate_active_response",
        ),
        failures,
    )
    require_source(
        ROOT / "g5-admin-transport/src/request_io.rs",
        (
            "validate_request_contract(",
            "validate_serialized_request_contract(",
            "validate_response_contract(",
            "response_content_type.as_deref()",
            "multipart/form-data",
        ),
        failures,
    )
    require_source(
        ROOT / "g5-admin-transport/src/request.rs",
        ("serde_json::from_str::<T>",),
        failures,
    )
    request_io_source = (ROOT / "g5-admin-transport/src/request_io.rs").read_text(encoding="utf-8")
    if request_io_source.find("validate_response_contract(") > request_io_source.find(
        "api_error_from_response("
    ):
        failures.append("response contract validation must run before API error mapping")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return 1
    print("rust_openapi_wire=PASS")
    print("active_operations=189")
    print(f"wire_object_schemas={parity['compared_count']}")
    print(f"wire_fields={parity['compared_field_count']}")
    print("request_response_runtime_validation=enabled")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
