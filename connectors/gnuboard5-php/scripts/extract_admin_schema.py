#!/usr/bin/env python3

from __future__ import annotations

import argparse
import difflib
import hashlib
import html
import json
import re
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
LEGACY_ROOT: Path | None = None
SCHEMA_ROOT = ROOT / "api" / "v1" / "Admin" / "Schema"
MANIFEST_PATH = SCHEMA_ROOT / "schema-domains.json"
OUTPUT_DIR = SCHEMA_ROOT / "Data" / "generated"
INSTALL_SQL_PATH = ROOT / "install" / "gnuboard5.sql"
SHOP_SQL_PATH = ROOT / "install" / "gnuboard5shop.sql"
DEFAULT_TABLE_SQL_PATHS = [str(INSTALL_SQL_PATH.relative_to(ROOT)), str(SHOP_SQL_PATH.relative_to(ROOT))]
EXTRACTOR_VERSION = 6
VOLATILE_KEYS = {"generated_at"}
NO_DEFAULT = object()
PHP_PLACEHOLDER_PREFIX = "__PHP_BLOCK_"

INTEGER_SUFFIXES = (
    "_level",
    "_point",
    "_rows",
    "_pages",
    "_count",
    "_size",
    "_width",
    "_height",
    "_order",
    "_hot",
    "_new",
    "_term",
    "_sec",
    "_day",
    "_days",
    "_limit",
    "_modify",
    "_delete",
    "_min",
    "_max",
    "_cols",
    "_len",
)

DYNAMIC_SQL_DEFAULTS = {
    "current_timestamp",
    "current_timestamp()",
    "current_date",
    "current_date()",
    "current_time",
    "current_time()",
    "now()",
}

PHP_BLOCK_PATTERN = re.compile(r"<\?(?:php|=).*?\?>", flags=re.S)


def source_path(relative: str) -> Path:
    path = ROOT / relative
    # The Fleet repository separates the PHP overlay from the locked G5 input.
    # Only upstream forms and install SQL may fall back, never provider code.
    if not path.is_file() and LEGACY_ROOT is not None and Path(relative).parts[0] in {"adm", "install"}:
        return LEGACY_ROOT / relative
    return path


def strip_php(text: str) -> str:
    return PHP_BLOCK_PATTERN.sub(" ", text)


def mask_php(text: str) -> str:
    index = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal index
        marker = f"__PHP_BLOCK_{index}__"
        index += 1
        return marker

    return PHP_BLOCK_PATTERN.sub(replace, text)


def strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text)


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_text(text: str) -> str:
    normalized = strip_php(text)
    normalized = strip_tags(normalized)
    normalized = html.unescape(normalized)
    normalized = normalized.replace(" ", " ")
    normalized = normalize_space(normalized)
    normalized = normalized.replace("필수", "").strip()
    return normalized


def contains_php_placeholder(value: Any) -> bool:
    if isinstance(value, str):
        return PHP_PLACEHOLDER_PREFIX in value
    if isinstance(value, list):
        return any(contains_php_placeholder(item) for item in value)
    if isinstance(value, dict):
        return any(contains_php_placeholder(item) for item in value.values())
    return False


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path.relative_to(ROOT)} JSON 파싱 실패: {exc}") from exc


def load_manifest(path: Path) -> tuple[dict[str, Any], OrderedDict[str, dict[str, Any]]]:
    document = read_json(path)
    entries = document.get("domains")
    if not isinstance(entries, list) or not entries:
        raise SystemExit(f"{path.relative_to(ROOT)} 에 domains 배열이 비어 있거나 없습니다.")

    ordered: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for entry in entries:
        if not isinstance(entry, dict):
            raise SystemExit(f"{path.relative_to(ROOT)} 의 domain entry 형식이 올바르지 않습니다.")
        domain = str(entry.get("domain", "")).strip()
        if domain == "":
            raise SystemExit(f"{path.relative_to(ROOT)} 에 domain 값이 비어 있는 entry가 있습니다.")
        if domain in ordered:
            raise SystemExit(f"{path.relative_to(ROOT)} 에 중복 domain '{domain}' 이 있습니다.")
        ordered[domain] = entry

    return document, ordered


def extract_php_string_array(path: Path, const_name: str = "UPDATABLE_FIELDS") -> list[str]:
    content = path.read_text(encoding="utf-8")
    pattern = rf"{const_name}\s*=\s*\[(.*?)\];"
    match = re.search(pattern, content, flags=re.S)
    if match is None:
        raise SystemExit(f"{path.relative_to(ROOT)} 에서 {const_name} 상수를 찾지 못했습니다.")
    return re.findall(r"'([^']+)'", match.group(1))


def decode_php_string(token: str) -> Any:
    if len(token) < 2 or token[0] != token[-1] or token[0] not in {"'", '"'}:
        return NO_DEFAULT

    quote = token[0]
    body = token[1:-1]
    if quote == "'":
        return re.sub(r"\\(['\\])", r"\1", body)

    if re.search(r"(?<!\\)\$", body):
        return NO_DEFAULT

    replacements = {
        r"\\": "\\",
        r"\"": '"',
        r"\n": "\n",
        r"\r": "\r",
        r"\t": "\t",
    }
    for source, target in replacements.items():
        body = body.replace(source, target)
    return body


def parse_scalar_literal(expression: str) -> Any:
    token = expression.strip().rstrip(",")
    if token == "":
        return NO_DEFAULT

    decoded = decode_php_string(token)
    if decoded is not NO_DEFAULT:
        return decoded

    lowered = token.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered == "null":
        return None
    if re.fullmatch(r"-?\d+", token):
        return int(token)

    return NO_DEFAULT


