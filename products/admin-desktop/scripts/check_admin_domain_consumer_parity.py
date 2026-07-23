#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from audit_harness.paths import resolve_php_root

RUST_ROOT = Path(__file__).resolve().parents[1]
PHP_ROOT = resolve_php_root(RUST_ROOT)


@dataclass(frozen=True)
class ArraySource:
    file: Path
    array_name: str
    item_pattern: str


@dataclass(frozen=True)
class ObjectSource:
    file: Path
    object_name: str
    item_pattern: str


@dataclass(frozen=True)
class RegexSource:
    file: Path
    item_pattern: str


@dataclass(frozen=True)
class DomainAdapter:
    domain: str
    schema_json: Path
    top_level_text_sources: tuple[ArraySource | ObjectSource | RegexSource, ...]
    top_level_boolean_sources: tuple[ArraySource | ObjectSource | RegexSource, ...]
    top_level_radio_boolean_sources: tuple[ArraySource | ObjectSource | RegexSource, ...] = ()
    extra_text_sources: tuple[ArraySource | ObjectSource | RegexSource, ...] = ()
    extra_boolean_sources: tuple[ArraySource | ObjectSource | RegexSource, ...] = ()
    extra_radio_boolean_sources: tuple[ArraySource | ObjectSource | RegexSource, ...] = ()
    save_sources: tuple[ArraySource | ObjectSource | RegexSource, ...] = ()
    save_includes_extra_fields: bool = False
    section_order_file: Path | None = None
    section_order_array_name: str | None = None
    section_key_pattern: str | None = None
    multi_value_checkbox_fields: frozenset[str] = frozenset()
    schema_scope: str | None = None
    exclude_create_only_update_fields: bool = False
    ignored_schema_fields: frozenset[str] = frozenset()
    manual_text_fields: frozenset[str] = frozenset()
    manual_boolean_fields: frozenset[str] = frozenset()
    manual_radio_boolean_fields: frozenset[str] = frozenset()
    manual_save_fields: frozenset[str] = frozenset()
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class SourceGraphAdapter:
    domain: str
    feature_dir: Path
    entity_schema: str | None = None
    write_schemas: tuple[str, ...] = ()
    read_only_fields: frozenset[str] = frozenset()


CONFIG_ADAPTER = DomainAdapter(
    domain="config",
    schema_json=PHP_ROOT / "api/v1/Admin/Schema/Data/generated/config.json",
    top_level_text_sources=(
        ArraySource(
            file=RUST_ROOT / "g5-admin/src/features/config/admin-config-renderable.ts",
            array_name="siteInfoFields",
            item_pattern=r'name:\s*"([^"]+)"',
        ),
        ArraySource(
            file=RUST_ROOT / "g5-admin/src/features/config/admin-config-renderable.ts",
            array_name="policyPointFields",
            item_pattern=r'name:\s*"([^"]+)"',
        ),
    ),
    top_level_boolean_sources=(
        ArraySource(
            file=RUST_ROOT / "g5-admin/src/features/config/admin-config-renderable.ts",
            array_name="policyToggleFields",
            item_pattern=r'name:\s*"([^"]+)"',
        ),
    ),
    extra_text_sources=(
        ArraySource(
            file=RUST_ROOT / "g5-admin/src/features/config/config-field-meta.ts",
            array_name="adminConfigExtraTextFieldNames",
            item_pattern=r'"([^"]+)"',
        ),
    ),
    extra_boolean_sources=(
        ArraySource(
            file=RUST_ROOT / "g5-admin/src/features/config/config-field-meta.ts",
            array_name="adminConfigExtraFlagFieldNames",
            item_pattern=r'"([^"]+)"',
        ),
    ),
    save_sources=(
        RegexSource(
            file=RUST_ROOT / "g5-admin/src/features/config/admin-config-form.ts",
            item_pattern=r'(?:assignString|assignBoolean)\(\s*payload,\s*"([^"]+)"',
        ),
    ),
    save_includes_extra_fields=True,
    section_order_file=RUST_ROOT / "g5-admin/src/features/config/admin-config-renderable.ts",
    section_order_array_name="legacyConfigSectionOrder",
    section_key_pattern=r'sectionKeys:\s*\[(.*?)\]',
    multi_value_checkbox_fields=frozenset({"cf_social_servicelist"}),
    notes=(
        "파이프라인은 domain adapter registry 기반이며, 현재 config adapter 를 먼저 구현했습니다.",
        "다른 도메인은 adapter definition 만 추가하면 같은 리포트 구조를 재사용할 수 있습니다.",
    ),
)

