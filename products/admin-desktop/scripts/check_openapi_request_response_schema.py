#!/usr/bin/env python3
"""Verify the full active operation request/response contract fingerprint."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import generate_rust_openapi_wire as generator
import yaml
from audit_harness.paths import resolve_openapi_path

ROOT = Path(__file__).resolve().parents[1]
PHP_OPENAPI = resolve_openapi_path(ROOT)
GENERATED = ROOT / "g5-admin-models/src/openapi_wire/generated.rs"
MANIFEST_MARKER = 'pub const ACTIVE_CONTRACT_JSON: &str = r###"'
PROBLEM_REF = "#/components/schemas/ProblemDetails"


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def fingerprint(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def load_generated_manifest(path: Path = GENERATED) -> dict[str, Any]:
    source = path.read_text(encoding="utf-8")
    if MANIFEST_MARKER not in source:
        raise ValueError("generated active contract marker is missing")
    encoded = source.split(MANIFEST_MARKER, 1)[1].split('"###;', 1)[0]
    payload = json.loads(encoded)
    if not isinstance(payload, dict):
        raise ValueError("generated active contract must be an object")
    return payload


def evaluate_manifest(
    canonical: dict[str, Any], generated: dict[str, Any]
) -> dict[str, Any]:
    failures: list[str] = []
    expected_operations = canonical.get("operations")
    actual_operations = generated.get("operations")
    if not isinstance(expected_operations, list) or not isinstance(actual_operations, list):
        return {"status": "fail", "failures": ["operations must be arrays"]}

    expected_by_edge = {
        (str(item.get("method")), str(item.get("path"))): item
        for item in expected_operations
        if isinstance(item, dict)
    }
    actual_by_edge = {
        (str(item.get("method")), str(item.get("path"))): item
        for item in actual_operations
        if isinstance(item, dict)
    }
    if len(expected_operations) != 189 or len(expected_by_edge) != 189:
        failures.append(
            f"canonical active operation inventory must be 189, got {len(expected_operations)}"
        )
    if set(expected_by_edge) != set(actual_by_edge):
        failures.append("generated active method/path inventory differs from canonical OpenAPI")

    parameter_count = 0
    response_count = 0
    error_response_count = 0
    for edge, expected in sorted(expected_by_edge.items()):
        actual = actual_by_edge.get(edge)
        if actual is None:
            continue
        if fingerprint(expected) != fingerprint(actual):
            failures.append(f"{edge[0]} {edge[1]}: operation semantic fingerprint mismatch")
            continue
        if not expected.get("operation_id"):
            failures.append(f"{edge[0]} {edge[1]}: operationId missing")
        security = expected.get("security")
        if not isinstance(security, list):
            failures.append(f"{edge[0]} {edge[1]}: explicit/effective security missing")
        if edge[1].startswith("/admin/") and security != [{"bearerAuth": []}]:
            failures.append(f"{edge[0]} {edge[1]}: admin bearerAuth security mismatch")

        parameters = expected.get("parameters") or []
        parameter_count += len(parameters)
        path_parameters = {
            str(parameter.get("name")): parameter
            for parameter in parameters
            if isinstance(parameter, dict) and parameter.get("in") == "path"
        }
        for name in re.findall(r"\{([^}]+)\}", edge[1]):
            parameter = path_parameters.get(name)
            if parameter is None or parameter.get("required") is not True:
                failures.append(
                    f"{edge[0]} {edge[1]}: required path parameter {name} is not bound"
                )
        for parameter in parameters:
            if not isinstance(parameter, dict) or not parameter.get("name"):
                failures.append(f"{edge[0]} {edge[1]}: malformed parameter contract")
            elif not isinstance(parameter.get("schema"), dict):
                failures.append(
                    f"{edge[0]} {edge[1]}: parameter {parameter.get('name')} schema missing"
                )

        request = expected.get("request")
        if request is not None:
            content = request.get("content") if isinstance(request, dict) else None
            media_type = request.get("media_type") if isinstance(request, dict) else None
            if not isinstance(content, dict) or not content or media_type not in content:
                failures.append(f"{edge[0]} {edge[1]}: request media/schema contract incomplete")

        responses = expected.get("responses")
        if not isinstance(responses, dict) or not responses:
            failures.append(f"{edge[0]} {edge[1]}: response contract missing")
            continue
        response_count += len(responses)
        if not any(str(status).startswith("2") for status in responses):
            failures.append(f"{edge[0]} {edge[1]}: success response status missing")
        for status, response in responses.items():
            if not isinstance(response, dict):
                failures.append(f"{edge[0]} {edge[1]} {status}: malformed response")
                continue
            content = response.get("content") or {}
            media_type = response.get("media_type")
            if content and media_type not in content:
                failures.append(
                    f"{edge[0]} {edge[1]} {status}: response media/schema contract incomplete"
                )
            if not str(status).startswith("2"):
                error_response_count += 1
                schema = response.get("schema")
                if not isinstance(schema, dict) or schema.get("$ref") != PROBLEM_REF:
                    failures.append(
                        f"{edge[0]} {edge[1]} {status}: error response is not RFC7807 ProblemDetails"
                    )

    if parameter_count == 0 or response_count == 0 or error_response_count == 0:
        failures.append("operation semantic scanner returned zero evidence")
    return {
        "status": "fail" if failures else "pass",
        "operation_count": len(actual_operations),
        "parameter_count": parameter_count,
        "response_count": response_count,
        "error_response_count": error_response_count,
        "manifest_fingerprint": fingerprint(actual_operations),
        "failures": failures,
    }


def main() -> None:
    document = yaml.safe_load(PHP_OPENAPI.read_text(encoding="utf-8"))
    canonical = generator.build_contract_manifest(document)
    generated = load_generated_manifest()
    summary = evaluate_manifest(canonical, generated)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    raise SystemExit(0 if summary["status"] == "pass" else 1)


if __name__ == "__main__":
    main()
