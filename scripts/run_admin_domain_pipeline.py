#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "api/v1/Admin/Schema/Data/generated"
SCHEMA_DOMAINS_PATH = ROOT / "api/v1/Admin/Schema/schema-domains.json"


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(ROOT),
        text=True,
        capture_output=True,
        check=False,
    )


def sanitize_command(args: list[str], inspect_secret: str | None) -> str:
    sanitized: list[str] = []
    secret = inspect_secret or ""
    for arg in args:
        if secret and arg == secret:
            sanitized.append("$ADMIN_SCHEMA_INSPECT_SECRET")
            continue
        if arg.startswith("--inspect-secret="):
            sanitized.append("--inspect-secret=$ADMIN_SCHEMA_INSPECT_SECRET")
            continue
        sanitized.append(arg)
    return " ".join(sanitized)


def redact_text(value: str, inspect_secret: str | None) -> str:
    if not inspect_secret:
        return value
    return value.replace(inspect_secret, "$ADMIN_SCHEMA_INSPECT_SECRET")


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def validate_playwright_manifest(
    manifest_path: Path,
    *,
    domain: str,
    audit_run_id: str | None,
    expected_targets: list[str],
) -> list[str]:
    failures: list[str] = []
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"Playwright manifest parse failure: {error}"]
    if not isinstance(payload, dict):
        return ["Playwright manifest root must be an object"]
    if payload.get("domain") != domain:
        failures.append("Playwright manifest domain mismatch")
    if payload.get("audit_run_id") != audit_run_id:
        failures.append("Playwright manifest audit_run_id mismatch")
    pages = payload.get("pages")
    if not isinstance(pages, list) or payload.get("page_count") != len(pages):
        failures.append("Playwright manifest page_count/pages mismatch")
        pages = []
    actual_targets = [
        str(page.get("target") or "") for page in pages if isinstance(page, dict)
    ]
    if actual_targets != expected_targets:
        failures.append("Playwright manifest target inventory/order mismatch")
    for page in pages:
        if not isinstance(page, dict):
            failures.append("Playwright manifest page entry must be an object")
            continue
        target = str(page.get("target") or "")
        if page.get("status") != "pass":
            failures.append(f"Playwright page did not pass: {target}")
        if page.get("evidence_failures") not in ([], None):
            failures.append(f"Playwright page contains evidence failures: {target}")
        final_url = page.get("final_url")
        expected_path = "/" + target.lstrip("/")
        if not isinstance(final_url, str) or (
            urlparse(final_url).path.rstrip("/") != expected_path.rstrip("/")
        ):
            failures.append(f"Playwright final URL mismatch: {target}")
        artifacts = page.get("artifacts")
        if not isinstance(artifacts, dict):
            failures.append(f"Playwright artifact map missing: {target}")
            continue
        for artifact_name in ("snapshot", "console", "network"):
            raw_path = artifacts.get(artifact_name)
            artifact_path = (
                Path(raw_path)
                if isinstance(raw_path, str) and Path(raw_path).is_absolute()
                else ROOT / raw_path
                if isinstance(raw_path, str) and raw_path
                else None
            )
            if (
                artifact_path is None
                or not artifact_path.is_file()
                or artifact_path.stat().st_size == 0
            ):
                failures.append(
                    f"Playwright {artifact_name} artifact missing/empty: {target}"
                )
    if payload.get("status") != "pass" or failures:
        if payload.get("status") != "pass":
            failures.append("Playwright manifest status is not pass")
    return failures


def load_domain_config(domain: str) -> dict[str, Any]:
    manifest = json.loads(SCHEMA_DOMAINS_PATH.read_text(encoding="utf-8"))
    for item in manifest.get("domains", []):
        if item.get("domain") == domain:
            return item
    raise SystemExit(f"schema-domains.json 에 domain={domain} 이 없습니다.")


def resolve_target_placeholders(target: str) -> str:
    bootstrap_admin_id = os.getenv("ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID", "neojins").strip() or "neojins"
    return target.replace("{bootstrap_admin_id}", bootstrap_admin_id)


def normalize_legacy_forms(config: dict[str, Any]) -> list[str]:
    forms = config.get("legacy_forms")
    normalized: list[str] = []
    if isinstance(forms, list):
        for item in forms:
            if isinstance(item, str) and item.strip():
                normalized.append(resolve_target_placeholders(item.strip()))
            elif isinstance(item, dict):
                target = item.get("target") or item.get("path")
                if isinstance(target, str) and target.strip():
                    normalized.append(resolve_target_placeholders(target.strip()))
    elif isinstance(config.get("legacy_form"), str) and config["legacy_form"].strip():
        normalized.append(resolve_target_placeholders(config["legacy_form"].strip()))
    return normalized


