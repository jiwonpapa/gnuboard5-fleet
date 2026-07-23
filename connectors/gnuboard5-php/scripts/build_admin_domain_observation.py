#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DOMAINS_PATH = ROOT / "api/v1/Admin/Schema/schema-domains.json"
GENERATED_DIR = ROOT / "api/v1/Admin/Schema/Data/generated"
DDL_DIR = ROOT / "docs/ddls"


@dataclass
class CommandResult:
    returncode: int
    stdout: str
    stderr: str


def run_command(args: list[str], cwd: Path | None = None) -> CommandResult:
    completed = subprocess.run(
        args,
        cwd=str(cwd or ROOT),
        text=True,
        capture_output=True,
        check=False,
    )
    return CommandResult(
        returncode=completed.returncode,
        stdout=completed.stdout,
        stderr=completed.stderr,
    )


def present_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def load_domain_config(domain: str) -> dict[str, Any]:
    manifest = json.loads(SCHEMA_DOMAINS_PATH.read_text(encoding="utf-8"))
    domain_items = manifest.get("domains", manifest)
    for item in domain_items:
        if item.get("domain") == domain:
            return item
    raise SystemExit(f"schema-domains.json 에 domain={domain} 이 없습니다.")


def normalize_legacy_forms(config: dict[str, Any]) -> list[str]:
    forms = config.get("legacy_forms")
    if isinstance(forms, list) and forms:
        normalized = []
        for item in forms:
            if isinstance(item, str):
                normalized.append(resolve_target_placeholders(item))
            elif isinstance(item, dict):
                target = item.get("target") or item.get("path")
                if isinstance(target, str):
                    normalized.append(resolve_target_placeholders(target))
        return normalized

    legacy_form = config.get("legacy_form")
    if isinstance(legacy_form, str) and legacy_form.strip():
        return [resolve_target_placeholders(legacy_form)]

    return []


def normalize_db_observation(config: dict[str, Any]) -> dict[str, Any]:
    raw = config.get("db_observation")
    if isinstance(raw, dict):
        tables = [
            str(table).strip()
            for table in raw.get("tables", [])
            if str(table).strip()
        ]
        mode = str(raw.get("mode") or "").strip().lower()
        if mode == "" and tables:
            mode = "table" if len(tables) == 1 else "multi"
        if mode in {"table", "multi", "none"}:
            return {
                "mode": mode,
                "tables": tables,
            }

    table = str(config.get("table", "")).strip()
    if table:
        return {
            "mode": "table",
            "tables": [table],
        }

    return {
        "mode": "none",
        "tables": [],
    }


def resolve_target_placeholders(target: str) -> str:
    bootstrap_admin_id = os.getenv("ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID", "neojins").strip() or "neojins"
    return target.replace("{bootstrap_admin_id}", bootstrap_admin_id)


def normalize_source_file_path(target: str) -> str:
    return target.split("?", 1)[0]


def extract_constant_field_list(path: Path, const_name: str) -> list[str]:
    if not path.is_file():
        return []
    content = path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"{re.escape(const_name)}\s*=\s*\[(.*?)\];",
        re.S,
    )
    match = pattern.search(content)
    if not match:
        return []
    return re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))


def extract_update_rules(path: Path, field_names: set[str]) -> dict[str, Any]:
    if not path.is_file():
        return {
            "type_hints": {},
            "validation_snippets": [],
            "mentioned_fields": [],
            "blocked_reason": f"{path} 파일이 없습니다.",
        }

    content = path.read_text(encoding="utf-8")
    type_hints: dict[str, str] = {}
    for field, hint in re.findall(r"['\"]([^'\"]+)['\"]\s*=>\s*['\"]([^'\"]+)['\"]", content):
        if field in field_names:
            type_hints[field] = hint

    validation_snippets: list[dict[str, Any]] = []
    keywords = ("alert(", "preg_replace", "preg_match", "clean_xss_tags", "filter_var", "check_config_captcha_open")
    lines = content.splitlines()
    for index, line in enumerate(lines, start=1):
        if not any(keyword in line for keyword in keywords):
            continue
        matched_fields = sorted(name for name in field_names if name in line)
        if not matched_fields:
            continue
        validation_snippets.append(
            {
                "line": index,
                "fields": matched_fields,
                "snippet": line.strip(),
            }
        )

    mentioned_fields = sorted(
        {field for field in field_names if re.search(rf"\b{re.escape(field)}\b", content)}
    )

    return {
        "type_hints": type_hints,
        "validation_snippets": validation_snippets,
        "mentioned_fields": mentioned_fields,
        "blocked_reason": None,
    }