MEMBERS_ADAPTER = DomainAdapter(
    domain="members",
    schema_json=PHP_ROOT / "api/v1/Admin/Schema/Data/generated/members.json",
    top_level_text_sources=(
        ObjectSource(
            file=RUST_ROOT / "g5-admin/src/features/members/admin-members-form.ts",
            object_name="emptyAdminMemberFormValues",
            item_pattern=r'\b(mb_[a-z0-9_]+):\s*"[^"]*"',
        ),
    ),
    top_level_boolean_sources=(
        ObjectSource(
            file=RUST_ROOT / "g5-admin/src/features/members/admin-members-form.ts",
            object_name="emptyAdminMemberFormValues",
            item_pattern=r'\b(mb_[a-z0-9_]+):\s*(?:false|true)',
        ),
    ),
    top_level_radio_boolean_sources=(
        RegexSource(
            file=RUST_ROOT / "g5-admin/src/features/members/MemberDetailProfileSection.tsx",
            item_pattern=r'<BooleanChoiceControl\b(?:(?!<BooleanChoiceControl).)*?name="([^"]+)"(?:(?!<BooleanChoiceControl).)*?\/>',
        ),
    ),
    extra_text_sources=(
        RegexSource(
            file=RUST_ROOT / "g5-admin/src/features/members/MemberDetailMediaSection.tsx",
            item_pattern=r'fieldLabel\("([^"]+)"',
        ),
    ),
    save_sources=(
        RegexSource(
            file=RUST_ROOT / "g5-admin/src/features/members/admin-members-form.ts",
            item_pattern=r'(?:assignText|assignFlag)\(\s*input,\s*"([^"]+)"',
        ),
    ),
    multi_value_checkbox_fields=frozenset(),
    schema_scope="supported_fields",
    exclude_create_only_update_fields=True,
    manual_text_fields=frozenset({"mb_level"}),
    manual_save_fields=frozenset({"mb_level", "mb_password", "mb_icon", "mb_img"}),
    notes=(
        "members consumer parity 는 회원 수정 작업면의 write surface 를 기준으로 supported_fields 범위를 검증합니다.",
        "mb_level 은 별도 레벨 카드에서 select 로, mb_icon/mb_img 는 media 카드에서 처리합니다.",
    ),
)

SOURCE_GRAPH_ADAPTERS = (
    SourceGraphAdapter(
        "boards",
        RUST_ROOT / "g5-admin/src/features/boards",
        entity_schema="AdminBoard",
        write_schemas=("AdminBoardCreateRequest", "AdminBoardUpdateRequest"),
        read_only_fields=frozenset({"bo_count_write", "bo_count_comment", "bo_notice"}),
    ),
    SourceGraphAdapter(
        "config",
        RUST_ROOT / "g5-admin/src/features/config",
        entity_schema="AdminConfig",
        write_schemas=("AdminConfigUpdateRequest",),
    ),
    SourceGraphAdapter(
        "contents",
        RUST_ROOT / "g5-admin/src/features/contents",
        entity_schema="ContentItem",
        write_schemas=("ContentCreateRequest", "ContentUpdateRequest"),
    ),
    SourceGraphAdapter("faq-masters", RUST_ROOT / "g5-admin/src/features/faqs"),
    SourceGraphAdapter("faqs", RUST_ROOT / "g5-admin/src/features/faqs"),
    SourceGraphAdapter(
        "groups",
        RUST_ROOT / "g5-admin/src/features/board-groups",
        entity_schema="Group",
        write_schemas=("AdminGroupCreateRequest", "AdminGroupUpdateRequest"),
    ),
    SourceGraphAdapter("mails", RUST_ROOT / "g5-admin/src/features/mails"),
    SourceGraphAdapter("members", RUST_ROOT / "g5-admin/src/features/members"),
    SourceGraphAdapter("menus", RUST_ROOT / "g5-admin/src/features/menus"),
    SourceGraphAdapter("points", RUST_ROOT / "g5-admin/src/features/points"),
    SourceGraphAdapter(
        "polls",
        RUST_ROOT / "g5-admin/src/features/polls",
        entity_schema="Poll",
        write_schemas=("AdminPollCreateRequest", "AdminPollUpdateRequest"),
        read_only_fields=frozenset(
            {
                "po_id",
                "po_cnt1",
                "po_cnt2",
                "po_cnt3",
                "po_cnt4",
                "po_cnt5",
                "po_cnt6",
                "po_cnt7",
                "po_cnt8",
                "po_cnt9",
                "po_ips",
                "mb_ids",
            }
        ),
    ),
    SourceGraphAdapter(
        "popups",
        RUST_ROOT / "g5-admin/src/features/popups",
        entity_schema="Popup",
        write_schemas=("PopupCreateRequest", "PopupUpdateRequest"),
        read_only_fields=frozenset({"nw_id"}),
    ),
    SourceGraphAdapter("sms-contacts", RUST_ROOT / "g5-admin/src/features/sms-contacts"),
    SourceGraphAdapter("sms-messages", RUST_ROOT / "g5-admin/src/features/sms-messages"),
    SourceGraphAdapter("sms-templates", RUST_ROOT / "g5-admin/src/features/sms-templates"),
    SourceGraphAdapter("system", RUST_ROOT / "g5-admin/src/features/system"),
    SourceGraphAdapter("theme", RUST_ROOT / "g5-admin/src/features/theme"),
)