def parse_sql_default(token: str) -> Any:
    normalized = token.strip().rstrip(",")
    if normalized == "":
        return NO_DEFAULT
    if normalized.lower() in DYNAMIC_SQL_DEFAULTS:
        return NO_DEFAULT
    return parse_scalar_literal(normalized)


def resolve_table_sql_paths(config: dict[str, Any]) -> list[str]:
    configured = config.get("table_sql_paths")
    if isinstance(configured, list) and configured:
        resolved = [str(path).strip() for path in configured if str(path).strip()]
        if resolved:
            return resolved

    return DEFAULT_TABLE_SQL_PATHS


def extract_table_columns(table_name: str, table_sql_paths: list[str]) -> tuple[list[dict[str, Any]], list[str]]:
    pattern = rf"CREATE TABLE IF NOT EXISTS `{re.escape(table_name)}` \((.*?)\)\s*ENGINE="
    for relative_path in dict.fromkeys(table_sql_paths):
        table_sql_path = source_path(relative_path)
        if not table_sql_path.is_file():
            raise SystemExit(f"{relative_path} SQL 파일이 존재하지 않습니다.")

        sql = table_sql_path.read_text(encoding="utf-8")
        match = re.search(pattern, sql, flags=re.S)
        if match is None:
            continue

        columns: list[dict[str, Any]] = []
        for line in match.group(1).splitlines():
            column_match = re.match(r"^\s*`([^`]+)`\s+([^\s,]+)(.*)$", line)
            if column_match is None:
                continue

            column_name = column_match.group(1)
            sql_type = column_match.group(2).lower()
            remainder = column_match.group(3)
            default_match = re.search(
                r"\bdefault\b\s+((?:'[^']*')|(?:\"[^\"]*\")|(?:null)|(?:[^\s,]+))",
                remainder,
                flags=re.I,
            )
            sql_default = None
            has_sql_default = default_match is not None
            if default_match is not None:
                parsed_default = parse_sql_default(default_match.group(1))
                sql_default = None if parsed_default is NO_DEFAULT else parsed_default

            columns.append(
                {
                    "name": column_name,
                    "sql_type": sql_type,
                    "sql_default": sql_default,
                    "has_sql_default": has_sql_default,
                }
            )

        return columns, [relative_path]

    raise SystemExit(
        f"{', '.join(sorted(dict.fromkeys(table_sql_paths)))} 에서 테이블 '{table_name}' 정의를 찾지 못했습니다."
    )


def parse_form_defaults(raw_html: str, supported_fields: set[str]) -> tuple[dict[str, Any], dict[str, Any], set[str]]:
    base_defaults: dict[str, Any] = {}
    create_defaults: dict[str, Any] = {}
    dynamic_create_fields: set[str] = set()
    masked_html = mask_php(raw_html)

    for match in re.finditer(r"<input[^>]*>", masked_html, flags=re.I):
        attrs = match.group(0)
        field_match = re.search(r'name="([^"]+)"', attrs)
        if field_match is None:
            continue

        field_name = field_match.group(1)
        if field_name not in supported_fields:
            continue

        type_match = re.search(r'type="([^"]+)"', attrs)
        value_match = re.search(r'value="([^"]*)"', attrs)
        if value_match is None:
            continue

        if "__PHP_BLOCK_" in value_match.group(1):
            dynamic_create_fields.add(field_name)
            continue

        value = parse_scalar_literal(value_match.group(1))
        if value is NO_DEFAULT:
            dynamic_create_fields.add(field_name)
            continue

        input_type = (type_match.group(1).lower() if type_match else "text").strip()
        if input_type == "hidden":
            base_defaults[field_name] = value
        elif input_type in {"checkbox", "radio"} and isinstance(value, str):
            base_defaults[field_name] = value == "1"
        else:
            create_defaults[field_name] = value

    for match in re.finditer(r"<textarea[^>]*name=\"([^\"]+)\"[^>]*>(.*?)</textarea>", masked_html, flags=re.I | re.S):
        field_name = match.group(1)
        if field_name not in supported_fields:
            continue

        if "__PHP_BLOCK_" in match.group(2):
            dynamic_create_fields.add(field_name)
            continue

        value = clean_text(match.group(2))
        parsed_value = parse_scalar_literal(repr(value))
        if parsed_value is NO_DEFAULT:
            dynamic_create_fields.add(field_name)
            continue

        create_defaults[field_name] = parsed_value

    for match in re.finditer(r"<select[^>]*name=\"([^\"]+)\"[^>]*>(.*?)</select>", masked_html, flags=re.I | re.S):
        field_name = match.group(1)
        if field_name not in supported_fields:
            continue

        options_html = match.group(2)
        selected = re.search(r"<option[^>]*selected[^>]*value=\"([^\"]*)\"", options_html, flags=re.I | re.S)
        if selected is None:
            continue

        if "__PHP_BLOCK_" in selected.group(1):
            dynamic_create_fields.add(field_name)
            continue

        parsed_value = parse_scalar_literal(selected.group(1))
        if parsed_value is NO_DEFAULT:
            dynamic_create_fields.add(field_name)
            continue

        create_defaults[field_name] = parsed_value
        base_defaults[field_name] = parsed_value

    return base_defaults, create_defaults, dynamic_create_fields