def extract_ddl_columns(table: str) -> dict[str, Any]:
    slug = table.removeprefix("g5_")
    ddl_path = DDL_DIR / f"{slug}.md"
    if not ddl_path.is_file():
        return {
            "status": "blocked",
            "reason": f"DDL 문서가 없습니다: {ddl_path}",
            "columns": [],
            "source": None,
        }

    content = ddl_path.read_text(encoding="utf-8")
    sql_block = re.search(
        rf"CREATE TABLE IF NOT EXISTS `{re.escape(table)}` \((.*?)\)\s*ENGINE=",
        content,
        re.S,
    )
    if not sql_block:
        return {
            "status": "blocked",
            "reason": f"{ddl_path} 에서 CREATE TABLE {table} 블록을 찾지 못했습니다.",
            "columns": [],
            "source": str(ddl_path.relative_to(ROOT)),
        }

    columns: list[dict[str, Any]] = []
    for raw_line in sql_block.group(1).splitlines():
        line = raw_line.strip().rstrip(",")
        if not line.startswith("`"):
            continue
        match = re.match(r"`([^`]+)`\s+([^\s]+(?:\([^)]+\))?)\s+(.*)", line)
        if not match:
            continue
        name, sql_type, tail = match.groups()
        columns.append(
            {
                "name": name,
                "sql_type": sql_type,
                "nullable": "NOT NULL" not in tail.upper(),
                "default": extract_default_value(tail),
                "raw_tail": tail,
            }
        )

    return {
        "status": "ok",
        "reason": None,
        "columns": columns,
        "source": str(ddl_path.relative_to(ROOT)),
    }


def extract_default_value(tail: str) -> str | None:
    match = re.search(r"DEFAULT\s+'([^']*)'", tail, re.I)
    if match:
        return match.group(1)
    match = re.search(r"DEFAULT\s+([^\s]+)", tail, re.I)
    if match:
        return match.group(1)
    return None


def load_rendered_inventory(
    domain: str,
    legacy_forms: list[str],
    base_url: str | None,
    inspect_secret: str | None,
    output_dir: Path,
) -> dict[str, Any]:
    if not base_url:
        return {
            "status": "blocked",
            "reason": "--base-url 이 없어 렌더된 관리자 HTML inventory 를 수집하지 못했습니다.",
            "manifest": None,
            "pages": [],
        }

    survey_dir = output_dir / "legacy-survey"
    args = [
        "php",
        str(ROOT / "scripts/survey_local_admin_pages.php"),
        f"--base-url={base_url}",
        f"--output-dir={survey_dir}",
    ]
    if inspect_secret:
        args.append(f"--inspect-secret={inspect_secret}")
    for target in legacy_forms:
        args.append(f"--target=/{target.lstrip('/')}")

    result = run_command(args)
    manifest_path = survey_dir / "manifest.json"
    if result.returncode != 0 or not manifest_path.is_file():
        return {
            "status": "blocked",
            "reason": "legacy survey 실행에 실패했습니다.",
            "manifest": {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
            },
            "pages": [],
        }

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    pages: list[dict[str, Any]] = []
    for page in manifest.get("pages", []):
        inventory_path = page.get("json_path")
        if not inventory_path:
            pages.append(page)
            continue
        inventory = json.loads(Path(inventory_path).read_text(encoding="utf-8"))
        pages.append(
            {
                "path": page.get("path"),
                "label": page.get("label"),
                "field_count": inventory.get("field_count"),
                "section_count": inventory.get("section_count"),
                "fields": [
                    {
                        "name": field.get("name"),
                        "label": field.get("label"),
                        "render_type": field.get("render_type"),
                        "required": field.get("required"),
                        "readonly": field.get("readonly"),
                        "disabled": field.get("disabled"),
                        "section_key": field.get("section_key"),
                        "option_count": field.get("option_count"),
                    }
                    for field in inventory.get("fields", [])
                ],
                "json_path": present_path(Path(inventory_path)),
                "html_path": present_path(Path(page["html_path"])) if page.get("html_path") else None,
            }
        )

    return {
        "status": "ok",
        "reason": None,
        "manifest": {
            "base_url": manifest.get("base_url"),
            "generated_at": manifest.get("generated_at"),
            "page_count": manifest.get("page_count"),
        },
        "pages": pages,
    }


def load_db_observation(table: str) -> dict[str, Any]:
    command = run_command(
        [
            "php",
            str(ROOT / "scripts/dump_db_table_observation.php"),
            f"--table={table}",
        ]
    )
    if command.returncode != 0:
        return {
            "status": "blocked",
            "reason": "dump_db_table_observation.php 실행에 실패했습니다.",
            "stdout": command.stdout,
            "stderr": command.stderr,
        }
    return json.loads(command.stdout)


