#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT_DIR / "api" / "docs" / "openapi.yaml"
DEFAULT_OUTPUT = ROOT_DIR / "api" / "docs" / "openapi.contract-manifest.json"
HTTP_METHODS = (
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "trace",
)


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def construct_mapping(loader: UniqueKeyLoader, node: yaml.nodes.MappingNode, deep: bool = False) -> dict[str, Any]:
    loader.flatten_mapping(node)
    mapping: dict[str, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise SystemExit(
                f"Duplicate YAML key detected: {key!r} at line {key_node.start_mark.line + 1}",
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_mapping,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a deterministic contract manifest from OpenAPI YAML.",
    )
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument(
        "--mode",
        choices=("write", "check", "stdout"),
        default="stdout",
        help="write: overwrite output, check: compare against output, stdout: print manifest",
    )
    return parser.parse_args()


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: normalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


def fingerprint(value: Any) -> str:
    normalized = normalize(value)
    payload = json.dumps(
        normalized,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def resolve_pointer(document: dict[str, Any], ref: str) -> Any:
    if not ref.startswith("#/"):
        return None
    node: Any = document
    for part in ref.removeprefix("#/").split("/"):
        decoded = part.replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or decoded not in node:
            raise SystemExit(f"Unresolved local OpenAPI reference: {ref}")
        node = node[decoded]
    return node


def resolve_schema(document: dict[str, Any], schema: Any) -> Any:
    if not isinstance(schema, dict):
        return schema

    ref = schema.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/"):
        return schema

    return resolve_pointer(document, ref)


def deep_resolve_local_refs(
    document: dict[str, Any],
    value: Any,
    stack: tuple[str, ...] = (),
) -> Any:
    if isinstance(value, list):
        return [deep_resolve_local_refs(document, item, stack) for item in value]
    if not isinstance(value, dict):
        return value

    ref = value.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/"):
        siblings = {
            key: deep_resolve_local_refs(document, item, stack)
            for key, item in value.items()
            if key != "$ref"
        }
        if ref in stack:
            resolved: Any = {"$cycle": True}
        else:
            resolved = deep_resolve_local_refs(
                document,
                resolve_pointer(document, ref),
                stack + (ref,),
            )
        result: dict[str, Any] = {
            "$ref": ref,
            "$resolved": resolved,
        }
        if siblings:
            result["$siblings"] = siblings
        return result

    return {
        key: deep_resolve_local_refs(document, item, stack)
        for key, item in value.items()
    }


def extract_field_names(document: dict[str, Any], schema: Any) -> list[str]:
    resolved = resolve_schema(document, schema)
    if not isinstance(resolved, dict):
        return []

    properties = resolved.get("properties")
    if isinstance(properties, dict):
        return sorted(properties.keys())

    if "allOf" in resolved and isinstance(resolved["allOf"], list):
        fields: set[str] = set()
        for item in resolved["allOf"]:
            fields.update(extract_field_names(document, item))
        return sorted(fields)

    return []


def resolve_component_object(document: dict[str, Any], value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    ref = value.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/"):
        return value
    resolved = resolve_pointer(document, ref)
    return resolved if isinstance(resolved, dict) else {}


def build_content_contract(document: dict[str, Any], content: Any) -> dict[str, Any]:
    if not isinstance(content, dict):
        return {}

    result: dict[str, Any] = {}
    for media_type in sorted(content):
        media = content[media_type]
        if not isinstance(media, dict):
            result[media_type] = {
                "fingerprint": fingerprint(media),
                "schema_ref": None,
                "field_names": [],
                "schema_fingerprint": None,
            }
            continue
        schema = media.get("schema")
        result[media_type] = {
            "fingerprint": fingerprint(deep_resolve_local_refs(document, media)),
            "schema_ref": schema.get("$ref") if isinstance(schema, dict) else None,
            "field_names": extract_field_names(document, schema),
            "schema_fingerprint": fingerprint(deep_resolve_local_refs(document, schema))
            if schema is not None
            else None,
        }
    return result


def parameter_identity(document: dict[str, Any], parameter: Any) -> tuple[str, str]:
    resolved = resolve_component_object(document, parameter)
    return (str(resolved.get("name", "")), str(resolved.get("in", "")))


def build_parameters(
    document: dict[str, Any],
    path_item: dict[str, Any],
    operation: dict[str, Any],
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], Any] = {}
    for source in (path_item.get("parameters", []), operation.get("parameters", [])):
        if not isinstance(source, list):
            continue
        for parameter in source:
            merged[parameter_identity(document, parameter)] = parameter

    entries: list[dict[str, Any]] = []
    for identity in sorted(merged):
        parameter = merged[identity]
        resolved = resolve_component_object(document, parameter)
        entries.append(
            {
                "name": resolved.get("name"),
                "in": resolved.get("in"),
                "required": bool(resolved.get("required", False)),
                "deprecated": bool(resolved.get("deprecated", False)),
                "schema_ref": resolved.get("schema", {}).get("$ref")
                if isinstance(resolved.get("schema"), dict)
                else None,
                "fingerprint": fingerprint(
                    deep_resolve_local_refs(document, parameter)
                ),
            }
        )
    return entries


def security_scheme_names(security: Any) -> list[str]:
    names: set[str] = set()
    if isinstance(security, list):
        for requirement in security:
            if isinstance(requirement, dict):
                names.update(str(name) for name in requirement)
    return sorted(names)


def build_operation_entry(
    document: dict[str, Any],
    path_name: str,
    path_item: dict[str, Any],
    method: str,
    operation: dict[str, Any],
) -> dict[str, Any]:
    request_schema = None
    request_body = operation.get("requestBody")
    resolved_request_body = resolve_component_object(document, request_body)
    request_content: dict[str, Any] = {}
    if resolved_request_body:
        content = resolved_request_body.get("content")
        if isinstance(content, dict):
            request_content = build_content_contract(document, content)
            media_type = content.get("application/json")
            if not isinstance(media_type, dict) and content:
                media_type = next(iter(content.values()))
            if isinstance(media_type, dict):
                request_schema = media_type.get("schema")

    responses: list[dict[str, Any]] = []
    response_map = operation.get("responses")
    if isinstance(response_map, dict):
        for status in sorted(response_map):
            response = response_map[status]
            resolved_response = resolve_component_object(document, response)
            response_content = {}
            if resolved_response:
                response_content = resolved_response.get("content", {})
            content_contract = build_content_contract(document, response_content)
            media_type = None
            if isinstance(response_content, dict):
                media_type = response_content.get("application/json")
                if not isinstance(media_type, dict) and response_content:
                    media_type = next(iter(response_content.values()))
            response_schema = media_type.get("schema") if isinstance(media_type, dict) else None
            responses.append(
                {
                    "status": status,
                    "response_ref": response.get("$ref")
                    if isinstance(response, dict)
                    else None,
                    "schema_ref": response_schema.get("$ref")
                    if isinstance(response_schema, dict)
                    else None,
                    "field_names": extract_field_names(document, response_schema),
                    "media_types": sorted(content_contract),
                    "header_names": sorted(resolved_response.get("headers", {}))
                    if isinstance(resolved_response.get("headers"), dict)
                    else [],
                    "fingerprint": fingerprint(
                        deep_resolve_local_refs(document, response)
                    ),
                }
            )

    security = operation.get("security", document.get("security", []))
    parameters = build_parameters(document, path_item, operation)
    servers = operation.get(
        "servers",
        path_item.get("servers", document.get("servers", [])),
    )
    entry = {
        "method": method.upper(),
        "path": path_name,
        "operation_id": operation.get("operationId"),
        "deprecated": bool(operation.get("deprecated", False)),
        "tags": sorted(operation.get("tags", []))
        if isinstance(operation.get("tags"), list)
        else [],
        "parameters": parameters,
        "parameters_fingerprint": fingerprint(parameters),
        "security": normalize(security),
        "security_scheme_names": security_scheme_names(security),
        "security_fingerprint": fingerprint(security),
        "servers": normalize(servers),
        "servers_fingerprint": fingerprint(servers),
        "request_body_required": bool(resolved_request_body.get("required", False)),
        "request_body_ref": request_body.get("$ref")
        if isinstance(request_body, dict)
        else None,
        "request_schema_ref": request_schema.get("$ref")
        if isinstance(request_schema, dict)
        else None,
        "request_field_names": extract_field_names(document, request_schema),
        "request_media_types": sorted(request_content),
        "request_fingerprint": fingerprint(
            deep_resolve_local_refs(document, request_body)
        )
        if request_body is not None
        else None,
        "responses": responses,
    }
    entry["semantic_fingerprint"] = fingerprint(entry)
    return entry


def build_manifest(document: dict[str, Any]) -> dict[str, Any]:
    paths = document.get("paths")
    if not isinstance(paths, dict):
        raise SystemExit("OpenAPI document does not contain a valid `paths` object.")

    operations: list[dict[str, Any]] = []
    operation_ids: list[str] = []

    for path_name in sorted(paths):
        path_item = paths[path_name]
        if not isinstance(path_item, dict):
            continue
        for method in HTTP_METHODS:
            operation = path_item.get(method)
            if not isinstance(operation, dict):
                continue
            entry = build_operation_entry(
                document,
                path_name,
                path_item,
                method,
                operation,
            )
            operations.append(entry)
            operation_id = entry.get("operation_id")
            if isinstance(operation_id, str):
                operation_ids.append(operation_id)

    duplicates = sorted(
        {
            operation_id
            for operation_id in operation_ids
            if operation_ids.count(operation_id) > 1
        }
    )
    if duplicates:
        raise SystemExit(
            "Duplicate operationId values found: " + ", ".join(duplicates),
        )

    components = document.get("components", {})
    schema_map = components.get("schemas", {}) if isinstance(components, dict) else {}
    schemas: list[dict[str, Any]] = []
    if isinstance(schema_map, dict):
        for name in sorted(schema_map):
            schema = schema_map[name]
            schemas.append(
                {
                    "name": name,
                    "fingerprint": fingerprint(
                        deep_resolve_local_refs(document, schema)
                    ),
                    "required": sorted(schema.get("required", []))
                    if isinstance(schema, dict) and isinstance(schema.get("required"), list)
                    else [],
                    "field_names": extract_field_names(document, schema),
                }
            )

    manifest = {
        "openapi": document.get("openapi"),
        "info": {
            "title": document.get("info", {}).get("title"),
            "version": document.get("info", {}).get("version"),
        },
        "global_security": normalize(document.get("security", [])),
        "global_security_fingerprint": fingerprint(document.get("security", [])),
        "servers": normalize(document.get("servers", [])),
        "servers_fingerprint": fingerprint(document.get("servers", [])),
        "components_fingerprint": fingerprint(
            deep_resolve_local_refs(document, document.get("components", {}))
        ),
        "stats": {
            "operation_count": len(operations),
            "schema_count": len(schemas),
        },
        "operations": operations,
        "schemas": schemas,
    }
    manifest["fingerprint"] = fingerprint(manifest)
    return manifest


def render_manifest(manifest: dict[str, Any]) -> str:
    return json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()

    with input_path.open("r", encoding="utf-8") as handle:
        document = yaml.load(handle, Loader=UniqueKeyLoader)

    if not isinstance(document, dict):
        raise SystemExit("OpenAPI root document must be a mapping.")

    manifest_text = render_manifest(build_manifest(document))

    if args.mode == "stdout":
        sys.stdout.write(manifest_text)
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.mode == "write":
        output_path.write_text(manifest_text, encoding="utf-8")
        return 0

    current = output_path.read_text(encoding="utf-8") if output_path.exists() else None
    if current != manifest_text:
        sys.stderr.write(
            f"OpenAPI contract manifest is stale: {output_path}\n"
            "Run `python3 ./scripts/generate_openapi_contract_manifest.py --mode write`.\n",
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