def extract_sections(raw_html: str, default_section: dict[str, str] | None = None) -> list[dict[str, str]]:
    matches = list(
        re.finditer(
            r'<section id="([^"]+)".*?>\s*<h2 class="h2_frm">(.*?)</h2>(.*?)</section>',
            raw_html,
            flags=re.S,
        )
    )
    if not matches:
        section = default_section or {"key": "general", "label": "기본 정보"}
        return [{"id": section["key"], "label": section["label"], "html": raw_html}]

    sections: list[dict[str, str]] = []
    for match in matches:
        sections.append(
            {
                "id": match.group(1),
                "label": clean_text(match.group(2)),
                "html": match.group(3),
            }
        )
    return sections


def extract_row_header(row_html: str) -> str:
    match = re.search(r"<th[^>]*>(.*?)</th>", row_html, flags=re.S)
    if match is None:
        return ""
    return clean_text(match.group(1))


def extract_field_labels(row_html: str) -> dict[str, str]:
    labels: dict[str, str] = {}
    for field, label in re.findall(r'<label[^>]*for="([^"]+)"[^>]*>(.*?)</label>', row_html, flags=re.S):
        labels[field] = clean_text(label)
    return labels


def find_controls(row_html: str) -> dict[str, list[dict[str, str]]]:
    controls: dict[str, list[dict[str, str]]] = {}
    masked_row_html = mask_php(row_html)
    patterns = [
        ("input", re.compile(r"<input\b([^>]*?)>", flags=re.S)),
        ("select", re.compile(r"<select\b([^>]*?)>(.*?)</select>", flags=re.S)),
        ("textarea", re.compile(r"<textarea\b([^>]*?)>(.*?)</textarea>", flags=re.S)),
    ]
    for tag, pattern in patterns:
        for match in pattern.finditer(masked_row_html):
            attrs = match.group(1)
            name_match = re.search(r'name="([^"]+)"', attrs)
            if name_match is None:
                continue
            name = name_match.group(1)
            controls.setdefault(name, []).append(
                {
                    "tag": tag,
                    "attrs": attrs,
                    "html": match.group(0),
                }
            )

    helper_patterns = [
        ("select", re.compile(r"get_group_select\(\s*'([^']+)'", flags=re.S)),
        ("select", re.compile(r"get_member_level_select\(\s*'([^']+)'", flags=re.S)),
        ("select", re.compile(r"get_member_id_select\(\s*'([^']+)'", flags=re.S)),
        ("select", re.compile(r"get_skin_select\(\s*'[^']+'\s*,\s*'([^']+)'", flags=re.S)),
        ("select", re.compile(r"get_mobile_skin_select\(\s*'[^']+'\s*,\s*'([^']+)'", flags=re.S)),
    ]
    for tag, pattern in helper_patterns:
        for match in pattern.finditer(row_html):
            name = match.group(1)
            controls.setdefault(name, []).append(
                {
                    "tag": tag,
                    "attrs": "",
                    "html": match.group(0),
                }
            )
    return controls


def infer_input_type(control_group: list[dict[str, str]]) -> str:
    tags = {control["tag"] for control in control_group}
    if "select" in tags:
        return "select"
    if "textarea" in tags:
        return "textarea"

    input_types = {
        re.search(r'type="([^"]+)"', control["attrs"]).group(1)
        if re.search(r'type="([^"]+)"', control["attrs"])
        else "text"
        for control in control_group
    }
    if "radio" in input_types:
        return "radio"
    if "checkbox" in input_types:
        return "checkbox"
    if "number" in input_types:
        return "number"
    if "password" in input_types:
        return "password"
    if "file" in input_types:
        return "file"
    if "hidden" in input_types:
        return "hidden"
    if any(re.search(r'class="[^"]*\bnumeric\b', control["attrs"]) for control in control_group):
        return "number"
    return "text"


def extract_literal_control_default(raw_row_html: str, control_group: list[dict[str, str]], input_type: str) -> Any:
    if input_type == "select":
        select_html = next((control["html"] for control in control_group if control["tag"] == "select"), "")
        stripped_select_html = strip_php(select_html)
        option_matches = re.findall(r'<option value="([^"]*)"([^>]*)>', stripped_select_html, flags=re.S)
        if option_matches:
            for value, attrs in option_matches:
                if re.search(r"\bselected\b", attrs):
                    return html.unescape(value)
            return html.unescape(option_matches[0][0])

        helper_options = re.findall(r'option_selected\(([^,]+),[^,]+,\s*"([^"]+)"\)', raw_row_html)
        if helper_options:
            first_value = helper_options[0][0].strip().strip("'\"")
            return html.unescape(first_value)
        return NO_DEFAULT

    if input_type == "radio":
        for control in control_group:
            normalized_html = strip_php(control["html"])
            if not re.search(r"\bchecked(?:=\"checked\")?\b", normalized_html):
                continue
            value_match = re.search(r'value="([^"]*)"', normalized_html)
            if value_match is None:
                continue
            return html.unescape(value_match.group(1))
        return NO_DEFAULT

    if input_type == "checkbox":
        if len(control_group) > 1:
            selected_values: list[str] = []
            for control in control_group:
                normalized_html = strip_php(control["html"])
                if not re.search(r"\bchecked(?:=\"checked\")?\b", normalized_html):
                    continue
                value_match = re.search(r'value="([^"]*)"', control["attrs"])
                if value_match is None:
                    continue
                selected_values.append(html.unescape(value_match.group(1)))
            return ",".join(selected_values)
        for control in control_group:
            normalized_html = strip_php(control["html"])
            if re.search(r"\bchecked(?:=\"checked\")?\b", normalized_html):
                return True
        return False

    if input_type == "textarea":
        textarea_html = next((control["html"] for control in control_group if control["tag"] == "textarea"), "")
        match = re.search(r"<textarea\b[^>]*>(.*?)</textarea>", textarea_html, flags=re.S)
        if match is None:
            return NO_DEFAULT
        body = match.group(1)
        if "<?" in body:
            return NO_DEFAULT
        return html.unescape(body)

    control = control_group[0]
    value_match = re.search(r'value="([^"]*)"', control["attrs"], flags=re.S)
    if value_match is None:
        return NO_DEFAULT
    raw_value = value_match.group(1)
    if "<?" in raw_value or "__PHP_BLOCK_" in raw_value:
        return NO_DEFAULT
    return html.unescape(raw_value)