DOMAIN_ADAPTERS: dict[str, DomainAdapter | SourceGraphAdapter] = {
    adapter.domain: adapter for adapter in SOURCE_GRAPH_ADAPTERS
}

RUST_SOURCE_GLOBS = (
    "g5-admin/src/**/*.ts",
    "g5-admin/src/**/*.tsx",
    "g5-admin/src-tauri/src/**/*.rs",
)


def extract_array_body(content: str, array_name: str) -> str:
    pattern = re.compile(rf"{re.escape(array_name)}[^=]*=\s*\[(.*?)\]\s*(?:as const)?;", re.S)
    match = pattern.search(content)
    if not match:
        raise ValueError(f"배열 {array_name} 를 찾지 못했습니다.")
    return match.group(1)


def extract_object_body(content: str, object_name: str) -> str:
    pattern = re.compile(rf"{re.escape(object_name)}[^=]*=\s*\{{(.*?)\}}\s*;", re.S)
    match = pattern.search(content)
    if not match:
        raise ValueError(f"객체 {object_name} 를 찾지 못했습니다.")
    return match.group(1)


def extract_values(source: ArraySource | ObjectSource | RegexSource) -> list[str]:
    content = source.file.read_text(encoding="utf-8")
    if isinstance(source, ArraySource):
        body = extract_array_body(content, source.array_name)
    elif isinstance(source, ObjectSource):
        body = extract_object_body(content, source.object_name)
    else:
        body = content
    return re.findall(source.item_pattern, body, re.S)


def extract_section_keys(adapter: DomainAdapter) -> list[str]:
    if (
        adapter.section_order_file is None
        or adapter.section_order_array_name is None
        or adapter.section_key_pattern is None
    ):
        return []
    content = adapter.section_order_file.read_text(encoding="utf-8")
    body = extract_array_body(content, adapter.section_order_array_name)
    section_key_blocks = re.findall(adapter.section_key_pattern, body, re.S)
    keys: list[str] = []
    for block in section_key_blocks:
        keys.extend(re.findall(r'"([^"]+)"', block))
    return keys


def load_schema_fields(schema_json_path: Path) -> tuple[dict[str, dict[str, Any]], list[str]]:
    schema = json.loads(schema_json_path.read_text(encoding="utf-8"))
    fields: dict[str, dict[str, Any]] = {}
    section_keys: list[str] = []
    for section in schema.get("sections", []):
        key = section.get("key")
        if isinstance(key, str):
            section_keys.append(key)
        for field in section.get("fields", []):
            name = field.get("name")
            if not isinstance(name, str) or not name:
                continue
            fields[name] = {
                "section_key": key,
                "input_type": field.get("input_type"),
                "data_type": field.get("data_type"),
                "required": bool(field.get("required", False)),
                "create_only": bool(field.get("create_only", False)),
                "readonly_on_update": bool(field.get("readonly_on_update", False)),
                "label": field.get("label"),
                "default_value": field.get("default_value"),
                "options": field.get("options") or [],
                "option_source": field.get("option_source"),
            }
    return fields, section_keys


def load_manifest_supported_fields(domain: str) -> frozenset[str]:
    manifest = json.loads(
        (PHP_ROOT / "api/v1/Admin/Schema/schema-domains.json").read_text(encoding="utf-8")
    )
    for item in manifest.get("domains", []):
        if item.get("domain") != domain:
            continue
        supported = item.get("supported_fields") or []
        return frozenset(field for field in supported if isinstance(field, str))
    return frozenset()