def load_live_db_observation(table: str, live_base_url: str, inspect_secret: str, sample_limit: int = 1) -> dict[str, Any]:
    command = run_command(
        [
            "bash",
            str(ROOT / "scripts/fetch_live_admin_db_table.sh"),
            live_base_url,
            table,
            inspect_secret,
            str(sample_limit),
        ]
    )
    if command.returncode != 0:
        return {
            "status": "blocked",
            "reason": "fetch_live_admin_db_table.sh 실행에 실패했습니다.",
            "stdout": command.stdout,
            "stderr": command.stderr,
        }
    return json.loads(command.stdout)


def sanitize_db_observation(observation: dict[str, Any]) -> dict[str, Any]:
    sanitized = dict(observation)
    sample_rows = sanitized.pop("sample_rows", None)
    if isinstance(sample_rows, list):
        sanitized["sample_row_field_names"] = sorted(
            {
                key
                for row in sample_rows
                if isinstance(row, dict)
                for key in row.keys()
            }
        )
    return sanitized


def build_report(
    domain: str,
    base_url: str | None,
    inspect_secret: str | None,
    output_dir: Path,
    live_base_url: str | None = None,
) -> dict[str, Any]:
    config = load_domain_config(domain)
    generated_path = GENERATED_DIR / f"{domain}.json"
    generated = json.loads(generated_path.read_text(encoding="utf-8"))
    legacy_forms = normalize_legacy_forms(config)
    repo_file = ROOT / str(config.get("repo_file", ""))
    repo_field_file = ROOT / str(config.get("repo_field_file", config.get("repo_file", "")))
    db_observation_spec = normalize_db_observation(config)
    db_tables = db_observation_spec["tables"]

    schema_fields = {
        field["name"]
        for section in generated.get("sections", [])
        for field in section.get("fields", [])
        if isinstance(field.get("name"), str)
    }
    update_fields = extract_constant_field_list(repo_field_file, str(config.get("repo_field_const", "UPDATABLE_FIELDS")))
    rendered_inventory = load_rendered_inventory(domain, legacy_forms, base_url, inspect_secret, output_dir)
    db_doc_observations = [extract_ddl_columns(table) for table in db_tables]
    db_live_observations = [
        sanitize_db_observation(
            load_live_db_observation(table, live_base_url, inspect_secret)
            if live_base_url and inspect_secret
            else load_db_observation(table)
        )
        for table in db_tables
    ]

    source_candidates = [ROOT / normalize_source_file_path(path) for path in legacy_forms]
    source_candidates.extend(path for path in [repo_file, repo_field_file] if path.is_file())
    source_candidates = list(dict.fromkeys(source_candidates))

    php_rule_observations = [
        {
            "source": present_path(path),
            **extract_update_rules(path, schema_fields),
        }
        for path in source_candidates
    ]

    blocked_items: list[dict[str, str]] = []
    if rendered_inventory["status"] != "ok":
        blocked_items.append(
            {
                "area": "legacy_html",
                "reason": str(rendered_inventory.get("reason")),
                "next_input": "로컬 관리자 베이스 URL (--base-url) 또는 미리 수집한 inventory json",
                "workaround": "PHP source + generated schema + DDL 문서 기준으로만 관찰 리포트를 생성합니다.",
            }
        )
    if not db_tables and db_observation_spec["mode"] != "none":
        blocked_items.append(
            {
                "area": "db_live",
                "reason": "db_observation.tables 또는 table 설정이 없습니다.",
                "next_input": "단일 table 또는 다중 table 관찰 명세",
                "workaround": "legacy HTML + PHP source + generated schema 기준으로만 관찰 리포트를 생성합니다.",
            }
        )
    elif any(item.get("status") != "ok" for item in db_live_observations):
        blocked_items.append(
            {
                "area": "db_live",
                "reason": "; ".join(
                    f"{item.get('table')}: {item.get('reason')}"
                    for item in db_live_observations
                    if item.get("status") != "ok"
                ),
                "next_input": "live inspect secret 이 있는 staging api 또는 .env 가 있는 REST API 실행 환경",
                "workaround": "docs/ddls/*.md 의 정적 DDL 과 schema generated 파일로만 비교합니다.",
            }
        )

    return {
        "domain": domain,
        "generated_at": generated.get("generated_at"),
        "legacy_forms": legacy_forms,
        "schema_summary": {
            "field_count": generated.get("field_count"),
            "section_count": generated.get("section_count"),
            "layout": generated.get("layout"),
            "generated_path": present_path(generated_path),
            "updatable_field_count": len(update_fields),
        },
        "provider_sources": {
            "repo_file": present_path(repo_file) if repo_file.is_file() else None,
            "repo_field_file": present_path(repo_field_file) if repo_field_file.is_file() else None,
            "table": db_tables[0] if len(db_tables) == 1 else None,
            "tables": db_tables,
            "db_observation_mode": db_observation_spec["mode"],
        },
        "legacy_html_observation": rendered_inventory,
        "php_source_observation": {
            "update_fields": update_fields,
            "rule_reports": php_rule_observations,
        },
        "db_observation": {
            "mode": db_observation_spec["mode"],
            "tables": db_tables,
            "ddl_docs": db_doc_observations,
            "live_db_tables": db_live_observations,
        },
        "observation_notes": [
            "확정(contract)과 관찰(observation)을 분리합니다. generated schema 는 계약 산출물이며, legacy_html/php_source/db 는 공급자 관찰 산출물입니다.",
            "실제 관리자 HTML inventory 는 helper 함수가 만든 최종 렌더 결과를 기준으로 합니다.",
            "DB live introspection 이 막히면 docs/ddls/*.md 를 임시 기준으로 사용하되 blocked 로 남깁니다.",
        ],
        "blocked_items": blocked_items,
    }