def extract_options(raw_row_html: str, control_group: list[dict[str, str]]) -> list[dict[str, str]]:
    input_type = infer_input_type(control_group)
    if input_type == "select":
        member_level_options = extract_member_level_select_options(raw_row_html, control_group)
        if member_level_options:
            return member_level_options

        options: list[dict[str, str]] = []
        select_html = next((control["html"] for control in control_group if control["tag"] == "select"), "")
        for value, label in re.findall(r'<option value="([^"]*)"[^>]*>(.*?)</option>', strip_php(select_html), flags=re.S):
            options.append({"value": html.unescape(value), "label": clean_text(label)})
        if options:
            return [option for option in options if not contains_php_placeholder(option)]
        for value, label in re.findall(r'option_selected\(([^,]+),[^,]+,\s*"([^"]+)"\)', raw_row_html):
            options.append({"value": value.strip().strip("'\""), "label": clean_text(label)})
        return [option for option in options if not contains_php_placeholder(option)]

    if input_type == "radio":
        labels = extract_field_labels(raw_row_html)
        options = []
        for control in control_group:
            value_match = re.search(r'value="([^"]*)"', control["attrs"])
            id_match = re.search(r'id="([^"]+)"', control["attrs"])
            if value_match is None:
                continue
            label = labels.get(id_match.group(1) if id_match else "", "") or value_match.group(1)
            options.append({"value": value_match.group(1), "label": label})
        return options

    if input_type == "checkbox":
        if len(control_group) <= 1:
            return []
        labels = extract_field_labels(raw_row_html)
        options = []
        for control in control_group:
            value_match = re.search(r'value="([^"]*)"', control["attrs"])
            id_match = re.search(r'id="([^"]+)"', control["attrs"])
            if value_match is None:
                continue
            label = labels.get(id_match.group(1) if id_match else "", "") or value_match.group(1)
            options.append({"value": html.unescape(value_match.group(1)), "label": label})
        return options

    return []


def extract_member_level_select_options(
    raw_row_html: str,
    control_group: list[dict[str, str]],
) -> list[dict[str, str]]:
    names = []
    for control in control_group:
        name_match = re.search(r"name=\"([^\"]+)\"", control["attrs"])
        if name_match is not None:
            names.append(name_match.group(1))

        helper_match = re.search(r"get_member_level_select\(\s*['\"]([^'\"]+)['\"]", control["html"])
        if helper_match is not None:
            names.append(helper_match.group(1))

    for name in names:
        pattern = (
            r"get_member_level_select\(\s*['\"]"
            + re.escape(name)
            + r"['\"]\s*,\s*(\d+)\s*,\s*(\d+)"
        )
        match = re.search(pattern, raw_row_html, flags=re.S)
        if match is None:
            continue

        start = int(match.group(1))
        end = int(match.group(2))
        if start > end:
            continue

        return [{"value": str(value), "label": str(value)} for value in range(start, end + 1)]

    return []


def infer_option_source(raw_row_html: str, field_name: str, input_type: str) -> dict[str, str] | None:
    if input_type != "select":
        return None

    if re.search(r"get_group_select\(\s*['\"]" + re.escape(field_name) + r"['\"]", raw_row_html, flags=re.S):
        return {
            "kind": "endpoint",
            "name": "admin.groups",
            "endpoint": "/admin/groups",
            "value_field": "gr_id",
            "label_field": "gr_subject",
        }

    if re.search(r"get_member_id_select\(\s*['\"]" + re.escape(field_name) + r"['\"]", raw_row_html, flags=re.S):
        return {
            "kind": "endpoint",
            "name": "admin.members",
            "endpoint": "/admin/members",
            "value_field": "mb_id",
            "label_field": "mb_id",
        }

    skin_match = re.search(
        r"get_skin_select\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"][^'\"]+['\"]\s*,\s*['\"]"
        + re.escape(field_name)
        + r"['\"]",
        raw_row_html,
        flags=re.S,
    )
    if skin_match is not None:
        skin_group = skin_match.group(1)
        return {
            "kind": "directory",
            "name": f"skin.{skin_group}",
            "value_field": "value",
            "label_field": "label",
        }

    mobile_skin_match = re.search(
        r"get_mobile_skin_select\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"][^'\"]+['\"]\s*,\s*['\"]"
        + re.escape(field_name)
        + r"['\"]",
        raw_row_html,
        flags=re.S,
    )
    if mobile_skin_match is not None:
        skin_group = mobile_skin_match.group(1)
        return {
            "kind": "directory",
            "name": f"mobile_skin.{skin_group}",
            "value_field": "value",
            "label_field": "label",
        }

    return None


def infer_data_type(field_name: str, input_type: str, options: list[dict[str, str]]) -> str:
    if input_type == "checkbox":
        if options and len(options) > 1:
            return "string"
        return "boolean"
    if input_type == "file":
        return "file"
    if input_type == "radio":
        values = {option["value"] for option in options}
        if values and values.issubset({"0", "1"}):
            return "boolean"
        return "string"
    if input_type == "select":
        values = [option["value"] for option in options if option["value"] != ""]
        if values and all(re.fullmatch(r"-?\d+", value) for value in values):
            return "integer"
        if field_name.endswith(INTEGER_SUFFIXES):
            return "integer"
        return "string"
    if input_type in {"textarea", "password"}:
        return "string"
    if field_name.endswith(INTEGER_SUFFIXES):
        return "integer"
    return "string"