def resolve_schema_json(domain: str) -> Path:
    return PHP_ROOT / "api/v1/Admin/Schema/Data/generated" / f"{domain}.json"


def list_rust_source_files() -> list[Path]:
    files: list[Path] = []
    for pattern in RUST_SOURCE_GLOBS:
        files.extend(RUST_ROOT.glob(pattern))
    return sorted({path for path in files if path.is_file()})


def load_openapi_schemas() -> dict[str, dict[str, Any]]:
    payload = yaml.safe_load(
        (RUST_ROOT / "specs/contracts/php-openapi.snapshot.yaml").read_text(
            encoding="utf-8"
        )
    )
    return payload.get("components", {}).get("schemas", {})


def resolve_openapi_properties(
    schema_name: str,
    schemas: dict[str, dict[str, Any]],
    seen: frozenset[str] = frozenset(),
) -> set[str]:
    if schema_name in seen:
        return set()
    schema = schemas.get(schema_name) or {}
    properties = set((schema.get("properties") or {}).keys())
    next_seen = seen | {schema_name}
    for item in schema.get("allOf") or []:
        ref = item.get("$ref") if isinstance(item, dict) else None
        if isinstance(ref, str):
            properties |= resolve_openapi_properties(ref.rsplit("/", 1)[-1], schemas, next_seen)
        elif isinstance(item, dict):
            properties |= set((item.get("properties") or {}).keys())
    return properties


def load_supported_field_scope(domain: str) -> set[str]:
    manifest = json.loads(
        (PHP_ROOT / "api/v1/Admin/Schema/schema-domains.json").read_text(
            encoding="utf-8"
        )
    )
    for item in manifest.get("domains", []):
        if item.get("domain") != domain:
            continue
        supported = item.get("supported_fields")
        if isinstance(supported, list) and supported:
            return {str(field) for field in supported}
    return set()


def production_sources(feature_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in feature_dir.rglob("*")
        if path.suffix in {".ts", ".tsx"}
        and ".test." not in path.name
        and ".spec." not in path.name
    )


def resolve_local_import(source: Path, specifier: str) -> Path | None:
    if not specifier.startswith("."):
        return None
    candidate = (source.parent / specifier).resolve()
    for path in (
        candidate,
        candidate.with_suffix(".ts"),
        candidate.with_suffix(".tsx"),
        candidate / "index.ts",
        candidate / "index.tsx",
    ):
        if path.is_file():
            return path
    return None


def reachable_feature_sources(adapter: SourceGraphAdapter) -> list[Path]:
    sources = production_sources(adapter.feature_dir)
    source_set = {path.resolve() for path in sources}
    roots = [
        path
        for path in sources
        if path.suffix == ".tsx" and path.name.endswith("Page.tsx")
    ]
    if not roots:
        raise ValueError(f"{adapter.domain}: 활성 React Page.tsx root를 찾지 못했습니다.")

    reachable: set[Path] = set()
    pending = [path.resolve() for path in roots]
    import_pattern = re.compile(r'(?:from\s+|import\s*)["\']([^"\']+)["\']')
    while pending:
        source = pending.pop()
        if source in reachable:
            continue
        reachable.add(source)
        content = source.read_text(encoding="utf-8", errors="ignore")
        for specifier in import_pattern.findall(content):
            imported = resolve_local_import(source, specifier)
            if imported is None:
                continue
            resolved = imported.resolve()
            if resolved in source_set and resolved not in reachable:
                pending.append(resolved)
    return sorted(reachable)


def source_mentions_field(content: str, field: str) -> bool:
    return re.search(rf"(?<![A-Za-z0-9_]){re.escape(field)}(?![A-Za-z0-9_])", content) is not None


def source_is_save_owner(source: Path, all_sources: list[Path]) -> bool:
    content = source.read_text(encoding="utf-8", errors="ignore")
    if re.search(
        r"build[A-Za-z0-9_]*(?:Input|Payload|Patch)|prepare[A-Za-z0-9_]*Submit|mutationFn\s*:|\.mutate\(|Upload|type=[\"\']file[\"\']",
        content,
    ):
        return True

    stem = source.stem
    import_ref = re.compile(rf'["\'][^"\']*{re.escape(stem)}["\']')
    for consumer in all_sources:
        if consumer == source:
            continue
        consumer_content = consumer.read_text(encoding="utf-8", errors="ignore")
        if not import_ref.search(consumer_content):
            continue
        if re.search(
            r"build[A-Za-z0-9_]*(?:Input|Payload|Patch)|prepare[A-Za-z0-9_]*Submit|mutationFn\s*:|\.mutate\(|Upload|type=[\"\']file[\"\']",
            consumer_content,
        ):
            return True
    return False


