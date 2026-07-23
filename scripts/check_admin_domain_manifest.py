#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DOMAINS_PATH = ROOT / "api/v1/Admin/Schema/schema-domains.json"
GENERATED_DIR = ROOT / "api/v1/Admin/Schema/Data/generated"
OUTPUT_DIR = ROOT / "output/admin-domain-pipeline"
EXPECTED_NON_SHOP_DOMAINS = {
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


def load_manifest() -> list[dict[str, Any]]:
    manifest = json.loads(SCHEMA_DOMAINS_PATH.read_text(encoding="utf-8"))
    return manifest.get("domains", manifest)


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


def classify_provider_anchor(config: dict[str, Any]) -> dict[str, Any]:
    repo_file = str(config.get("repo_file", "")).strip()
    repo_field_file = str(config.get("repo_field_file", "")).strip()
    repo_candidates = [
        repo_file,
        repo_field_file,
    ]
    existing_repo_files = [
        str((ROOT / path).relative_to(ROOT))
        for path in repo_candidates
        if path and (ROOT / path).is_file()
    ]
    metadata_backing = any(
        bool(config.get(key))
        for key in ("supported_fields", "include_fields", "field_patterns", "field_overrides")
    )
    status = "pass" if existing_repo_files or metadata_backing else "fail"
    return {
        "status": status,
        "repo_files": existing_repo_files,
        "metadata_backing": metadata_backing,
    }


def summarize_domain(config: dict[str, Any]) -> dict[str, Any]:
    domain = str(config.get("domain") or "").strip()
    title = str(config.get("title") or "").strip()
    legacy_forms = normalize_legacy_forms(config)
    provider_anchor = classify_provider_anchor(config)
    db_observation = normalize_db_observation(config)
    generated_schema_path = GENERATED_DIR / f"{domain}.json"
    statuses = {
        "identity": "pass" if domain and title else "fail",
        "generated_schema": "pass" if generated_schema_path.is_file() else "fail",
        "legacy_forms": "pass" if legacy_forms else "fail",
        "provider_anchor": provider_anchor["status"],
        "db_observation": "pass"
        if db_observation["mode"] == "none" or bool(db_observation["tables"])
        else "fail",
    }
    blocked_items: list[dict[str, str]] = []
    if statuses["generated_schema"] != "pass":
        blocked_items.append(
            {
                "area": "generated_schema",
                "reason": f"generated schema 가 없습니다: {generated_schema_path.relative_to(ROOT)}",
                "next_input": "schema:extract 또는 schema:check 로 generated schema 생성",
            }
        )
    if statuses["legacy_forms"] != "pass":
        blocked_items.append(
            {
                "area": "legacy_forms",
                "reason": "legacy_forms / legacy_form 이 비어 있습니다.",
                "next_input": "staging 에서 실제로 점검할 legacy form path 또는 target 명세",
            }
        )
    if statuses["provider_anchor"] != "pass":
        blocked_items.append(
            {
                "area": "provider_anchor",
                "reason": "repo_file/repo_field_file 또는 supported/include/override 계층이 없습니다.",
                "next_input": "REST provider source 경로 또는 field metadata anchor",
            }
        )
    if statuses["db_observation"] != "pass":
        blocked_items.append(
            {
                "area": "db_observation",
                "reason": "table 또는 db_observation.tables 가 없습니다.",
                "next_input": "단일 table 또는 다중 table 관찰 명세",
            }
        )

    status = "pass" if all(value == "pass" for value in statuses.values()) else "fail"
    return {
        "domain": domain,
        "title": title,
        "status": status,
        "statuses": statuses,
        "legacy_forms": legacy_forms,
        "provider_anchor": provider_anchor,
        "db_observation": db_observation,
        "generated_schema": str(generated_schema_path.relative_to(ROOT)),
        "blocked_items": blocked_items,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Admin Domain Manifest Index",
        "",
        "- purpose: `감사 전에 전 도메인 baseline manifest completeness 를 먼저 점검합니다.`",
        f"- inventory_status: `{report['inventory_status']}`",
        f"- total_domains: `{report['total_domains']}`",
        f"- passed: `{report['counts']['pass']}`",
        f"- failed: `{report['counts']['fail']}`",
        "",
        "## Domains",
    ]
    for failure in report.get("inventory_failures", []):
        lines.append(f"- inventory failure: {failure}")
    for item in report["domains"]:
        lines.append(
            f"- `{item['domain']}`: status=`{item['status']}` "
            f"(identity={item['statuses']['identity']}, "
            f"generated={item['statuses']['generated_schema']}, "
            f"legacy={item['statuses']['legacy_forms']}, "
            f"provider={item['statuses']['provider_anchor']}, "
            f"db={item['statuses']['db_observation']}) "
            f"db_mode=`{item['db_observation']['mode']}` "
            f"tables=`{', '.join(item['db_observation']['tables']) or '-'}`"
        )
        for blocked in item.get("blocked_items", []):
            lines.append(f"  - `{blocked['area']}`: {blocked['reason']}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-shop", action="store_true")
    parser.add_argument("--domains", help="comma separated domain names")
    args = parser.parse_args()

    selected_domains = {
        item.strip()
        for item in (args.domains or "").split(",")
        if item.strip() != ""
    }

    manifest = load_manifest()
    manifest_domain_names = [
        str(item.get("domain") or "").strip()
        for item in manifest
        if str(item.get("domain") or "").strip()
    ]
    inventory_failures: list[str] = []
    if not manifest_domain_names:
        inventory_failures.append("domain manifest scanner returned zero domains")
    if len(manifest_domain_names) != len(set(manifest_domain_names)):
        inventory_failures.append("domain manifest contains duplicate domains")
    if not selected_domains and not args.include_shop:
        actual_non_shop = {
            domain for domain in manifest_domain_names if not domain.startswith("shop-")
        }
        if actual_non_shop != EXPECTED_NON_SHOP_DOMAINS:
            inventory_failures.append(
                "non-shop domain inventory differs from the 17-domain v1 baseline"
            )

    domain_summaries: list[dict[str, Any]] = []
    for item in manifest:
        domain = str(item.get("domain") or "").strip()
        if domain == "":
            continue
        if selected_domains and domain not in selected_domains:
            continue
        if not args.include_shop and domain.startswith("shop-"):
            continue
        domain_summaries.append(summarize_domain(item))

    counts = {
        "pass": sum(1 for item in domain_summaries if item["status"] == "pass"),
        "fail": sum(1 for item in domain_summaries if item["status"] == "fail"),
    }
    report = {
        "inventory_status": "pass" if not inventory_failures else "fail",
        "inventory_failures": inventory_failures,
        "total_domains": len(domain_summaries),
        "counts": counts,
        "domains": domain_summaries,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "manifest-index.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (OUTPUT_DIR / "manifest-index.md").write_text(
        render_markdown(report),
        encoding="utf-8",
    )
    print(str(OUTPUT_DIR / "manifest-index.json"))
    raise SystemExit(0 if counts["fail"] == 0 and not inventory_failures else 1)


if __name__ == "__main__":
    main()