def normalize_default_value(value: Any, data_type: str) -> Any:
    if value is None:
        return None

    if data_type == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value != 0
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        return None

    if data_type == "integer":
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            normalized = value.strip()
            if re.fullmatch(r"-?\d+", normalized):
                return int(normalized)
        return None

    if isinstance(value, str):
        if contains_php_placeholder(value):
            return None
        return value
    if isinstance(value, (bool, int)):
        return str(value)

    return None


def find_literal_help(row_html: str) -> str | None:
    # Accept one complete PHP string literal, never a concatenation/expression.
    # The previous non-greedy backreference consumed quotes inside nested calls
    # and leaked PHP source (including variable names) into the rendered help.
    match = re.search(r'''help\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*\)''', row_html, flags=re.S)
    if match is None:
        return None
    quoted = match.group(1)
    if quoted is not None:
        if re.search(r"(?<!\\)\$", quoted):
            return None
        literal = quoted.replace('\\"', '"').replace('\\n', '\n').replace('\\r', '\r')
    else:
        literal = match.group(2).replace("\\'", "'")
    value = clean_text(literal.replace('\\\\', '\\'))
    return value or None


def build_row_candidates(
    row_html: str,
    section_id: str,
    section_label: str,
    supported_names: set[str],
) -> list[dict[str, Any]]:
    row_header = extract_row_header(row_html)
    field_labels = extract_field_labels(row_html)
    controls = find_controls(row_html)
    description = find_literal_help(row_html)
    candidates: list[dict[str, Any]] = []

    for raw_name, control_group in controls.items():
        normalized_name = raw_name.replace("[]", "")
        if normalized_name not in supported_names:
            continue
        if normalized_name.startswith("chk_") or normalized_name in {"w", "page", "token", "sfl", "stx", "sst", "sod"}:
            continue

        input_type = infer_input_type(control_group)
        label = field_labels.get(normalized_name, "")
        if input_type == "radio" and row_header:
            label = row_header
        elif label in {"사용", "보이기", "필수입력"} and row_header:
            label = f"{row_header} {label}"
        elif label == "":
            label = row_header or normalized_name

        options = extract_options(row_html, control_group)
        data_type = infer_data_type(normalized_name, input_type, options)
        if input_type == "text" and data_type == "integer":
            input_type = "number"
        raw_default_value = extract_literal_control_default(row_html, control_group, input_type)
        required = any("required" in control["attrs"] for control in control_group)
        if not required:
            required = bool(
                re.search(
                    rf'<label[^>]*for="{re.escape(normalized_name)}"[^>]*>.*?필수',
                    row_html,
                    flags=re.S,
                )
            )
        candidates.append(
            {
                "name": normalized_name,
                "label": label or normalized_name,
                "description": description,
                "input_type": input_type,
                "data_type": data_type,
                "required": required,
                "section_key": section_id,
                "section_label": section_label,
                "options": options,
                "option_source": infer_option_source(row_html, normalized_name, input_type),
                "create_only": False,
                "readonly_on_update": False,
                "default_value": None if raw_default_value is NO_DEFAULT else raw_default_value,
                "has_default_value": raw_default_value is not NO_DEFAULT,
            }
        )
    return candidates


