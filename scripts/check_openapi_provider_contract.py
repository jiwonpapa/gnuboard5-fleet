#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import generate_openapi_contract_manifest as contract_manifest
import phase1_consumer_scope as consumer_scope


ROOT_DIR = SCRIPT_DIR.parent
DEFAULT_OPENAPI = ROOT_DIR / "api/docs/openapi.yaml"
DEFAULT_POLICY = ROOT_DIR / "api/docs/openapi.audit-policy.json"
DEFAULT_CONSUMER_SCOPE = ROOT_DIR / "api/docs/openapi.phase1-consumer-scope.json"
MUTATING_METHODS = {"post", "put", "patch", "delete"}
SUCCESS_STATUS = re.compile(r"^2\d\d$")
NON_ERROR_STATUS = re.compile(r"^[23]\d\d$")
SERVER_ERROR_STATUS = re.compile(r"^5\d\d$")
PATH_PARAMETER = re.compile(r"\{([^}:]+)(?::[^}]+)?\}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fail-closed semantic audit for the canonical PHP OpenAPI contract.",
    )
    parser.add_argument("--input", default=str(DEFAULT_OPENAPI))
    parser.add_argument("--policy", default=str(DEFAULT_POLICY))
    parser.add_argument("--consumer-scope", default=str(DEFAULT_CONSUMER_SCOPE))
    parser.add_argument("--output-json")
    parser.add_argument("--output-md")
    parser.add_argument("--max-console-findings", type=int, default=30)
    return parser.parse_args()


