#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tomllib
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from audit_harness.execution import CheckResult, CheckSpec  # noqa: E402
from audit_harness.execution import run_check as execute_check  # noqa: E402
from audit_harness.paths import (  # noqa: E402
    resolve_openapi_manifest_path,
    resolve_openapi_path,
    resolve_php_root,
    resolve_workspace_root,
)

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore[assignment]


# Distinct OpenAPI paths are distinct consumer obligations.  This audit must not
# collapse compatibility-looking paths because their operationId, parameters,
# request body or response contract can differ.
PATH_ALIASES: dict[str, str] = {}

# Backward-compatible defaults for a v1 scope registry.  The v2 registry owns
# these values through ``audit_contract``; these defaults keep an older checkout
# fail-closed for the app bootstrap path instead of silently auditing /admin only.
DEFAULT_ACTIVE_PATH_PREFIXES = ("/admin/",)
DEFAULT_ACTIVE_EXACT_OPERATIONS = (
    ("GET", "/health"),
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/refresh"),
    ("GET", "/members/me"),
)
OPENAPI_OPERATION_METHODS = frozenset(
    {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
)

SCHEMA_CONSUMER_PATTERN = re.compile(r"\buseAdminFieldSchema\(")
COMMAND_PATTERN = re.compile(r"\bcmd_[a-z0-9_]+\b")
TRACE_FIELD_NAMES = {"request_id", "correlation_id", "server_request_id"}
FLATTENED_RESPONSE_FIELD_MAP = {
    "AdminAuthListResponse": {
        "data": {"items"},
        "meta": TRACE_FIELD_NAMES,
    },
    "AdminSchemaCatalogResponse": {
        "data": {"catalog"},
        "meta": TRACE_FIELD_NAMES,
    },
    "AdminSchemaDetailResponse": {
        "data": {"schema"},
        "meta": TRACE_FIELD_NAMES,
    },
    "BoardDetailResponse": {
        "data": {"board"},
        "meta": TRACE_FIELD_NAMES,
    },
    "BoardListResponse": {
        "data": {"boards"},
        "meta": TRACE_FIELD_NAMES,
    },
}
ALLOWED_RUST_EXTENSION_FIELDS = {
    "AdminBoard": {"extra"},
}
OPENAPI_TO_RUST_SCHEMA_NAMES = {
    "Board": "AdminBoard",
    "BoardDetailResponse": "AdminBoardDetailResponse",
    "BoardListResponse": "AdminBoardListResponse",
    "AdminAuthAssignment": "AdminAuthGrant",
    "AdminAuthMember": "AdminAuthItem",
}
OPENAPI_TO_RUST_REF_NAMES = {
    "Board": "AdminBoard",
    "AdminAuthAssignment": "AdminAuthGrant",
    "AdminAuthMember": "AdminAuthItem",
    "Meta": "ApiTraceMeta",
    "VisitStatsSummary": "AdminVisitStatsSummary",
}
ALLOWED_RUST_MISSING_ADMIN_PATHS: set[str] = set()
LEGACY_API_COVERED_FILES = {
    "adm/auth_list.php",
    "adm/board_copy.php",
    "adm/board_list.php",
    "adm/boardgroup_list.php",
    "adm/boardgroupmember_form.php",
    "adm/boardgroupmember_list.php",
    "adm/browscap.php",
    "adm/browscap_convert.php",
    "adm/browscap_converter.php",
    "adm/browscap_update.php",
    "adm/cache_file_delete.php",
    "adm/captcha_file_delete.php",
    "adm/contentlist.php",
    "adm/faqlist.php",
    "adm/faqmasterlist.php",
    "adm/mail_form.php",
    "adm/mail_list.php",
    "adm/mail_preview.php",
    "adm/mail_select_form.php",
    "adm/mail_select_list.php",
    "adm/mail_test.php",
    "adm/member_delete.php",
    "adm/member_list.php",
    "adm/member_list_exel.php",
    "adm/member_list_exel_export.php",
    "adm/member_list_file_delete.php",
    "adm/menu_form.php",
    "adm/menu_list.php",
    "adm/newwinlist.php",
    "adm/point_list.php",
    "adm/point_update.php",
    "adm/poll_list.php",
    "adm/popular_list.php",
    "adm/popular_rank.php",
    "adm/qa_config.php",
    "adm/qa_config_update.php",
    "adm/sendmail_test.php",
    "adm/session_file_delete.php",
    "adm/theme.php",
    "adm/theme_detail.php",
    "adm/thumbnail_file_delete.php",
    "adm/visit_browser.php",
    "adm/visit_date.php",
    "adm/visit_delete.php",
    "adm/visit_device.php",
    "adm/visit_domain.php",
    "adm/visit_hour.php",
    "adm/visit_list.php",
    "adm/visit_month.php",
    "adm/visit_os.php",
    "adm/visit_search.php",
    "adm/visit_week.php",
    "adm/visit_year.php",
    "adm/write_count.php",
}
LEGACY_WEB_ONLY_FILES = {
    "adm/dbupgrade.php",
    "adm/service.php",
    "adm/theme_preview.php",
}
LEGACY_SUPPORT_FILE_PATTERNS = (
    re.compile(r"_update\.php$"),
    re.compile(r"_delete\.php$"),
    re.compile(r"_delete\.inc\.php$"),
    re.compile(r"_form_update\.php$"),
    re.compile(r"_list_update\.php$"),
    re.compile(r"formupdate\.php$"),
    re.compile(r"_file_delete\.php$"),
    re.compile(r"_copy_update\.php$"),
    re.compile(r"_load\.php$"),
    re.compile(r"_search\.php$"),
    re.compile(r"_list_delete\.php$"),
    re.compile(r"\.lib\.php$"),
)


def normalize_path(path: str, aliases: dict[str, str] | None = None) -> str:
    normalized = re.sub(r"\{[^}]*\}", "{param}", path)
    merged_aliases = dict(PATH_ALIASES)
    if aliases:
        merged_aliases.update(aliases)
    return merged_aliases.get(normalized, normalized)


def load_active_consumer_scope_metrics(rust_root: Path) -> dict[str, Any]:
    registry_path = rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
    if not registry_path.is_file():
        return {
            "available": False,
            "reason": "active consumer scope registry not found",
            "registry_path": "specs/integration/ACTIVE_CONSUMER_SCOPE.json",
            "allowance_count": 0,
            "allowance_ids": [],
            "php_features": [],
            "allowed_exact_paths": [],
            "allowed_path_prefixes": [],
            "allowed_exact_schema_domains": [],
            "allowed_schema_domain_prefixes": [],
            "included_path_prefixes": list(DEFAULT_ACTIVE_PATH_PREFIXES),
            "included_exact_operations": [
                {"method": method, "path": path}
                for method, path in DEFAULT_ACTIVE_EXACT_OPERATIONS
            ],
            "path_aliases": dict(PATH_ALIASES),
            "audit_contract_id": "",
            "expected_operation_counts": {},
            "required_layers": [],
            "hard_fail_states": [],
        }

    payload = read_json(registry_path)
    audit_contract = payload.get("audit_contract", {})
    if not isinstance(audit_contract, dict):
        audit_contract = {}

    raw_aliases = audit_contract.get(
        "path_equivalents", audit_contract.get("path_aliases", {})
    )
    contract_aliases: dict[str, str] = {}
    if isinstance(raw_aliases, dict):
        contract_aliases = {
            re.sub(r"\{[^}]*\}", "{param}", source.strip()): re.sub(
                r"\{[^}]*\}", "{param}", target.strip()
            )
            for source, target in raw_aliases.items()
            if isinstance(source, str)
            and source.strip()
            and isinstance(target, str)
            and target.strip()
        }

    raw_prefixes = audit_contract.get("included_path_prefixes")
    if not isinstance(raw_prefixes, list):
        raw_prefixes = list(DEFAULT_ACTIVE_PATH_PREFIXES)
    included_path_prefixes = sorted(
        {
            value.strip()
            for value in raw_prefixes
            if isinstance(value, str) and value.strip()
        }
    )

    raw_exact_operations: Any = None
    for key in (
        "included_exact_operations",
        "exact_operations",
        "bootstrap_operations",
        "included_operations",
    ):
        candidate = audit_contract.get(key)
        if isinstance(candidate, list):
            raw_exact_operations = candidate
            break
    if raw_exact_operations is None:
        raw_exact_operations = [
            {"method": method, "path": path}
            for method, path in DEFAULT_ACTIVE_EXACT_OPERATIONS
        ]

    included_exact_operations: set[tuple[str, str]] = set()
    for operation in raw_exact_operations:
        method = ""
        path = ""
        if isinstance(operation, dict):
            method = str(operation.get("method", "")).strip().upper()
            path = str(operation.get("path", "")).strip()
        elif isinstance(operation, str):
            parts = operation.strip().split(maxsplit=1)
            if len(parts) == 2:
                method, path = parts[0].upper(), parts[1]
        if method in {"GET", "POST", "PUT", "PATCH", "DELETE"} and path.startswith("/"):
            included_exact_operations.add(
                (method, normalize_path(path, contract_aliases))
            )

    raw_allowances = payload.get("provider_only_allowances", [])
    allowances: list[dict[str, Any]] = []
    allowance_ids: list[str] = []
    php_features: set[str] = set()
    exact_paths: set[str] = set()
    path_prefixes: set[str] = set()
    exact_schema_domains: set[str] = set()
    schema_domain_prefixes: set[str] = set()

    if not isinstance(raw_allowances, list):
        raw_allowances = []

    for raw in raw_allowances:
        if not isinstance(raw, dict):
            continue
        allowance_id = str(raw.get("id", "")).strip()
        if allowance_id == "":
            continue
        exact = sorted(
            {
                normalize_path(value.strip(), contract_aliases)
                for value in raw.get("path_exact", [])
                if isinstance(value, str) and value.strip()
            }
        )
        prefixes = sorted(
            {
                value.strip()
                for value in raw.get("path_prefixes", [])
                if isinstance(value, str) and value.strip()
            }
        )
        schema_exact = sorted(
            {
                value.strip()
                for value in raw.get("schema_domains", [])
                if isinstance(value, str) and value.strip()
            }
        )
        schema_prefixes = sorted(
            {
                value.strip()
                for value in raw.get("schema_domain_prefixes", [])
                if isinstance(value, str) and value.strip()
            }
        )
        php_feature = str(raw.get("php_feature", "")).strip()
        allowance = {
            "id": allowance_id,
            "php_feature": php_feature,
            "reason": str(raw.get("reason", "")).strip(),
            "path_exact": exact,
            "path_prefixes": prefixes,
            "schema_domains": schema_exact,
            "schema_domain_prefixes": schema_prefixes,
        }
        allowances.append(allowance)
        allowance_ids.append(allowance_id)
        if php_feature:
            php_features.add(php_feature)
        exact_paths.update(exact)
        path_prefixes.update(prefixes)
        exact_schema_domains.update(schema_exact)
        schema_domain_prefixes.update(schema_prefixes)

    return {
        "available": True,
        "consumer": str(payload.get("consumer", "rust-admin")).strip() or "rust-admin",
        "registry_path": str(registry_path.relative_to(rust_root)),
        "allowance_count": len(allowances),
        "allowance_ids": sorted(allowance_ids),
        "php_features": sorted(php_features),
        "allowed_exact_paths": sorted(exact_paths),
        "allowed_path_prefixes": sorted(path_prefixes),
        "allowed_exact_schema_domains": sorted(exact_schema_domains),
        "allowed_schema_domain_prefixes": sorted(schema_domain_prefixes),
        "allowances": allowances,
        "included_path_prefixes": included_path_prefixes,
        "included_exact_operations": [
            {"method": method, "path": path}
            for method, path in sorted(included_exact_operations)
        ],
        "path_aliases": {**PATH_ALIASES, **contract_aliases},
        "audit_contract_id": str(audit_contract.get("id", "")).strip(),
        "expected_operation_counts": (
            audit_contract.get("expected_operation_counts", {})
            if isinstance(audit_contract.get("expected_operation_counts", {}), dict)
            else {}
        ),
        "required_layers": (
            audit_contract.get("required_layers", [])
            if isinstance(audit_contract.get("required_layers", []), list)
            else []
        ),
        "hard_fail_states": (
            audit_contract.get("hard_fail_states", [])
            if isinstance(audit_contract.get("hard_fail_states", []), list)
            else []
        ),
    }


def is_provider_only_path(path: str, scope: dict[str, Any]) -> bool:
    normalized = normalize_path(path, scope.get("path_aliases", {}))
    if normalized in scope.get("allowed_exact_paths", []):
        return True
    return any(
        normalized.startswith(prefix)
        for prefix in scope.get("allowed_path_prefixes", [])
    )


def is_active_consumer_operation(
    method: str,
    path: str,
    scope: dict[str, Any],
) -> bool:
    normalized = normalize_path(path, scope.get("path_aliases", {}))
    operation = (method.upper(), normalized)
    exact_operations = {
        (str(item.get("method", "")).upper(), str(item.get("path", "")))
        for item in scope.get("included_exact_operations", [])
        if isinstance(item, dict)
    }
    if operation in exact_operations:
        return True
    return any(
        normalized.startswith(prefix)
        for prefix in scope.get("included_path_prefixes", [])
    )


def is_provider_only_schema_domain(domain: str, scope: dict[str, Any]) -> bool:
    if domain in scope.get("allowed_exact_schema_domains", []):
        return True
    return any(
        domain.startswith(prefix)
        for prefix in scope.get("allowed_schema_domain_prefixes", [])
    )


def resolve_roots(args: argparse.Namespace) -> tuple[Path, Path, Path, Path | None]:
    rust_root = (
        Path(args.rust_root).resolve()
        if args.rust_root
        else Path(__file__).resolve().parents[1]
    )
    workspace_root = resolve_workspace_root(rust_root)
    php_root = (
        Path(args.php_root).resolve()
        if args.php_root
        else resolve_php_root(rust_root)
    )
    flutter_root = Path(args.flutter_root).resolve() if args.flutter_root else None
    return workspace_root, rust_root, php_root, flutter_root


def extract_braced_function_body(source: str, signature_end: int) -> str | None:
    """Return one Rust/TS function body without consuming following helpers/tests."""
    start = source.find("{", signature_end)
    if start < 0:
        return None
    depth = 0
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    index = start
    while index < len(source):
        character = source[index]
        following = source[index + 1] if index + 1 < len(source) else ""
        if line_comment:
            if character == "\n":
                line_comment = False
            index += 1
            continue
        if block_comment:
            if character == "*" and following == "/":
                block_comment = False
                index += 2
                continue
            index += 1
            continue
        if quote is not None:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            index += 1
            continue
        if character == "/" and following == "/":
            line_comment = True
            index += 2
            continue
        if character == "/" and following == "*":
            block_comment = True
            index += 2
            continue
        if character == '"':
            quote = character
            index += 1
            continue
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return source[start + 1 : index]
        index += 1
    return None


def run_check(
    check_id: str,
    title: str,
    command: list[str],
    cwd: Path,
    env: dict[str, str],
) -> CheckResult:
    return execute_check(
        CheckSpec(
            id=check_id,
            title=title,
            command=tuple(command),
            cwd=cwd,
            tail_limit=20,
        ),
        env=env,
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_php_schema_manifest(php_root: Path) -> dict[str, Any]:
    return read_json(php_root / "api/v1/Admin/Schema/schema-domains.json")


def extract_table_columns(sql: str, table_name: str) -> list[str]:
    pattern = rf"CREATE TABLE IF NOT EXISTS `{re.escape(table_name)}` \((.*?)\)\s*ENGINE="
    match = re.search(pattern, sql, flags=re.S)
    if match is None:
        return []
    return re.findall(r"^\s*`([^`]+)`", match.group(1), flags=re.M)


def collect_php_schema_metrics(php_root: Path) -> dict[str, Any]:
    manifest = load_php_schema_manifest(php_root)
    sql = (php_root / "install/gnuboard5.sql").read_text(encoding="utf-8", errors="ignore")
    generated_root = php_root / "api/v1/Admin/Schema/Data/generated"

    raw_labels: list[dict[str, str]] = []
    fixme_labels: list[dict[str, str]] = []
    domain_parity: list[dict[str, Any]] = []
    generated_domains: list[str] = []

    for domain_entry in manifest.get("domains", []):
        domain = str(domain_entry.get("domain", "")).strip()
        if domain == "":
            continue
        generated_path = generated_root / f"{domain}.json"
        if not generated_path.is_file():
            domain_parity.append(
                {
                    "domain": domain,
                    "table": domain_entry.get("table"),
                    "generated": False,
                    "missing_columns": ["__generated_schema_missing__"],
                    "raw_labels": [],
                }
            )
            continue

        generated_domains.append(domain)
        schema = read_json(generated_path)
        fields = {
            field["name"]: field
            for section in schema.get("sections", [])
            for field in section.get("fields", [])
        }

        domain_raw = []
        for field_name, field in sorted(fields.items()):
            label = field.get("label")
            if label == field_name:
                record = {"domain": domain, "field": field_name}
                raw_labels.append(record)
                domain_raw.append(field_name)
            if isinstance(label, str) and label.startswith("FIXME_"):
                fixme_labels.append({"domain": domain, "field": field_name, "label": label})

        table_name = str(domain_entry.get("table", "") or "").strip()
        missing_columns: list[str] = []
        if table_name != "":
            columns = extract_table_columns(sql, table_name)
            ignored_columns = {
                str(column).strip()
                for column in domain_entry.get("exclude_fields", [])
                if str(column).strip()
            }
            ignored_columns.update(
                {
                    str(column).strip()
                    for column in domain_entry.get("source_field_map", {}).keys()
                    if str(column).strip()
                }
            )
            missing_columns = [
                column
                for column in columns
                if column not in fields and column not in ignored_columns
            ]

        domain_parity.append(
            {
                "domain": domain,
                "table": table_name or None,
                "generated": True,
                "field_count": len(fields),
                "missing_columns": missing_columns,
                "raw_labels": domain_raw,
            }
        )

    return {
        "manifest_domain_count": len(manifest.get("domains", [])),
        "generated_domain_count": len(generated_domains),
        "domains": generated_domains,
        "raw_label_count": len(raw_labels),
        "fixme_label_count": len(fixme_labels),
        "raw_labels": raw_labels,
        "fixme_labels": fixme_labels,
        "domain_parity": domain_parity,
    }


def extract_rust_command_metrics(rust_root: Path) -> dict[str, Any]:
    commands_root = rust_root / "g5-admin/src-tauri/src/commands"
    registry_path = rust_root / "g5-admin/src-tauri/src/commands/registry.rs"
    registry_groups_path = (
        rust_root / "g5-admin/src-tauri/src/commands/registry_groups.rs"
    )
    lib_path = rust_root / "g5-admin/src-tauri/src/lib.rs"
    api_target_registry_path = (
        rust_root / "g5-admin/src/api/client/core/api-target-registry.ts"
    )
    api_target_registry_groups_dir = (
        rust_root / "g5-admin/src/api/client/core/api-target-registry-groups"
    )

    command_files = sorted(commands_root.rglob("*.rs"))
    command_source = "".join(
        path.read_text(encoding="utf-8") for path in command_files
    )
    rust_cmd_count = len(re.findall(r"pub async fn cmd_", command_source))

    paths: set[str] = set()
    if api_target_registry_path.is_file():
        api_target_sources = [api_target_registry_path.read_text(encoding="utf-8")]
        if api_target_registry_groups_dir.is_dir():
            api_target_sources.extend(
                path.read_text(encoding="utf-8")
                for path in sorted(api_target_registry_groups_dir.rglob("*.ts"))
            )
        for api_target_source in api_target_sources:
            for match in re.finditer(r':\s*"(/admin/[^"]+)"', api_target_source):
                paths.add(normalize_path(match.group(1)))
    else:
        for path in command_files:
            content = path.read_text(encoding="utf-8")
            for match in re.finditer(r'"(/admin/[^"]+)"', content):
                paths.add(normalize_path(match.group(1)))

    marker = "tauri::generate_handler!["
    registered_commands: list[str] = []
    for candidate in (registry_groups_path, registry_path, lib_path):
        if not candidate.is_file():
            continue
        source = candidate.read_text(encoding="utf-8")
        start = source.find(marker)
        if start == -1:
            continue
        registered_commands = sorted(set(COMMAND_PATTERN.findall(source[start:])))
        break

    return {
        "cmd_count": rust_cmd_count,
        "registered_command_count": len(registered_commands),
        "registered_commands": registered_commands,
        "admin_paths": sorted(paths),
        "admin_path_count": len(paths),
    }


def extract_php_openapi_operations(
    php_root: Path,
    aliases: dict[str, str] | None = None,
) -> list[dict[str, str]]:
    """Extract every OpenAPI operation as a normalized method/path pair."""
    if yaml is None:
        raise RuntimeError("PyYAML is required for exact OpenAPI operation extraction")
    openapi_path = php_root / "api/docs/openapi.yaml"
    document = yaml.safe_load(openapi_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("paths"), dict):
        raise ValueError("OpenAPI paths must be a non-empty object")
    operations: set[tuple[str, str]] = set()
    for raw_path, path_item in document["paths"].items():
        if not isinstance(raw_path, str) or not isinstance(path_item, dict):
            raise ValueError("OpenAPI path items must be path/object pairs")
        normalized_path = normalize_path(raw_path, aliases)
        for raw_method, operation in path_item.items():
            method = str(raw_method).lower()
            if method not in OPENAPI_OPERATION_METHODS:
                continue
            if not isinstance(operation, dict):
                raise ValueError(
                    f"OpenAPI operation must be an object: {method.upper()} {raw_path}"
                )
            operations.add((method.upper(), normalized_path))
    return [
        {"method": method, "path": path}
        for method, path in sorted(operations)
    ]


def extract_php_openapi_metrics(
    php_root: Path,
    aliases: dict[str, str] | None = None,
) -> dict[str, Any]:
    operations = extract_php_openapi_operations(php_root, aliases)
    admin_operations = [
        operation
        for operation in operations
        if operation["path"].startswith("/admin/")
    ]
    admin_paths = {operation["path"] for operation in admin_operations}
    return {
        "admin_paths": sorted(admin_paths),
        "admin_path_count": len(admin_paths),
        "admin_operations": admin_operations,
        "admin_operation_count": len(admin_operations),
        "all_operation_count": len(operations),
    }


def extract_rust_schema_metrics(rust_root: Path) -> dict[str, Any]:
    schema_hook = rust_root / "g5-admin/src/features/schema/useAdminFieldSchema.ts"
    content = schema_hook.read_text(encoding="utf-8")
    domains = re.findall(r'\|\s*"([^"]+)"', content)

    features_root = rust_root / "g5-admin/src/features"
    consumer_files: list[str] = []
    for path in sorted(features_root.rglob("*.tsx")):
        text = path.read_text(encoding="utf-8")
        if SCHEMA_CONSUMER_PATTERN.search(text):
            consumer_files.append(str(path.relative_to(rust_root / "g5-admin")))

    return {
        "schema_domains": sorted(domains),
        "schema_domain_count": len(domains),
        "consumer_file_count": len(consumer_files),
        "consumer_files": consumer_files,
    }


def extract_flutter_contract_metrics(flutter_root: Path) -> dict[str, Any]:
    manifest_path = flutter_root / "contracts/php-openapi.contract-manifest.json"
    manifest = read_json(manifest_path)
    operations = manifest.get("operations", [])
    schemas = manifest.get("schemas", [])
    return {
        "snapshot_operation_count": len(operations),
        "snapshot_schema_count": len(schemas),
    }


def collect_legacy_coverage_metrics(php_root: Path) -> dict[str, Any]:
    """Strangler Fig: schema-domains.json legacy_forms vs adm/ directory."""
    manifest = load_php_schema_manifest(php_root)
    adm_dir = php_root / "adm"

    declared_legacy: dict[str, str] = {}
    domains_without_legacy: list[str] = []
    for domain_entry in manifest.get("domains", []):
        domain = str(domain_entry.get("domain", "")).strip()
        forms = domain_entry.get("legacy_forms", [])
        if not forms:
            domains_without_legacy.append(domain)
        for form in forms:
            p = form.get("path", "")
            if p:
                declared_legacy[p] = domain

    adm_admin_files: set[str] = set()
    if adm_dir.is_dir():
        admin_keywords = (
            "_form", "_list", "_delete", "config_form", "poll_", "popular_",
            "qa_config", "theme", "visit_", "mail_", "member_", "menu_",
            "point_", "newwin", "content", "faq", "boardgroup", "board_",
            "auth_", "browscap", "write_count",
        )
        for f in adm_dir.iterdir():
            if f.is_file() and f.suffix == ".php":
                name = f.name
                if any(name.endswith(s + ".php") for s in ("_form", "_list", "_delete", "form", "list")):
                    adm_admin_files.add(f"adm/{name}")
                elif any(kw in name for kw in admin_keywords):
                    adm_admin_files.add(f"adm/{name}")

    mapped_files = set(declared_legacy.keys())
    api_covered_files = sorted(adm_admin_files & LEGACY_API_COVERED_FILES)
    web_only_files = sorted(adm_admin_files & LEGACY_WEB_ONLY_FILES)
    support_helper_files = sorted(
        path
        for path in adm_admin_files - mapped_files - set(api_covered_files) - set(web_only_files)
        if any(pattern.search(Path(path).name) for pattern in LEGACY_SUPPORT_FILE_PATTERNS)
    )
    unmapped_files = sorted(
        adm_admin_files
        - mapped_files
        - set(api_covered_files)
        - set(web_only_files)
        - set(support_helper_files)
    )

    missing_declared: list[dict[str, str]] = []
    for path_str, domain in sorted(declared_legacy.items()):
        if not (php_root / path_str).exists():
            missing_declared.append({"path": path_str, "domain": domain})

    return {
        "declared_legacy_count": len(declared_legacy),
        "declared_legacy_files": sorted(
            [{"path": p, "domain": d, "exists": (php_root / p).exists()}
             for p, d in declared_legacy.items()],
            key=lambda x: x["domain"],
        ),
        "adm_admin_file_count": len(adm_admin_files),
        "api_covered_legacy_files": api_covered_files,
        "api_covered_legacy_count": len(api_covered_files),
        "web_only_legacy_files": web_only_files,
        "web_only_legacy_count": len(web_only_files),
        "support_helper_files": support_helper_files,
        "support_helper_count": len(support_helper_files),
        "unmapped_adm_files": unmapped_files,
        "unmapped_adm_count": len(unmapped_files),
        "missing_declared_files": missing_declared,
        "domains_without_legacy_forms": domains_without_legacy,
    }


def collect_rust_blocker_metrics(rust_root: Path) -> dict[str, Any]:
    registry_path = rust_root / "specs/audits/BLOCKERS.toml"
    if not registry_path.is_file():
        return {"available": False, "reason": "blocker registry not found"}

    document = tomllib.loads(registry_path.read_text(encoding="utf-8"))
    raw_entries = document.get("blockers", [])
    if not isinstance(raw_entries, list):
        return {"available": False, "reason": "invalid blocker registry format"}

    blockers: list[dict[str, Any]] = []
    features: set[str] = set()
    owners: set[str] = set()
    reasons: set[str] = set()
    audits: set[str] = set()
    generated_report_json = None
    generated_report_md = None
    handoff_reports: list[str] = []

    for raw in raw_entries:
        if not isinstance(raw, dict):
            continue
        blocker_id = str(raw.get("id", "")).strip()
        if blocker_id == "":
            continue
        feature_list = [
            value.strip()
            for value in raw.get("features", [])
            if isinstance(value, str) and value.strip()
        ]
        blockers.append(
            {
                "id": blocker_id,
                "audit": str(raw.get("audit", "")).strip(),
                "scope": str(raw.get("scope", "")).strip(),
                "owner": str(raw.get("owner", "")).strip(),
                "reason": str(raw.get("reason", "")).strip(),
                "feature_count": int(raw.get("feature_count", len(feature_list))),
                "features": feature_list,
                "handoff_report": str(raw.get("handoff_report", "")).strip(),
                "generated_report_json": str(raw.get("generated_report_json", "")).strip(),
                "generated_report_md": str(raw.get("generated_report_md", "")).strip(),
            }
        )
        features.update(feature_list)
        if raw.get("owner"):
            owners.add(str(raw["owner"]).strip())
        if raw.get("reason"):
            reasons.add(str(raw["reason"]).strip())
        if raw.get("audit"):
            audits.add(str(raw["audit"]).strip())
        if raw.get("handoff_report"):
            handoff_reports.append(str(raw["handoff_report"]).strip())
        if generated_report_json is None and raw.get("generated_report_json"):
            generated_report_json = str(raw["generated_report_json"]).strip()
        if generated_report_md is None and raw.get("generated_report_md"):
            generated_report_md = str(raw["generated_report_md"]).strip()

    artifact_blocked_count = None
    if generated_report_json:
        artifact_path = rust_root / generated_report_json
        if artifact_path.is_file():
            payload = read_json(artifact_path)
            artifact_blocked_count = payload.get("blocked_count")

    return {
        "available": True,
        "registry_path": str(registry_path.relative_to(rust_root)),
        "blocker_count": len(blockers),
        "blocker_ids": [item["id"] for item in blockers],
        "owners": sorted(owners),
        "reasons": sorted(reasons),
        "audits": sorted(audits),
        "blocked_feature_count": len(features),
        "blocked_features": sorted(features),
        "generated_blocked_feature_count": artifact_blocked_count,
        "handoff_reports": handoff_reports,
        "generated_report_json": generated_report_json,
        "generated_report_md": generated_report_md,
        "blockers": blockers,
    }


def collect_php_blocker_metrics(php_root: Path) -> dict[str, Any]:
    registry_path = php_root / "docs/audits/BLOCKERS.toml"
    if not registry_path.is_file():
        return {"available": False, "reason": "blocker registry not found"}

    document = tomllib.loads(registry_path.read_text(encoding="utf-8"))
    raw_entries = document.get("blockers", [])
    if not isinstance(raw_entries, list):
        return {"available": False, "reason": "invalid blocker registry format"}

    blockers: list[dict[str, Any]] = []
    owners: set[str] = set()
    upstreams: set[str] = set()
    scopes: set[str] = set()

    for raw in raw_entries:
        if not isinstance(raw, dict):
            continue
        blocker_id = str(raw.get("id", "")).strip()
        if blocker_id == "":
            continue
        blocker = {
            "id": blocker_id,
            "owner": str(raw.get("owner", "")).strip(),
            "scope": str(raw.get("scope", "")).strip(),
            "upstream": str(raw.get("upstream", "")).strip(),
            "summary": str(raw.get("summary", "")).strip(),
            "next_action": str(raw.get("next_action", "")).strip(),
        }
        blockers.append(blocker)
        if blocker["owner"]:
            owners.add(blocker["owner"])
        if blocker["upstream"]:
            upstreams.add(blocker["upstream"])
        if blocker["scope"]:
            scopes.add(blocker["scope"])

    return {
        "available": True,
        "registry_path": str(registry_path.relative_to(php_root)),
        "blocker_count": len(blockers),
        "blocker_ids": [item["id"] for item in blockers],
        "owners": sorted(owners),
        "upstreams": sorted(upstreams),
        "scopes": sorted(scopes),
        "blockers": blockers,
    }


def collect_php_structure_report_metrics(php_root: Path) -> dict[str, Any]:
    json_path = php_root / "output/php-structure-audit/latest.json"
    md_path = php_root / "output/php-structure-audit/latest.md"
    if not json_path.is_file():
        return {"available": False, "reason": "php structure audit artifact not found"}

    payload = read_json(json_path)
    summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
    warnings = payload.get("warnings", []) if isinstance(payload, dict) else []
    budgets = payload.get("active_warning_budgets", []) if isinstance(payload, dict) else []
    blockers = payload.get("blocked_backlog", []) if isinstance(payload, dict) else []

    warning_rules: set[str] = set()
    warning_paths: set[str] = set()
    for warning in warnings:
        if not isinstance(warning, dict):
            continue
        rule = str(warning.get("rule", "")).strip()
        path = str(warning.get("path", "")).strip()
        if rule:
            warning_rules.add(rule)
        if path:
            warning_paths.add(path)

    return {
        "available": True,
        "json_path": str(json_path.relative_to(php_root)),
        "md_path": str(md_path.relative_to(php_root)) if md_path.is_file() else None,
        "status": str(payload.get("status", "")).strip(),
        "generated_at": str(payload.get("generated_at", "")).strip(),
        "failure_count": int(summary.get("failures", 0)),
        "warning_count": int(summary.get("warnings", 0)),
        "active_warning_budget_count": int(summary.get("active_warning_budgets", len(budgets))),
        "active_blocker_count": int(summary.get("active_blockers", len(blockers))),
        "warning_rules": sorted(warning_rules),
        "warning_paths": sorted(warning_paths),
    }


def collect_php_schema_provider_readiness_metrics(php_root: Path) -> dict[str, Any]:
    json_path = php_root / "output/admin-schema-provider-readiness/latest.json"
    md_path = php_root / "output/admin-schema-provider-readiness/latest.md"
    if not json_path.is_file():
        return {
            "available": False,
            "reason": "php schema provider readiness artifact not found",
        }

    payload = read_json(json_path)
    summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
    blocked_entries = payload.get("blocked", []) if isinstance(payload, dict) else []
    implemented_entries = (
        payload.get("implemented", []) if isinstance(payload, dict) else []
    )
    manifest_domains = payload.get("manifest_domains", []) if isinstance(payload, dict) else []

    blocked_features: list[str] = []
    blocked_priorities: set[str] = set()
    blocker_kinds: set[str] = set()
    for entry in blocked_entries:
        if not isinstance(entry, dict):
            continue
        feature = str(entry.get("feature", "")).strip()
        priority = str(entry.get("priority", "")).strip()
        blocker = str(entry.get("blocker", "")).strip()
        if feature:
            blocked_features.append(feature)
        if priority:
            blocked_priorities.add(priority)
        if blocker:
            blocker_kinds.add(blocker)

    implemented_features: list[str] = []
    for entry in implemented_entries:
        if not isinstance(entry, dict):
            continue
        feature = str(entry.get("feature", "")).strip()
        if feature:
            implemented_features.append(feature)

    return {
        "available": True,
        "json_path": str(json_path.relative_to(php_root)),
        "md_path": str(md_path.relative_to(php_root)) if md_path.is_file() else None,
        "status": str(payload.get("status", "")).strip(),
        "generated_at": str(payload.get("generated_at", "")).strip(),
        "registry_path": str(payload.get("registry", "")).strip(),
        "schema_manifest_path": str(payload.get("schema_manifest", "")).strip(),
        "implemented_feature_count": int(
            summary.get("implemented_features", len(implemented_features))
        ),
        "blocked_feature_count": int(
            summary.get("blocked_features", len(blocked_features))
        ),
        "manifest_domain_count": int(
            summary.get("manifest_domains", len(manifest_domains))
        ),
        "implemented_features": sorted(implemented_features),
        "blocked_features": sorted(blocked_features),
        "blocked_priorities": sorted(blocked_priorities),
        "blocker_kinds": sorted(blocker_kinds),
    }


def _split_top_level(value: str, delimiter: str) -> list[str]:
    """Split a generated type expression without breaking nested constructs."""
    parts: list[str] = []
    start = 0
    depths = {"{": 0, "[": 0, "(": 0, "<": 0}
    closing = {"}": "{", "]": "[", ")": "(", ">": "<"}
    quote: str | None = None
    escaped = False
    index = 0
    while index < len(value):
        character = value[index]
        if quote is not None:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            index += 1
            continue
        if character in {'"', "'", "`"}:
            quote = character
            index += 1
            continue
        if character in depths:
            depths[character] += 1
        elif character in closing:
            opener = closing[character]
            depths[opener] = max(0, depths[opener] - 1)
        elif value.startswith(delimiter, index) and all(
            depth == 0 for depth in depths.values()
        ):
            parts.append(value[start:index].strip())
            index += len(delimiter)
            start = index
            continue
        index += 1
    parts.append(value[start:].strip())
    return [part for part in parts if part]


def _signature_key(signature: dict[str, Any]) -> str:
    return json.dumps(signature, ensure_ascii=False, sort_keys=True)


def _normalize_ts_type(raw_type: str) -> dict[str, Any]:
    value = raw_type.strip()
    while value.startswith("(") and value.endswith(")"):
        value = value[1:-1].strip()

    union_parts = _split_top_level(value, "|")
    if len(union_parts) > 1:
        nullable = any(part.strip() == "null" for part in union_parts)
        variants = [
            _normalize_ts_type(part)
            for part in union_parts
            if part.strip() not in {"null", "undefined"}
        ]
        if any(variant.get("kind") == "unverified" for variant in variants):
            return {
                "kind": "unverified",
                "reason": f"unsupported TypeScript union: {value}",
                "nullable": nullable,
            }
        unique = {
            _signature_key({k: v for k, v in variant.items() if k != "nullable"}): {
                k: v for k, v in variant.items() if k != "nullable"
            }
            for variant in variants
        }
        normalized_variants = [unique[key] for key in sorted(unique)]
        if len(normalized_variants) == 1:
            result = dict(normalized_variants[0])
            result["nullable"] = nullable
            return result
        return {
            "kind": "union",
            "variants": normalized_variants,
            "nullable": nullable,
        }

    if value == "null":
        return {"kind": "null", "nullable": True}
    if re.fullmatch(r'"[^"]*"|\'[^\']*\'', value):
        return {"kind": "string", "nullable": False}
    if value == "string":
        return {"kind": "string", "nullable": False}
    if value == "number":
        return {"kind": "number", "nullable": False}
    if value == "bigint":
        return {"kind": "bigint", "nullable": False}
    if value == "boolean":
        return {"kind": "boolean", "nullable": False}
    if value in {"unknown", "any", "JsonValue"}:
        return {"kind": "any", "nullable": False}

    array_match = re.fullmatch(r"Array\s*<(.+)>", value, re.S)
    if array_match:
        return {
            "kind": "array",
            "items": _normalize_ts_type(array_match.group(1)),
            "nullable": False,
        }
    if value.endswith("[]"):
        return {
            "kind": "array",
            "items": _normalize_ts_type(value[:-2]),
            "nullable": False,
        }

    record_match = re.fullmatch(
        r"\{\s*\[key\s+in\s+string\]\s*:\s*(.+)\s*\}", value, re.S
    )
    if record_match:
        return {
            "kind": "record",
            "values": _normalize_ts_type(record_match.group(1)),
            "nullable": False,
        }
    generic_record_match = re.fullmatch(r"Record\s*<\s*string\s*,\s*(.+)>", value, re.S)
    if generic_record_match:
        return {
            "kind": "record",
            "values": _normalize_ts_type(generic_record_match.group(1)),
            "nullable": False,
        }
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
        return {
            "kind": "ref",
            "ref": value,
            "nullable": False,
        }
    return {
        "kind": "unverified",
        "reason": f"unsupported TypeScript type: {value}",
        "nullable": False,
    }


def _resolve_ts_aliases(
    signature: dict[str, Any],
    aliases: dict[str, dict[str, Any]],
    visited: set[str] | None = None,
) -> dict[str, Any]:
    visited = set() if visited is None else set(visited)
    kind = signature.get("kind")
    if kind == "ref" and signature.get("ref") in aliases:
        ref_name = str(signature["ref"])
        if ref_name in visited:
            return {
                "kind": "unverified",
                "reason": f"recursive TypeScript alias: {ref_name}",
                "nullable": bool(signature.get("nullable", False)),
            }
        visited.add(ref_name)
        resolved = _resolve_ts_aliases(aliases[ref_name], aliases, visited)
        resolved["nullable"] = bool(signature.get("nullable", False)) or bool(
            resolved.get("nullable", False)
        )
        return resolved
    resolved = dict(signature)
    if kind == "array" and isinstance(signature.get("items"), dict):
        resolved["items"] = _resolve_ts_aliases(
            signature["items"], aliases, visited
        )
    elif kind == "record" and isinstance(signature.get("values"), dict):
        resolved["values"] = _resolve_ts_aliases(
            signature["values"], aliases, visited
        )
    elif kind == "union" and isinstance(signature.get("variants"), list):
        resolved["variants"] = [
            _resolve_ts_aliases(variant, aliases, visited)
            for variant in signature["variants"]
        ]
    return resolved


def extract_rust_ts_schema_signatures(rust_root: Path) -> dict[str, dict[str, Any]]:
    """Extract field name/type/nullability/required signatures from ts-rs output."""
    wire_types_dir = rust_root / "g5-admin/src/openapi-wire-types"
    types_dir = (
        wire_types_dir
        if wire_types_dir.is_dir()
        else rust_root / "g5-admin/src/types"
    )
    canonical_wire_types = types_dir == wire_types_dir
    result: dict[str, dict[str, Any]] = {}
    if not types_dir.is_dir():
        return result
    aliases: dict[str, dict[str, Any]] = {}
    for ts_path in sorted(types_dir.glob("*.ts")):
        content = ts_path.read_text(encoding="utf-8")
        alias_match = re.search(r"export type (\w+)\s*=\s*(.+);\s*$", content, re.S)
        if not alias_match:
            continue
        expression = alias_match.group(2).strip()
        if expression.startswith("{"):
            continue
        aliases[alias_match.group(1)] = _normalize_ts_type(expression)

    for ts_path in sorted(types_dir.glob("*.ts")):
        content = ts_path.read_text(encoding="utf-8")
        type_match = re.search(r"export type (\w+)\s*=\s*\{", content)
        if not type_match:
            continue
        type_name = type_match.group(1)
        if not type_name.startswith(("Admin", "Board")):
            continue
        body_end = content.rfind("};")
        if body_end < type_match.end():
            result[type_name] = {
                "fields": {},
                "unverified": ["generated object closing delimiter not found"],
                "source": str(ts_path.relative_to(rust_root)),
            }
            continue
        body = content[type_match.end() : body_end]
        fields: dict[str, dict[str, Any]] = {}
        unverified: list[str] = []
        for raw_field in _split_top_level(body, ","):
            field_match = re.fullmatch(
                r"([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*(.+)",
                raw_field,
                re.S,
            )
            if not field_match:
                unverified.append(f"unsupported field declaration: {raw_field}")
                continue
            field_name = field_match.group(1)
            optional_property = field_match.group(2) == "?"
            signature = _normalize_ts_type(field_match.group(3))
            # Canonical wire DTOs intentionally retain scalar component aliases
            # so an OpenAPI $ref remains a named Rust contract edge.  Legacy IPC
            # bindings still need alias expansion for their historical helpers.
            if not canonical_wire_types:
                signature = _resolve_ts_aliases(signature, aliases)
            # ts-rs renders Rust Option<T> as `T | null`. Serde accepts a
            # missing Option field, so HTTP-wire requiredness is false even
            # though the generated frontend object key is present after IPC.
            signature["required"] = (
                not optional_property
                if canonical_wire_types
                else not optional_property and not signature.get("nullable", False)
            )
            signature["ts_property_required"] = not optional_property
            fields[field_name] = signature
        if fields:
            result[type_name] = {
                "fields": fields,
                "unverified": unverified,
                "source": str(ts_path.relative_to(rust_root)),
            }
    return result


def extract_rust_ts_fields(rust_root: Path) -> dict[str, list[str]]:
    """Compatibility field-name view over the normalized ts-rs signatures."""
    return {
        schema_name: list(schema["fields"])
        for schema_name, schema in extract_rust_ts_schema_signatures(rust_root).items()
    }


def _resolve_openapi_ref(ref_str: str, all_schemas: dict[str, Any], visited: set[str] | None = None) -> dict[str, Any]:
    """Recursively resolve $ref in OpenAPI schemas."""
    if visited is None:
        visited = set()
    name = ref_str.split("/")[-1]
    if name in visited:
        return {}
    visited.add(name)
    target = all_schemas.get(name, {})
    if "$ref" in target:
        return _resolve_openapi_ref(target["$ref"], all_schemas, visited)
    return target


def _extract_openapi_schema_fields_regex(php_root: Path) -> dict[str, list[str]]:
    """Fallback: regex-based extraction when pyyaml is unavailable."""
    openapi_path = php_root / "api/docs/openapi.yaml"
    text = openapi_path.read_text(encoding="utf-8")
    result: dict[str, list[str]] = {}
    current_schema: str | None = None
    current_fields: list[str] = []
    in_properties = False
    in_components = False

    for line in text.splitlines():
        if line.strip() == "schemas:" or line == "    schemas:":
            in_components = True
            continue
        if not in_components:
            continue
        schema_match = re.match(r"^    (\w+):$", line)
        if schema_match:
            if current_schema and current_fields:
                result[current_schema] = current_fields
            current_schema = schema_match.group(1)
            current_fields = []
            in_properties = False
            continue
        if current_schema:
            if line.strip() == "properties:":
                in_properties = True
                continue
            if in_properties:
                prop_match = re.match(r"^        (\w+):$", line)
                if prop_match:
                    current_fields.append(prop_match.group(1))
                elif re.match(r"^    \w", line):
                    if current_fields:
                        result[current_schema] = current_fields
                    current_schema = None
                    current_fields = []
                    in_properties = False
    if current_schema and current_fields:
        result[current_schema] = current_fields
    return {k: v for k, v in result.items() if k.startswith("Admin") or k.startswith("Board")}


def extract_openapi_schema_fields(php_root: Path) -> dict[str, list[str]]:
    """Extract field names from OpenAPI components/schemas with $ref resolution."""
    if yaml is None:
        return _extract_openapi_schema_fields_regex(php_root)

    openapi_path = php_root / "api/docs/openapi.yaml"
    doc = yaml.safe_load(openapi_path.read_text(encoding="utf-8"))
    all_schemas = doc.get("components", {}).get("schemas", {})
    result: dict[str, list[str]] = {}

    for name, schema in all_schemas.items():
        if not (name.startswith("Admin") or name.startswith("Board")):
            continue
        resolved = schema
        if "$ref" in schema:
            resolved = _resolve_openapi_ref(schema["$ref"], all_schemas)
        properties = resolved.get("properties", {})
        if properties:
            result[name] = list(properties.keys())

    return result


def _normalize_openapi_type(schema: Any) -> dict[str, Any]:
    if not isinstance(schema, dict):
        return {
            "kind": "unverified",
            "reason": "OpenAPI property is not an object",
            "nullable": False,
        }
    nullable = bool(schema.get("nullable", False))
    if "$ref" in schema:
        ref_name = str(schema["$ref"]).split("/")[-1]
        return {
            "kind": "ref",
            "ref": ref_name,
            "nullable": nullable,
        }

    for composition_key in ("oneOf", "anyOf"):
        if composition_key in schema:
            raw_variants = schema.get(composition_key)
            if not isinstance(raw_variants, list) or not raw_variants:
                return {
                    "kind": "unverified",
                    "reason": f"invalid OpenAPI {composition_key}",
                    "nullable": nullable,
                }
            variants = [_normalize_openapi_type(item) for item in raw_variants]
            if any(variant.get("kind") == "unverified" for variant in variants):
                return {
                    "kind": "unverified",
                    "reason": f"unsupported OpenAPI {composition_key}",
                    "nullable": nullable,
                }
            unique = {
                _signature_key({k: v for k, v in variant.items() if k != "nullable"}): {
                    k: v for k, v in variant.items() if k != "nullable"
                }
                for variant in variants
            }
            normalized_variants = [unique[key] for key in sorted(unique)]
            if len(normalized_variants) == 1:
                result = dict(normalized_variants[0])
                result["nullable"] = nullable
                return result
            return {
                "kind": "union",
                "variants": normalized_variants,
                "nullable": nullable,
            }

    if "allOf" in schema:
        raw_variants = schema.get("allOf")
        if isinstance(raw_variants, list) and len(raw_variants) == 1:
            result = _normalize_openapi_type(raw_variants[0])
            result["nullable"] = nullable or result.get("nullable", False)
            return result
        return {
            "kind": "unverified",
            "reason": "multi-branch OpenAPI allOf requires explicit adapter",
            "nullable": nullable,
        }

    raw_type = schema.get("type")
    if isinstance(raw_type, list):
        nullable = nullable or "null" in raw_type
        concrete = [item for item in raw_type if item != "null"]
        if len(concrete) != 1:
            return {
                "kind": "unverified",
                "reason": f"unsupported OpenAPI type array: {raw_type}",
                "nullable": nullable,
            }
        raw_type = concrete[0]
    if raw_type == "string":
        return {"kind": "string", "nullable": nullable}
    if raw_type in {"integer", "number"}:
        return {"kind": "number", "nullable": nullable}
    if raw_type == "boolean":
        return {"kind": "boolean", "nullable": nullable}
    if raw_type == "array":
        if "items" not in schema:
            return {
                "kind": "unverified",
                "reason": "OpenAPI array items missing",
                "nullable": nullable,
            }
        return {
            "kind": "array",
            "items": _normalize_openapi_type(schema["items"]),
            "nullable": nullable,
        }
    if raw_type == "object" or "additionalProperties" in schema:
        additional = schema.get("additionalProperties")
        if isinstance(additional, dict):
            return {
                "kind": "record",
                "values": _normalize_openapi_type(additional),
                "nullable": nullable,
            }
        if additional is True:
            return {
                "kind": "record",
                "values": {"kind": "any", "nullable": False},
                "nullable": nullable,
            }
        if isinstance(schema.get("properties"), dict):
            return {"kind": "object", "nullable": nullable}
    return {
        "kind": "unverified",
        "reason": f"unsupported OpenAPI property construct: {sorted(schema)}",
        "nullable": nullable,
    }


def extract_openapi_schema_signatures(
    php_root: Path,
) -> dict[str, dict[str, Any]]:
    """Extract comparable OpenAPI component field signatures."""
    if yaml is None:
        return {
            "__scanner__": {
                "fields": {},
                "unverified": ["PyYAML unavailable; typed OpenAPI scan cannot run"],
                "source": "api/docs/openapi.yaml",
            }
        }

    openapi_path = php_root / "api/docs/openapi.yaml"
    document = yaml.safe_load(openapi_path.read_text(encoding="utf-8"))
    all_schemas = document.get("components", {}).get("schemas", {})
    result: dict[str, dict[str, Any]] = {}
    inline_results: dict[str, dict[str, Any]] = {}
    for schema_name, raw_schema in sorted(all_schemas.items()):
        if not (schema_name.startswith("Admin") or schema_name.startswith("Board")):
            continue
        schema = raw_schema
        if isinstance(schema, dict) and "$ref" in schema:
            schema = _resolve_openapi_ref(schema["$ref"], all_schemas)
        if not isinstance(schema, dict):
            result[schema_name] = {
                "fields": {},
                "unverified": ["component schema is not an object"],
                "source": "api/docs/openapi.yaml",
            }
            continue
        properties = schema.get("properties")
        if not isinstance(properties, dict):
            # Scalar/union components are verified where active object fields
            # reference them and by the generated runtime validator.  They are
            # not object field-parity rows.
            continue
        required_fields = set(schema.get("required", []))
        fields: dict[str, dict[str, Any]] = {}
        for field_name, property_schema in properties.items():
            all_of = (
                property_schema.get("allOf")
                if isinstance(property_schema, dict)
                else None
            )
            if isinstance(all_of, list) and len(all_of) > 1:
                inline_name = f"{schema_name}{''.join(part[:1].upper() + part[1:] for part in re.split(r'[^A-Za-z0-9]+', str(field_name)) if part)}"
                signature = {
                    "kind": "ref",
                    "ref": inline_name,
                    "nullable": bool(property_schema.get("nullable", False)),
                }
                merged_properties: dict[str, Any] = {}
                merged_required: set[str] = set()
                for branch in all_of:
                    resolved = branch
                    if isinstance(branch, dict) and "$ref" in branch:
                        resolved = _resolve_openapi_ref(branch["$ref"], all_schemas)
                    if not isinstance(resolved, dict):
                        continue
                    branch_properties = resolved.get("properties", {})
                    if isinstance(branch_properties, dict):
                        merged_properties.update(branch_properties)
                    merged_required.update(resolved.get("required", []))
                inline_results[inline_name] = {
                    "fields": {
                        name: {
                            **_normalize_openapi_type(field_schema),
                            "required": name in merged_required,
                        }
                        for name, field_schema in merged_properties.items()
                    },
                    "unverified": [],
                    "source": "api/docs/openapi.yaml#inline-allOf",
                }
            else:
                signature = _normalize_openapi_type(property_schema)
            signature["required"] = field_name in required_fields
            fields[field_name] = signature
        result[schema_name] = {
            "fields": fields,
            "unverified": [],
            "source": "api/docs/openapi.yaml",
        }
    result.update(inline_results)
    return result


def _comparable_signature(signature: dict[str, Any]) -> dict[str, Any]:
    """Drop TS-only evidence while preserving wire-contract semantics."""
    return {
        key: value
        for key, value in signature.items()
        if key != "ts_property_required"
    }


def compare_field_parity(
    openapi_fields: dict[str, Any],
    rust_fields: dict[str, Any],
) -> dict[str, Any]:
    """Compare OpenAPI and ts-rs field names plus normalized wire signatures."""
    comparisons: list[dict[str, Any]] = []
    compared_field_count = 0
    signature_mismatch_count = 0
    unverified: list[dict[str, str]] = []
    missing_rust_schemas: list[dict[str, str]] = []

    # Backward compatibility for callers that still provide name-only lists.
    typed_mode = bool(openapi_fields) and all(
        isinstance(value, dict) and "fields" in value
        for value in openapi_fields.values()
    )
    canonical_wire_mode = any(
        "openapi-wire-types" in str(schema.get("source", ""))
        for schema in rust_fields.values()
        if isinstance(schema, dict)
    )
    def map_expected_ref(
        signature: dict[str, Any], aliases: dict[str, str]
    ) -> dict[str, Any]:
        normalized = dict(signature)
        if normalized.get("kind") == "ref":
            normalized["ref"] = aliases.get(
                str(normalized.get("ref")), normalized.get("ref")
            )
        for key in ("items", "values"):
            if isinstance(normalized.get(key), dict):
                normalized[key] = map_expected_ref(normalized[key], aliases)
        if isinstance(normalized.get("variants"), list):
            normalized["variants"] = [
                map_expected_ref(variant, aliases)
                for variant in normalized["variants"]
            ]
        return normalized

    for openapi_name, openapi_f in sorted(openapi_fields.items()):
        rust_name = (
            openapi_name
            if canonical_wire_mode
            else OPENAPI_TO_RUST_SCHEMA_NAMES.get(openapi_name, openapi_name)
        )
        if rust_name not in rust_fields:
            missing_rust_schemas.append(
                {"openapi_schema": openapi_name, "rust_type": rust_name}
            )
            if typed_mode:
                unverified.append(
                    {
                        "schema": openapi_name,
                        "field": "*",
                        "reason": f"Rust ts-rs schema missing: {rust_name}",
                    }
                )
            continue
        if typed_mode:
            openapi_schema = openapi_f
            rust_schema = rust_fields[rust_name]
            openapi_f = openapi_schema.get("fields", {})
            rust_f = rust_schema.get("fields", {})
            for reason in openapi_schema.get("unverified", []):
                unverified.append(
                    {"schema": openapi_name, "field": "*", "reason": str(reason)}
                )
            for reason in rust_schema.get("unverified", []):
                unverified.append(
                    {"schema": rust_name, "field": "*", "reason": str(reason)}
                )
        openapi_set = set(openapi_f)
        rust_set = set(rust_f)
        normalized_expected_rust = set()
        flattened_aliases = (
            {} if canonical_wire_mode else FLATTENED_RESPONSE_FIELD_MAP.get(openapi_name, {})
        )
        for field in openapi_set:
            normalized_expected_rust.update(flattened_aliases.get(field, {field}))

        allowed_extra = ALLOWED_RUST_EXTENSION_FIELDS.get(rust_name, set())
        missing_in_rust = sorted(normalized_expected_rust - rust_set)
        extra_in_rust = sorted((rust_set - normalized_expected_rust) - allowed_extra)
        type_mismatches: list[dict[str, Any]] = []
        if typed_mode:
            for openapi_field in sorted(openapi_set):
                aliases = flattened_aliases.get(openapi_field, {openapi_field})
                if len(aliases) != 1:
                    for rust_field in sorted(aliases & rust_set):
                        unverified.append(
                            {
                                "schema": openapi_name,
                                "field": f"{openapi_field}->{rust_field}",
                                "reason": "flattened field expansion requires explicit signature adapter",
                            }
                        )
                    continue
                rust_field = next(iter(aliases))
                if rust_field not in rust_f:
                    continue
                expected = _comparable_signature(openapi_f[openapi_field])
                if not canonical_wire_mode:
                    expected = map_expected_ref(expected, OPENAPI_TO_RUST_REF_NAMES)
                actual = _comparable_signature(rust_f[rust_field])
                if expected.get("kind") == "unverified" or actual.get("kind") == "unverified":
                    unverified.append(
                        {
                            "schema": openapi_name,
                            "field": openapi_field,
                            "reason": str(
                                expected.get("reason")
                                or actual.get("reason")
                                or "unsupported property signature"
                            ),
                        }
                    )
                    continue
                compared_field_count += 1
                if expected != actual:
                    type_mismatches.append(
                        {
                            "openapi_field": openapi_field,
                            "rust_field": rust_field,
                            "openapi_signature": expected,
                            "rust_signature": actual,
                        }
                    )
                    signature_mismatch_count += 1

        if missing_in_rust or extra_in_rust or type_mismatches:
            comparisons.append({
                "openapi_schema": openapi_name,
                "rust_type": rust_name,
                "missing_in_rust": missing_in_rust,
                "extra_in_rust": extra_in_rust,
                "signature_mismatches": type_mismatches,
            })

    return {
        "compared_count": sum(
            1
            for openapi_name in openapi_fields
            if (
                openapi_name
                if canonical_wire_mode
                else OPENAPI_TO_RUST_SCHEMA_NAMES.get(openapi_name, openapi_name)
            ) in rust_fields
        ),
        "compared_field_count": compared_field_count,
        "mismatches": comparisons,
        "mismatch_count": len(comparisons),
        "signature_mismatch_count": signature_mismatch_count,
        "unverified": unverified,
        "unverified_count": len(unverified),
        "missing_rust_schemas": missing_rust_schemas,
        "missing_rust_schema_count": len(missing_rust_schemas),
        "typed_mode": typed_mode,
    }


def extract_rust_admin_operation_metrics(
    rust_root: Path,
    aliases: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Extract the active Rust API-client operation graph and Tauri call evidence.

    The API client was split out of ``g5-admin/src-tauri`` into the workspace
    crate ``g5-admin-api-client``.  Scanning the old directory silently yielded
    zero operations, so the scan root and zero-result evidence are part of the
    returned contract metrics.

    Public methods sometimes delegate to a private transport helper (media,
    maintenance, point actions).  In those cases the public method still owns
    the literal admin target while the private helper owns ``Method::*``. The
    scanner resolves that helper edge before using a stable verb-prefix fallback.
    """
    api_client_dir = rust_root / "g5-admin-api-client/src"
    commands_dir = rust_root / "g5-admin/src-tauri/src/commands"
    fn_pattern = re.compile(
        r"^[ \t]*(?P<visibility>pub(?:\([^)]*\))?\s+)?async\s+fn\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)",
        re.M,
    )
    admin_path_pattern = re.compile(r'"(?P<path>/admin/[^"]+)"')
    method_pattern = re.compile(
        r"Method::(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)"
    )

    source_files = sorted(api_client_dir.rglob("*.rs")) if api_client_dir.is_dir() else []
    public_functions: set[str] = set()
    operation_evidence: dict[tuple[str, str], dict[str, set[str]]] = {}
    ambiguous_methods: list[dict[str, Any]] = []

    for rs_path in source_files:
        content = rs_path.read_text(encoding="utf-8")
        fn_matches = list(fn_pattern.finditer(content))
        function_records: list[dict[str, Any]] = []
        helper_methods: dict[str, set[str]] = {}
        helper_paths: dict[str, set[str]] = {}
        for index, function_match in enumerate(fn_matches):
            next_start = (
                fn_matches[index + 1].start()
                if index + 1 < len(fn_matches)
                else len(content)
            )
            fn_body = content[function_match.end() : next_start]
            fn_name = function_match.group("name")
            direct_methods = set(method_pattern.findall(fn_body))
            direct_paths = {
                normalize_path(path_match.group("path"), aliases)
                for path_match in admin_path_pattern.finditer(fn_body)
            }
            function_records.append(
                {
                    "visibility": function_match.group("visibility") or "",
                    "name": fn_name,
                    "body": fn_body,
                    "direct_methods": direct_methods,
                    "direct_paths": direct_paths,
                }
            )
            if direct_methods:
                helper_methods.setdefault(fn_name, set()).update(direct_methods)
            if direct_paths:
                helper_paths.setdefault(fn_name, set()).update(direct_paths)

        for function in function_records:
            visibility = str(function["visibility"])
            if visibility.strip() != "pub":
                continue

            fn_name = str(function["name"])
            fn_body = str(function["body"])
            public_functions.add(fn_name)
            delegated_names = re.findall(
                r"\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(", fn_body
            )
            paths_set = set(function["direct_paths"])
            for delegated_name in delegated_names:
                paths_set.update(helper_paths.get(delegated_name, set()))
            paths = sorted(paths_set)
            if not paths:
                continue

            direct_methods = sorted(function["direct_methods"])
            if len(direct_methods) > 1:
                ambiguous_methods.append(
                    {
                        "function": fn_name,
                        "source": str(rs_path.relative_to(rust_root)),
                        "methods": direct_methods,
                        "paths": paths,
                    }
                )
                continue
            method_resolution = "direct"
            method = direct_methods[0] if direct_methods else None
            if method is None:
                delegated_methods: set[str] = set()
                for delegated_name in delegated_names:
                    delegated_methods.update(helper_methods.get(delegated_name, set()))
                if len(delegated_methods) > 1:
                    ambiguous_methods.append(
                        {
                            "function": fn_name,
                            "source": str(rs_path.relative_to(rust_root)),
                            "methods": sorted(delegated_methods),
                            "paths": paths,
                        }
                    )
                    continue
                if delegated_methods:
                    method = next(iter(delegated_methods))
                    method_resolution = "delegated_helper"
            if method is None:
                method = infer_method_from_rust_api_client_fn(fn_name)
                method_resolution = "verb_prefix"
            if method is None:
                continue

            source = str(rs_path.relative_to(rust_root))
            for path in paths:
                evidence = operation_evidence.setdefault(
                    (method, path),
                    {
                        "client_functions": set(),
                        "sources": set(),
                        "method_resolution": set(),
                    },
                )
                evidence["client_functions"].add(fn_name)
                evidence["sources"].add(source)
                evidence["method_resolution"].add(method_resolution)

    operations = [
        {
            "method": method,
            "path": path,
            "client_functions": sorted(evidence["client_functions"]),
            "sources": sorted(evidence["sources"]),
            "method_resolution": sorted(evidence["method_resolution"]),
        }
        for (method, path), evidence in sorted(operation_evidence.items())
    ]

    operation_client_functions = sorted(
        {
            function_name
            for evidence in operation_evidence.values()
            for function_name in evidence["client_functions"]
        }
    )
    public_api_client_functions = operation_client_functions
    command_sources = (
        sorted(commands_dir.rglob("*.rs")) if commands_dir.is_dir() else []
    )
    command_calls: set[str] = set()
    method_call_pattern = re.compile(r"\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(")
    command_fn_pattern = re.compile(
        r"^[ \t]*pub\s+async\s+fn\s+(?P<name>cmd_[A-Za-z0-9_]+)", re.M
    )
    local_fn_pattern = re.compile(
        r"^[ \t]*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+"
        r"(?P<name>[A-Za-z_][A-Za-z0-9_]*)",
        re.M,
    )
    command_records: list[dict[str, Any]] = []
    unresolved_command_edges: list[dict[str, Any]] = []
    for command_path in command_sources:
        command_source = command_path.read_text(encoding="utf-8")
        local_function_bodies: dict[str, str] = {}
        for function_match in local_fn_pattern.finditer(command_source):
            function_body = extract_braced_function_body(
                command_source, function_match.end()
            )
            if function_body is not None:
                local_function_bodies[function_match.group("name")] = function_body

        def resolve_local_client_calls(
            function_name: str, visited: set[str] | None = None
        ) -> set[str]:
            visited = set() if visited is None else set(visited)
            if function_name in visited:
                return set()
            visited.add(function_name)
            body = local_function_bodies.get(function_name, "")
            resolved = set(method_call_pattern.findall(body)) & set(
                public_api_client_functions
            )
            for helper_name in local_function_bodies:
                if helper_name in visited or helper_name == function_name:
                    continue
                if re.search(rf"\b{re.escape(helper_name)}\s*\(", body):
                    resolved.update(
                        resolve_local_client_calls(helper_name, visited)
                    )
            return resolved

        command_matches = list(command_fn_pattern.finditer(command_source))
        for command_match in command_matches:
            body = extract_braced_function_body(command_source, command_match.end())
            if body is None:
                unresolved_command_edges.append(
                    {
                        "command": command_match.group("name"),
                        "source": str(command_path.relative_to(rust_root)),
                        "reason": "command body brace scanner failed",
                    }
                )
                continue
            client_calls = sorted(
                resolve_local_client_calls(command_match.group("name"))
            )
            command_calls.update(client_calls)
            command_paths = sorted(
                {
                    normalize_path(path_match.group("path"), aliases)
                    for path_match in admin_path_pattern.finditer(body)
                }
            )
            if not client_calls:
                if command_paths:
                    unresolved_command_edges.append(
                        {
                            "command": command_match.group("name"),
                            "source": str(command_path.relative_to(rust_root)),
                            "command_paths": command_paths,
                            "local_calls": sorted(
                                set(method_call_pattern.findall(body))
                            ),
                            "reason": "no direct API client call in command body",
                        }
                    )
                continue
            command_records.append(
                {
                    "command": command_match.group("name"),
                    "source": str(command_path.relative_to(rust_root)),
                    "client_functions": client_calls,
                    "command_paths": command_paths,
                }
            )

    referenced_client_functions = sorted(set(public_api_client_functions) & command_calls)
    unreferenced_client_functions = sorted(
        set(public_api_client_functions) - command_calls
    )
    inferred_methods = [
        {
            "method": operation["method"],
            "path": operation["path"],
            "client_functions": operation["client_functions"],
        }
        for operation in operations
        if "verb_prefix" in operation["method_resolution"]
    ]
    client_function_operations: dict[str, set[tuple[str, str]]] = {}
    for operation in operations:
        for function_name in operation["client_functions"]:
            client_function_operations.setdefault(function_name, set()).add(
                (operation["method"], operation["path"])
            )
    command_operation_edges: list[dict[str, Any]] = []
    command_operation_edge_mismatches: list[dict[str, Any]] = []
    for record in command_records:
        client_functions = list(record["client_functions"])
        command_paths = set(record["command_paths"])
        if command_paths:
            path_matched_functions = [
                function_name
                for function_name in client_functions
                if {
                    path
                    for _, path in client_function_operations.get(
                        function_name, set()
                    )
                }
                & command_paths
            ]
            if path_matched_functions:
                client_functions = path_matched_functions
        expected_operations = sorted(
            {
                operation
                for function_name in client_functions
                for operation in client_function_operations.get(function_name, set())
            }
        )
        expected_paths = {path for _, path in expected_operations}
        edge = {
            **record,
            "client_functions": sorted(client_functions),
            "operations": [
                {"method": method, "path": path}
                for method, path in expected_operations
            ],
        }
        command_operation_edges.append(edge)
        if not expected_operations or command_paths != expected_paths:
            command_operation_edge_mismatches.append(
                {
                    **edge,
                    "expected_paths": sorted(expected_paths),
                    "missing_command_paths": sorted(expected_paths - command_paths),
                    "extra_command_paths": sorted(command_paths - expected_paths),
                }
            )

    return {
        "scan_root": str(api_client_dir.relative_to(rust_root)),
        "source_file_count": len(source_files),
        "public_function_count": len(public_functions),
        "admin_public_function_count": len(public_api_client_functions),
        "operation_client_function_count": len(operation_client_functions),
        "operation_count": len(operations),
        "operations": operations,
        "ambiguous_method_count": len(ambiguous_methods),
        "ambiguous_methods": ambiguous_methods,
        "inferred_method_count": len(inferred_methods),
        "inferred_methods": inferred_methods,
        "command_source_file_count": len(command_sources),
        "command_link_count": len(referenced_client_functions),
        "command_linked_client_functions": referenced_client_functions,
        "unreferenced_client_function_count": len(unreferenced_client_functions),
        "unreferenced_client_functions": unreferenced_client_functions,
        "command_operation_edge_count": len(command_operation_edges),
        "command_operation_edges": command_operation_edges,
        "command_operation_edge_mismatch_count": len(
            command_operation_edge_mismatches
        ),
        "command_operation_edge_mismatches": command_operation_edge_mismatches,
        "command_operation_edge_unresolved_count": len(unresolved_command_edges),
        "command_operation_edge_unresolved": unresolved_command_edges,
    }


def extract_rust_admin_operations(rust_root: Path) -> list[dict[str, Any]]:
    """Compatibility wrapper returning the operation list only."""
    return extract_rust_admin_operation_metrics(rust_root)["operations"]


def extract_rust_bootstrap_operation_metrics(
    rust_root: Path,
    consumer_scope: dict[str, Any],
) -> dict[str, Any]:
    """Extract registry-owned auth/profile/health bootstrap operations.

    Auth and profile requests live in ``g5-admin-transport``. The active-site
    health command consumes ``GET /health`` through ``g5-admin-api-client``;
    the separate ``g5-admin-health-check`` crate remains the pre-registration
    URL boundary probe. A path is counted only when transport source contains
    the exact registry path and compatible HTTP-method evidence.
    Command logging strings are deliberately not scanned.
    """
    exact_operations = {
        (
            str(operation.get("method", "")).upper(),
            normalize_path(
                str(operation.get("path", "")),
                consumer_scope.get("path_aliases", {}),
            ),
        )
        for operation in consumer_scope.get("included_exact_operations", [])
        if isinstance(operation, dict)
    }
    scan_files = [
        rust_root / "g5-admin-transport/src/auth.rs",
        rust_root / "g5-admin-transport/src/member_profile.rs",
        rust_root / "g5-admin-api-client/src/health.rs",
    ]
    health_root = rust_root / "g5-admin-health-check/src"
    if health_root.is_dir():
        scan_files.extend(
            path
            for path in sorted(health_root.rglob("*.rs"))
            if path.name != "tests.rs"
        )
    scan_files = sorted({path for path in scan_files if path.is_file()})

    evidence: dict[tuple[str, str], set[str]] = {}
    method_path_patterns = (
        re.compile(
            r"Method::(?P<method>GET|POST|PUT|PATCH|DELETE)\s*,\s*"
            r"(?:&\s*)?\"(?P<path>/[^\"]+)\"",
            re.S,
        ),
        re.compile(
            r"\.\s*(?P<method>get|post|put|patch|delete)\s*\(\s*"
            r"\"(?P<path>/[^\"]+)\"",
            re.S,
        ),
    )
    for source_path in scan_files:
        source = source_path.read_text(encoding="utf-8")
        pairs: set[tuple[str, str]] = set()
        for pattern in method_path_patterns:
            for match in pattern.finditer(source):
                pairs.add(
                    (
                        match.group("method").upper(),
                        normalize_path(
                            match.group("path"),
                            consumer_scope.get("path_aliases", {}),
                        ),
                    )
                )
        for method, path in sorted(pairs & exact_operations):
            evidence.setdefault((method, path), set()).add(
                str(source_path.relative_to(rust_root))
            )

    operations = [
        {
            "method": method,
            "path": path,
            "sources": sorted(sources),
        }
        for (method, path), sources in sorted(evidence.items())
    ]
    return {
        "scan_roots": [
            "g5-admin-transport/src/auth.rs",
            "g5-admin-transport/src/member_profile.rs",
            "g5-admin-api-client/src/health.rs",
            "g5-admin-health-check/src",
        ],
        "source_file_count": len(scan_files),
        "expected_operation_count": len(exact_operations),
        "operation_count": len(operations),
        "operations": operations,
        "missing_operations": [
            {"method": method, "path": path}
            for method, path in sorted(exact_operations - set(evidence))
        ],
    }


def extract_rust_active_app_operation_metrics(
    rust_root: Path,
    consumer_scope: dict[str, Any],
) -> dict[str, Any]:
    admin = extract_rust_admin_operation_metrics(
        rust_root, consumer_scope.get("path_aliases", {})
    )
    bootstrap = extract_rust_bootstrap_operation_metrics(rust_root, consumer_scope)
    combined: dict[tuple[str, str], dict[str, Any]] = {}
    for operation in admin["operations"] + bootstrap["operations"]:
        key = (str(operation["method"]), str(operation["path"]))
        if not is_active_consumer_operation(key[0], key[1], consumer_scope):
            continue
        current = combined.setdefault(
            key,
            {"method": key[0], "path": key[1], "sources": set()},
        )
        current["sources"].update(operation.get("sources", []))
        if operation.get("client_functions"):
            current.setdefault("client_functions", set()).update(
                operation["client_functions"]
            )

    operations: list[dict[str, Any]] = []
    for operation in combined.values():
        rendered = {
            "method": operation["method"],
            "path": operation["path"],
            "sources": sorted(operation["sources"]),
        }
        if operation.get("client_functions"):
            rendered["client_functions"] = sorted(operation["client_functions"])
        operations.append(rendered)
    operations.sort(key=lambda item: (item["method"], item["path"]))

    return {
        "operation_count": len(operations),
        "operations": operations,
        "admin": admin,
        "bootstrap": bootstrap,
    }


def compare_admin_operations(
    php_operations: list[dict[str, Any]],
    rust_operations: list[dict[str, Any]],
    consumer_scope: dict[str, Any],
) -> dict[str, Any]:
    """Compare the exact active ``(HTTP method, normalized path)`` sets.

    Provider-only operations (currently the shop catalog) remain visible as a
    handoff allowance, but they are not part of the active Rust-admin set.
    Rust operations are still checked against the complete PHP set so a future
    optional provider-only consumer does not become a false positive.
    """
    aliases = consumer_scope.get("path_aliases", {})
    php_ops = {
        (
            str(operation["method"]),
            normalize_path(str(operation["path"]), aliases),
        )
        for operation in php_operations
    }
    rust_ops = {
        (
            str(operation["method"]),
            normalize_path(str(operation["path"]), aliases),
        )
        for operation in rust_operations
    }
    provider_only_php_ops = {
        operation
        for operation in php_ops
        if is_provider_only_path(operation[1], consumer_scope)
    }
    active_php_ops = php_ops - provider_only_php_ops

    def serialize(operations: set[tuple[str, str]]) -> list[dict[str, str]]:
        return [
            {"method": method, "path": path}
            for method, path in sorted(operations)
        ]

    return {
        "php_operation_count": len(php_ops),
        "active_php_operation_count": len(active_php_ops),
        "provider_only_php_operation_count": len(provider_only_php_ops),
        "rust_operation_count": len(rust_ops),
        "rust_active_operation_count": len(rust_ops & active_php_ops),
        "missing_in_rust": serialize(active_php_ops - rust_ops),
        "provider_only_missing_in_rust": serialize(provider_only_php_ops - rust_ops),
        "provider_only_implemented_in_rust": serialize(provider_only_php_ops & rust_ops),
        "extra_in_rust": serialize(rust_ops - php_ops),
    }


def infer_method_from_rust_api_client_fn(fn_name: str) -> str | None:
    normalized = fn_name.lower()
    if normalized.startswith(("get_", "list_", "export_")):
        return "GET"
    if normalized.startswith(("delete_", "remove_")):
        return "DELETE"
    if normalized.startswith(
        (
            "create_",
            "upload_",
            "send_",
            "resend_",
            "grant_",
            "deduct_",
            "expire_",
            "purge_",
            "import_",
            "batch_",
            "sync_",
        )
    ):
        return "POST"
    if normalized.startswith(("update_", "patch_")) or "_patch_" in normalized:
        return "PATCH"
    if normalized.startswith(("reorder_", "move_")):
        return "POST"
    return None


def collect_field_normalization_metrics(php_root: Path) -> dict[str, Any]:
    """Check ALL OpenAPI schema fields have labels in field-dictionary.json."""
    dict_path = php_root / "api/v1/Admin/Schema/field-dictionary.json"
    if not dict_path.exists():
        return {"available": False, "reason": "field-dictionary.json not found"}

    dictionary = json.loads(dict_path.read_text(encoding="utf-8"))
    known_fields = dictionary.get("fields", {})
    stats = dictionary.get("stats", {})

    LEGACY_PREFIXES = [
        "bo_", "mb_", "wr_", "gr_", "po_", "au_", "me_", "qa_",
        "cf_", "ma_", "la_", "bf_", "pu_", "pt_", "fm_", "co_",
        "nw_", "fa_", "vi_", "faq_",
    ]

    # Load ALL OpenAPI schemas
    openapi_path = php_root / "api/docs/openapi.yaml"
    if yaml is not None and openapi_path.exists():
        doc = yaml.safe_load(openapi_path.read_text(encoding="utf-8"))
        all_schemas = doc.get("components", {}).get("schemas", {})
    else:
        all_schemas = {}

    # Find legacy-prefixed fields missing labels
    unlabeled: list[dict[str, str]] = []
    total_legacy_checked = 0
    for schema_name, schema in sorted(all_schemas.items()):
        resolved = schema
        if "$ref" in schema:
            resolved = _resolve_openapi_ref(schema["$ref"], all_schemas)
        properties = resolved.get("properties", {})
        for field in properties:
            is_legacy = any(field.startswith(p) for p in LEGACY_PREFIXES)
            if not is_legacy:
                continue
            total_legacy_checked += 1
            entry = known_fields.get(field, {})
            label = entry.get("label") if entry else None
            if label is None:
                unlabeled.append({"schema": schema_name, "field": field})

    return {
        "available": True,
        "dictionary_version": dictionary.get("version", "unknown"),
        "total_dictionary_fields": stats.get("total_fields", 0),
        "labeled_in_dictionary": stats.get("labeled", 0),
        "schemas_checked": len(all_schemas),
        "legacy_fields_in_openapi": total_legacy_checked,
        "unlabeled_count": len(unlabeled),
        "unlabeled_fields": unlabeled,
    }


def build_operation_graph_failures(
    operation_comparison: dict[str, Any],
    operation_scan: dict[str, Any],
    consumer_scope: dict[str, Any],
) -> list[str]:
    """Return fail-closed API-operation graph violations."""
    failures: list[str] = []
    if not consumer_scope.get("available"):
        failures.append("active_consumer_scope_registry_missing")
    if operation_comparison.get("php_operation_count", 0) <= 0:
        failures.append("php_active_operation_scanner_count=0")
    if operation_comparison.get("active_php_operation_count", 0) <= 0:
        failures.append("php_required_operation_scanner_count=0")
    if operation_comparison.get("rust_operation_count", 0) <= 0:
        failures.append("rust_active_operation_scanner_count=0")

    admin_scan = operation_scan.get("admin", {})
    bootstrap_scan = operation_scan.get("bootstrap", {})
    expected_counts = consumer_scope.get("expected_operation_counts", {})
    expected_admin = int(expected_counts.get("admin_non_shop_exact", 0) or 0)
    expected_bootstrap = int(expected_counts.get("bootstrap", 0) or 0)
    expected_active = int(expected_counts.get("active_total_exact", 0) or 0)
    if expected_admin > 0 and admin_scan.get("operation_count", 0) != expected_admin:
        failures.append(
            "rust_admin_operation_count="
            f"{admin_scan.get('operation_count', 0)} expected={expected_admin}"
        )
    if expected_bootstrap > 0 and bootstrap_scan.get("operation_count", 0) != expected_bootstrap:
        failures.append(
            "rust_bootstrap_operation_count="
            f"{bootstrap_scan.get('operation_count', 0)} expected={expected_bootstrap}"
        )
    if (
        expected_active > 0
        and operation_comparison.get("active_php_operation_count", 0) != expected_active
    ):
        failures.append(
            "php_active_operation_count="
            f"{operation_comparison.get('active_php_operation_count', 0)} "
            f"expected={expected_active}"
        )
    if admin_scan.get("source_file_count", 0) <= 0:
        failures.append("rust_api_client_source_scanner_count=0")
    if admin_scan.get("operation_count", 0) <= 0:
        failures.append("rust_admin_operation_scanner_count=0")
    if admin_scan.get("ambiguous_method_count", 0) > 0:
        failures.append(
            "rust_admin_operation_ambiguous_methods="
            + str(admin_scan["ambiguous_method_count"])
        )
    if admin_scan.get("inferred_method_count", 0) > 0:
        failures.append(
            "rust_admin_operation_method_inferred_without_wire_evidence="
            + str(admin_scan["inferred_method_count"])
        )
    if admin_scan.get("command_operation_edge_count", 0) <= 0:
        failures.append("rust_tauri_command_operation_edge_scanner_count=0")
    if admin_scan.get("command_operation_edge_mismatch_count", 0) > 0:
        failures.append(
            "rust_tauri_command_operation_edge_mismatches="
            + str(admin_scan["command_operation_edge_mismatch_count"])
        )
    if admin_scan.get("command_operation_edge_unresolved_count", 0) > 0:
        failures.append(
            "rust_tauri_command_operation_edges_unresolved="
            + str(admin_scan["command_operation_edge_unresolved_count"])
        )
    if admin_scan.get("admin_public_function_count", 0) > 0:
        if admin_scan.get("command_source_file_count", 0) <= 0:
            failures.append("rust_tauri_command_source_scanner_count=0")
        if admin_scan.get("command_link_count", 0) <= 0:
            failures.append("rust_api_client_tauri_command_link_count=0")
    if admin_scan.get("unreferenced_client_function_count", 0) > 0:
        failures.append(
            "rust_api_client_functions_missing_in_tauri_commands="
            + ", ".join(admin_scan["unreferenced_client_functions"])
        )

    missing = operation_comparison.get("missing_in_rust", [])
    if missing:
        failures.append(
            "php_operations_missing_in_rust="
            + ", ".join(
                f"{operation['method']} {operation['path']}"
                for operation in missing
            )
        )
    extra = operation_comparison.get("extra_in_rust", [])
    if extra:
        failures.append(
            "rust_operations_missing_in_php="
            + ", ".join(
                f"{operation['method']} {operation['path']}"
                for operation in extra
            )
        )
    return failures


def build_failures(metrics: dict[str, Any], checks: list[CheckResult]) -> list[str]:
    failures: list[str] = []
    failed_checks = [check.id for check in checks if check.status != "passed"]
    if failed_checks:
        failures.append("command_failures=" + ", ".join(failed_checks))

    cross = metrics["cross"]
    failures.extend(
        build_operation_graph_failures(
            cross.get("operation_comparison", {}),
            metrics.get("rust", {}).get("operation_scan", {}),
            metrics.get("rust", {}).get("consumer_scope", {}),
        )
    )
    consumer_scope = metrics.get("rust", {}).get("consumer_scope", {})
    expected_counts = consumer_scope.get("expected_operation_counts", {})
    php_openapi = metrics.get("php", {}).get("openapi", {})
    admin_comparison = cross.get("admin_operation_comparison", {})
    count_checks = (
        (
            "php_openapi_total",
            php_openapi.get("all_operation_count", 0),
            expected_counts.get("openapi_total", 0),
        ),
        (
            "php_admin_total",
            php_openapi.get("admin_operation_count", 0),
            expected_counts.get("admin_total", 0),
        ),
        (
            "php_shop_provider_only",
            admin_comparison.get("provider_only_php_operation_count", 0),
            expected_counts.get("shop_provider_only", 0),
        ),
        (
            "php_admin_non_shop_exact",
            admin_comparison.get("active_php_operation_count", 0),
            expected_counts.get("admin_non_shop_exact", 0),
        ),
    )
    for label, actual, expected in count_checks:
        if int(expected or 0) <= 0:
            failures.append(f"{label}_expected_count_missing")
        elif int(actual or 0) != int(expected):
            failures.append(f"{label}={actual} expected={expected}")
    missing_admin_paths = sorted(
        set(cross["missing_admin_paths"]) - ALLOWED_RUST_MISSING_ADMIN_PATHS
    )
    if missing_admin_paths:
        failures.append("php_openapi_paths_missing_in_rust=" + ", ".join(missing_admin_paths))
    if cross["extra_admin_paths"]:
        failures.append("rust_admin_paths_missing_in_php=" + ", ".join(cross["extra_admin_paths"]))
    if cross["missing_schema_domains_in_rust"]:
        failures.append(
            "php_schema_domains_missing_in_rust="
            + ", ".join(cross["missing_schema_domains_in_rust"])
        )
    if cross["extra_schema_domains_in_rust"]:
        failures.append(
            "rust_schema_domains_missing_in_php="
            + ", ".join(cross["extra_schema_domains_in_rust"])
        )

    field_parity = cross.get("field_parity", {})
    if not field_parity.get("typed_mode", False):
        failures.append("field_parity_typed_scanner_unavailable")
    if field_parity.get("compared_count", 0) <= 0:
        failures.append("field_parity_compared_schema_count=0")
    if field_parity.get("compared_field_count", 0) <= 0:
        failures.append("field_parity_compared_field_count=0")
    if field_parity.get("mismatch_count", 0) > 0:
        failures.append(
            f"field_parity_mismatches={field_parity['mismatch_count']}"
        )
    if field_parity.get("signature_mismatch_count", 0) > 0:
        failures.append(
            "field_signature_mismatches="
            + str(field_parity["signature_mismatch_count"])
        )
    if field_parity.get("unverified_count", 0) > 0:
        failures.append(
            "field_signature_unverified="
            + str(field_parity["unverified_count"])
        )
    if field_parity.get("missing_rust_schema_count", 0) > 0:
        failures.append(
            "openapi_schemas_missing_in_rust="
            + str(field_parity["missing_rust_schema_count"])
        )

    php_schema = metrics["php"]["schema"]
    if php_schema["raw_label_count"] > 0:
        failures.append(f"php_raw_schema_labels={php_schema['raw_label_count']}")
    parity_failures = [
        domain["domain"]
        for domain in php_schema["domain_parity"]
        if domain["missing_columns"]
    ]
    if parity_failures:
        failures.append("php_schema_parity_gaps=" + ", ".join(parity_failures))

    flutter_metrics = metrics.get("flutter", {}).get("contract")
    if flutter_metrics:
        if flutter_metrics["snapshot_operation_count"] <= 0:
            failures.append("flutter_snapshot_operation_count=0")
        if flutter_metrics["snapshot_schema_count"] <= 0:
            failures.append("flutter_snapshot_schema_count=0")

    legacy = metrics.get("php", {}).get("legacy_coverage", {})
    if legacy.get("missing_declared_files"):
        failures.append(
            f"legacy_declared_files_not_found={len(legacy['missing_declared_files'])}"
        )

    return failures


def build_warnings(metrics: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    cross = metrics["cross"]
    allowed_missing_admin_paths = sorted(
        set(cross.get("missing_admin_paths", [])) & ALLOWED_RUST_MISSING_ADMIN_PATHS
    )

    if allowed_missing_admin_paths:
        warnings.append(
            "allowed_php_paths_missing_in_rust=" + ", ".join(allowed_missing_admin_paths)
        )

    # --- Legacy coverage warnings ---
    if "legacy_coverage" in metrics.get("php", {}):
        legacy = metrics["php"]["legacy_coverage"]
        if legacy.get("unmapped_adm_count", 0) > 0:
            warnings.append(f"unmapped_adm_files={legacy['unmapped_adm_count']}")

    # --- Field normalization warnings ---
    field_norm = metrics.get("cross", {}).get("field_normalization", {})
    if field_norm.get("available") and field_norm.get("unlabeled_count", 0) > 0:
        warnings.append(f"unlabeled_legacy_fields={field_norm['unlabeled_count']}")

    php_schema = metrics["php"]["schema"]
    if php_schema.get("fixme_label_count", 0) > 0:
        warnings.append(f"php_fixme_schema_labels={php_schema['fixme_label_count']}")

    return warnings


def build_notes(
    workspace_root: Path,
    flutter_root: Path | None,
    metrics: dict[str, Any],
) -> list[str]:
    notes: list[str] = []
    notes.append(
        f"active_targets=php,rust{',flutter' if flutter_root is not None else ''}"
    )
    if flutter_root is None:
        notes.append("routine integrated audit excludes archived Flutter by default")
    if ALLOWED_RUST_MISSING_ADMIN_PATHS:
        allowed = ", ".join(sorted(ALLOWED_RUST_MISSING_ADMIN_PATHS))
        notes.append(f"allowed_missing_admin_paths={allowed}")
    notes.append(f"workspace_root={workspace_root}")
    consumer_scope = metrics.get("rust", {}).get("consumer_scope", {})
    if consumer_scope.get("available"):
        notes.append(
            "consumer_scope_registry="
            + str(consumer_scope.get("registry_path", "-"))
        )
        if consumer_scope.get("audit_contract_id"):
            notes.append(
                "consumer_scope_audit_contract="
                + str(consumer_scope["audit_contract_id"])
            )
        if consumer_scope.get("php_features"):
            notes.append(
                "provider_only_php_features="
                + ",".join(consumer_scope.get("php_features", []))
            )
    provider_only_missing_paths = metrics.get("cross", {}).get(
        "provider_only_missing_admin_paths", []
    )
    if provider_only_missing_paths:
        notes.append(
            "provider_only_php_paths_missing_in_rust="
            + str(len(provider_only_missing_paths))
        )
    provider_only_missing_domains = metrics.get("cross", {}).get(
        "provider_only_missing_schema_domains_in_rust", []
    )
    if provider_only_missing_domains:
        notes.append(
            "provider_only_php_schema_domains_missing_in_rust="
            + str(len(provider_only_missing_domains))
        )
    provider_only_missing_ops = (
        metrics.get("cross", {})
        .get("operation_comparison", {})
        .get("provider_only_missing_in_rust", [])
    )
    if provider_only_missing_ops:
        notes.append(
            "provider_only_php_operations_missing_in_rust="
            + str(len(provider_only_missing_ops))
        )
    rust_blockers = metrics.get("rust", {}).get("blockers", {})
    if rust_blockers.get("available") and rust_blockers.get("blocker_count", 0) > 0:
        notes.append(
            "rust_blocked_backlog="
            + ",".join(rust_blockers.get("blocker_ids", []))
        )
        notes.append(
            f"rust_provider_blocked_features={rust_blockers.get('blocked_feature_count', 0)}"
        )
    php_blockers = metrics.get("php", {}).get("blockers", {})
    if php_blockers.get("available") and php_blockers.get("blocker_count", 0) > 0:
        notes.append(
            "php_blocked_backlog="
            + ",".join(php_blockers.get("blocker_ids", []))
        )
        if php_blockers.get("upstreams"):
            notes.append(
                "php_blocked_upstreams="
                + ",".join(php_blockers.get("upstreams", []))
            )
    php_structure_report = metrics.get("php", {}).get("structure_report", {})
    if php_structure_report.get("available"):
        notes.append(
            f"php_structure_audit_status={php_structure_report.get('status', 'unknown')}"
        )
        notes.append(
            f"php_structure_audit_warnings={php_structure_report.get('warning_count', 0)}"
        )
    php_schema_provider = metrics.get("php", {}).get("schema_provider_readiness", {})
    if php_schema_provider.get("available"):
        notes.append(
            "php_schema_provider_status="
            + str(php_schema_provider.get("status", "unknown"))
        )
        notes.append(
            "php_schema_provider_blocked_features="
            + str(php_schema_provider.get("blocked_feature_count", 0))
        )
    return notes


def build_evidence(
    metrics: dict[str, Any],
    checks: list[CheckResult],
    output_json: Path,
    output_md: Path,
) -> list[str]:
    failed_checks = [check.id for check in checks if check.status != "passed"]
    evidence = [
        f"executed_checks={len(checks)}",
        f"failed_checks={len(failed_checks)}",
        f"rust_registered_commands={metrics['rust']['commands']['registered_command_count']}",
        f"rust_admin_paths={metrics['rust']['commands']['admin_path_count']}",
        f"php_admin_paths={metrics['php']['openapi']['admin_path_count']}",
        f"php_schema_domains={metrics['php']['schema']['generated_domain_count']}",
        f"rust_schema_domains={metrics['rust']['schema']['schema_domain_count']}",
        f"rust_schema_consumers={metrics['rust']['schema']['consumer_file_count']}",
        f"report_json={output_json}",
        f"report_md={output_md}",
    ]
    operation_comparison = metrics.get("cross", {}).get(
        "operation_comparison", {}
    )
    operation_scan = metrics.get("rust", {}).get("operation_scan", {})
    admin_scan = operation_scan.get("admin", {})
    bootstrap_scan = operation_scan.get("bootstrap", {})
    evidence.extend(
        [
            "php_required_active_operations="
            + str(operation_comparison.get("active_php_operation_count", 0)),
            "rust_active_operations="
            + str(operation_comparison.get("rust_operation_count", 0)),
            "rust_admin_client_operations="
            + str(admin_scan.get("operation_count", 0)),
            "rust_bootstrap_operations="
            + str(bootstrap_scan.get("operation_count", 0)),
            "rust_api_client_command_links="
            + str(admin_scan.get("command_link_count", 0)),
        ]
    )
    field_parity = metrics.get("cross", {}).get("field_parity", {})
    evidence.extend(
        [
            "field_signature_compared="
            + str(field_parity.get("compared_field_count", 0)),
            "field_signature_mismatches="
            + str(field_parity.get("signature_mismatch_count", 0)),
            "field_signature_unverified="
            + str(field_parity.get("unverified_count", 0)),
        ]
    )
    consumer_scope = metrics.get("rust", {}).get("consumer_scope", {})
    if consumer_scope.get("available"):
        evidence.append(
            "consumer_scope_registry="
            + str(consumer_scope.get("registry_path", "-"))
        )
        evidence.append(
            "consumer_scope_allowances="
            + str(consumer_scope.get("allowance_count", 0))
        )
    provider_only_missing_paths = metrics.get("cross", {}).get(
        "provider_only_missing_admin_paths", []
    )
    if provider_only_missing_paths:
        evidence.append(
            "provider_only_missing_admin_paths="
            + str(len(provider_only_missing_paths))
        )
    provider_only_missing_domains = metrics.get("cross", {}).get(
        "provider_only_missing_schema_domains_in_rust", []
    )
    if provider_only_missing_domains:
        evidence.append(
            "provider_only_missing_schema_domains="
            + str(len(provider_only_missing_domains))
        )
    provider_only_missing_ops = (
        metrics.get("cross", {})
        .get("operation_comparison", {})
        .get("provider_only_missing_in_rust", [])
    )
    if provider_only_missing_ops:
        evidence.append(
            "provider_only_missing_operations="
            + str(len(provider_only_missing_ops))
        )
    rust_blockers = metrics.get("rust", {}).get("blockers", {})
    if rust_blockers.get("available"):
        evidence.append(
            f"rust_blocker_registry={rust_blockers.get('registry_path', '-')}"
        )
        if rust_blockers.get("generated_report_json"):
            evidence.append(
                f"rust_blocker_generated_json={rust_blockers['generated_report_json']}"
            )
        if rust_blockers.get("generated_report_md"):
            evidence.append(
                f"rust_blocker_generated_md={rust_blockers['generated_report_md']}"
            )
    php_blockers = metrics.get("php", {}).get("blockers", {})
    if php_blockers.get("available"):
        evidence.append(
            f"php_blocker_registry={php_blockers.get('registry_path', '-')}"
        )
    php_structure_report = metrics.get("php", {}).get("structure_report", {})
    if php_structure_report.get("available"):
        evidence.append(
            f"php_structure_report_json={php_structure_report.get('json_path', '-')}"
        )
        if php_structure_report.get("md_path"):
            evidence.append(
                f"php_structure_report_md={php_structure_report['md_path']}"
            )
    php_schema_provider = metrics.get("php", {}).get("schema_provider_readiness", {})
    if php_schema_provider.get("available"):
        evidence.append(
            "php_schema_provider_registry="
            + str(php_schema_provider.get("registry_path", "-"))
        )
        evidence.append(
            "php_schema_provider_report_json="
            + str(php_schema_provider.get("json_path", "-"))
        )
        if php_schema_provider.get("md_path"):
            evidence.append(
                f"php_schema_provider_report_md={php_schema_provider['md_path']}"
            )
    return evidence


def append_step_summary(markdown: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(markdown)
        if not markdown.endswith("\n"):
            handle.write("\n")


def render_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    metrics = report["metrics"]
    checks = report["checks"]
    targets = report["workspace"].get("targets", ["php", "rust"])
    flutter_root = report["workspace"].get("flutter_root")

    lines = [
        f"# 통합 감사 보고서 — {report['generated_at'][:10]}",
        "",
        f"- 상태: **{summary['status'].upper()}**",
        f"- 대상: `{', '.join(targets)}`",
        f"- 워크스페이스: `{report['workspace']['workspace_root']}`",
        f"- Rust: `{report['workspace']['rust_root']}`",
        f"- PHP: `{report['workspace']['php_root']}`",
        "",
        "## 1. Failure",
        "",
    ]
    if summary["failures"]:
        for failure in summary["failures"]:
            lines.append(f"- `{failure}`")
    else:
        lines.append("- 없음")

    lines.extend(["", "## 2. Warning", ""])
    if summary.get("warnings"):
        for warning in summary["warnings"]:
            lines.append(f"- `{warning}`")
    else:
        lines.append("- 없음")

    lines.extend(["", "## 3. Note", ""])
    if summary.get("notes"):
        for note in summary["notes"]:
            lines.append(f"- {note}")
    else:
        lines.append("- 없음")

    lines.extend(["", "## 4. Evidence", ""])
    if summary.get("evidence"):
        for item in summary["evidence"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- 없음")

    if summary.get("waived"):
        lines.extend(["", "## 5. Waived", ""])
        for item in summary["waived"]:
            lines.append(f"- `{item}`")
    else:
        lines.extend(["", "## 5. Waived", "", "- 없음", "", "## 6. 실행 체크", ""])

    if summary.get("waived"):
        lines.extend(["", "## 6. 실행 체크", ""])

    lines.extend([
        "",
        "| ID | 상태 | 명령 |",
        "|---|---|---|",
    ])
    if flutter_root:
        lines.insert(7, f"- Archived Flutter: `{flutter_root}`")
        lines.insert(8, "")
    for check in checks:
        lines.append(f"| `{check['id']}` | `{check['status']}` | `{check['command']}` |")

    flutter_metrics = metrics.get("flutter", {}).get("contract")
    section_two = [
        "",
        "## 7. 교차 정합성 핵심 수치",
        "",
        f"- Rust registered commands: `{metrics['rust']['commands']['registered_command_count']}`",
        f"- Rust admin paths: `{metrics['rust']['commands']['admin_path_count']}`",
        f"- PHP OpenAPI admin paths: `{metrics['php']['openapi']['admin_path_count']}`",
        f"- PHP schema domains: `{metrics['php']['schema']['generated_domain_count']}`",
        f"- Rust schema domains: `{metrics['rust']['schema']['schema_domain_count']}`",
        f"- Rust schema consumer files: `{metrics['rust']['schema']['consumer_file_count']}`",
        f"- PHP raw schema labels: `{metrics['php']['schema']['raw_label_count']}`",
        f"- PHP FIXME schema labels: `{metrics['php']['schema']['fixme_label_count']}`",
    ]
    if flutter_metrics:
        section_two.extend(
            [
                f"- Flutter snapshot operations: `{flutter_metrics['snapshot_operation_count']}`",
                f"- Flutter snapshot schemas: `{flutter_metrics['snapshot_schema_count']}`",
            ]
        )
    section_two.extend(
        [
            "",
            "## 8. 교차 감사 판정",
            "",
            f"- PHP에 있고 Rust에 없는 admin path: `{len(metrics['cross']['missing_admin_paths'])}`",
            f"- provider-only handoff admin path: `{len(metrics['cross'].get('provider_only_missing_admin_paths', []))}`",
            f"- Rust에 있고 PHP에 없는 admin path: `{len(metrics['cross']['extra_admin_paths'])}`",
            f"- PHP schema에 있고 Rust에 없는 schema domain: `{len(metrics['cross']['missing_schema_domains_in_rust'])}`",
            f"- provider-only handoff schema domain: `{len(metrics['cross'].get('provider_only_missing_schema_domains_in_rust', []))}`",
            f"- Rust schema에 있고 PHP에 없는 schema domain: `{len(metrics['cross']['extra_schema_domains_in_rust'])}`",
            "",
            "## 9. PHP legacy DB parity",
            "",
            "| Domain | Missing Columns | Raw Labels |",
            "|---|---:|---:|",
        ]
    )
    lines.extend(section_two)
    for domain in metrics["php"]["schema"]["domain_parity"]:
        lines.append(
            f"| `{domain['domain']}` | `{len(domain['missing_columns'])}` | `{len(domain['raw_labels'])}` |"
        )

    # --- Level 2: Operation comparison ---
    if "operation_comparison" in metrics["cross"]:
        op_comp = metrics["cross"]["operation_comparison"]
        lines.extend(["", "## 10. 활성 앱 Operation 비교 (path + HTTP method)", ""])
        lines.append(
            f"- PHP scope operations (provider-only 포함): `{op_comp.get('php_operation_count', 0)}`"
        )
        lines.append(
            f"- PHP required active operations: `{op_comp.get('active_php_operation_count', 0)}`"
        )
        lines.append(
            f"- Rust active operations: `{op_comp.get('rust_operation_count', 0)}`"
        )
        admin_scan = metrics["rust"].get("operation_scan", {}).get("admin", {})
        bootstrap_scan = metrics["rust"].get("operation_scan", {}).get("bootstrap", {})
        lines.append(
            f"- Rust exact non-shop admin operations: `{admin_scan.get('operation_count', 0)}`"
        )
        lines.append(
            f"- Rust bootstrap operations: `{bootstrap_scan.get('operation_count', 0)}` / `{bootstrap_scan.get('expected_operation_count', 0)}`"
        )
        lines.append(
            f"- Rust API client functions linked by Tauri commands: `{admin_scan.get('command_link_count', 0)}` / `{admin_scan.get('admin_public_function_count', 0)}`"
        )
        lines.append(f"- PHP에 있고 Rust에 없는 operations: `{len(op_comp.get('missing_in_rust', []))}`")
        lines.append(
            f"- provider-only handoff operations: `{len(op_comp.get('provider_only_missing_in_rust', []))}`"
        )
        lines.append(f"- Rust에 있고 PHP에 없는 operations: `{len(op_comp.get('extra_in_rust', []))}`")
        missing_ops = op_comp.get("missing_in_rust", [])
        if missing_ops:
            lines.extend(["", "| Method | Path |", "|---|---|"])
            for op in missing_ops[:30]:
                lines.append(f"| `{op['method']}` | `{op['path']}` |")
            if len(missing_ops) > 30:
                lines.append(f"| ... | ({len(missing_ops) - 30} more) |")

    # --- Level 3: Field parity ---
    if "field_parity" in metrics["cross"]:
        fp = metrics["cross"]["field_parity"]
        lines.extend(["", "## 11. 필드 정합성 (PHP OpenAPI ↔ Rust TS types)", ""])
        lines.append(f"- 비교된 타입 수: `{fp.get('compared_count', 0)}`")
        lines.append(f"- 비교된 필드 signature 수: `{fp.get('compared_field_count', 0)}`")
        lines.append(f"- 불일치 타입 수: `{fp.get('mismatch_count', 0)}`")
        lines.append(
            f"- type/array/ref/nullable/required 불일치 수: `{fp.get('signature_mismatch_count', 0)}`"
        )
        lines.append(f"- 미검증 signature 수: `{fp.get('unverified_count', 0)}`")
        for mm in fp.get("mismatches", []):
            lines.extend([
                "",
                f"**{mm['openapi_schema']}** (OpenAPI) ↔ **{mm['rust_type']}** (Rust)",
            ])
            if mm["missing_in_rust"]:
                lines.append(f"  - PHP에 있고 Rust에 없는 필드: `{', '.join(mm['missing_in_rust'])}`")
            if mm["extra_in_rust"]:
                lines.append(f"  - Rust에 있고 PHP에 없는 필드: `{', '.join(mm['extra_in_rust'])}`")
            for mismatch in mm.get("signature_mismatches", [])[:10]:
                lines.append(
                    "  - signature mismatch: "
                    f"`{mismatch['openapi_field']} -> {mismatch['rust_field']}` "
                    f"OpenAPI=`{json.dumps(mismatch['openapi_signature'], ensure_ascii=False, sort_keys=True)}` "
                    f"Rust=`{json.dumps(mismatch['rust_signature'], ensure_ascii=False, sort_keys=True)}`"
                )
        if fp.get("unverified"):
            lines.extend(["", "### 미검증 필드 signature", ""])
            for item in fp["unverified"][:30]:
                lines.append(
                    f"- `{item['schema']}.{item['field']}`: {item['reason']}"
                )

    # --- Legacy coverage ---
    if "legacy_coverage" in metrics.get("php", {}):
        lc = metrics["php"]["legacy_coverage"]
        lines.extend(["", "## 12. 레거시 커버리지 (Strangler Fig)", ""])
        lines.append(f"- schema-domains.json 등록 legacy: `{lc.get('declared_legacy_count', 0)}`")
        lines.append(f"- adm/ 관리 파일 수: `{lc.get('adm_admin_file_count', 0)}`")
        lines.append(f"- API로 커버된 legacy entrypoint: `{lc.get('api_covered_legacy_count', 0)}`")
        lines.append(f"- 보조 update/delete/helper 스크립트: `{lc.get('support_helper_count', 0)}`")
        lines.append(f"- 웹 전용/명시적 제외 파일: `{lc.get('web_only_legacy_count', 0)}`")
        lines.append(f"- 미등록 관리 파일: `{lc.get('unmapped_adm_count', 0)}`")
        if lc.get("missing_declared_files"):
            lines.extend(["", "### 선언됐지만 adm/에 없는 파일", ""])
            for f in lc["missing_declared_files"]:
                lines.append(f"- ❌ [{f['domain']}] `{f['path']}`")
        if lc.get("api_covered_legacy_files"):
            lines.extend(["", "### API로 커버된 legacy entrypoint (상위 20개)", ""])
            for f in lc["api_covered_legacy_files"][:20]:
                lines.append(f"- ✅ `{f}`")
            if len(lc["api_covered_legacy_files"]) > 20:
                lines.append(
                    f"- ... ({len(lc['api_covered_legacy_files']) - 20}개 더)"
                )
        if lc.get("support_helper_files"):
            lines.extend(["", "### 보조 update/delete/helper 스크립트 (상위 20개)", ""])
            for f in lc["support_helper_files"][:20]:
                lines.append(f"- ℹ️ `{f}`")
            if len(lc["support_helper_files"]) > 20:
                lines.append(
                    f"- ... ({len(lc['support_helper_files']) - 20}개 더)"
                )
        if lc.get("web_only_legacy_files"):
            lines.extend(["", "### 웹 전용/명시적 제외 파일", ""])
            for f in lc["web_only_legacy_files"]:
                lines.append(f"- ↩️ `{f}`")
        if lc.get("unmapped_adm_files"):
            lines.extend(["", "### adm/에 있지만 미등록된 파일 (상위 20개)", ""])
            for f in lc["unmapped_adm_files"][:20]:
                lines.append(f"- ⚠️ `{f}`")
            if len(lc["unmapped_adm_files"]) > 20:
                lines.append(f"- ... ({len(lc['unmapped_adm_files']) - 20}개 더)")

    # Section 8: Field normalization (label dictionary)
    field_norm = metrics.get("cross", {}).get("field_normalization", {})
    if field_norm.get("available"):
        lines.extend(["", "## 13. 필드 라벨 사전 (field-dictionary.json)", ""])
        lines.append(f"- 사전 버전: `{field_norm.get('dictionary_version', 'unknown')}`")
        lines.append(f"- 사전 등록 필드: `{field_norm.get('total_dictionary_fields', 0)}`")
        lines.append(f"- 라벨 완료: `{field_norm.get('labeled_in_dictionary', 0)}`")
        lines.append(f"- OpenAPI 레거시 필드 수: `{field_norm.get('legacy_fields_in_openapi', 0)}`")
        lines.append(f"- 라벨 미등록 (레거시 필드): `{field_norm.get('unlabeled_count', 0)}`")
        unlabeled = field_norm.get("unlabeled_fields", [])
        if unlabeled:
            lines.extend(["", "| Schema | 라벨 미등록 필드 |", "|---|---|"])
            for u in unlabeled[:30]:
                lines.append(f"| `{u['schema']}` | `{u['field']}` |")
            if len(unlabeled) > 30:
                lines.append(f"| ... | ({len(unlabeled) - 30}개 더) |")

    consumer_scope = metrics.get("rust", {}).get("consumer_scope", {})
    if consumer_scope.get("available"):
        lines.extend(["", "## 14. Active Consumer Scope Handoff", ""])
        lines.append(f"- registry: `{consumer_scope.get('registry_path', '-')}`")
        lines.append(f"- allowance count: `{consumer_scope.get('allowance_count', 0)}`")
        if consumer_scope.get("php_features"):
            lines.append(
                f"- provider-only PHP features: `{', '.join(consumer_scope['php_features'])}`"
            )
        if metrics["cross"].get("provider_only_missing_admin_paths"):
            lines.append(
                f"- provider-only missing admin paths: `{', '.join(metrics['cross']['provider_only_missing_admin_paths'])}`"
            )
        if metrics["cross"].get("provider_only_missing_schema_domains_in_rust"):
            lines.append(
                f"- provider-only missing schema domains: `{', '.join(metrics['cross']['provider_only_missing_schema_domains_in_rust'])}`"
            )
        provider_only_missing_ops = (
            metrics["cross"]
            .get("operation_comparison", {})
            .get("provider_only_missing_in_rust", [])
        )
        if provider_only_missing_ops:
            lines.append(
                f"- provider-only missing operations: `{len(provider_only_missing_ops)}`"
            )

    php_structure_report = metrics.get("php", {}).get("structure_report", {})
    if php_structure_report.get("available"):
        lines.extend(["", "## 15. PHP Structure Audit Handoff", ""])
        lines.append(f"- generated json: `{php_structure_report['json_path']}`")
        if php_structure_report.get("md_path"):
            lines.append(f"- generated markdown: `{php_structure_report['md_path']}`")
        lines.append(f"- status: `{php_structure_report.get('status', 'unknown')}`")
        lines.append(f"- failures: `{php_structure_report.get('failure_count', 0)}`")
        lines.append(f"- warnings: `{php_structure_report.get('warning_count', 0)}`")
        lines.append(
            f"- active warning budgets: `{php_structure_report.get('active_warning_budget_count', 0)}`"
        )
        lines.append(
            f"- active blockers: `{php_structure_report.get('active_blocker_count', 0)}`"
        )
        if php_structure_report.get("warning_rules"):
            lines.append(
                f"- warning rules: `{', '.join(php_structure_report['warning_rules'])}`"
            )

    php_schema_provider = metrics.get("php", {}).get("schema_provider_readiness", {})
    if php_schema_provider.get("available"):
        lines.extend(["", "## 16. PHP Schema Provider Readiness Handoff", ""])
        lines.append(f"- generated json: `{php_schema_provider['json_path']}`")
        if php_schema_provider.get("md_path"):
            lines.append(
                f"- generated markdown: `{php_schema_provider['md_path']}`"
            )
        lines.append(
            f"- status: `{php_schema_provider.get('status', 'unknown')}`"
        )
        if php_schema_provider.get("registry_path"):
            lines.append(
                f"- registry: `{php_schema_provider['registry_path']}`"
            )
        if php_schema_provider.get("schema_manifest_path"):
            lines.append(
                f"- schema manifest: `{php_schema_provider['schema_manifest_path']}`"
            )
        lines.append(
            f"- implemented features: `{php_schema_provider.get('implemented_feature_count', 0)}`"
        )
        lines.append(
            f"- blocked features: `{php_schema_provider.get('blocked_feature_count', 0)}`"
        )
        lines.append(
            f"- manifest domains: `{php_schema_provider.get('manifest_domain_count', 0)}`"
        )
        if php_schema_provider.get("blocked_priorities"):
            lines.append(
                f"- blocked priorities: `{', '.join(php_schema_provider['blocked_priorities'])}`"
            )
        if php_schema_provider.get("blocker_kinds"):
            lines.append(
                f"- blocker kinds: `{', '.join(php_schema_provider['blocker_kinds'])}`"
            )
        if php_schema_provider.get("blocked_features"):
            lines.append(
                f"- blocked backlog: `{', '.join(php_schema_provider['blocked_features'])}`"
            )

    php_blockers = metrics.get("php", {}).get("blockers", {})
    if php_blockers.get("available") and php_blockers.get("blocker_count", 0) > 0:
        lines.extend(["", "## 17. PHP Blocked Backlog Handoff", ""])
        lines.append(f"- blocker registry: `{php_blockers['registry_path']}`")
        lines.append(f"- active blocker ids: `{', '.join(php_blockers.get('blocker_ids', []))}`")
        if php_blockers.get("owners"):
            lines.append(f"- owners: `{', '.join(php_blockers['owners'])}`")
        if php_blockers.get("upstreams"):
            lines.append(f"- upstreams: `{', '.join(php_blockers['upstreams'])}`")
        if php_blockers.get("scopes"):
            lines.append(f"- scopes: `{', '.join(php_blockers['scopes'])}`")

    rust_blockers = metrics.get("rust", {}).get("blockers", {})
    if rust_blockers.get("available") and rust_blockers.get("blocker_count", 0) > 0:
        lines.extend(["", "## 18. Rust Blocked Backlog Handoff", ""])
        lines.append(f"- blocker registry: `{rust_blockers['registry_path']}`")
        lines.append(f"- active blocker ids: `{', '.join(rust_blockers.get('blocker_ids', []))}`")
        lines.append(f"- blocked features: `{rust_blockers.get('blocked_feature_count', 0)}`")
        if rust_blockers.get("generated_blocked_feature_count") is not None:
            lines.append(
                f"- generated blocked features: `{rust_blockers['generated_blocked_feature_count']}`"
            )
        if rust_blockers.get("owners"):
            lines.append(f"- owners: `{', '.join(rust_blockers['owners'])}`")
        if rust_blockers.get("reasons"):
            lines.append(f"- reasons: `{', '.join(rust_blockers['reasons'])}`")
        if rust_blockers.get("handoff_reports"):
            for report_path in rust_blockers["handoff_reports"]:
                lines.append(f"- handoff report: `{report_path}`")
        if rust_blockers.get("generated_report_md"):
            lines.append(
                f"- generated handoff: `{rust_blockers['generated_report_md']}`"
            )

    lines.extend(["", "## 19. 사용 규칙", ""])
    lines.append("- 이 보고서는 `rust/scripts/run_integrated_audit.py`가 생성한 결과만 신뢰합니다.")
    lines.append("- 수기 숫자/수기 판정 문서는 감사 기준으로 사용하지 않습니다.")
    lines.append("- 릴리스/배포/감사 완료 선언 전에는 이 스크립트를 다시 실행해야 합니다.")

    return "\n".join(lines) + "\n"


def write_report(report: dict[str, Any], json_path: Path, md_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    markdown = render_markdown(report)
    md_path.write_text(markdown, encoding="utf-8")
    append_step_summary(markdown)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run integrated PHP/Rust audit.")
    parser.add_argument("--rust-root")
    parser.add_argument("--php-root")
    parser.add_argument("--flutter-root")
    parser.add_argument("--output-json")
    parser.add_argument("--output-md")
    parser.add_argument("--audit-run-id")
    args = parser.parse_args()

    workspace_root, rust_root, php_root, flutter_root = resolve_roots(args)
    output_json = (
        Path(args.output_json).resolve()
        if args.output_json
        else (workspace_root / "output/integrated-audit/latest.json").resolve()
    )
    output_md = (
        Path(args.output_md).resolve()
        if args.output_md
        else (workspace_root / "output/integrated-audit/latest.md").resolve()
    )

    shared_env = os.environ.copy()
    shared_env["CARGO_NET_OFFLINE"] = "true"
    shared_env["COMPOSER_DISABLE_NETWORK"] = "1"
    shared_env["G5_PHP_ROOT"] = str(php_root)
    shared_env["G5_OPENAPI_PATH"] = str(
        resolve_openapi_path(rust_root, php_root=php_root)
    )
    shared_env["G5_OPENAPI_MANIFEST_PATH"] = str(
        resolve_openapi_manifest_path(rust_root, php_root=php_root)
    )

    checks = [
        run_check(
            "php.schema_check",
            "PHP schema registry check",
            ["composer", "run", "schema:check"],
            php_root,
            shared_env,
        ),
        run_check(
            "php.contract_check",
            "PHP OpenAPI contract manifest check",
            ["composer", "run", "contract:check"],
            php_root,
            shared_env,
        ),
        run_check(
            "php.schema_tests",
            "PHP schema regression tests",
            [
                str(php_root / "vendor/bin/phpunit"),
                str(php_root / "tests/Admin/Schema/AdminSchemaServiceTest.php"),
                str(php_root / "tests/contract/AdminSchemaContractTest.php"),
            ],
            php_root,
            shared_env,
        ),
        run_check(
            "rust.contract_check",
            "Rust OpenAPI contract check",
            ["bun", "run", "contract:check"],
            rust_root / "g5-admin",
            shared_env,
        ),
        run_check(
            "rust.typecheck",
            "Rust frontend typecheck",
            ["bun", "x", "--no-install", "tsc", "--noEmit"],
            rust_root / "g5-admin",
            shared_env,
        ),
        run_check(
            "rust.lint",
            "Rust frontend lint",
            ["bun", "run", "lint"],
            rust_root / "g5-admin",
            shared_env,
        ),
        run_check(
            "rust.cargo_check",
            "Rust desktop cargo check",
            [
                "bash",
                "scripts/with_optional_sccache.sh",
                "cargo",
                "check",
                "--locked",
                "--manifest-path",
                "g5-admin/src-tauri/Cargo.toml",
            ],
            rust_root,
            shared_env,
        ),
        run_check(
            "rust.critical_tests",
            "Rust critical regression coverage",
            ["bun", "run", "test:coverage:critical"],
            rust_root / "g5-admin",
            shared_env,
        ),
    ]
    if flutter_root is not None:
        checks.append(
            run_check(
                "flutter.contract_check",
                "Archived Flutter OpenAPI contract snapshot check",
                ["dart", "tool/check_openapi_contract.dart"],
                flutter_root,
                shared_env,
            )
        )

    consumer_scope = load_active_consumer_scope_metrics(rust_root)
    contract_aliases = consumer_scope.get("path_aliases", {})
    rust_command_metrics = extract_rust_command_metrics(rust_root)
    php_openapi_metrics = extract_php_openapi_metrics(php_root, contract_aliases)
    php_schema_metrics = collect_php_schema_metrics(php_root)
    rust_schema_metrics = extract_rust_schema_metrics(rust_root)
    legacy_coverage_metrics = collect_legacy_coverage_metrics(php_root)

    # Level 3: Field parity
    openapi_schema_fields = extract_openapi_schema_signatures(php_root)
    rust_ts_fields = extract_rust_ts_schema_signatures(rust_root)
    field_parity = compare_field_parity(openapi_schema_fields, rust_ts_fields)

    # Level 2: exact active-app operation graph.  This includes every distinct
    # non-shop admin contract plus auth/profile/health bootstrap operations from
    # ACTIVE_CONSUMER_SCOPE.json.
    php_all_operations = extract_php_openapi_operations(php_root, contract_aliases)
    php_active_operations = [
        operation
        for operation in php_all_operations
        if is_active_consumer_operation(
            operation["method"], operation["path"], consumer_scope
        )
    ]
    rust_active_operation_metrics = extract_rust_active_app_operation_metrics(
        rust_root, consumer_scope
    )
    rust_ops_list = rust_active_operation_metrics["operations"]
    operation_comparison = compare_admin_operations(
        php_active_operations, rust_ops_list, consumer_scope
    )
    admin_operation_comparison = compare_admin_operations(
        php_openapi_metrics["admin_operations"],
        rust_active_operation_metrics["admin"]["operations"],
        consumer_scope,
    )

    rust_paths = set(rust_command_metrics["admin_paths"])
    php_paths = set(php_openapi_metrics["admin_paths"])
    php_schema_domains = set(php_schema_metrics["domains"])
    rust_schema_domains = set(rust_schema_metrics["schema_domains"])
    missing_admin_paths_all = sorted(php_paths - rust_paths)
    provider_only_missing_admin_paths = [
        path for path in missing_admin_paths_all if is_provider_only_path(path, consumer_scope)
    ]
    missing_admin_paths = [
        path for path in missing_admin_paths_all if not is_provider_only_path(path, consumer_scope)
    ]
    missing_schema_domains_all = sorted(php_schema_domains - rust_schema_domains)
    provider_only_missing_schema_domains = [
        domain
        for domain in missing_schema_domains_all
        if is_provider_only_schema_domain(domain, consumer_scope)
    ]
    missing_schema_domains = [
        domain
        for domain in missing_schema_domains_all
        if not is_provider_only_schema_domain(domain, consumer_scope)
    ]

    metrics = {
        "rust": {
            "commands": rust_command_metrics,
            "schema": rust_schema_metrics,
            "blockers": collect_rust_blocker_metrics(rust_root),
            "admin_operations": rust_active_operation_metrics["admin"]["operations"],
            "active_app_operations": rust_ops_list,
            "operation_scan": rust_active_operation_metrics,
            "consumer_scope": consumer_scope,
        },
        "php": {
            "openapi": php_openapi_metrics,
            "schema": php_schema_metrics,
            "legacy_coverage": legacy_coverage_metrics,
            "blockers": collect_php_blocker_metrics(php_root),
            "structure_report": collect_php_structure_report_metrics(php_root),
            "schema_provider_readiness": collect_php_schema_provider_readiness_metrics(
                php_root
            ),
        },
        "cross": {
            "missing_admin_paths": missing_admin_paths,
            "extra_admin_paths": sorted(rust_paths - php_paths),
            "missing_schema_domains_in_rust": missing_schema_domains,
            "extra_schema_domains_in_rust": sorted(rust_schema_domains - php_schema_domains),
            "provider_only_missing_admin_paths": provider_only_missing_admin_paths,
            "provider_only_missing_schema_domains_in_rust": provider_only_missing_schema_domains,
            "operation_comparison": operation_comparison,
            "admin_operation_comparison": admin_operation_comparison,
            "field_parity": field_parity,
            "field_normalization": collect_field_normalization_metrics(php_root),
        },
    }
    if flutter_root is not None:
        metrics["flutter"] = {
            "contract": extract_flutter_contract_metrics(flutter_root),
        }

    failures = build_failures(metrics, checks)
    warnings = build_warnings(metrics)
    notes = build_notes(workspace_root, flutter_root, metrics)
    evidence = build_evidence(metrics, checks, output_json, output_md)
    if failures:
        status = "failed"
    elif warnings:
        status = "passed_with_warnings"
    else:
        status = "passed"
    report = {
        "audit_run_id": args.audit_run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": {
            "workspace_root": str(workspace_root),
            "rust_root": str(rust_root),
            "php_root": str(php_root),
            "flutter_root": str(flutter_root) if flutter_root is not None else None,
            "targets": ["php", "rust"] + (["flutter"] if flutter_root is not None else []),
        },
        "checks": [asdict(check) for check in checks],
        "metrics": metrics,
        "summary": {
            "status": status,
            "failures": failures,
            "warnings": warnings,
            "notes": notes,
            "evidence": evidence,
            "waived": [],
        },
    }

    write_report(report, output_json, output_md)
    print(f"Integrated audit report written: {output_json}")
    print(f"Integrated audit report written: {output_md}")

    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
