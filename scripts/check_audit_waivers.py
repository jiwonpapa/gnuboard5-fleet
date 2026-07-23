#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import os

from audit_waivers import (
    REQUIRED_WAIVER_FIELDS,
    SUPPORTED_AUDITS,
    SUPPORTED_SEVERITIES,
    WAIVER_REGISTRY,
    Waiver,
    load_registry_document,
    waiver_matches,
)
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
    active_waivers: int,
) -> str:
    lines = [
        "## Structure Audit Waiver Registry",
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
            "- registry: `specs/audits/WAIVERS.toml`",
            f"- active_waivers: `{active_waivers}`",
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


def parse_waivers() -> tuple[list[Waiver], list[AuditIssue], list[AuditIssue], list[str]]:
    today = date.today()
    issues: list[AuditIssue] = []
    warnings: list[AuditIssue] = []
    notes: list[str] = []

    document = load_registry_document()
    version = document.get("version")
    if version != 1:
        issues.append(
            AuditIssue(
                severity="failure",
                detail=f"registry version must be 1 (got {version!r})",
            )
        )

    raw_waivers = document.get("waivers", [])
    if not isinstance(raw_waivers, list):
        issues.append(
            AuditIssue(
                severity="failure",
                detail="top-level `waivers` must be an array of tables",
            )
        )
        return [], issues, warnings, notes

    waivers: list[Waiver] = []
    seen_ids: set[str] = set()
    seen_targets: set[tuple[str, str, str, str]] = set()
    for index, raw in enumerate(raw_waivers, start=1):
        prefix = f"waiver[{index}]"
        if not isinstance(raw, dict):
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} must be a table",
                )
            )
            continue

        missing = [
            field
            for field in REQUIRED_WAIVER_FIELDS
            if not isinstance(raw.get(field), str) or not str(raw.get(field)).strip()
        ]
        if missing:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} missing required fields: {', '.join(missing)}",
                )
            )
            continue

        waiver = Waiver(
            id=str(raw["id"]).strip(),
            audit=str(raw["audit"]).strip(),
            severity=str(raw["severity"]).strip(),
            rule=str(raw["rule"]).strip(),
            path=str(raw["path"]).strip(),
            owner=str(raw["owner"]).strip(),
            reason=str(raw["reason"]).strip(),
            introduced_on=str(raw["introduced_on"]).strip(),
            expires_on=str(raw["expires_on"]).strip(),
            removal_criteria=str(raw["removal_criteria"]).strip(),
        )

        if waiver.id in seen_ids:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} duplicates waiver id `{waiver.id}`",
                )
            )
            continue
        seen_ids.add(waiver.id)

        if waiver.audit not in SUPPORTED_AUDITS:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} has unsupported audit `{waiver.audit}`; "
                        f"supported: {', '.join(sorted(SUPPORTED_AUDITS))}"
                    ),
                )
            )
            continue

        if waiver.severity not in SUPPORTED_SEVERITIES:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} has unsupported severity `{waiver.severity}`; "
                        f"supported: {', '.join(sorted(SUPPORTED_SEVERITIES))}"
                    ),
                )
            )
            continue

        try:
            introduced = waiver.introduced_date()
            expires = waiver.expires_date()
        except ValueError:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} date must use YYYY-MM-DD",
                )
            )
            continue

        if introduced > expires:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} introduced_on is after expires_on",
                )
            )
            continue

        target_key = (waiver.audit, waiver.severity, waiver.rule, waiver.path)
        if target_key in seen_targets:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} duplicates target "
                        f"{waiver.audit}/{waiver.severity}/{waiver.rule}/{waiver.path}"
                    ),
                )
            )
            continue
        seen_targets.add(target_key)

        if expires < today:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} `{waiver.id}` expired on {waiver.expires_on}; "
                        "remove it or resolve the debt"
                    ),
                )
            )
            continue

        days_left = (expires - today).days
        if days_left <= EXPIRING_SOON_DAYS:
            warnings.append(
                AuditIssue(
                    severity="warning",
                    detail=(
                        f"{prefix} `{waiver.id}` expires in {days_left} day(s) "
                        f"on {waiver.expires_on}"
                    ),
                )
            )

        notes.append(
            f"{waiver.id} {waiver.audit}/{waiver.severity} {waiver.rule} "
            f"{waiver.path} owner={waiver.owner} expires={waiver.expires_on}"
        )
        waivers.append(waiver)

    return waivers, issues, warnings, notes


def orphan_warnings(waivers: list[Waiver], findings: list[Finding]) -> list[AuditIssue]:
    warnings: list[AuditIssue] = []
    for waiver in waivers:
        if waiver.audit not in {"structure", "all"}:
            continue
        if any(
            waiver_matches(
                waiver,
                audit="structure",
                severity=finding.severity,
                rule=finding.rule,
                path=finding.path,
            )
            for finding in findings
        ):
            continue
        warnings.append(
            AuditIssue(
                severity="warning",
                detail=(
                    f"`{waiver.id}` does not match any current structure finding; "
                    "remove stale waiver or narrow its scope"
                ),
            )
        )
    return warnings


def main() -> None:
    waivers, failures, warnings, notes = parse_waivers()
    warnings.extend(orphan_warnings(waivers, collect_findings()))

    print_section("audit_waiver_registry")
    print(f"registry={WAIVER_REGISTRY.relative_to(WAIVER_REGISTRY.parents[1])}")
    print(f"active_waivers={len(waivers)}")
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
                active_waivers=len(waivers),
            )
        )
        raise SystemExit(1)

    print("none")
    append_step_summary(
        render_markdown_summary(
            failures=failures,
            warnings=warnings,
            notes=notes,
            active_waivers=len(waivers),
        )
    )
    print("PASS: audit waiver registry")


if __name__ == "__main__":
    main()