def load_openapi(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        document = yaml.load(handle, Loader=contract_manifest.UniqueKeyLoader)
    if not isinstance(document, dict):
        raise SystemExit("OpenAPI root document must be a mapping.")
    return document


def load_policy(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("OpenAPI audit policy must be a JSON object.")
    if payload.get("schema") != "gnuboard5.php.openapi-provider-audit-policy/v1":
        raise SystemExit("Unsupported OpenAPI audit policy schema.")
    return payload


def iter_operations(
    document: dict[str, Any],
) -> Iterable[tuple[str, str, dict[str, Any], dict[str, Any]]]:
    paths = document.get("paths", {})
    if not isinstance(paths, dict):
        return
    for path in sorted(paths):
        path_item = paths[path]
        if not isinstance(path_item, dict):
            continue
        for method in contract_manifest.HTTP_METHODS:
            operation = path_item.get(method)
            if isinstance(operation, dict):
                yield path, method, path_item, operation


def add_finding(
    findings: list[dict[str, Any]],
    rule: str,
    detail: str,
    *,
    path: str | None = None,
    method: str | None = None,
    operation_id: str | None = None,
    location: str | None = None,
) -> None:
    findings.append(
        {
            "rule": rule,
            "severity": "failure",
            "detail": detail,
            "path": path,
            "method": method.upper() if isinstance(method, str) else None,
            "operation_id": operation_id,
            "location": location,
        }
    )


def is_internal_path(path: str, policy: dict[str, Any]) -> bool:
    return any(
        path.startswith(str(prefix))
        for prefix in policy.get("internal_path_prefixes", [])
    )


def response_map(operation: dict[str, Any]) -> dict[str, Any]:
    responses = operation.get("responses", {})
    return responses if isinstance(responses, dict) else {}


def resolve_object(document: dict[str, Any], value: Any) -> dict[str, Any]:
    return contract_manifest.resolve_component_object(document, value)


def schema_ref_name(schema: Any) -> str | None:
    if not isinstance(schema, dict):
        return None
    ref = schema.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/components/schemas/"):
        return None
    return ref.rsplit("/", 1)[-1]


def schema_has_explicit_required_contract(
    document: dict[str, Any],
    schema: Any,
    seen: set[str] | None = None,
) -> bool:
    """Return whether every accepted object variant requires an explicit field set."""
    if not isinstance(schema, dict):
        return False

    seen = set() if seen is None else set(seen)
    ref = schema.get("$ref")
    if isinstance(ref, str):
        if ref in seen:
            return False
        seen.add(ref)
        return schema_has_explicit_required_contract(
            document,
            resolve_object(document, schema),
            seen,
        )

    if "required" in schema:
        return isinstance(schema.get("required"), list)

    for keyword in ("oneOf", "anyOf"):
        alternatives = schema.get(keyword)
        if isinstance(alternatives, list) and alternatives:
            return all(
                schema_has_explicit_required_contract(document, alternative, seen)
                for alternative in alternatives
            )

    compositions = schema.get("allOf")
    if isinstance(compositions, list) and compositions:
        return any(
            schema_has_explicit_required_contract(document, composition, seen)
            for composition in compositions
        )

    return False


def schema_is_binary(document: dict[str, Any], schema: Any, seen: set[str] | None = None) -> bool:
    if not isinstance(schema, dict):
        return False
    seen = set() if seen is None else seen
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/"):
        if ref in seen:
            return False
        seen.add(ref)
        resolved = contract_manifest.resolve_pointer(document, ref)
        return schema_is_binary(document, resolved, seen)

    if schema.get("type") == "string" and schema.get("format") == "binary":
        return True
    for key in ("oneOf", "anyOf", "allOf"):
        variants = schema.get(key)
        if isinstance(variants, list) and variants:
            return all(schema_is_binary(document, item, set(seen)) for item in variants)
    return False


def schema_is_fieldless(document: dict[str, Any], schema: Any, seen: set[str] | None = None) -> bool:
    if not isinstance(schema, dict):
        return True
    seen = set() if seen is None else seen
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/"):
        if ref in seen:
            return False
        seen.add(ref)
        resolved = contract_manifest.resolve_pointer(document, ref)
        return schema_is_fieldless(document, resolved, seen)

    variants = []
    for key in ("oneOf", "anyOf", "allOf"):
        value = schema.get(key)
        if isinstance(value, list):
            variants.extend(value)
    if variants:
        return any(schema_is_fieldless(document, item, set(seen)) for item in variants)

    if schema.get("type") == "array" or "items" in schema:
        return schema_is_fieldless(document, schema.get("items"), seen)

    properties = schema.get("properties")
    if isinstance(properties, dict) and properties:
        return False
    return schema.get("type") == "object" or "additionalProperties" in schema


def effective_parameters(
    document: dict[str, Any],
    path_item: dict[str, Any],
    operation: dict[str, Any],
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    anonymous: list[dict[str, Any]] = []
    for source in (path_item.get("parameters", []), operation.get("parameters", [])):
        if not isinstance(source, list):
            continue
        for parameter in source:
            resolved = resolve_object(document, parameter)
            name = resolved.get("name")
            location = resolved.get("in")
            if isinstance(name, str) and isinstance(location, str):
                merged[(name, location)] = resolved
            elif resolved:
                anonymous.append(resolved)
    return [merged[key] for key in sorted(merged)] + anonymous


def collect_local_refs(value: Any) -> Iterable[str]:
    if isinstance(value, dict):
        ref = value.get("$ref")
        if isinstance(ref, str):
            yield ref
        for item in value.values():
            yield from collect_local_refs(item)
    elif isinstance(value, list):
        for item in value:
            yield from collect_local_refs(item)


def load_plugin_manifests(root: Path) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for path in sorted((root / "api/plugins").glob("*/*/manifest.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue
        name = payload.get("name")
        if not isinstance(name, str) or name == "":
            continue
        license_config = payload.get("license", {})
        protected = (
            license_config.get("protected_paths", [])
            if isinstance(license_config, dict)
            else []
        )
        result[name] = {
            "manifest": str(path.relative_to(root)),
            "protected_paths": sorted(
                str(item) for item in protected if isinstance(item, str)
            ),
        }
    return result


def audit_plugin_license(
    findings: list[dict[str, Any]],
    path: str,
    method: str,
    operation: dict[str, Any],
    plugin_manifests: dict[str, dict[str, Any]],
    status: str,
) -> None:
    if status not in response_map(operation):
        return
    parts = path.strip("/").split("/")
    if len(parts) < 3 or parts[0] != "p":
        add_finding(
            findings,
            "plugin_license_path_invalid",
            f"{status} 라이선스 응답이 있지만 /p/{{plugin}} 경로가 아닙니다.",
            path=path,
            method=method,
            operation_id=operation.get("operationId"),
        )
        return
    plugin_name = parts[1]
    suffix = "/" + "/".join(parts[2:])
    manifest = plugin_manifests.get(plugin_name, {})
    protected_paths = manifest.get("protected_paths", [])
    if suffix not in protected_paths:
        add_finding(
            findings,
            "plugin_license_path_unprotected",
            f"OpenAPI는 {status} 라이선스를 선언하지만 manifest protected_paths에 {suffix}가 없습니다.",
            path=path,
            method=method,
            operation_id=operation.get("operationId"),
            location=manifest.get("manifest"),
        )


def build_audit(
    document: dict[str, Any],
    policy: dict[str, Any],
    plugin_manifests: dict[str, dict[str, Any]],
    scope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if scope is None:
        legacy_active = policy.get("active_scope", {})
        scope = {
            "schema": consumer_scope.SCHEMA,
            "scope_id": "test-legacy-policy",
            "active_scope": {
                **legacy_active,
                "include_operations": legacy_active.get("include_operations", []),
                "expected_admin_non_shop_operations": 0,
                "expected_bootstrap_operations": 0,
                "expected_total_operations": 0,
            },
            "deferred_scope": {"fallback_classification": "non_admin"},
        }
    findings: list[dict[str, Any]] = []
    operations = list(iter_operations(document))
    active_operations = [
        item
        for item in operations
        if consumer_scope.is_active_operation(item[1], item[0], scope)
    ]
    protected_operations = [
        item
        for item in operations
        if consumer_scope.is_protected_operation(item[1], item[0], scope)
    ]
    generic_names = {
        str(item) for item in policy.get("generic_success_schema_names", [])
    }
    request_policy = policy.get("request_contract", {})
    response_policy = policy.get("response_contract", {})
    public_policy = policy.get("public_mutation_policy", {})
    declared_tags = {
        str(item.get("name"))
        for item in document.get("tags", [])
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }

    operation_ids: list[str] = []
    active_success_body_operations = 0
    protected_success_body_operations = 0
    active_freeform_success_operations: set[str] = set()
    protected_freeform_success_operations: set[str] = set()
    active_request_operations = 0
    protected_request_operations = 0
    audited_used_schema_names: set[str] = set()

    for ref in sorted(set(collect_local_refs(document))):
        if not ref.startswith("#/"):
            add_finding(findings, "external_ref_not_allowed", f"외부 $ref를 허용하지 않습니다: {ref}")
            continue
        try:
            contract_manifest.resolve_pointer(document, ref)
        except SystemExit:
            add_finding(findings, "unresolved_local_ref", f"해석할 수 없는 $ref입니다: {ref}")

    for path, method, path_item, operation in operations:
        is_active = consumer_scope.is_active_operation(method, path, scope)
        is_protected = consumer_scope.is_protected_operation(method, path, scope)
        is_audited = is_active or is_protected
        operation_id = operation.get("operationId")
        if not isinstance(operation_id, str) or operation_id == "":
            add_finding(
                findings,
                "operation_id_missing",
                "operationId가 없습니다.",
                path=path,
                method=method,
            )
            operation_id = None
        else:
            operation_ids.append(operation_id)

        for tag in operation.get("tags", []) if isinstance(operation.get("tags"), list) else []:
            if str(tag) not in declared_tags:
                add_finding(
                    findings,
                    "tag_not_declared",
                    f"사용한 tag가 top-level tags에 없습니다: {tag}",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )

        parameters = effective_parameters(document, path_item, operation)
        path_parameter_names: set[str] = set()
        for parameter in parameters:
            name = parameter.get("name")
            location = parameter.get("in")
            if not isinstance(name, str):
                add_finding(
                    findings,
                    "parameter_name_not_string",
                    f"parameter name은 문자열이어야 합니다: {name!r}",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )
                continue
            if location == "path":
                path_parameter_names.add(name)
                if parameter.get("required") is not True:
                    add_finding(
                        findings,
                        "path_parameter_not_required",
                        f"path parameter {name}은 required: true여야 합니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )
        placeholders = set(PATH_PARAMETER.findall(path))
        for name in sorted(placeholders - path_parameter_names):
            add_finding(
                findings,
                "path_parameter_missing",
                f"경로 placeholder에 대응하는 parameter가 없습니다: {name}",
                path=path,
                method=method,
                operation_id=operation_id,
            )
        for name in sorted(path_parameter_names - placeholders):
            add_finding(
                findings,
                "path_parameter_extra",
                f"경로에 없는 path parameter가 선언됐습니다: {name}",
                path=path,
                method=method,
                operation_id=operation_id,
            )

        responses = response_map(operation)
        if not any(NON_ERROR_STATUS.match(str(status)) for status in responses):
            add_finding(
                findings,
                "success_response_missing",
                "2xx 성공 또는 3xx 리다이렉트 응답이 없습니다.",
                path=path,
                method=method,
                operation_id=operation_id,
            )
        if response_policy.get("require_server_error_or_default", False) and not (
            "default" in responses
            or any(SERVER_ERROR_STATUS.match(str(status)) for status in responses)
        ):
            add_finding(
                findings,
                "server_error_response_missing",
                "500 계열 또는 default 오류 응답이 없습니다.",
                path=path,
                method=method,
                operation_id=operation_id,
            )
        if response_policy.get("require_rate_limit_response", False) and "429" not in responses:
            add_finding(
                findings,
                "rate_limit_response_missing",
                "전역 RateLimitMiddleware의 429 응답이 없습니다.",
                path=path,
                method=method,
                operation_id=operation_id,
            )

        security = operation.get("security", document.get("security", []))
        security_names = set(contract_manifest.security_scheme_names(security))
        if is_active and not consumer_scope.is_bootstrap_operation(method, path, scope):
            if "bearerAuth" not in security_names or not {"401", "403"}.issubset(responses):
                add_finding(
                    findings,
                    "admin_security_missing",
                    "활성 관리자 operation은 bearerAuth와 401/403을 모두 선언해야 합니다.",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )
        if is_internal_path(path, policy):
            required_scheme = str(policy.get("required_internal_security_scheme", ""))
            if required_scheme == "" or required_scheme not in security_names:
                add_finding(
                    findings,
                    "internal_security_scheme_missing",
                    f"내부 operation에 {required_scheme or '전용'} security scheme이 없습니다.",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )

        if method in MUTATING_METHODS and not security_names:
            allowed_prefixes = public_policy.get("allowed_path_prefixes", [])
            allowed_ids = public_policy.get("allowed_operation_ids", [])
            license_status = str(public_policy.get("plugin_license_response_status", "402"))
            explicitly_allowed = any(
                path.startswith(str(prefix)) for prefix in allowed_prefixes
            ) or operation_id in allowed_ids
            if license_status in responses:
                audit_plugin_license(
                    findings,
                    path,
                    method,
                    operation,
                    plugin_manifests,
                    license_status,
                )
            elif not explicitly_allowed:
                add_finding(
                    findings,
                    "public_mutation_not_allowed",
                    "인증 없는 쓰기 operation이 명시적 허용 정책에 없습니다.",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )

        if response_policy.get("require_location_header_for_201", False):
            created_response = resolve_object(document, responses.get("201"))
            if "201" in responses:
                created_headers = created_response.get("headers", {})
                if not isinstance(created_headers, dict) or "Location" not in created_headers:
                    add_finding(
                        findings,
                        "created_location_header_missing",
                        "201 응답에 Location header 계약이 없습니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )

        if not is_audited:
            continue

        request_body = operation.get("requestBody")
        if isinstance(request_body, dict):
            if is_active:
                active_request_operations += 1
            if is_protected:
                protected_request_operations += 1
            resolved_body = resolve_object(document, request_body)
            content = resolved_body.get("content", {})
            if not isinstance(content, dict) or not content:
                add_finding(
                    findings,
                    "request_content_missing",
                    "requestBody content가 비어 있습니다.",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )
            for media_type, media in content.items() if isinstance(content, dict) else []:
                schema = media.get("schema") if isinstance(media, dict) else None
                ref_name = schema_ref_name(schema)
                resolved_schema = resolve_object(document, schema)
                if request_policy.get("require_named_component_schema", False) and ref_name is None:
                    add_finding(
                        findings,
                        "request_schema_not_named",
                        f"{media_type} 요청 schema가 named component $ref가 아닙니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )
                if ref_name is not None:
                    audited_used_schema_names.add(ref_name)
                properties = resolved_schema.get("properties")
                is_object = resolved_schema.get("type") == "object" or isinstance(properties, dict)
                if is_object and request_policy.get("require_closed_object_schema", False):
                    if resolved_schema.get("additionalProperties") is not False:
                        add_finding(
                            findings,
                            "request_object_open",
                            f"{media_type} 요청 object는 additionalProperties: false여야 합니다.",
                            path=path,
                            method=method,
                            operation_id=operation_id,
                        )
                if (
                    is_object
                    and resolved_body.get("required") is True
                    and request_policy.get("require_explicit_required_list", False)
                    and not schema_has_explicit_required_contract(document, resolved_schema)
                ):
                    add_finding(
                        findings,
                        "request_required_ambiguous",
                        f"{media_type} 필수 본문에 필드 required 목록이 없습니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )

        has_body_success = False
        for status, raw_response in responses.items():
            status_text = str(status)
            if not SUCCESS_STATUS.match(status_text):
                continue
            response = resolve_object(document, raw_response)
            content = response.get("content", {})
            if status_text == "204" and not content:
                continue
            has_body_success = True
            if not isinstance(content, dict) or not content:
                add_finding(
                    findings,
                    "success_content_missing",
                    f"{status_text} 성공 응답 content/schema가 없습니다.",
                    path=path,
                    method=method,
                    operation_id=operation_id,
                )
                if is_active:
                    active_freeform_success_operations.add(f"{method.upper()} {path}")
                if is_protected:
                    protected_freeform_success_operations.add(f"{method.upper()} {path}")
                continue
            for media_type, media in content.items():
                schema = media.get("schema") if isinstance(media, dict) else None
                ref_name = schema_ref_name(schema)
                binary_schema = schema_is_binary(document, schema)
                if ref_name in generic_names:
                    add_finding(
                        findings,
                        "generic_success_schema",
                        f"{status_text} {media_type}가 범용 schema {ref_name}를 사용합니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )
                    if is_active:
                        active_freeform_success_operations.add(f"{method.upper()} {path}")
                    if is_protected:
                        protected_freeform_success_operations.add(f"{method.upper()} {path}")
                if schema_is_fieldless(document, schema):
                    add_finding(
                        findings,
                        "fieldless_success_schema",
                        f"{status_text} {media_type} 성공 schema에 확정 필드가 없습니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )
                    if is_active:
                        active_freeform_success_operations.add(f"{method.upper()} {path}")
                    if is_protected:
                        protected_freeform_success_operations.add(f"{method.upper()} {path}")
                if (
                    response_policy.get("require_named_component_schema", False)
                    and ref_name is None
                    and not binary_schema
                ):
                    add_finding(
                        findings,
                        "success_schema_not_named",
                        f"{status_text} {media_type} 성공 schema가 named component $ref가 아닙니다.",
                        path=path,
                        method=method,
                        operation_id=operation_id,
                    )
                    if is_active:
                        active_freeform_success_operations.add(f"{method.upper()} {path}")
                    if is_protected:
                        protected_freeform_success_operations.add(f"{method.upper()} {path}")
                if ref_name is not None:
                    audited_used_schema_names.add(ref_name)
        if has_body_success:
            if is_active:
                active_success_body_operations += 1
            if is_protected:
                protected_success_body_operations += 1

    duplicate_ids = sorted(
        operation_id
        for operation_id, count in Counter(operation_ids).items()
        if count > 1
    )
    for operation_id in duplicate_ids:
        add_finding(
            findings,
            "operation_id_duplicate",
            f"중복 operationId입니다: {operation_id}",
            operation_id=operation_id,
        )

    schemas = document.get("components", {}).get("schemas", {})
    if isinstance(schemas, dict):
        required_envelope_fields = response_policy.get("required_envelope_fields", [])
        sensitive_patterns = [
            re.compile(str(pattern), re.IGNORECASE)
            for pattern in policy.get("sensitive_property_name_patterns", [])
        ]
        sensitive_exceptions = {
            str(property_name).lower()
            for property_name in policy.get("sensitive_property_name_exceptions", [])
        }
        for name, raw_schema in schemas.items():
            schema = resolve_object(document, raw_schema)
            properties = schema.get("properties", {})
            if not isinstance(properties, dict):
                continue
            if name not in audited_used_schema_names:
                continue
            required = schema.get("required", [])
            required_names = set(required) if isinstance(required, list) else set()
            if (
                name in audited_used_schema_names
                and properties
                and not schema_has_explicit_required_contract(document, schema)
            ):
                add_finding(
                    findings,
                    "active_schema_required_ambiguous",
                    f"활성 operation이 사용하는 {name} schema에 required 목록이 없습니다.",
                    location=f"#/components/schemas/{name}",
                )
            for envelope_field in required_envelope_fields:
                if envelope_field in properties and envelope_field not in required_names:
                    add_finding(
                        findings,
                        "envelope_field_not_required",
                        f"{name}.{envelope_field}가 properties에는 있으나 required가 아닙니다.",
                        location=f"#/components/schemas/{name}",
                    )
            for property_name, property_schema in properties.items():
                if str(property_name).lower() in sensitive_exceptions:
                    continue
                if not any(pattern.search(str(property_name)) for pattern in sensitive_patterns):
                    continue
                if not isinstance(property_schema, dict) or not (
                    property_schema.get("writeOnly") is True
                    or property_schema.get("x-masked") is True
                ):
                    add_finding(
                        findings,
                        "sensitive_property_unprotected",
                        f"민감 필드 {name}.{property_name}에 writeOnly 또는 x-masked 의미가 없습니다.",
                        location=f"#/components/schemas/{name}/properties/{property_name}",
                    )

    error_policy = policy.get("error_contract", {})
    forbidden_media = set(error_policy.get("forbidden_media_types", []))
    component_responses = document.get("components", {}).get("responses", {})
    if isinstance(component_responses, dict):
        for name, raw_response in component_responses.items():
            response = resolve_object(document, raw_response)
            content = response.get("content", {})
            if not isinstance(content, dict):
                continue
            for media_type in sorted(set(content) & forbidden_media):
                add_finding(
                    findings,
                    "forbidden_error_media_type",
                    f"공통 오류 응답 {name}에 금지 media type {media_type}이 있습니다.",
                    location=f"#/components/responses/{name}",
                )

    if scope.get("scope_id") != "test-legacy-policy":
        operation_pairs = [(path, method) for path, method, _, _ in operations]
        findings.extend(
            consumer_scope.expected_count_findings(
                consumer_scope.operation_counts(operation_pairs, scope),
                scope,
            )
        )
        findings.extend(consumer_scope.inventory_findings(operation_pairs, scope))

    deduplicated = {
        (
            item["rule"],
            item.get("method"),
            item.get("path"),
            item.get("operation_id"),
            item.get("location"),
            item["detail"],
        ): item
        for item in findings
    }
    all_findings = sorted(
        deduplicated.values(),
        key=lambda item: (
            item["rule"],
            item.get("path") or "",
            item.get("method") or "",
            item.get("location") or "",
        ),
    )
    findings = []
    deferred_findings = []
    excluded_findings = []
    for item in all_findings:
        path = item.get("path")
        method = item.get("method")
        if not isinstance(path, str) or not isinstance(method, str):
            findings.append(item)
            continue
        if consumer_scope.is_active_operation(method, path, scope):
            item["scope_classification"] = "active"
            findings.append(item)
            continue
        if consumer_scope.is_protected_operation(method, path, scope):
            item["scope_classification"] = "protected_general_board"
            findings.append(item)
            continue
        classification = consumer_scope.classify_operation(method, path, scope)
        deferred = dict(item)
        deferred["scope_classification"] = classification
        if classification == "excluded_admin_shop":
            deferred["severity"] = "excluded"
            excluded_findings.append(deferred)
        else:
            deferred["severity"] = "deferred"
            deferred_findings.append(deferred)

    finding_counts = dict(sorted(Counter(item["rule"] for item in findings).items()))
    deferred_finding_counts = dict(
        sorted(Counter(item["rule"] for item in deferred_findings).items())
    )
    excluded_finding_counts = dict(
        sorted(Counter(item["rule"] for item in excluded_findings).items())
    )
    scope_counts = consumer_scope.operation_counts(
        ((path, method) for path, method, _, _ in operations), scope
    )
    return {
        "schema": "gnuboard5.php.openapi-provider-audit/v2",
        "status": "failed" if findings else "passed",
        "certified": not findings,
        "policy_schema": policy.get("schema"),
        "consumer_scope_id": scope.get("scope_id"),
        "stats": {
            "operation_count": len(operations),
            "active_operation_count": len(active_operations),
            "protected_operation_count": len(protected_operations),
            "audited_operation_count": len(active_operations) + len(protected_operations),
            "admin_non_shop_operation_count": scope_counts["admin_non_shop"],
            "bootstrap_operation_count": scope_counts["bootstrap"],
            "deferred_operation_count": scope_counts["deferred"],
            "excluded_admin_shop_operation_count": scope_counts["excluded_admin_shop"],
            "active_success_body_operation_count": active_success_body_operations,
            "protected_success_body_operation_count": protected_success_body_operations,
            "active_freeform_success_operation_count": len(active_freeform_success_operations),
            "protected_freeform_success_operation_count": len(protected_freeform_success_operations),
            "active_request_operation_count": active_request_operations,
            "protected_request_operation_count": protected_request_operations,
            "finding_count": len(findings),
            "deferred_finding_count": len(deferred_findings),
            "excluded_finding_count": len(excluded_findings),
        },
        "finding_counts": finding_counts,
        "deferred_finding_counts": deferred_finding_counts,
        "excluded_finding_counts": excluded_finding_counts,
        "findings": findings,
        "deferred_findings": deferred_findings,
        "excluded_findings": excluded_findings,
    }


def render_markdown(report: dict[str, Any]) -> str:
    stats = report["stats"]
    lines = [
        "# PHP OpenAPI 공급자 의미 감사",
        "",
        f"- status: `{report['status']}`",
        f"- certified: `{str(report['certified']).lower()}`",
        f"- operations: `{stats['operation_count']}`",
        f"- active operations: `{stats['active_operation_count']}`",
        f"- protected board operations: `{stats['protected_operation_count']}`",
        f"- audited operations: `{stats['audited_operation_count']}`",
        f"- admin non-shop operations: `{stats['admin_non_shop_operation_count']}`",
        f"- bootstrap operations: `{stats['bootstrap_operation_count']}`",
        f"- deferred operations: `{stats['deferred_operation_count']}`",
        f"- active body success operations: `{stats['active_success_body_operation_count']}`",
        f"- protected body success operations: `{stats['protected_success_body_operation_count']}`",
        f"- active freeform success operations: `{stats['active_freeform_success_operation_count']}`",
        f"- protected freeform success operations: `{stats['protected_freeform_success_operation_count']}`",
        f"- findings: `{stats['finding_count']}`",
        f"- deferred findings: `{stats['deferred_finding_count']}`",
        f"- excluded findings: `{stats['excluded_finding_count']}`",
        "",
        "## 규칙별 실패",
        "",
    ]
    for rule, count in report["finding_counts"].items():
        lines.append(f"- `{rule}`: `{count}`")
    lines.extend(["", "## Deferred finding counts", ""])
    for rule, count in report["deferred_finding_counts"].items():
        lines.append(f"- `{rule}`: `{count}`")
    lines.extend(["", "## Excluded finding counts", ""])
    for rule, count in report["excluded_finding_counts"].items():
        lines.append(f"- `{rule}`: `{count}`")
    lines.extend(["", "## 상세", ""])
    for item in report["findings"]:
        target = " ".join(
            part
            for part in (item.get("method"), item.get("path"), item.get("operation_id"))
            if part
        )
        suffix = f" ({item['location']})" if item.get("location") else ""
        lines.append(f"- `{item['rule']}` {target}: {item['detail']}{suffix}")
    if not report["findings"]:
        lines.append("- 실패 없음")
    return "\n".join(lines) + "\n"


def write_optional(path_value: str | None, contents: str) -> None:
    if not path_value:
        return
    path = Path(path_value).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def portable_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT_DIR))
    except ValueError:
        return str(path)


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    policy_path = Path(args.policy).resolve()
    consumer_scope_path = Path(args.consumer_scope).resolve()
    document = load_openapi(input_path)
    policy = load_policy(policy_path)
    configured_scope = policy.get("consumer_scope")
    if not isinstance(configured_scope, str) or not configured_scope:
        raise SystemExit("OpenAPI audit policy consumer_scope is missing.")
    configured_scope_path = (
        Path(configured_scope)
        if Path(configured_scope).is_absolute()
        else ROOT_DIR / configured_scope
    ).resolve()
    if configured_scope_path != consumer_scope_path:
        raise SystemExit(
            "OpenAPI audit policy and CLI consumer scope paths do not match: "
            f"policy={configured_scope_path} cli={consumer_scope_path}"
        )
    scope = consumer_scope.load_scope(consumer_scope_path)
    configured_contract_path = (ROOT_DIR / scope["contract"]).resolve()
    if configured_contract_path != input_path:
        raise SystemExit(
            "Consumer scope contract and OpenAPI paths do not match: "
            f"scope={configured_contract_path} input={input_path}"
        )
    report = build_audit(document, policy, load_plugin_manifests(ROOT_DIR), scope)
    report["input"] = {
        "openapi": portable_path(input_path),
        "openapi_sha256": hashlib.sha256(input_path.read_bytes()).hexdigest(),
        "policy": portable_path(policy_path),
        "policy_sha256": hashlib.sha256(policy_path.read_bytes()).hexdigest(),
        "consumer_scope": portable_path(consumer_scope_path),
        "consumer_scope_sha256": scope["_sha256"],
    }

    json_text = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    markdown = render_markdown(report)
    write_optional(args.output_json, json_text)
    write_optional(args.output_md, markdown)

    stats = report["stats"]
    print("[openapi_provider_contract]")
    print(f"operations={stats['operation_count']}")
    print(f"active_operations={stats['active_operation_count']}")
    print(f"protected_operations={stats['protected_operation_count']}")
    print(f"audited_operations={stats['audited_operation_count']}")
    print(f"admin_non_shop_operations={stats['admin_non_shop_operation_count']}")
    print(f"bootstrap_operations={stats['bootstrap_operation_count']}")
    print(f"deferred_operations={stats['deferred_operation_count']}")
    print(f"active_success_body_operations={stats['active_success_body_operation_count']}")
    print(f"protected_success_body_operations={stats['protected_success_body_operation_count']}")
    print(f"active_freeform_success_operations={stats['active_freeform_success_operation_count']}")
    print(f"protected_freeform_success_operations={stats['protected_freeform_success_operation_count']}")
    print(f"findings={stats['finding_count']}")
    print(f"deferred_findings={stats['deferred_finding_count']}")
    print(f"excluded_findings={stats['excluded_finding_count']}")
    for rule, count in report["finding_counts"].items():
        print(f"finding.{rule}={count}")
    for item in report["findings"][: max(0, args.max_console_findings)]:
        target = " ".join(
            part
            for part in (item.get("method"), item.get("path"), item.get("operation_id"))
            if part
        )
        print(f"FAIL [{item['rule']}] {target}: {item['detail']}")
    if report["findings"]:
        print("FAIL: OpenAPI provider semantic contract is not closed.")
        return 1
    print("PASS: OpenAPI provider semantic contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
