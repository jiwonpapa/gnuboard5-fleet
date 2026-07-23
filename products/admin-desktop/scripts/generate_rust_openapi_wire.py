#!/usr/bin/env python3
"""Generate strict Rust wire DTOs and an active-operation contract manifest.

The generated module is compiled into g5-admin-models.  It is intentionally
separate from the IPC/domain DTOs: HTTP payloads are validated against this
wire contract before the legacy presentation adapters are allowed to consume
them.
"""

from __future__ import annotations

import argparse
import json
import keyword
import re
import subprocess
from pathlib import Path
from typing import Any

import yaml


METHODS = {"get", "put", "post", "delete", "patch", "options", "head", "trace"}
BOOTSTRAP = {
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/refresh"),
    ("GET", "/health"),
    ("GET", "/members/me"),
}
RUST_KEYWORDS = {
    "as", "break", "const", "continue", "crate", "else", "enum", "extern",
    "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod",
    "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct",
    "super", "trait", "true", "type", "unsafe", "use", "where", "while", "async",
    "await", "dyn", "abstract", "become", "box", "do", "final", "macro", "override",
    "priv", "typeof", "unsized", "virtual", "yield", "try",
}


def rust_ident(name: str) -> tuple[str, bool]:
    normalized = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not normalized or normalized[0].isdigit():
        normalized = f"field_{normalized}"
    if normalized in RUST_KEYWORDS or keyword.iskeyword(normalized):
        return f"r#{normalized}", normalized != name
    return normalized, normalized != name


def pascal_case(name: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in re.split(r"[^A-Za-z0-9]+", name) if part)


def schema_ref_name(schema: dict[str, Any]) -> str | None:
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
        return ref.rsplit("/", 1)[1]
    return None


def rust_base_type(schema: Any) -> str:
    if not isinstance(schema, dict):
        return "serde_json::Value"
    ref_name = schema_ref_name(schema)
    if ref_name:
        return ref_name
    for composition in ("oneOf", "anyOf"):
        branches = schema.get(composition)
        if isinstance(branches, list) and branches:
            branch_types = {rust_base_type(branch) for branch in branches}
            if len(branch_types) == 1:
                return next(iter(branch_types))
            return "serde_json::Value"
    all_of = schema.get("allOf")
    if isinstance(all_of, list) and len(all_of) == 1:
        return rust_base_type(all_of[0])
    raw_type = schema.get("type")
    if isinstance(raw_type, list):
        concrete = [item for item in raw_type if item != "null"]
        raw_type = concrete[0] if len(concrete) == 1 else None
    if raw_type == "string":
        return "String"
    if raw_type == "integer":
        return "i64"
    if raw_type == "number":
        return "f64"
    if raw_type == "boolean":
        return "bool"
    if raw_type == "array":
        return f"Vec<{rust_base_type(schema.get('items', {}))}>"
    if raw_type == "object" or "additionalProperties" in schema:
        additional = schema.get("additionalProperties")
        if isinstance(additional, dict):
            return f"BTreeMap<String, {rust_base_type(additional)}>"
        return "serde_json::Value"
    return "serde_json::Value"


def is_nullable(schema: Any) -> bool:
    if not isinstance(schema, dict):
        return False
    if schema.get("nullable") is True:
        return True
    raw_type = schema.get("type")
    return isinstance(raw_type, list) and "null" in raw_type


def ts_type_override(schema: Any) -> str | None:
    if not isinstance(schema, dict) or "$ref" in schema:
        return None
    raw_type = schema.get("type")
    if isinstance(raw_type, list):
        concrete = [item for item in raw_type if item != "null"]
        raw_type = concrete[0] if len(concrete) == 1 else None
    if raw_type == "integer":
        return "number | null" if is_nullable(schema) else "number"
    for composition in ("oneOf", "anyOf"):
        branches = schema.get(composition)
        if isinstance(branches, list) and branches:
            primitive = {
                "string": "string",
                "integer": "number",
                "number": "number",
                "boolean": "boolean",
            }
            variants = [primitive.get(branch.get("type")) for branch in branches if isinstance(branch, dict)]
            if len(variants) == len(branches) and all(variants):
                rendered = " | ".join(dict.fromkeys(variants))
                return f"{rendered} | null" if is_nullable(schema) else rendered
    if raw_type == "array":
        item_override = ts_type_override(schema.get("items", {}))
        if item_override:
            return f"Array<{item_override}>"
    if raw_type == "object" and schema.get("additionalProperties") is True:
        return "Record<string, unknown>"
    return None


def derive_lines() -> list[str]:
    return [
        "#[derive(Debug, Clone, Serialize, Deserialize)]",
        '#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]',
        '#[cfg_attr(feature = "ts-bindings", ts(export, export_to = "../../g5-admin/src/openapi-wire-types/"))]',
    ]