def merge_metadata(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        merged[key] = value
    return merged


def render_match_templates(value: Any, match: re.Match[str]) -> Any:
    if isinstance(value, str):
        rendered = value
        for index, group in enumerate(match.groups(), start=1):
            rendered = rendered.replace("{" + str(index) + "}", group)
        return rendered
    if isinstance(value, list):
        return [render_match_templates(item, match) for item in value]
    if isinstance(value, dict):
        return {key: render_match_templates(item, match) for key, item in value.items()}
    return value


def resolve_pattern_override(field_name: str, patterns: list[dict[str, Any]]) -> dict[str, Any]:
    for pattern_config in patterns:
        raw_pattern = str(pattern_config.get("pattern", "")).strip()
        if raw_pattern == "":
            continue
        match = re.fullmatch(raw_pattern, field_name)
        if match is None:
            continue

        override = {
            key: render_match_templates(value, match)
            for key, value in pattern_config.items()
            if key != "pattern"
        }
        return override

    return {}


def infer_sql_fallback_metadata(field_name: str, sql_type: str) -> dict[str, Any]:
    normalized = sql_type.lower()
    if normalized.startswith(("int", "tinyint", "smallint", "mediumint", "bigint", "decimal", "float", "double")):
        return {"input_type": "number", "data_type": "integer"}
    if normalized.startswith(("date",)):
        return {"input_type": "date", "data_type": "string"}
    if normalized.startswith(("datetime", "timestamp")):
        return {"input_type": "datetime-local", "data_type": "string"}
    if normalized.startswith(("text", "mediumtext", "longtext", "tinytext")):
        return {"input_type": "textarea", "data_type": "string"}
    if field_name.endswith(INTEGER_SUFFIXES):
        return {"input_type": "number", "data_type": "integer"}
    return {"input_type": "text", "data_type": "string"}


def normalize_legacy_forms(config: dict[str, Any]) -> list[dict[str, Any]]:
    forms = config.get("legacy_forms")
    if not isinstance(forms, list) or not forms:
        legacy_form = config.get("legacy_form")
        if not isinstance(legacy_form, str) or legacy_form.strip() == "":
            raise SystemExit("schema domain config 에 legacy_forms 또는 legacy_form 이 필요합니다.")
        forms = [{"path": legacy_form}]

    normalized: list[dict[str, Any]] = []
    for form in forms:
        if isinstance(form, str):
            normalized.append({"path": form})
            continue
        if not isinstance(form, dict):
            raise SystemExit("legacy_forms entry 형식이 올바르지 않습니다.")
        path = str(form.get("path", "")).strip()
        if path == "":
            raise SystemExit("legacy_forms entry 에 path 가 비어 있습니다.")
        normalized_form = {"path": path}
        if isinstance(form.get("default_section"), dict):
            normalized_form["default_section"] = form["default_section"]
        normalized.append(normalized_form)
    return normalized


def normalize_layout(config: dict[str, Any]) -> dict[str, Any] | None:
    raw_layout = config.get("layout")
    if raw_layout is None:
        return None
    if not isinstance(raw_layout, dict):
        raise SystemExit("schema domain config 의 layout 형식이 올바르지 않습니다.")

    desktop = str(raw_layout.get("desktop", "")).strip()
    mobile = str(raw_layout.get("mobile", "")).strip()
    if desktop not in {"tabs", "stack"}:
        raise SystemExit("schema domain config 의 layout.desktop 은 tabs 또는 stack 이어야 합니다.")
    if mobile not in {"accordion", "stack"}:
        raise SystemExit("schema domain config 의 layout.mobile 은 accordion 또는 stack 이어야 합니다.")

    single_open = raw_layout.get("single_open", True)
    if not isinstance(single_open, bool):
        raise SystemExit("schema domain config 의 layout.single_open 은 boolean 이어야 합니다.")

    return {
        "desktop": desktop,
        "mobile": mobile,
        "single_open": single_open,
    }


def extract_braced_block(text: str, brace_index: int) -> str | None:
    depth = 0
    body_start: int | None = None
    in_single_quote = False
    in_double_quote = False
    in_line_comment = False
    in_block_comment = False
    escaped = False
    cursor = brace_index

    while cursor < len(text):
        current = text[cursor]
        next_char = text[cursor + 1] if cursor + 1 < len(text) else ""

        if in_line_comment:
            if current == "\n":
                in_line_comment = False
            cursor += 1
            continue

        if in_block_comment:
            if current == "*" and next_char == "/":
                in_block_comment = False
                cursor += 2
                continue
            cursor += 1
            continue

        if in_single_quote:
            if current == "\\" and not escaped:
                escaped = True
                cursor += 1
                continue
            if current == "'" and not escaped:
                in_single_quote = False
            escaped = False
            cursor += 1
            continue

        if in_double_quote:
            if current == "\\" and not escaped:
                escaped = True
                cursor += 1
                continue
            if current == '"' and not escaped:
                in_double_quote = False
            escaped = False
            cursor += 1
            continue

        if current == "/" and next_char == "/":
            in_line_comment = True
            cursor += 2
            continue

        if current == "/" and next_char == "*":
            in_block_comment = True
            cursor += 2
            continue

        if current == "#":
            in_line_comment = True
            cursor += 1
            continue

        if current == "'":
            in_single_quote = True
            cursor += 1
            continue

        if current == '"':
            in_double_quote = True
            cursor += 1
            continue

        if current == "{":
            depth += 1
            if depth == 1:
                body_start = cursor + 1
            cursor += 1
            continue

        if current == "}":
            depth -= 1
            if depth == 0 and body_start is not None:
                return text[body_start:cursor]
            cursor += 1
            continue

        cursor += 1

    return None


def extract_form_defaults(raw_php: str, supported_fields: set[str]) -> tuple[dict[str, Any], dict[str, Any], set[str]]:
    base_defaults: dict[str, Any] = {}
    create_defaults: dict[str, Any] = {}
    dynamic_create_fields: set[str] = set()

    for array_match in re.finditer(r"\$\w+\s*=\s*array\s*\((.*?)\);", raw_php, flags=re.S):
        body = array_match.group(1)
        for entry in re.finditer(
            r"['\"]([^'\"]+)['\"]\s*=>\s*((?:'(?:\\.|[^'])*')|(?:\"(?:\\.|[^\"])*\")|(?:true)|(?:false)|(?:null)|(?:-?\d+))\s*,?",
            body,
            flags=re.I,
        ):
            field_name = entry.group(1)
            if field_name not in supported_fields:
                continue
            parsed_value = parse_scalar_literal(entry.group(2))
            if parsed_value is NO_DEFAULT:
                continue
            base_defaults[field_name] = parsed_value

    for if_match in re.finditer(r"if\s*\(\s*\$w\s*={2,3}\s*(['\"])\1\s*\)\s*\{", raw_php):
        block = extract_braced_block(raw_php, if_match.end() - 1)
        if block is None:
            continue

        for assignment in re.finditer(
            r"\$\w+\s*\[\s*(['\"])([^'\"]+)\1\s*\]\s*=\s*(.+?);",
            block,
            flags=re.S,
        ):
            field_name = assignment.group(2)
            if field_name not in supported_fields:
                continue
            parsed_value = parse_scalar_literal(assignment.group(3))
            if parsed_value is NO_DEFAULT:
                dynamic_create_fields.add(field_name)
                continue
            create_defaults[field_name] = parsed_value

    return base_defaults, create_defaults, dynamic_create_fields


def resolve_supported_fields(config: dict[str, Any]) -> list[str]:
    supported_fields = config.get("supported_fields")
    if isinstance(supported_fields, list) and supported_fields:
        return [str(field) for field in supported_fields]

    repo_file = str(config.get("repo_file", "")).strip()
    repo_field_file = str(config.get("repo_field_file", repo_file)).strip()
    if repo_field_file == "":
        return []
    return extract_php_string_array(ROOT / repo_field_file, str(config.get("repo_field_const", "UPDATABLE_FIELDS")))


def compute_source_hash(
    domain: str,
    config: dict[str, Any],
    manifest_relative_path: str,
    legacy_forms: list[dict[str, Any]],
    table_source_paths: list[str],
) -> str:
    hasher = hashlib.sha256()
    hasher.update(domain.encode("utf-8"))
    hasher.update(json.dumps(config, ensure_ascii=False, sort_keys=True).encode("utf-8"))

    source_paths = [manifest_relative_path, *[form["path"] for form in legacy_forms]]
    repo_file = str(config.get("repo_file", "")).strip()
    if repo_file != "":
        source_paths.append(repo_file)
    repo_field_file = str(config.get("repo_field_file", "")).strip()
    if repo_field_file != "":
        source_paths.append(repo_field_file)
    table_name = str(config.get("table", "")).strip()
    if table_name != "":
        for table_source_path in dict.fromkeys(table_source_paths):
            source_paths.append(str(table_source_path))

    for relative_path in sorted(dict.fromkeys(source_paths)):
        path = source_path(relative_path)
        if not path.is_file():
            raise SystemExit(f"schema source 파일이 없습니다: {relative_path}")
        hasher.update(relative_path.encode("utf-8"))
        hasher.update(path.read_bytes())

    return hasher.hexdigest()


def build_domain_schema(
    domain: str,
    config: dict[str, Any],
    manifest_relative_path: str,
) -> dict[str, Any]:
    legacy_forms = normalize_legacy_forms(config)
    layout = normalize_layout(config)
    sections: list[dict[str, str]] = []
    raw_forms: list[str] = []
    for legacy_form in legacy_forms:
        form_path = source_path(legacy_form["path"])
        raw_html = form_path.read_text(encoding="utf-8")
        raw_forms.append(raw_html)
        default_section = legacy_form.get("default_section") or config.get("default_section")
        sections.extend(extract_sections(raw_html, default_section))

    updatable_fields = resolve_supported_fields(config)
    table_name = str(config.get("table", "")).strip()
    table_source_paths: list[str] = []
    table_columns: list[dict[str, Any]] = []
    if table_name != "":
        table_sql_paths = resolve_table_sql_paths(config)
        table_columns, table_source_paths = extract_table_columns(table_name, table_sql_paths)

    table_fields = [column["name"] for column in table_columns]
    supported_fields = table_fields + updatable_fields + [str(field) for field in config.get("include_fields", [])]
    excluded_fields = {str(field) for field in config.get("exclude_fields", [])}
    supported_fields = [field for field in dict.fromkeys(supported_fields) if field not in excluded_fields]
    if not updatable_fields and table_fields:
        updatable_fields = table_fields

    updatable_field_set = set(updatable_fields)
    table_columns_by_name = {column["name"]: column for column in table_columns}
    supported_field_set = set(supported_fields)

    source_field_map = {str(key): str(value) for key, value in dict(config.get("source_field_map", {})).items()}
    supported_source_names = {source_field_map.get(field, field).replace("[]", "") for field in supported_fields}
    field_overrides = {str(key): value for key, value in dict(config.get("field_overrides", {})).items()}
    field_patterns = list(config.get("field_patterns", []))
    base_defaults: dict[str, Any] = {}
    create_defaults: dict[str, Any] = {}
    dynamic_create_fields: set[str] = set()
    for raw_form in raw_forms:
        form_base_defaults, form_create_defaults, form_dynamic_fields = extract_form_defaults(raw_form, supported_field_set)
        base_defaults.update(form_base_defaults)
        create_defaults.update(form_create_defaults)
        dynamic_create_fields.update(form_dynamic_fields)

    extracted_by_name: dict[str, dict[str, Any]] = {}
    for section in sections:
        for row_html in re.findall(r"<tr\b.*?>.*?</tr>", section["html"], flags=re.S):
            for candidate in build_row_candidates(row_html, section["id"], section["label"], supported_source_names):
                extracted_by_name[candidate["name"]] = candidate

    field_map: OrderedDict[str, dict[str, Any]] = OrderedDict()
    default_section = config.get("default_section", {"key": "misc", "label": "기타"})

    for field in supported_fields:
        source_name = source_field_map.get(field, field).replace("[]", "")
        sql_type = table_columns_by_name.get(field, {}).get("sql_type", "")
        fallback_meta = infer_sql_fallback_metadata(field, sql_type) if sql_type else {"input_type": "text", "data_type": "string"}
        base = extracted_by_name.get(
            source_name,
            {
                "name": field,
                "label": field,
                "description": None,
                "input_type": fallback_meta["input_type"],
                "data_type": fallback_meta["data_type"],
                "required": False,
                "section_key": default_section["key"],
                "section_label": default_section["label"],
                "options": [],
                "option_source": None,
                "create_only": False,
                "readonly_on_update": field not in updatable_field_set,
                "default_value": None,
                "has_default_value": False,
            },
        )
        if field in create_defaults:
            base["default_value"] = create_defaults[field]
            base["has_default_value"] = True
        elif base.get("has_default_value", False):
            pass
        elif field in base_defaults:
            base["default_value"] = base_defaults[field]
            base["has_default_value"] = True
        elif (
            field not in dynamic_create_fields
            and table_columns_by_name.get(field, {}).get("has_sql_default", False)
        ):
            base["default_value"] = table_columns_by_name[field]["sql_default"]
            base["has_default_value"] = True
        if field not in updatable_field_set:
            base["readonly_on_update"] = True
        merged = merge_metadata(base, resolve_pattern_override(field, field_patterns))
        merged = merge_metadata(merged, field_overrides.get(field, {}))
        merged["name"] = field
        merged["default_value"] = normalize_default_value(merged.get("default_value"), merged["data_type"])
        if contains_php_placeholder(merged.get("options")):
            merged["options"] = []
        if contains_php_placeholder(merged.get("default_value")):
            merged["default_value"] = None
        field_map[field] = merged

    sections_by_key: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for field_name, field in field_map.items():
        section_key = field.get("section_key", "misc")
        if section_key not in sections_by_key:
            sections_by_key[section_key] = {
                "key": section_key,
                "label": field.get("section_label", "기타"),
                "order": len(sections_by_key) + 1,
                "description": None,
                "fields": [],
            }
        serialized_field = {
            "name": field_name,
            "label": field["label"],
            "input_type": field["input_type"],
            "data_type": field["data_type"],
            "required": bool(field.get("required", False)),
            "create_only": bool(field.get("create_only", False)),
            "readonly_on_update": bool(field.get("readonly_on_update", False)),
            "description": field.get("description"),
            "options": list(field.get("options", [])),
            "default_value": field.get("default_value"),
        }
        option_source = field.get("option_source")
        if isinstance(option_source, dict) and option_source:
            serialized_field["option_source"] = option_source
        sections_by_key[section_key]["fields"].append(serialized_field)

    primary_legacy_form = legacy_forms[0]["path"]
    source_hash = compute_source_hash(
        domain,
        config,
        manifest_relative_path,
        legacy_forms,
        table_source_paths,
    )
    return {
        "domain": domain,
        "title": config["title"],
        "legacy_form": primary_legacy_form,
        "legacy_forms": [legacy_form["path"] for legacy_form in legacy_forms],
        "layout": layout,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "field_count": len(field_map),
        "section_count": len(sections_by_key),
        "source": {
            "manifest": manifest_relative_path,
            "repo_file": config.get("repo_file"),
            "repo_field_file": config.get("repo_field_file"),
            "repo_field_const": config.get("repo_field_const", "UPDATABLE_FIELDS"),
            "table": table_name or None,
            "extractor_version": EXTRACTOR_VERSION,
            "source_hash": source_hash,
        },
        "sections": list(sections_by_key.values()),
    }


def render_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def normalize_for_compare(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: normalize_for_compare(item)
            for key, item in value.items()
            if key not in VOLATILE_KEYS
        }
    if isinstance(value, list):
        return [normalize_for_compare(item) for item in value]
    return value


def verify_or_write(output_path: Path, payload: dict[str, Any], mode: str) -> bool:
    relative_path = output_path.relative_to(ROOT)
    if mode == "write":
        output_path.write_text(render_json(payload), encoding="utf-8")
        print(f"generated {relative_path} ({payload['field_count']} fields)")
        return True

    if not output_path.is_file():
        print(f"stale {relative_path}: generated registry 파일이 없습니다.")
        return False

    existing = read_json(output_path)
    existing_normalized = normalize_for_compare(existing)
    expected_normalized = normalize_for_compare(payload)
    if existing_normalized == expected_normalized:
        print(f"verified {relative_path}")
        return True

    diff = difflib.unified_diff(
        render_json(existing_normalized).splitlines(),
        render_json(expected_normalized).splitlines(),
        fromfile=f"{relative_path} (current)",
        tofile=f"{relative_path} (expected)",
        lineterm="",
    )
    print(f"stale {relative_path}: generated registry 를 다시 추출해야 합니다.")
    for line in diff:
        print(line)
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="레거시 관리자 폼에서 field metadata registry 를 추출합니다.",
    )
    parser.add_argument(
        "--mode",
        choices=("write", "check"),
        default="write",
        help="write 는 generated registry 갱신, check 는 stale 여부 검사",
    )
    parser.add_argument(
        "--domain",
        action="append",
        dest="domains",
        help="특정 domain 만 처리합니다. 여러 번 지정할 수 있습니다.",
    )
    parser.add_argument(
        "--manifest",
        default=str(MANIFEST_PATH),
        help="schema domain manifest 경로",
    )
    parser.add_argument("--legacy-root", type=Path, help="분리된 공식 G5 adm/install 입력 디렉터리")
    return parser.parse_args()