def compare_source_graph_consumer(adapter: SourceGraphAdapter) -> dict[str, Any]:
    schema_fields, schema_sections = load_schema_fields(resolve_schema_json(adapter.domain))
    supported_scope = load_supported_field_scope(adapter.domain)
    schemas = load_openapi_schemas()

    if supported_scope:
        expected_fields = set(schema_fields) & supported_scope
    elif adapter.entity_schema:
        entity_fields = resolve_openapi_properties(adapter.entity_schema, schemas)
        write_contract_fields = {
            field
            for name in adapter.write_schemas
            for field in resolve_openapi_properties(name, schemas)
        }
        expected_fields = set(schema_fields) & (entity_fields | write_contract_fields)
    else:
        expected_fields = set(schema_fields)

    writable_fields = expected_fields - set(adapter.read_only_fields)
    read_only_fields = expected_fields - writable_fields
    sources = reachable_feature_sources(adapter)
    contents = {
        source: source.read_text(encoding="utf-8", errors="ignore") for source in sources
    }
    occurrences = {
        field: [
            str(source.relative_to(RUST_ROOT))
            for source, content in contents.items()
            if source_mentions_field(content, field)
        ]
        for field in sorted(expected_fields)
    }
    missing_fields = sorted(field for field, paths in occurrences.items() if not paths)

    save_owned_sources = {
        source for source in sources if source_is_save_owner(source, sources)
    }
    save_evidence = {
        field: [
            str(source.relative_to(RUST_ROOT))
            for source in save_owned_sources
            if source_mentions_field(contents[source], field)
        ]
        for field in sorted(writable_fields)
    }
    missing_save_fields = sorted(
        field for field, paths in save_evidence.items() if not paths
    )

    hook_pattern = re.compile(
        rf'useAdminFieldSchema\(\s*["\']{re.escape(adapter.domain)}["\']\s*\)'
    )
    hook_sources = [
        str(source.relative_to(RUST_ROOT))
        for source, content in contents.items()
        if hook_pattern.search(content)
    ]
    metadata_guard = RUST_ROOT / "g5-admin/src/features/schema/useAdminFieldSchema.ts"
    metadata_guard_content = metadata_guard.read_text(encoding="utf-8")
    metadata_tokens = {
        "name",
        "input_type",
        "data_type",
        "required",
        "create_only",
        "readonly_on_update",
        "description",
        "default_value",
        "options",
        "option_source",
    }
    missing_metadata_tokens = sorted(
        token for token in metadata_tokens if token not in metadata_guard_content
    )

    type_mismatches: list[dict[str, Any]] = []
    for field in sorted(expected_fields):
        meta = schema_fields[field]
        input_type = str(meta.get("input_type") or "")
        data_type = str(meta.get("data_type") or "")
        if input_type not in {
            "text",
            "textarea",
            "select",
            "checkbox",
            "radio",
            "password",
            "file",
            "number",
            "date",
            "datetime-local",
            "hidden",
        } or data_type not in {"string", "integer", "boolean", "file"}:
            type_mismatches.append(
                {
                    "field": field,
                    "schema_input_type": input_type,
                    "schema_data_type": data_type,
                    "reason": "공통 runtime metadata guard가 지원하지 않는 control/data kind입니다.",
                }
            )

    dynamic_option_sources = [
        {
            "field": field,
            "source": schema_fields[field].get("option_source"),
        }
        for field in sorted(expected_fields)
        if schema_fields[field].get("option_source")
    ]
    runtime_directory_sources = [
        item["field"]
        for item in dynamic_option_sources
        if (item.get("source") or {}).get("kind") == "directory"
        and not (item.get("source") or {}).get("endpoint")
    ]

    status = "pass"
    if (
        missing_fields
        or missing_save_fields
        or type_mismatches
        or not hook_sources
        or missing_metadata_tokens
    ):
        status = "fail"

    return {
        "status": status,
        "mode": "strong_adapter",
        "adapter_kind": "reachable_source_graph",
        "domain": adapter.domain,
        "notes": [
            "활성 Page.tsx import graph에 도달하는 production source만 증거로 사용합니다.",
            "필드 범위는 PHP supported_fields 또는 canonical OpenAPI entity/request schema와 교집합으로 계산합니다.",
            "공통 runtime guard가 name/control/data/required/default/options/option_source 메타데이터를 fail-closed 검증합니다.",
        ],
        "schema_json": str(resolve_schema_json(adapter.domain)),
        "expected_fields": sorted(expected_fields),
        "consumer_field_sets": {
            "writable": sorted(writable_fields),
            "read_only": sorted(read_only_fields),
        },
        "field_source_evidence": occurrences,
        "save_field_evidence": save_evidence,
        "schema_hook_sources": hook_sources,
        "metadata_guard_source": str(metadata_guard.relative_to(RUST_ROOT)),
        "missing_metadata_tokens": missing_metadata_tokens,
        "dynamic_option_sources": dynamic_option_sources,
        "runtime_directory_option_sources": runtime_directory_sources,
        "missing_fields": missing_fields,
        "consumer_only_fields": [],
        "save_fields": sorted(field for field, paths in save_evidence.items() if paths),
        "missing_save_fields": missing_save_fields,
        "save_only_fields": [],
        "type_mismatches": type_mismatches,
        "missing_sections": [] if hook_sources else schema_sections,
        "consumer_only_sections": [],
        "unverified_manual_fields": [],
        "reachable_source_count": len(sources),
    }