def render_object(name: str, schema: dict[str, Any]) -> str:
    lines = derive_lines()
    if schema.get("additionalProperties") is False:
        lines.append("#[serde(deny_unknown_fields)]")
    lines.append(f"pub struct {name} {{")
    required = set(schema.get("required", []))
    properties = schema.get("properties", {})
    if not isinstance(properties, dict):
        properties = {}
    for field_name, field_schema in properties.items():
        ident, renamed = rust_ident(str(field_name))
        nullable = is_nullable(field_schema)
        optional = field_name not in required
        serde_args: list[str] = []
        if renamed or ident.startswith("r#"):
            serde_args.append(f'rename = "{field_name}"')
        if optional:
            serde_args.extend(["default", 'skip_serializing_if = "Option::is_none"'])
        if serde_args:
            lines.append(f"    #[serde({', '.join(serde_args)})]")
        if optional and nullable:
            lines.append('    #[cfg_attr(feature = "ts-bindings", ts(optional = nullable))]')
        elif optional:
            lines.append('    #[cfg_attr(feature = "ts-bindings", ts(optional))]')
        if override := ts_type_override(field_schema):
            lines.append(f'    #[cfg_attr(feature = "ts-bindings", ts(type = "{override}"))]')
        base = rust_base_type(field_schema)
        field_type = f"Option<{base}>" if optional or nullable else base
        lines.append(f"    pub {ident}: {field_type},")
    if schema.get("additionalProperties") is True:
        lines.extend([
            "    #[serde(default, flatten)]",
            '    #[cfg_attr(feature = "ts-bindings", ts(skip))]',
            "    pub additional_properties: BTreeMap<String, serde_json::Value>,",
        ])
    lines.append("}")
    return "\n".join(lines)


def enum_variant_name(schema: dict[str, Any], index: int) -> str:
    ref_name = schema_ref_name(schema)
    if ref_name:
        return ref_name
    raw_type = schema.get("type")
    names = {
        "string": "StringValue",
        "integer": "IntegerValue",
        "number": "NumberValue",
        "boolean": "BooleanValue",
        "array": "ArrayValue",
        "object": "ObjectValue",
    }
    return f"{names.get(raw_type, 'Value')}V{index + 1}"


def render_composed(name: str, schema: dict[str, Any]) -> str:
    branches = schema.get("oneOf") or schema.get("anyOf") or schema.get("allOf")
    if not isinstance(branches, list) or not branches:
        branches = [{"type": "object"}]
    if len(branches) == 1:
        lines = derive_lines()
        lines.append("#[serde(transparent)]")
        lines.append(f"pub struct {name}(pub {rust_base_type(branches[0])});")
        return "\n".join(lines)
    lines = derive_lines()
    lines.append("#[serde(untagged)]")
    lines.append(f"pub enum {name} {{")
    seen: dict[str, int] = {}
    for index, branch in enumerate(branches):
        variant = enum_variant_name(branch, index)
        seen[variant] = seen.get(variant, 0) + 1
        if seen[variant] > 1:
            variant = f"{variant}{seen[variant]}"
        lines.append(f"    {variant}({rust_base_type(branch)}),")
    lines.append("}")
    return "\n".join(lines)


def render_schema(name: str, schema: Any) -> str:
    if not isinstance(schema, dict):
        return render_composed(name, {})
    properties = schema.get("properties")
    if schema.get("type") == "object" or isinstance(properties, dict):
        return render_object(name, schema)
    ref_name = schema_ref_name(schema)
    if ref_name:
        lines = derive_lines()
        lines.append("#[serde(transparent)]")
        lines.append(f"pub struct {name}(pub {ref_name});")
        return "\n".join(lines)
    return render_composed(name, schema)


def merge_all_of_object(
    branches: list[Any], schemas: dict[str, Any]
) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    required: list[str] = []
    additional_properties: Any = True
    for branch in branches:
        if not isinstance(branch, dict):
            continue
        ref_name = schema_ref_name(branch)
        resolved = schemas.get(ref_name, {}) if ref_name else branch
        if not isinstance(resolved, dict):
            continue
        branch_properties = resolved.get("properties", {})
        if isinstance(branch_properties, dict):
            properties.update(branch_properties)
        for field in resolved.get("required", []):
            if field not in required:
                required.append(field)
        if resolved.get("additionalProperties") is False:
            additional_properties = False
    return {
        "type": "object",
        "additionalProperties": additional_properties,
        "required": required,
        "properties": properties,
    }