def load_schema_fields(schema: dict[str, Any]) -> dict[str, dict[str, Any]]:
    fields: dict[str, dict[str, Any]] = {}
    for section in schema.get("sections", []):
        section_key = section.get("key")
        for field in section.get("fields", []):
            name = field.get("name")
            if not isinstance(name, str) or not name:
                continue
            fields[name] = {
                "section_key": section_key,
                "input_type": field.get("input_type"),
                "data_type": field.get("data_type"),
                "required": bool(field.get("required", False)),
                "readonly_on_update": bool(field.get("readonly_on_update", False)),
                "option_count": len(field.get("options") or []),
                "label": field.get("label"),
            }
    return fields


def unwrap_live_schema_payload(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("sections"), list):
        return data
    return payload


def compare_schema_contract(
    local_schema: dict[str, Any],
    live_schema: dict[str, Any],
    runtime_option_fields: set[str] | None = None,
) -> dict[str, Any]:
    local_fields = load_schema_fields(local_schema)
    live_fields = load_schema_fields(live_schema)
    runtime_option_fields = runtime_option_fields or set()

    local_only = sorted(set(local_fields) - set(live_fields))
    live_only = sorted(set(live_fields) - set(local_fields))
    mismatches: list[dict[str, Any]] = []
    ignored_runtime_option_mismatches: list[dict[str, Any]] = []

    for name in sorted(set(local_fields) & set(live_fields)):
        local = local_fields[name]
        live = live_fields[name]
        diff_keys = ["section_key", "input_type", "data_type", "required", "readonly_on_update", "option_count", "label"]
        if name in runtime_option_fields:
            diff_keys = [key for key in diff_keys if key != "option_count"]
        field_diff = {
            key: {"local": local[key], "live": live[key]}
            for key in diff_keys
            if local[key] != live[key]
        }
        if field_diff:
            mismatches.append({"field": name, "diff": field_diff})
            continue
        if name in runtime_option_fields and local["option_count"] != live["option_count"]:
            ignored_runtime_option_mismatches.append(
                {
                    "field": name,
                    "reason": "runtime_option_field",
                    "local_option_count": local["option_count"],
                    "live_option_count": live["option_count"],
                }
            )

    status = "pass" if not local_only and not live_only and not mismatches else "fail"
    return {
        "status": status,
        "local_only_fields": local_only,
        "live_only_fields": live_only,
        "field_mismatches": mismatches,
        "ignored_runtime_option_mismatches": ignored_runtime_option_mismatches,
    }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        f"# {summary['domain']} Domain Pipeline Report",
        "",
        "## 1. Status",
        f"- playwright_smoke: `{summary['playwright_smoke']['status']}`",
        f"- schema_check: `{summary['schema_check']['status']}`",
        f"- source_observation: `{summary['source_observation']['status']}`",
        f"- legacy_vs_contract: `{summary['legacy_vs_contract']['status']}`",
        f"- contract_vs_live: `{summary['contract_vs_live']['status']}`",
        "",
        "## 2. Commands",
        f"- playwright smoke: `{summary['commands']['playwright_smoke']}`",
        f"- source observation: `{summary['commands']['source_observation']}`",
        f"- schema check: `{summary['commands']['schema_check']}`",
        f"- legacy parity: `{summary['commands']['legacy_vs_contract']}`",
        f"- live fetch: `{summary['commands']['live_fetch']}`",
        "",
        "## 3. Outputs",
        f"- playwright smoke: `{summary['artifacts']['playwright_smoke_manifest']}`",
        f"- source observation: `{summary['artifacts']['source_observation_json']}`",
        f"- legacy parity: `{summary['artifacts']['legacy_vs_contract_json']}`",
        f"- live schema: `{summary['artifacts']['live_schema_json']}`",
        f"- contract vs live: `{summary['artifacts']['contract_vs_live_json']}`",
        "",
        "## 4. Blocked",
    ]

    blocked = summary.get("blocked_items", [])
    if blocked:
        for item in blocked:
            lines.append(f"- `{item['area']}`: {item['reason']}")
            lines.append(f"  next_input: {item['next_input']}")
            lines.append(f"  workaround: {item['workaround']}")
    else:
        lines.append("- none")

    return "\n".join(lines) + "\n"