def compare_consumer_vs_schema(
    adapter: DomainAdapter | SourceGraphAdapter,
) -> dict[str, Any]:
    if isinstance(adapter, SourceGraphAdapter):
        return compare_source_graph_consumer(adapter)
    schema_fields, schema_section_keys = load_schema_fields(adapter.schema_json)
    if adapter.schema_scope == "supported_fields":
        supported_fields = load_manifest_supported_fields(adapter.domain)
        schema_fields = {
            name: meta for name, meta in schema_fields.items() if name in supported_fields
        }
    if adapter.exclude_create_only_update_fields:
        schema_fields = {
            name: meta
            for name, meta in schema_fields.items()
            if not (meta.get("create_only") and meta.get("readonly_on_update"))
        }
    if adapter.ignored_schema_fields:
        schema_fields = {
            name: meta
            for name, meta in schema_fields.items()
            if name not in adapter.ignored_schema_fields
        }

    top_level_text = {
        item
        for source in adapter.top_level_text_sources
        for item in extract_values(source)
    } | set(adapter.manual_text_fields)
    top_level_boolean = {
        item
        for source in adapter.top_level_boolean_sources
        for item in extract_values(source)
    } | set(adapter.manual_boolean_fields)
    top_level_radio_boolean = {
        item
        for source in adapter.top_level_radio_boolean_sources
        for item in extract_values(source)
    } | set(adapter.manual_radio_boolean_fields)
    extra_text = {
        item
        for source in adapter.extra_text_sources
        for item in extract_values(source)
    }
    extra_boolean = {
        item
        for source in adapter.extra_boolean_sources
        for item in extract_values(source)
    }
    extra_radio_boolean = {
        item
        for source in adapter.extra_radio_boolean_sources
        for item in extract_values(source)
    }
    consumer_sections = extract_section_keys(adapter)

    consumer_field_sets = {
        "top_level_text": sorted(top_level_text),
        "top_level_boolean": sorted(top_level_boolean),
        "top_level_radio_boolean": sorted(top_level_radio_boolean),
        "extra_text": sorted(extra_text),
        "extra_boolean": sorted(extra_boolean),
        "extra_radio_boolean": sorted(extra_radio_boolean),
    }
    consumer_fields = (
        top_level_text
        | top_level_boolean
        | top_level_radio_boolean
        | extra_text
        | extra_boolean
        | extra_radio_boolean
    )

    save_fields = {
        item
        for source in adapter.save_sources
        for item in extract_values(source)
    } | set(adapter.manual_save_fields)
    if adapter.save_includes_extra_fields:
        save_fields |= extra_text | extra_boolean | extra_radio_boolean
    unverified_manual_fields = sorted(
        set(adapter.manual_text_fields)
        | set(adapter.manual_boolean_fields)
        | set(adapter.manual_radio_boolean_fields)
        | set(adapter.manual_save_fields)
    )

    missing_fields = sorted(set(schema_fields) - consumer_fields)
    consumer_only_fields = sorted(consumer_fields - set(schema_fields))
    missing_save_fields = sorted(consumer_fields - save_fields)
    save_only_fields = sorted(save_fields - consumer_fields)

    type_mismatches: list[dict[str, Any]] = []
    for name, schema_field in sorted(schema_fields.items()):
        location = classify_consumer_field(
            name,
            top_level_text,
            top_level_boolean,
            top_level_radio_boolean,
            extra_text,
            extra_boolean,
            extra_radio_boolean,
        )
        if location is None:
            continue

        input_type = str(schema_field.get("input_type") or "")
        data_type = str(schema_field.get("data_type") or "")
        mismatch_reason = validate_field_mapping(name, location, input_type, data_type, adapter)
        if mismatch_reason:
            type_mismatches.append(
                {
                    "field": name,
                    "consumer_location": location,
                    "schema_input_type": input_type,
                    "schema_data_type": data_type,
                    "reason": mismatch_reason,
                }
            )

    if consumer_sections:
        missing_sections = sorted(set(schema_section_keys) - set(consumer_sections))
        stale_sections = sorted(set(consumer_sections) - set(schema_section_keys))
    else:
        missing_sections = []
        stale_sections = []

    status = "pass"
    if (
        missing_fields
        or consumer_only_fields
        or missing_save_fields
        or save_only_fields
        or type_mismatches
        or missing_sections
        or stale_sections
        or unverified_manual_fields
    ):
        status = "fail"

    return {
        "status": status,
        "mode": "strong_adapter",
        "domain": adapter.domain,
        "notes": list(adapter.notes),
        "schema_json": str(adapter.schema_json),
        "consumer_field_sets": consumer_field_sets,
        "missing_fields": missing_fields,
        "consumer_only_fields": consumer_only_fields,
        "save_fields": sorted(save_fields),
        "missing_save_fields": missing_save_fields,
        "save_only_fields": save_only_fields,
        "type_mismatches": type_mismatches,
        "missing_sections": missing_sections,
        "consumer_only_sections": stale_sections,
        "unverified_manual_fields": unverified_manual_fields,
    }