def resolve_local_ref(document: dict[str, Any], value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    ref = value.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/"):
        return value
    current: Any = document
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or part not in current:
            raise ValueError(f"unresolved local OpenAPI reference: {ref}")
        current = current[part]
    return current


def merge_parameters(
    document: dict[str, Any], path_item: dict[str, Any], operation: dict[str, Any]
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    for raw in [*path_item.get("parameters", []), *operation.get("parameters", [])]:
        resolved = resolve_local_ref(document, raw)
        if not isinstance(resolved, dict):
            continue
        key = (str(resolved.get("in", "")), str(resolved.get("name", "")))
        merged[key] = resolved
    return list(merged.values())


def body_contract(document: dict[str, Any], raw: Any) -> dict[str, Any] | None:
    resolved = resolve_local_ref(document, raw)
    if not isinstance(resolved, dict):
        return None
    content = resolved.get("content", {})
    if not isinstance(content, dict):
        content = {}
    media_type = None
    schema = None
    if content:
        media_type = "application/json" if "application/json" in content else next(iter(content))
        media = content.get(media_type, {})
        if isinstance(media, dict):
            schema = media.get("schema")
    return {
        "required": bool(resolved.get("required", False)),
        "media_type": media_type,
        "schema": schema,
        "content": content,
    }


def response_contract(document: dict[str, Any], raw: Any) -> dict[str, Any] | None:
    resolved = resolve_local_ref(document, raw)
    if not isinstance(resolved, dict):
        return None
    contract = body_contract(document, resolved) or {}
    contract.pop("required", None)
    contract["description"] = resolved.get("description")
    contract["headers"] = resolved.get("headers", {})
    return contract


def build_contract_manifest(document: dict[str, Any]) -> dict[str, Any]:
    operations: list[dict[str, Any]] = []
    for path, path_item in document.get("paths", {}).items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method not in METHODS or not isinstance(operation, dict):
                continue
            method_name = method.upper()
            active_admin = path.startswith("/admin/") and not (
                path == "/admin/shop" or path.startswith("/admin/shop/")
            )
            if not (active_admin or (method_name, path) in BOOTSTRAP):
                continue
            request_contract = body_contract(document, operation.get("requestBody"))
            responses: dict[str, Any] = {}
            for status, response in operation.get("responses", {}).items():
                resolved_response = response_contract(document, response)
                if resolved_response is not None:
                    responses[str(status)] = resolved_response
            operations.append({
                "method": method_name,
                "path": path,
                "operation_id": operation.get("operationId"),
                "security": operation.get("security", document.get("security")),
                "parameters": merge_parameters(document, path_item, operation),
                "request": request_contract,
                "responses": responses,
            })
    return {
        "operations": operations,
        "schemas": document.get("components", {}).get("schemas", {}),
    }


def render_module(document: dict[str, Any]) -> str:
    schemas = document.get("components", {}).get("schemas", {})
    rendered_schemas = json.loads(json.dumps(schemas))
    inline_schemas: dict[str, Any] = {}
    for parent_name, parent_schema in rendered_schemas.items():
        if not isinstance(parent_schema, dict):
            continue
        properties = parent_schema.get("properties", {})
        if not isinstance(properties, dict):
            continue
        for field_name, property_schema in list(properties.items()):
            if not isinstance(property_schema, dict):
                continue
            all_of = property_schema.get("allOf")
            if not isinstance(all_of, list) or len(all_of) <= 1:
                continue
            inline_name = f"{parent_name}{pascal_case(str(field_name))}"
            inline_schemas[inline_name] = merge_all_of_object(all_of, schemas)
            replacement: dict[str, Any] = {"$ref": f"#/components/schemas/{inline_name}"}
            if property_schema.get("nullable") is True:
                replacement["nullable"] = True
            properties[field_name] = replacement
    manifest = json.dumps(build_contract_manifest(document), ensure_ascii=False, separators=(",", ":"))
    sections = [
        "// @generated by scripts/generate_rust_openapi_wire.py; do not edit manually.",
        "use serde::{Deserialize, Serialize};",
        "use std::collections::BTreeMap;",
        "",
    ]
    for name, schema in [*rendered_schemas.items(), *inline_schemas.items()]:
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", str(name)):
            raise ValueError(f"unsupported OpenAPI component name: {name}")
        sections.extend([render_schema(str(name), schema), ""])
    sections.extend([
        f'pub const ACTIVE_CONTRACT_JSON: &str = r###"{manifest}"###;',
        "",
    ])
    return "\n".join(sections)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--openapi", type=Path, default=Path("specs/contracts/php-openapi.snapshot.yaml"))
    parser.add_argument("--output", type=Path, default=Path("g5-admin-models/src/openapi_wire/generated.rs"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    document = yaml.safe_load(args.openapi.read_text(encoding="utf-8"))
    output = render_module(document)
    formatted = subprocess.run(
        ["rustfmt", "--edition", "2021", "--emit", "stdout"],
        input=output,
        text=True,
        capture_output=True,
        check=False,
    )
    if formatted.returncode != 0:
        print(formatted.stderr)
        return formatted.returncode
    output = formatted.stdout
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != output:
            print(
                "generated Rust OpenAPI wire contract is stale; run "
                "`python3 scripts/generate_rust_openapi_wire.py`",
            )
            return 1
        print(f"Rust OpenAPI wire contract is current: {args.output}")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    print(f"generated {len(document['components']['schemas'])} schemas -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