def summary_exit_code(summary: dict[str, Any]) -> int:
    stages = (
        "playwright_smoke",
        "schema_check",
        "source_observation",
        "legacy_vs_contract",
        "contract_vs_live",
    )
    if summary.get("blocked_items"):
        return 1
    if any(
        not isinstance(summary.get(stage), dict)
        or summary[stage].get("status") != "pass"
        for stage in stages
    ):
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--base-url")
    parser.add_argument("--live-base-url")
    parser.add_argument("--inspect-secret")
    parser.add_argument("--output-dir")
    parser.add_argument("--audit-run-id")
    parser.add_argument("--strict-choice-options", action="store_true")
    parser.add_argument("--playwright-smoke", action="store_true")
    args = parser.parse_args()
    audit_run_id = args.audit_run_id or uuid.uuid4().hex
    inspect_secret = (
        args.inspect_secret or os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "")
    ).strip()
    domain_config = load_domain_config(args.domain)
    runtime_option_fields = {
        str(field).strip()
        for field in domain_config.get("runtime_option_fields", [])
        if str(field).strip()
    }

    output_dir = Path(args.output_dir or (ROOT / "output/admin-domain-pipeline" / args.domain))
    output_dir.mkdir(parents=True, exist_ok=True)

    source_observation_json = output_dir / "source-observation.json"
    legacy_vs_contract_json = output_dir / "legacy-vs-contract.json"
    live_schema_json = output_dir / "live-schema.json"
    contract_vs_live_json = output_dir / "contract-vs-live.json"
    playwright_smoke_output = output_dir / "playwright"
    playwright_smoke_manifest = playwright_smoke_output / "manifest.json"
    summary_json = output_dir / "pipeline-summary.json"
    summary_md = output_dir / "pipeline-summary.md"

    blocked_items: list[dict[str, str]] = []

    legacy_forms = normalize_legacy_forms(domain_config)
    playwright_smoke_cmd = None
    playwright_smoke_status = "blocked"
    playwright_smoke_errors: list[str] = []
    if args.playwright_smoke:
        if args.base_url and inspect_secret and legacy_forms:
            playwright_smoke_cmd = [
                "python3",
                str(ROOT / "scripts/run_admin_domain_playwright_smoke.py"),
                f"--domain={args.domain}",
                f"--base-url={args.base_url}",
                f"--inspect-secret={inspect_secret}",
                f"--output-dir={playwright_smoke_output}",
                f"--audit-run-id={audit_run_id}",
            ]
            for target in legacy_forms:
                playwright_smoke_cmd.append(f"--target={target}")
            playwright_smoke = run_command(playwright_smoke_cmd)
            if playwright_smoke.returncode == 0 and playwright_smoke_manifest.is_file():
                playwright_smoke_errors = validate_playwright_manifest(
                    playwright_smoke_manifest,
                    domain=args.domain,
                    audit_run_id=audit_run_id,
                    expected_targets=["/" + target.lstrip("/") for target in legacy_forms],
                )
            if (
                playwright_smoke.returncode == 0
                and playwright_smoke_manifest.is_file()
                and not playwright_smoke_errors
            ):
                playwright_smoke_status = "pass"
            else:
                playwright_smoke_status = "fail"
        else:
            blocked_items.append(
                {
                    "area": "playwright_smoke",
                    "reason": "Playwright smoke 는 --base-url, --inspect-secret, legacy_forms 가 필요합니다.",
                    "next_input": "staging 관리자 URL, inspect secret, manifest legacy_forms",
                    "workaround": "curl 기반 legacy parity 와 live inspect 로 나머지 파이프라인은 계속 실행합니다.",
                }
            )
    else:
        blocked_items.append(
            {
                "area": "playwright_smoke",
                "reason": "--playwright-smoke 옵션이 없어 브라우저 smoke 를 실행하지 않았습니다.",
                "next_input": "--playwright-smoke",
                "workaround": "Playwright 없이도 provider diff 자체는 계산됩니다.",
            }
        )

    source_observation_cmd = [
        "python3",
        str(ROOT / "scripts/build_admin_domain_observation.py"),
        f"--domain={args.domain}",
        f"--output-dir={output_dir}",
    ]
    if args.base_url:
        source_observation_cmd.append(f"--base-url={args.base_url}")
    if args.live_base_url:
        source_observation_cmd.append(f"--live-base-url={args.live_base_url}")
    if inspect_secret:
        source_observation_cmd.append(f"--inspect-secret={inspect_secret}")
    source_observation = run_command(source_observation_cmd)
    source_observation_status = "pass" if source_observation.returncode == 0 else "fail"

    schema_check_cmd = [
        "python3",
        str(ROOT / "scripts/extract_admin_schema.py"),
        f"--domain={args.domain}",
        "--mode=check",
    ]
    schema_check = run_command(schema_check_cmd)
    schema_check_status = "pass" if schema_check.returncode == 0 else "fail"

    legacy_cmd = [
        "php",
        str(ROOT / "scripts/check_legacy_schema_parity.php"),
        f"--domain={args.domain}",
        f"--output-json={legacy_vs_contract_json}",
    ]
    if args.strict_choice_options:
        legacy_cmd.append("--strict-choice-options")

    legacy_status = "blocked"
    if args.base_url:
        if inspect_secret:
            legacy_cmd.append(f"--inspect-secret={inspect_secret}")
        legacy_cmd.append(f"--base-url={args.base_url}")
        legacy_result = run_command(legacy_cmd)
        legacy_status = "pass" if legacy_result.returncode == 0 else "fail"
    else:
        legacy_result = None
        blocked_items.append(
            {
                "area": "legacy_vs_contract",
                "reason": "--base-url 이 없어 실제 렌더 HTML parity 를 수행하지 못했습니다.",
                "next_input": "로컬 관리자 베이스 URL (--base-url)",
                "workaround": "source observation 과 schema check 만 먼저 실행합니다.",
            }
        )

    contract_vs_live_status = "blocked"
    live_fetch_cmd = None
    if args.live_base_url:
        if inspect_secret:
            live_fetch_cmd = [
                str(ROOT / "scripts/fetch_live_admin_schema.sh"),
                args.live_base_url,
                args.domain,
                inspect_secret,
                str(live_schema_json),
            ]
            live_fetch = run_command(live_fetch_cmd)
            if live_fetch.returncode == 0 and live_schema_json.is_file():
                local_schema = json.loads((GENERATED_DIR / f"{args.domain}.json").read_text(encoding="utf-8"))
                live_schema = unwrap_live_schema_payload(
                    json.loads(live_schema_json.read_text(encoding="utf-8"))
                )
                contract_vs_live = compare_schema_contract(
                    local_schema,
                    live_schema,
                    runtime_option_fields=runtime_option_fields,
                )
                contract_vs_live_json.write_text(
                    json.dumps(contract_vs_live, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                contract_vs_live_status = contract_vs_live["status"]
            else:
                contract_vs_live_status = "fail"
        else:
            blocked_items.append(
                {
                    "area": "contract_vs_live",
                    "reason": "ADMIN_SCHEMA_INSPECT_SECRET 또는 --inspect-secret 이 없습니다.",
                    "next_input": "live 서버 inspect secret",
                    "workaround": "local generated schema 기준으로만 consumer 검증을 계속 진행합니다.",
                }
            )
    else:
        blocked_items.append(
            {
                "area": "contract_vs_live",
                "reason": "--live-base-url 이 없어 live REST 응답과 계약 diff 를 수행하지 못했습니다.",
                "next_input": "live api base url (--live-base-url)",
                "workaround": "local generated schema 기준으로만 consumer 검증을 계속 진행합니다.",
            }
        )

    source_observation_report = {}
    if source_observation_json.is_file():
        source_observation_report = json.loads(source_observation_json.read_text(encoding="utf-8"))
        blocked_items.extend(source_observation_report.get("blocked_items", []))

    summary = {
        "audit_run_id": audit_run_id,
        "domain": args.domain,
        "commands": {
            "playwright_smoke": sanitize_command(playwright_smoke_cmd, inspect_secret) if playwright_smoke_cmd else None,
            "source_observation": sanitize_command(source_observation_cmd, inspect_secret),
            "schema_check": sanitize_command(schema_check_cmd, inspect_secret),
            "legacy_vs_contract": sanitize_command(legacy_cmd, inspect_secret),
            "live_fetch": sanitize_command(live_fetch_cmd, inspect_secret) if live_fetch_cmd else None,
        },
        "artifacts": {
            "playwright_smoke_manifest": display_path(playwright_smoke_manifest),
            "source_observation_json": display_path(source_observation_json),
            "legacy_vs_contract_json": display_path(legacy_vs_contract_json),
            "live_schema_json": display_path(live_schema_json),
            "contract_vs_live_json": display_path(contract_vs_live_json),
        },
        "playwright_smoke": {
            "status": playwright_smoke_status,
            "evidence_failures": playwright_smoke_errors,
        },
        "schema_check": {
            "status": schema_check_status,
            "stdout": redact_text(schema_check.stdout, inspect_secret),
            "stderr": redact_text(schema_check.stderr, inspect_secret),
        },
        "source_observation": {
            "status": source_observation_status,
            "stdout": redact_text(source_observation.stdout, inspect_secret),
            "stderr": redact_text(source_observation.stderr, inspect_secret),
        },
        "legacy_vs_contract": {
            "status": legacy_status,
            "stdout": redact_text(legacy_result.stdout, inspect_secret) if legacy_result else "",
            "stderr": redact_text(legacy_result.stderr, inspect_secret) if legacy_result else "",
        },
        "contract_vs_live": {
            "status": contract_vs_live_status,
        },
        "blocked_items": blocked_items,
    }

    summary_json.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    summary_md.write_text(render_markdown(summary), encoding="utf-8")
    print(str(summary_json))
    raise SystemExit(summary_exit_code(summary))


if __name__ == "__main__":
    main()