def build_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# {report['domain']} Source Observation Report",
        "",
        "## 1. Summary",
        f"- domain: `{report['domain']}`",
        f"- generated_at: `{report.get('generated_at')}`",
        f"- field_count: `{report['schema_summary'].get('field_count')}`",
        f"- section_count: `{report['schema_summary'].get('section_count')}`",
        "",
        "## 2. Provider Sources",
        f"- legacy_forms: {', '.join(report.get('legacy_forms', [])) or '-'}",
        f"- repo_file: `{report['provider_sources'].get('repo_file')}`",
        f"- repo_field_file: `{report['provider_sources'].get('repo_field_file')}`",
        f"- db_observation_mode: `{report['provider_sources'].get('db_observation_mode')}`",
        f"- tables: `{', '.join(report['provider_sources'].get('tables') or []) or '-'}`",
        "",
        "## 3. Legacy HTML Observation",
        f"- status: `{report['legacy_html_observation'].get('status')}`",
    ]

    if report["legacy_html_observation"].get("status") == "ok":
        for page in report["legacy_html_observation"].get("pages", []):
            lines.append(
                f"- `{page.get('path')}`: fields={page.get('field_count')} sections={page.get('section_count')} json={page.get('json_path')}"
            )
    else:
        lines.append(f"- blocked_reason: {report['legacy_html_observation'].get('reason')}")

    lines.extend(
        [
            "",
            "## 4. PHP Source Observation",
            f"- update_fields: `{report['php_source_observation'].get('update_fields') and len(report['php_source_observation']['update_fields'])}`",
        ]
    )
    for rule_report in report["php_source_observation"].get("rule_reports", []):
        lines.append(f"- `{rule_report.get('source')}`: mentioned_fields={len(rule_report.get('mentioned_fields', []))} validation_snippets={len(rule_report.get('validation_snippets', []))}")

    ddl_docs = report["db_observation"]["ddl_docs"]
    live_db_tables = report["db_observation"]["live_db_tables"]
    lines.extend(
        [
            "",
            "## 5. DB Observation",
            f"- mode: `{report['db_observation'].get('mode')}`",
        ]
    )
    for ddl_doc in ddl_docs:
        lines.append(
            f"- ddl_doc `{ddl_doc.get('source') or ddl_doc.get('table') or '-'}`: status=`{ddl_doc.get('status')}` columns=`{len(ddl_doc.get('columns') or [])}`"
        )
    for live_db in live_db_tables:
        lines.append(
            f"- live_db `{live_db.get('table') or '-'}`: status=`{live_db.get('status')}` columns=`{len(live_db.get('columns') or [])}`"
        )

    lines.extend(["", "## 6. Blocked Items"])
    if report.get("blocked_items"):
        for item in report["blocked_items"]:
            lines.append(f"- `{item['area']}`: {item['reason']}")
            lines.append(f"  next_input: {item['next_input']}")
            lines.append(f"  workaround: {item['workaround']}")
    else:
        lines.append("- none")

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--base-url")
    parser.add_argument("--inspect-secret")
    parser.add_argument("--live-base-url")
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    output_dir = Path(args.output_dir or (ROOT / "output/admin-domain-pipeline" / args.domain))
    output_dir.mkdir(parents=True, exist_ok=True)

    report = build_report(args.domain, args.base_url, args.inspect_secret, output_dir, args.live_base_url)
    (output_dir / "source-observation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "source-observation.md").write_text(
        build_markdown(report),
        encoding="utf-8",
    )
    print(str(output_dir / "source-observation.json"))


if __name__ == "__main__":
    main()
