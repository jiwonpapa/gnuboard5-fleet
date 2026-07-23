#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tomllib

from php_structure_findings import Finding, collect_findings, collect_metrics

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output" / "php-structure-audit"
MARKDOWN_PATH = OUTPUT_DIR / "latest.md"
JSON_PATH = OUTPUT_DIR / "latest.json"
WARNING_BUDGETS_PATH = ROOT / "docs" / "audits" / "WARNING_BUDGETS.toml"
BLOCKERS_PATH = ROOT / "docs" / "audits" / "BLOCKERS.toml"
ROOT_ORCHESTRATORS = (
    "api/routes/v1.php",
    "api/routes/v1/admin.php",
    "api/container.php",
)


def load_warning_budgets() -> list[dict[str, str]]:
    document = tomllib.loads(WARNING_BUDGETS_PATH.read_text(encoding="utf-8"))
    raw = document.get("budgets", [])
    if not isinstance(raw, list):
        return []
    return [entry for entry in raw if isinstance(entry, dict)]


def load_blockers() -> list[dict[str, str]]:
    document = tomllib.loads(BLOCKERS_PATH.read_text(encoding="utf-8"))
    raw = document.get("blockers", [])
    if not isinstance(raw, list):
        return []
    return [entry for entry in raw if isinstance(entry, dict)]


def match_budget(finding: Finding, budgets: list[dict[str, str]]) -> dict[str, str] | None:
    for budget in budgets:
        if (
            str(budget.get("audit", "")).strip() == "structure"
            and str(budget.get("rule", "")).strip() == finding.rule
            and str(budget.get("path", "")).strip() == finding.path
        ):
            return budget
    return None


def render_finding_line(finding: Finding, budget: dict[str, str] | None = None) -> str:
    line = f"- `{finding.rule}` `{finding.path}`: {finding.detail}"
    if budget is None:
        return line
    budget_id = str(budget.get("id", "")).strip()
    expires_on = str(budget.get("expires_on", "")).strip()
    owner = str(budget.get("owner", "")).strip()
    return f"{line} (`budget={budget_id}`, `owner={owner}`, `expires_on={expires_on}`)"