def main() -> int:
    global LEGACY_ROOT
    args = parse_args()
    if args.legacy_root is not None:
        LEGACY_ROOT = args.legacy_root.resolve()
        if not (LEGACY_ROOT / "install/gnuboard5.sql").is_file():
            raise SystemExit("legacy root에 공식 G5 설치 SQL이 없습니다.")
    manifest_path = Path(args.manifest).resolve()
    manifest_document, domain_map = load_manifest(manifest_path)
    manifest_relative_path = str(manifest_path.relative_to(ROOT))
    selected_domains = args.domains or list(domain_map.keys())

    unknown_domains = [domain for domain in selected_domains if domain not in domain_map]
    if unknown_domains:
        raise SystemExit(f"지원하지 않는 schema domain: {', '.join(unknown_domains)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_ok = True
    for domain in selected_domains:
        payload = build_domain_schema(domain, domain_map[domain], manifest_relative_path)
        output_path = OUTPUT_DIR / f"{domain}.json"
        all_ok = verify_or_write(output_path, payload, args.mode) and all_ok

    if args.mode == "check" and not all_ok:
        print("hint: composer run schema:extract")
        return 1

    version = manifest_document.get("version", 1)
    print(f"schema manifest version={version}, extractor={EXTRACTOR_VERSION}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
