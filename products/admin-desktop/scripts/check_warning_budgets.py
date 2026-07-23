#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import os

from audit_warning_budgets import (
    BUDGET_REGISTRY,
    REQUIRED_BUDGET_FIELDS,
    SUPPORTED_AUDITS,
    WarningBudget,
    budget_matches,
    load_registry_document,
)
from audit_waivers import find_matching_waiver, load_waivers
from check_active_crate_boundaries import Finding, collect_findings


EXPIRING_SOON_DAYS = 7


@dataclass(frozen=True)
class AuditIssue:
    severity: str
    detail: str


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def render_markdown_summary(
    *,
    failures: list[AuditIssue],
    warnings: list[AuditIssue],
    notes: list[str],
    active_budgets: int,
) -> str:
    lines = [
        "## Structure Audit Warning Budgets",
        "",
        "### Failure",
    ]
    if failures:
        for issue in failures:
            lines.append(f"- {issue.detail}")
    else:
        lines.append("- none")

    lines.extend(["", "### Warning"])
    if warnings:
        for issue in warnings:
            lines.append(f"- {issue.detail}")
    else:
        lines.append("- none")

    lines.extend(["", "### Note"])
    if notes:
        for note in notes:
            lines.append(f"- {note}")
    else:
        lines.append("- none")

    lines.extend(
        [
            "",
            "### Evidence",
            f"- registry: `{BUDGET_REGISTRY.relative_to(BUDGET_REGISTRY.parents[1])}`",
            f"- active_budgets: `{active_budgets}`",
            f"- failure_count: `{len(failures)}`",
            f"- warning_count: `{len(warnings)}`",
            f"- note_count: `{len(notes)}`",
        ]
    )
    return "\n".join(lines) + "\n"