def markdown_list(items: list[str]) -> list[str]:
    return items if items else ["- none"]


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    findings = collect_findings()
    metrics = collect_metrics()
    budgets = load_warning_budgets()
    blockers = load_blockers()

    failures = [finding for finding in findings if finding.severity == "failure"]
    warnings = [finding for finding in findings if finding.severity == "warning"]
    matched_budget_map = {
        f"{finding.rule}::{finding.path}": match_budget(finding, budgets) for finding in warnings
    }
    budgeted_warnings = [
        finding for finding in warnings if matched_budget_map[f"{finding.rule}::{finding.path}"] is not None
    ]
    unbudgeted_warnings = [
        finding for finding in warnings if matched_budget_map[f"{finding.rule}::{finding.path}"] is None
    ]

    notes = [
        f"top_service_repository `{item['path']}` `{item['lines']} LOC`"
        for item in metrics["top_service_repository"][:10]
    ]
    notes.append(
        "thresholds root_warning=220 root_failure=320 service_repo_warning=320 service_repo_failure=480"
    )

    evidence = [
        "root_orchestrators: "
        + ", ".join(f"`{path}`" for path in ROOT_ORCHESTRATORS),
        f"scan_root: `api/v1`",
        f"service_repository_count={metrics['service_repository_count']}",
        f"integration_contract_reference_files={metrics['integration_contract_reference_count']}",
        f"gateway_usage_rule_registry=`{metrics['gateway_rule_registry']}`",
        f"gateway_usage_rule_registry_available={metrics['gateway_rule_registry_available']}",
        f"local_only_gateway_rules={metrics['local_only_rule_count']}",
        f"shared_inventory_gateway_rules={metrics['shared_inventory_rule_count']}",
        f"warning_budget_registry=`{WARNING_BUDGETS_PATH.relative_to(ROOT).as_posix()}`",
        f"blocker_registry=`{BLOCKERS_PATH.relative_to(ROOT).as_posix()}`",
        f"generated_report_md=`{MARKDOWN_PATH.relative_to(ROOT).as_posix()}`",
        f"generated_report_json=`{JSON_PATH.relative_to(ROOT).as_posix()}`",
    ]

    payload = {
        "generated_at": generated_at,
        "status": "failed" if failures or unbudgeted_warnings else "passed",
        "summary": {
            "failures": len(failures),
            "warnings": len(warnings),
            "budgeted_warnings": len(budgeted_warnings),
            "unbudgeted_warnings": len(unbudgeted_warnings),
            "notes": len(notes),
            "evidence": len(evidence),
            "active_warning_budgets": len(budgets),
            "active_blockers": len(blockers),
            "service_repository_files": metrics["service_repository_count"],
            "integration_contract_reference_files": metrics["integration_contract_reference_count"],
        },
        "failures": [
            {
                "rule": finding.rule,
                "path": finding.path,
                "detail": finding.detail,
            }
            for finding in failures
        ],
        "warnings": [
            {
                "rule": finding.rule,
                "path": finding.path,
                "detail": finding.detail,
                "budget": matched_budget_map[f"{finding.rule}::{finding.path}"],
            }
            for finding in warnings
        ],
        "notes": notes,
        "evidence": evidence,
        "active_warning_budgets": budgets,
        "blocked_backlog": blockers,
    }

    markdown_lines = [
        "# PHP Structure Audit",
        "",
        f"- generated_at: `{generated_at}`",
        f"- status: `{payload['status']}`",
        f"- failures: `{len(failures)}`",
        f"- warnings: `{len(warnings)}`",
        f"- budgeted_warnings: `{len(budgeted_warnings)}`",
        f"- unbudgeted_warnings: `{len(unbudgeted_warnings)}`",
        f"- active_warning_budgets: `{len(budgets)}`",
        f"- active_blockers: `{len(blockers)}`",
        "",
        "## Failures",
        *markdown_list(
            [render_finding_line(finding) for finding in failures]
        ),
        "",
        "## Warnings",
        *markdown_list(
            [
                render_finding_line(
                    finding,
                    matched_budget_map[f"{finding.rule}::{finding.path}"],
                )
                for finding in warnings
            ]
        ),
        "",
        "## Budgeted Warnings",
        *markdown_list(
            [
                render_finding_line(
                    finding,
                    matched_budget_map[f"{finding.rule}::{finding.path}"],
                )
                for finding in budgeted_warnings
            ]
        ),
        "",
        "## Unbudgeted Warnings",
        *markdown_list(
            [render_finding_line(finding) for finding in unbudgeted_warnings]
        ),
        "",
        "## Notes",
        *markdown_list([f"- {note}" for note in notes]),
        "",
        "## Evidence",
        *markdown_list([f"- {item}" for item in evidence]),
        "",
        "## Active Warning Budgets",
        *markdown_list(
            [
                (
                    f"- `{budget['id']}` `{budget['rule']}` `{budget['path']}` "
                    f"owner=`{budget['owner']}` expires=`{budget['expires_on']}`"
                )
                for budget in budgets
            ]
        ),
        "",
        "## Blocked",
        *markdown_list(
            [
                (
                    f"- `{blocker['id']}` owner=`{blocker['owner']}` "
                    f"upstream=`{blocker['upstream']}`: {blocker['summary']}"
                )
                for blocker in blockers
            ]
        ),
        "",
    ]

    MARKDOWN_PATH.write_text("\n".join(markdown_lines), encoding="utf-8")
    JSON_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("[php_structure_report]")
    print(f"markdown={MARKDOWN_PATH.relative_to(ROOT).as_posix()}")
    print(f"json={JSON_PATH.relative_to(ROOT).as_posix()}")
    print(f"status={payload['status']}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"budgeted_warnings={len(budgeted_warnings)}")
    print(f"unbudgeted_warnings={len(unbudgeted_warnings)}")
    print(f"active_warning_budgets={len(budgets)}")
    print(f"active_blockers={len(blockers)}")
    print("PASS: generated php structure audit report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
