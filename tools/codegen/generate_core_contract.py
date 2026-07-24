#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = ROOT / "connectors/gnuboard5-php/api/docs/openapi.yaml"
SCOPE_PATH = ROOT / "connectors/gnuboard5-php/api/docs/openapi.phase1-consumer-scope.json"
OUTPUT_PATHS = (
    ROOT / "contracts/core-operations.json",
    ROOT / "apps/admin-web/src/generated/core-operations.json",
)
HTTP_METHODS = {"get", "put", "post", "delete", "patch", "head", "options", "trace"}
SCHEMA_DOMAINS = {
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
SPECIALIZED = {"getHealth", "login", "logout", "refreshToken"}
EXTERNAL_EFFECTS = {
    "adminCreateMailTest",
    "adminSendMail",
    "adminSendTestMail",
    "adminSendPush",
    "adminCreateSmsMessage",
    "adminResendAllSmsBatch",
    "adminResendSmsFailures",
    "adminSystemSendMemberMail",
    "adminSystemSendMailTest",
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def operation_set_sha256(keys: list[str]) -> str:
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return sha256_bytes(payload)


def resolve_ref(document: dict[str, Any], value: Any) -> Any:
    if not isinstance(value, dict) or not isinstance(value.get("$ref"), str):
        return value
    ref = value["$ref"]
    if not ref.startswith("#/"):
        raise ValueError(f"external OpenAPI reference is not supported: {ref}")
    current: Any = document
    for part in ref[2:].split("/"):
        current = current[part.replace("~1", "/").replace("~0", "~")]
    return current


def schema_refs(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        ref = value.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            found.add(ref.rsplit("/", 1)[-1])
        for child in value.values():
            found.update(schema_refs(child))
    elif isinstance(value, list):
        for child in value:
            found.update(schema_refs(child))
    return found


def recursive_schema_refs(
    document: dict[str, Any], names: set[str]
) -> set[str]:
    complete = set(names)
    pending = list(names)
    schemas = document["components"]["schemas"]
    while pending:
        name = pending.pop()
        for child in schema_refs(schemas[name]):
            if child not in complete:
                complete.add(child)
                pending.append(child)
    return complete


def schema_properties(
    document: dict[str, Any], schema: Any, seen: set[str] | None = None
) -> dict[str, Any]:
    if not isinstance(schema, dict):
        return {}
    seen = set() if seen is None else seen
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
        name = ref.rsplit("/", 1)[-1]
        if name in seen:
            return {}
        seen.add(name)
        return schema_properties(
            document, document["components"]["schemas"][name], seen
        )
    properties = dict(schema.get("properties", {}))
    for composition in ("allOf", "oneOf", "anyOf"):
        for child in schema.get(composition, []):
            properties.update(schema_properties(document, child, seen))
    return properties


def schema_required_fields(
    document: dict[str, Any], schema: Any, seen: set[str] | None = None
) -> set[str]:
    if not isinstance(schema, dict):
        return set()
    seen = set() if seen is None else seen
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
        name = ref.rsplit("/", 1)[-1]
        if name in seen:
            return set()
        seen.add(name)
        return schema_required_fields(
            document, document["components"]["schemas"][name], seen
        )
    required = {str(value) for value in schema.get("required", [])}
    for composition in ("allOf", "oneOf", "anyOf"):
        for child in schema.get(composition, []):
            required.update(schema_required_fields(document, child, seen))
    return required


def schema_type(document: dict[str, Any], schema: Any) -> str:
    if not isinstance(schema, dict):
        return "any"
    ref = schema.get("$ref")
    if isinstance(ref, str):
        return ref.rsplit("/", 1)[-1]
    kind = schema.get("type")
    if kind == "array":
        return f"array<{schema_type(document, schema.get('items'))}>"
    if isinstance(kind, list):
        return "|".join(str(value) for value in kind)
    return str(kind or "object")


def is_active(method: str, path: str, scope: dict[str, Any]) -> bool:
    active = scope["active_scope"]
    included = {
        (row["method"].upper(), row["path"]) for row in active["include_operations"]
    }
    if (method.upper(), path) in included:
        return True
    if any(path.startswith(prefix) for prefix in active["exclude_path_prefixes"]):
        return False
    return any(path.startswith(prefix) for prefix in active["include_path_prefixes"])


def operation_domain(path: str, tags: list[str]) -> str:
    if path.startswith("/admin/faq-masters"):
        return "faq-masters"
    if path.startswith("/admin/faqs"):
        return "faqs"
    if path.startswith("/admin/sms/contact") or path.startswith("/admin/sms/contacts"):
        return "sms-contacts"
    if path.startswith("/admin/sms/template") or path.startswith("/admin/sms/templates"):
        return "sms-templates"
    if path.startswith("/admin/sms/history") or path == "/admin/sms/messages":
        return "sms-messages"
    if path.startswith(("/admin/board-groups", "/admin/groups")):
        return "groups"
    if path.startswith("/admin/system/theme"):
        return "theme"
    prefixes = (
        ("boards", "/admin/boards"),
        ("config", "/admin/config"),
        ("contents", "/admin/contents"),
        ("mails", "/admin/mail"),
        ("members", "/admin/members"),
        ("menus", "/admin/menus"),
        ("points", "/admin/points"),
        ("polls", "/admin/polls"),
        ("popups", "/admin/popups"),
    )
    for domain, prefix in prefixes:
        if path.startswith(prefix):
            return domain
    tag = tags[0].split(":", 1)[-1].strip().lower() if tags else "system"
    aliases = {
        "auth": "auth",
        "layouts": "layouts",
        "populars": "popular",
        "reports": "reports",
        "visit": "visits",
        "push": "push",
        "schema": "schema",
        "qa": "qa",
        "writecount": "write-count",
        "member": "member",
        "admin": "admin",
    }
    return aliases.get(tag, tag if tag else "system")


def risk_for(method: str, operation_id: str) -> str:
    if operation_id in EXTERNAL_EFFECTS:
        return "external_effect"
    if method == "GET":
        return "read"
    if method == "DELETE":
        return "destructive"
    return "write"


def parameter_rows(
    document: dict[str, Any], path_item: dict[str, Any], operation: dict[str, Any]
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    for raw in [*path_item.get("parameters", []), *operation.get("parameters", [])]:
        value = resolve_ref(document, raw)
        key = (str(value.get("in")), str(value.get("name")))
        merged[key] = value
    return [
        {
            "name": value["name"],
            "location": value["in"],
            "required": bool(value.get("required")),
            "type": schema_type(document, value.get("schema")),
        }
        for _, value in sorted(merged.items())
        if value.get("in") in {"path", "query"}
    ]


def operation_request_schema(
    document: dict[str, Any], operation: dict[str, Any]
) -> tuple[Any, list[str], bool]:
    request_body = resolve_ref(document, operation.get("requestBody", {}))
    content = request_body.get("content", {}) if isinstance(request_body, dict) else {}
    media_types = sorted(content)
    for media_type in (
        "application/json",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
    ):
        if media_type in content:
            return (
                content[media_type].get("schema", {}),
                media_types,
                bool(request_body.get("required")),
            )
    return {}, media_types, bool(request_body.get("required"))


def operation_response_schemas(
    document: dict[str, Any], operation: dict[str, Any]
) -> list[Any]:
    schemas: list[Any] = []
    for status, raw_response in operation.get("responses", {}).items():
        if not str(status).startswith("2"):
            continue
        response = resolve_ref(document, raw_response)
        for media in response.get("content", {}).values():
            if "schema" in media:
                schemas.append(media["schema"])
    return schemas


def schema_row(document: dict[str, Any], name: str) -> dict[str, Any]:
    schema = document["components"]["schemas"][name]
    properties = schema_properties(document, schema)
    required = set(schema.get("required", []))
    fields = []
    for field_name, raw_field in sorted(properties.items()):
        field = resolve_ref(document, raw_field)
        fields.append(
            {
                "name": field_name,
                "type": schema_type(document, raw_field),
                "required": field_name in required,
                "nullable": bool(field.get("nullable")),
                "read_only": bool(field.get("readOnly")),
                "write_only": bool(field.get("writeOnly")),
            }
        )
    return {
        "name": name,
        "type": schema_type(document, schema),
        "required": sorted(required),
        "fields": fields,
    }


def build_registry() -> dict[str, Any]:
    openapi_bytes = OPENAPI_PATH.read_bytes()
    scope_bytes = SCOPE_PATH.read_bytes()
    document = yaml.safe_load(openapi_bytes)
    scope = json.loads(scope_bytes)
    operations: list[dict[str, Any]] = []
    all_schema_refs: set[str] = set()
    operation_keys: list[str] = []

    for path, path_item in document["paths"].items():
        for method, operation in path_item.items():
            if method not in HTTP_METHODS or not is_active(method, path, scope):
                continue
            method_upper = method.upper()
            operation_id = operation["operationId"]
            request_schema, request_media_types, request_body_required = operation_request_schema(
                document, operation
            )
            response_schemas = operation_response_schemas(document, operation)
            direct_refs = schema_refs(request_schema)
            for response_schema in response_schemas:
                direct_refs.update(schema_refs(response_schema))
            complete_refs = recursive_schema_refs(document, direct_refs)
            all_schema_refs.update(complete_refs)
            request_fields = sorted(schema_properties(document, request_schema))
            response_fields = sorted(
                {
                    name
                    for response_schema in response_schemas
                    for name in schema_properties(document, response_schema)
                }
            )
            parameters = parameter_rows(document, path_item, operation)
            tags = [str(tag) for tag in operation.get("tags", [])]
            risk = risk_for(method_upper, operation_id)
            operations.append(
                {
                    "operation_id": operation_id,
                    "method": method_upper,
                    "path": path,
                    "domain": operation_domain(path, tags),
                    "tags": tags,
                    "risk": risk,
                    "transport": (
                        "specialized" if operation_id in SPECIALIZED else "core_proxy"
                    ),
                    "requires_step_up": risk != "read",
                    "parameters": parameters,
                    "request_body_required": request_body_required,
                    "request_media_types": request_media_types,
                    "request_fields": request_fields,
                    "request_required_fields": sorted(
                        schema_required_fields(document, request_schema)
                    ),
                    "response_fields": response_fields,
                    "schema_refs": sorted(complete_refs),
                }
            )
            operation_keys.append(f"{method_upper} {path}")

    operations.sort(key=lambda row: (row["domain"], row["path"], row["method"]))
    schemas = [
        schema_row(document, name) for name in sorted(all_schema_refs)
    ]
    schema_by_name = {row["name"]: row for row in schemas}
    schema_domains = []
    for domain in sorted(SCHEMA_DOMAINS):
        domain_operations = [row for row in operations if row["domain"] == domain]
        refs = sorted(
            {
                ref
                for operation in domain_operations
                for ref in operation["schema_refs"]
            }
        )
        fields = sorted(
            {
                field["name"]
                for ref in refs
                for field in schema_by_name[ref]["fields"]
            }
        )
        schema_domains.append(
            {
                "domain": domain,
                "operation_ids": [
                    operation["operation_id"] for operation in domain_operations
                ],
                "schema_refs": refs,
                "fields": fields,
                "field_count": len(fields),
            }
        )

    expected_count = scope["active_scope"]["expected_total_operations"]
    if len(operations) != expected_count:
        raise ValueError(
            f"active operation count mismatch: expected={expected_count} actual={len(operations)}"
        )
    if {row["domain"] for row in schema_domains} != SCHEMA_DOMAINS:
        raise ValueError("schema domain registry mismatch")
    operation_ids = [row["operation_id"] for row in operations]
    if len(operation_ids) != len(set(operation_ids)):
        raise ValueError("duplicate active operation id")
    return {
        "schema": "g5-fleet.core-operations/v1",
        "source": {
            "openapi": "connectors/gnuboard5-php/api/docs/openapi.yaml",
            "openapi_sha256": sha256_bytes(openapi_bytes),
            "scope": "connectors/gnuboard5-php/api/docs/openapi.phase1-consumer-scope.json",
            "scope_sha256": sha256_bytes(scope_bytes),
            "active_operation_keys_sha256": operation_set_sha256(operation_keys),
        },
        "counts": {
            "active": len(operations),
            "admin_non_shop": sum(
                row["path"].startswith("/admin/") for row in operations
            ),
            "bootstrap": sum(
                not row["path"].startswith("/admin/") for row in operations
            ),
            "shop": sum(
                row["path"].startswith("/admin/shop/") for row in operations
            ),
            "schemas": len(schemas),
            "schema_domains": len(schema_domains),
        },
        "operations": operations,
        "schemas": schemas,
        "schema_domains": schema_domains,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = (
        json.dumps(build_registry(), ensure_ascii=False, indent=2, sort_keys=False)
        + "\n"
    ).encode("utf-8")
    if args.check:
        stale = [
            path.relative_to(ROOT).as_posix()
            for path in OUTPUT_PATHS
            if not path.is_file() or path.read_bytes() != encoded
        ]
        if stale:
            raise SystemExit(f"generated Core contract is stale: {', '.join(stale)}")
        print("Core contract generation check PASS")
        return 0
    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encoded)
        print(path.relative_to(ROOT).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