def compare_consumer_with_generic_heuristic(domain: str) -> dict[str, Any]:
    schema_json = resolve_schema_json(domain)
    if not schema_json.is_file():
        return {
            "status": "blocked",
            "mode": "missing_schema",
            "domain": domain,
            "notes": [
                "generated schema 파일이 없어 consumer parity 를 계산할 수 없습니다.",
            ],
            "schema_json": str(schema_json),
            "missing_fields": [],
            "consumer_only_fields": [],
            "save_fields": [],
            "missing_save_fields": [],
            "save_only_fields": [],
            "type_mismatches": [],
            "missing_sections": [],
            "consumer_only_sections": [],
            "candidate_files": [],
        }

    schema_fields, schema_section_keys = load_schema_fields(schema_json)
    source_files = list_rust_source_files()
    field_names = sorted(schema_fields)
    candidate_files: list[dict[str, Any]] = []
    matched_fields: set[str] = set()
    domain_tokens = {domain, domain.replace("-", ""), domain.replace("-", "_")}

    for path in source_files:
        content = path.read_text(encoding="utf-8", errors="ignore")
        file_matches = [field for field in field_names if field in content]
        domain_score = sum(1 for token in domain_tokens if token and token in content)
        if not file_matches and domain_score == 0:
            continue

        matched_fields.update(file_matches)
        candidate_files.append(
            {
                "file": str(path.relative_to(RUST_ROOT)),
                "field_hit_count": len(file_matches),
                "domain_token_hits": domain_score,
                "matched_fields": file_matches[:25],
            }
        )

    candidate_files.sort(
        key=lambda item: (-item["field_hit_count"], -item["domain_token_hits"], item["file"])
    )
    candidate_files = candidate_files[:20]

    return {
        "status": "blocked",
        "mode": "heuristic_only",
        "domain": domain,
        "notes": [
            "이 도메인에는 strong consumer adapter 가 아직 없습니다.",
            "대신 Rust 전체 소스에서 schema field name 과 domain token 을 검색한 heuristic footprint 를 리포트합니다.",
            "이 리포트는 구현 흔적 탐색용이며, 실제 parity pass/fail 판정은 아닙니다.",
        ],
        "schema_json": str(schema_json),
        "missing_fields": sorted(set(schema_fields) - matched_fields),
        "consumer_only_fields": [],
        "save_fields": [],
        "missing_save_fields": sorted(matched_fields),
        "save_only_fields": [],
        "type_mismatches": [],
        "missing_sections": schema_section_keys,
        "consumer_only_sections": [],
        "candidate_files": candidate_files,
        "matched_field_count": len(matched_fields),
        "schema_field_count": len(schema_fields),
    }


