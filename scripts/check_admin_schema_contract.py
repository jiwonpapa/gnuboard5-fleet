#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "api/v1/Admin/Schema/Data/generated"
OPENAPI_PATH = ROOT / "api/docs/openapi.yaml"
PLACEHOLDER = "__PHP_BLOCK_"
CHOICE_INPUT_TYPES = {"select", "radio"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated-dir", default=str(GENERATED_DIR))
    parser.add_argument("--openapi", default=str(OPENAPI_PATH))
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_openapi(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    if not isinstance(document, dict):
        raise SystemExit("OpenAPI root document must be an object.")
    return document


def enum_values(document: dict[str, Any], schema_name: str, property_name: str) -> set[str]:
    schemas = document.get("components", {}).get("schemas", {})
    schema = schemas.get(schema_name, {}) if isinstance(schemas, dict) else {}
    properties = schema.get("properties", {}) if isinstance(schema, dict) else {}
    property_schema = properties.get(property_name, {}) if isinstance(properties, dict) else {}
    values = property_schema.get("enum", []) if isinstance(property_schema, dict) else []
    if not isinstance(values, list):
        return set()
    return {str(value) for value in values}


def has_placeholder(value: Any) -> bool:
    if isinstance(value, str):
        return PLACEHOLDER in value
    if isinstance(value, list):
        return any(has_placeholder(item) for item in value)
    if isinstance(value, dict):
        return any(has_placeholder(item) for item in value.values())
    return False


def iter_fields(generated_dir: Path) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for path in sorted(generated_dir.glob("*.json")):
        schema = load_json(path)
        domain = str(schema.get("domain") or path.stem)
        for section in schema.get("sections", []):
            section_key = str(section.get("key") or "")
            for field in section.get("fields", []):
                if not isinstance(field, dict):
                    continue
                fields.append(
                    {
                        "domain": domain,
                        "section": section_key,
                        "name": str(field.get("name") or ""),
                        "payload": field,
                    }
                )
    return fields


def field_ref(field: dict[str, Any]) -> str:
    return f"{field['domain']}:{field['section']}:{field['name']}"


def main() -> int:
    args = parse_args()
    generated_dir = Path(args.generated_dir)
    openapi_path = Path(args.openapi)
    openapi = load_openapi(openapi_path)
    fields = iter_fields(generated_dir)

    input_type_enum = enum_values(openapi, "AdminFieldSchema", "input_type")
    data_type_enum = enum_values(openapi, "AdminFieldSchema", "data_type")
    failures: list[str] = []

    if not input_type_enum:
        failures.append("OpenAPI AdminFieldSchema.input_type enum is missing.")
    if not data_type_enum:
        failures.append("OpenAPI AdminFieldSchema.data_type enum is missing.")

    for field in fields:
        payload = field["payload"]
        name = field["name"]
        input_type = str(payload.get("input_type") or "")
        data_type = str(payload.get("data_type") or "")
        options = payload.get("options") if isinstance(payload.get("options"), list) else []
        option_source = payload.get("option_source")

        if name == "":
            failures.append(f"{field_ref(field)} has an empty name.")
        if str(payload.get("label") or "") == "":
            failures.append(f"{field_ref(field)} has an empty label.")
        if input_type not in input_type_enum:
            failures.append(f"{field_ref(field)} input_type={input_type!r} is not documented in OpenAPI.")
        if data_type not in data_type_enum:
            failures.append(f"{field_ref(field)} data_type={data_type!r} is not documented in OpenAPI.")
        if has_placeholder(payload):
            failures.append(f"{field_ref(field)} contains generated PHP placeholder text.")
        if input_type in CHOICE_INPUT_TYPES and not options and not isinstance(option_source, dict):
            failures.append(f"{field_ref(field)} is {input_type} but has neither options nor option_source.")

    print("[admin_schema_contract]")
    print(f"fields={len(fields)}")
    print(f"input_type_enum={','.join(sorted(input_type_enum))}")
    print(f"data_type_enum={','.join(sorted(data_type_enum))}")
    print(f"failures={len(failures)}")

    if failures:
        print("\n[failures]")
        for failure in failures[:120]:
            print(f"FAIL {failure}")
        if len(failures) > 120:
            print(f"... {len(failures) - 120} more")
        return 1

    print("PASS: admin schema contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