def append_step_summary(markdown: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(markdown)
        if not markdown.endswith("\n"):
            handle.write("\n")


def active_structure_warnings() -> list[Finding]:
    waivers = load_waivers()
    warnings: list[Finding] = []
    for finding in collect_findings():
        if finding.severity != "warning":
            continue
        waiver = find_matching_waiver(
            waivers,
            audit="structure",
            severity="warning",
            rule=finding.rule,
            path=finding.path,
        )
        if waiver is None:
            warnings.append(finding)
    return warnings


def parse_budgets() -> tuple[list[WarningBudget], list[AuditIssue], list[AuditIssue], list[str]]:
    today = date.today()
    failures: list[AuditIssue] = []
    warnings: list[AuditIssue] = []
    notes: list[str] = []

    document = load_registry_document()
    version = document.get("version")
    if version != 1:
        failures.append(
            AuditIssue(
                severity="failure",
                detail=f"registry version must be 1 (got {version!r})",
            )
        )

    raw_budgets = document.get("budgets", [])
    if not isinstance(raw_budgets, list):
        failures.append(
            AuditIssue(
                severity="failure",
                detail="top-level `budgets` must be an array of tables",
            )
        )
        return [], failures, warnings, notes

    budgets: list[WarningBudget] = []
    seen_ids: set[str] = set()
    seen_targets: set[tuple[str, str, str]] = set()
    for index, raw in enumerate(raw_budgets, start=1):
        prefix = f"budget[{index}]"
        if not isinstance(raw, dict):
            failures.append(AuditIssue("failure", f"{prefix} must be a table"))
            continue

        missing = [
            field
            for field in REQUIRED_BUDGET_FIELDS
            if not isinstance(raw.get(field), str) or not str(raw.get(field)).strip()
        ]
        if missing:
            failures.append(
                AuditIssue("failure", f"{prefix} missing required fields: {', '.join(missing)}")
            )
            continue

        budget = WarningBudget(
            id=str(raw["id"]).strip(),
            audit=str(raw["audit"]).strip(),
            rule=str(raw["rule"]).strip(),
            path=str(raw["path"]).strip(),
            owner=str(raw["owner"]).strip(),
            reason=str(raw["reason"]).strip(),
            introduced_on=str(raw["introduced_on"]).strip(),
            expires_on=str(raw["expires_on"]).strip(),
            removal_criteria=str(raw["removal_criteria"]).strip(),
        )

        if budget.id in seen_ids:
            failures.append(
                AuditIssue("failure", f"{prefix} duplicates budget id `{budget.id}`")
            )
            continue
        seen_ids.add(budget.id)

        if budget.audit not in SUPPORTED_AUDITS:
            failures.append(
                AuditIssue(
                    "failure",
                    f"{prefix} has unsupported audit `{budget.audit}`; supported: {', '.join(sorted(SUPPORTED_AUDITS))}",
                )
            )
            continue

        try:
            introduced = budget.introduced_date()
            expires = budget.expires_date()
        except ValueError:
            failures.append(
                AuditIssue("failure", f"{prefix} date must use YYYY-MM-DD")
            )
            continue

        if introduced > expires:
            failures.append(
                AuditIssue("failure", f"{prefix} introduced_on is after expires_on")
            )
            continue

        target_key = (budget.audit, budget.rule, budget.path)
        if target_key in seen_targets:
            failures.append(
                AuditIssue(
                    "failure",
                    f"{prefix} duplicates target {budget.audit}/{budget.rule}/{budget.path}",
                )
            )
            continue
        seen_targets.add(target_key)

        if expires < today:
            failures.append(
                AuditIssue(
                    "failure",
                    f"{prefix} `{budget.id}` expired on {budget.expires_on}; remove the warning or renew the budget",
                )
            )
            continue

        days_left = (expires - today).days
        if days_left <= EXPIRING_SOON_DAYS:
            warnings.append(
                AuditIssue(
                    "warning",
                    f"{prefix} `{budget.id}` expires in {days_left} day(s) on {budget.expires_on}",
                )
            )

        notes.append(
            f"{budget.id} {budget.audit}/{budget.rule} {budget.path} owner={budget.owner} expires={budget.expires_on}"
        )
        budgets.append(budget)

    return budgets, failures, warnings, notes


def missing_budget_failures(
    budgets: list[WarningBudget],
    findings: list[Finding],
) -> list[AuditIssue]:
    failures: list[AuditIssue] = []
    for finding in findings:
        matched = any(
            budget_matches(
                budget=budget,
                audit="structure",
                rule=finding.rule,
                path=finding.path,
            )
            for budget in budgets
        )
        if matched:
            continue
        failures.append(
            AuditIssue(
                "failure",
                f"active warning `{finding.rule}` `{finding.path}` has no budget entry",
            )
        )
    return failures


def stale_budget_warnings(
    budgets: list[WarningBudget],
    findings: list[Finding],
) -> list[AuditIssue]:
    warnings: list[AuditIssue] = []
    for budget in budgets:
        matched = any(
            budget_matches(
                budget=budget,
                audit="structure",
                rule=finding.rule,
                path=finding.path,
            )
            for finding in findings
        )
        if matched:
            continue
        warnings.append(
            AuditIssue(
                "warning",
                f"budget `{budget.id}` no longer matches an active warning and should be removed",
            )
        )
    return warnings


def main() -> None:
    findings = active_structure_warnings()
    budgets, failures, warnings, notes = parse_budgets()
    failures.extend(missing_budget_failures(budgets, findings))
    warnings.extend(stale_budget_warnings(budgets, findings))

    print_section("warning_budget_registry")
    print(f"registry={BUDGET_REGISTRY.relative_to(BUDGET_REGISTRY.parents[1])}")
    print(f"active_warning_findings={len(findings)}")
    print(f"active_budgets={len(budgets)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")

    print_section("notes")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")

    print_section("warnings")
    if warnings:
        for issue in warnings:
            print(f"WARN {issue.detail}")
    else:
        print("none")

    print_section("failures")
    if failures:
        for issue in failures:
            print(f"FAIL {issue.detail}")
        append_step_summary(
            render_markdown_summary(
                failures=failures,
                warnings=warnings,
                notes=notes,
                active_budgets=len(budgets),
            )
        )
        raise SystemExit(1)
    print("none")
    append_step_summary(
        render_markdown_summary(
            failures=failures,
            warnings=warnings,
            notes=notes,
            active_budgets=len(budgets),
        )
    )
    print("PASS: warning budget registry")


if __name__ == "__main__":
    main()