def classify_consumer_field(
    name: str,
    top_level_text: set[str],
    top_level_boolean: set[str],
    top_level_radio_boolean: set[str],
    extra_text: set[str],
    extra_boolean: set[str],
    extra_radio_boolean: set[str],
) -> str | None:
    if name in top_level_text:
        return "top_level_text"
    if name in top_level_radio_boolean:
        return "top_level_radio_boolean"
    if name in top_level_boolean:
        return "top_level_boolean"
    if name in extra_text:
        return "extra_text"
    if name in extra_radio_boolean:
        return "extra_radio_boolean"
    if name in extra_boolean:
        return "extra_boolean"
    return None


def validate_field_mapping(
    name: str,
    location: str,
    input_type: str,
    data_type: str,
    adapter: DomainAdapter,
) -> str | None:
    if input_type == "checkbox" and data_type == "string":
        if name in adapter.multi_value_checkbox_fields and location in {"top_level_text", "extra_text"}:
            return None
        return f"checkbox(string) multi-value 필드는 text 계열 consumer 로 소비해야 합니다. 현재={location}"

    if input_type == "checkbox" and data_type == "boolean":
        if location in {"top_level_boolean", "extra_boolean"}:
            return None
        return f"checkbox(boolean) 필드는 boolean 계열 consumer 로 소비해야 합니다. 현재={location}"

    if input_type == "radio" and data_type == "boolean":
        if location in {"top_level_radio_boolean", "extra_radio_boolean"}:
            return None
        return f"radio(boolean) 필드는 radio-boolean 계열 consumer 로 소비해야 합니다. 현재={location}"

    if input_type in {"select", "radio", "text", "textarea", "number", "date", "datetime-local"}:
        if location in {"top_level_text", "extra_text"}:
            return None
        return f"{input_type} 필드는 text/select 계열 consumer 로 소비해야 합니다. 현재={location}"

    return (
        f"{input_type or '<empty>'}/{data_type or '<empty>'} control kind는 "
        "현재 strong adapter가 명시적으로 증명하지 못합니다."
    )


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# {report['domain']} Consumer Parity Report",
        "",
        "## 1. Status",
        f"- status: `{report['status']}`",
        f"- mode: `{report.get('mode', 'unknown')}`",
        f"- schema_json: `{report['schema_json']}`",
        "",
        "## 2. Missing Fields",
    ]
    if report["missing_fields"]:
        for field in report["missing_fields"]:
            lines.append(f"- `{field}`")
    else:
        lines.append("- none")

    lines.extend(["", "## 3. Consumer-only Fields"])
    if report["consumer_only_fields"]:
        for field in report["consumer_only_fields"]:
            lines.append(f"- `{field}`")
    else:
        lines.append("- none")

    lines.extend(["", "## 4. Type Mismatches"])
    if report["type_mismatches"]:
        for item in report["type_mismatches"]:
            lines.append(
                f"- `{item['field']}`: {item['reason']} (schema={item['schema_input_type']}/{item['schema_data_type']}, consumer={item['consumer_location']})"
            )
    else:
        lines.append("- none")

    lines.extend(["", "## 5. Save-path Drift"])
    lines.append(f"- missing_save_fields: {report.get('missing_save_fields') or 'none'}")
    lines.append(f"- save_only_fields: {report.get('save_only_fields') or 'none'}")

    lines.extend(["", "## 6. Section Drift"])
    lines.append(f"- missing_sections: {report['missing_sections'] or 'none'}")
    lines.append(f"- consumer_only_sections: {report['consumer_only_sections'] or 'none'}")
    candidate_files = report.get("candidate_files") or []
    lines.extend(["", "## 7. Candidate Files"])
    if candidate_files:
        for item in candidate_files:
            lines.append(
                f"- `{item['file']}`: field_hits={item.get('field_hit_count', 0)} "
                f"domain_token_hits={item.get('domain_token_hits', 0)} "
                f"matched={item.get('matched_fields', [])}"
            )
    else:
        lines.append("- none")
    lines.extend(["", "## 8. Notes"])
    for note in report["notes"]:
        lines.append(f"- {note}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    output_dir = Path(args.output_dir or (RUST_ROOT / "output/admin-domain-consumer-parity" / args.domain))
    output_dir.mkdir(parents=True, exist_ok=True)

    adapter = DOMAIN_ADAPTERS.get(args.domain)
    report = compare_consumer_vs_schema(adapter) if adapter is not None else compare_consumer_with_generic_heuristic(args.domain)
    (output_dir / "latest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "latest.md").write_text(render_markdown(report), encoding="utf-8")
    print(str(output_dir / "latest.json"))
    raise SystemExit(0 if report["status"] == "pass" else 1)


if __name__ == "__main__":
    main()
