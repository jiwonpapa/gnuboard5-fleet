#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import re
import tomllib

from check_form_metadata_coverage import load_registry as load_form_metadata_registry


ROOT = Path(__file__).resolve().parents[1]
TODO_PATH = ROOT / "specs" / "TODO.md"
REGISTRY_PATH = ROOT / "specs" / "audits" / "BLOCKERS.toml"
SUPPORTED_AUDITS = {"implementation", "consumer", "structure", "integrated"}
BLOCKED_SECTION_PATTERN = re.compile(
    r"^## Blocked\s*(?P<body>.*?)(?=^## |\Z)",
    flags=re.MULTILINE | re.DOTALL,
)
TODO_ID_PATTERN = re.compile(r"^- \[ \] (?P<id>T\d+-\d+)\b", flags=re.MULTILINE)


@dataclass(frozen=True)
class BlockerEntry:
    id: str
    audit: str
    scope: str
    owner: str
    reason: str
    source_registry: str
    handoff_report: str
    generated_report_json: str
    generated_report_md: str
    feature_count: int
    features: tuple[str, ...]
    unblock_signal: str
    rust_followup: str


@dataclass(frozen=True)
class AuditIssue:
    severity: str
    detail: str


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def append_step_summary(markdown: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(markdown)
        if not markdown.endswith("\n"):
            handle.write("\n")


def render_markdown_summary(
    *,
    failures: list[AuditIssue],
    warnings: list[AuditIssue],
    notes: list[str],
    evidence: list[str],
) -> str:
    lines = [
        "## Blocker Registry Audit",
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

    lines.extend(["", "### Evidence"])
    if evidence:
        for item in evidence:
            lines.append(f"- {item}")
    else:
        lines.append("- none")
    return "\n".join(lines) + "\n"


def load_todo_blocked_ids() -> set[str]:
    text = TODO_PATH.read_text(encoding="utf-8")
    match = BLOCKED_SECTION_PATTERN.search(text)
    if not match:
        return set()
    body = match.group("body")
    return {item.group("id") for item in TODO_ID_PATTERN.finditer(body)}


def load_registry() -> tuple[list[BlockerEntry], list[AuditIssue]]:
    issues: list[AuditIssue] = []
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    version = document.get("version")
    if version != 1:
        issues.append(
            AuditIssue(
                severity="failure",
                detail=f"registry version must be 1 (got {version!r})",
            )
        )

    raw_entries = document.get("blockers", [])
    if not isinstance(raw_entries, list):
        issues.append(
            AuditIssue(
                severity="failure",
                detail="top-level `blockers` must be an array of tables",
            )
        )
        return [], issues

    entries: list[BlockerEntry] = []
    seen_ids: set[str] = set()
    for index, raw in enumerate(raw_entries, start=1):
        prefix = f"blocker[{index}]"
        if not isinstance(raw, dict):
            issues.append(
                AuditIssue(severity="failure", detail=f"{prefix} must be a table")
            )
            continue

        required_str_fields = [
            "id",
            "audit",
            "scope",
            "owner",
            "reason",
            "source_registry",
            "handoff_report",
            "generated_report_json",
            "generated_report_md",
            "unblock_signal",
            "rust_followup",
        ]
        missing = [
            field
            for field in required_str_fields
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

        feature_count = raw.get("feature_count")
        if not isinstance(feature_count, int) or feature_count < 1:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} feature_count must be a positive integer",
                )
            )
            continue

        raw_features = raw.get("features")
        if not isinstance(raw_features, list):
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} features must be an array",
                )
            )
            continue
        features = tuple(
            value.strip()
            for value in raw_features
            if isinstance(value, str) and value.strip()
        )
        if len(features) != len(raw_features) or not features:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} features must be a non-empty string array",
                )
            )
            continue
        if len(set(features)) != len(features):
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} features contains duplicates",
                )
            )
            continue
        if len(features) != feature_count:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} feature_count={feature_count} does not match "
                        f"features={len(features)}"
                    ),
                )
            )
            continue

        entry = BlockerEntry(
            id=str(raw["id"]).strip(),
            audit=str(raw["audit"]).strip(),
            scope=str(raw["scope"]).strip(),
            owner=str(raw["owner"]).strip(),
            reason=str(raw["reason"]).strip(),
            source_registry=str(raw["source_registry"]).strip(),
            handoff_report=str(raw["handoff_report"]).strip(),
            generated_report_json=str(raw["generated_report_json"]).strip(),
            generated_report_md=str(raw["generated_report_md"]).strip(),
            feature_count=feature_count,
            features=features,
            unblock_signal=str(raw["unblock_signal"]).strip(),
            rust_followup=str(raw["rust_followup"]).strip(),
        )

        if entry.id in seen_ids:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=f"{prefix} duplicates blocker id `{entry.id}`",
                )
            )
            continue
        seen_ids.add(entry.id)

        if entry.audit not in SUPPORTED_AUDITS:
            issues.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{prefix} has unsupported audit `{entry.audit}`; "
                        f"supported: {', '.join(sorted(SUPPORTED_AUDITS))}"
                    ),
                )
            )
            continue

        entries.append(entry)

    return entries, issues


def relative_file(path_str: str) -> Path:
    return ROOT / path_str


def validate_form_metadata_blocker(
    entry: BlockerEntry,
    *,
    failures: list[AuditIssue],
    warnings: list[AuditIssue],
    notes: list[str],
    evidence: list[str],
) -> None:
    registry_features = {
        item.feature
        for item in load_form_metadata_registry()
        if item.mode == "schema_planned" and item.provider_blocker == entry.reason
    }
    if registry_features != set(entry.features):
        failures.append(
            AuditIssue(
                severity="failure",
                detail=(
                    f"{entry.id} feature set does not match FORM_METADATA_COVERAGE "
                    f"provider blockers: expected={sorted(registry_features)} "
                    f"registry={sorted(set(entry.features))}"
                ),
            )
        )

    json_path = relative_file(entry.generated_report_json)
    if json_path.is_file():
        payload = json.loads(json_path.read_text(encoding="utf-8"))
        blocked_features = {
            str(item.get("feature", "")).strip()
            for item in payload.get("blocked_features", [])
            if isinstance(item, dict) and str(item.get("feature", "")).strip()
        }
        blocked_count = payload.get("blocked_count")
        if blocked_features != set(entry.features):
            failures.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{entry.id} generated blocker artifact is out of sync: "
                        f"json={sorted(blocked_features)} registry={sorted(set(entry.features))}"
                    ),
                )
            )
        if blocked_count != entry.feature_count:
            failures.append(
                AuditIssue(
                    severity="failure",
                    detail=(
                        f"{entry.id} generated blocker count `{blocked_count}` does not match "
                        f"registry feature_count `{entry.feature_count}`"
                    ),
                )
            )
        notes.append(
            f"{entry.id} generated_blocked_count={blocked_count} owner={entry.owner} scope={entry.scope}"
        )
    else:
        warnings.append(
            AuditIssue(
                severity="warning",
                detail=(
                    f"{entry.id} generated blocker artifact is missing: "
                    f"{entry.generated_report_json}"
                ),
            )
        )

    evidence.append(f"source_registry: `{entry.source_registry}`")
    evidence.append(f"handoff_report: `{entry.handoff_report}`")
    evidence.append(f"generated_report_json: `{entry.generated_report_json}`")
    evidence.append(f"generated_report_md: `{entry.generated_report_md}`")


def main() -> None:
    failures: list[AuditIssue] = []
    warnings: list[AuditIssue] = []
    notes: list[str] = []
    evidence: list[str] = [f"registry: `{REGISTRY_PATH.relative_to(ROOT)}`"]

    blocked_todo_ids = load_todo_blocked_ids()
    entries, registry_issues = load_registry()
    failures.extend(issue for issue in registry_issues if issue.severity == "failure")
    warnings.extend(issue for issue in registry_issues if issue.severity == "warning")

    registry_ids = {entry.id for entry in entries}
    missing_registry = sorted(blocked_todo_ids - registry_ids)
    stale_registry = sorted(registry_ids - blocked_todo_ids)
    for todo_id in missing_registry:
        failures.append(
            AuditIssue(
                severity="failure",
                detail=f"TODO Blocked item `{todo_id}` has no blocker registry entry",
            )
        )
    for blocker_id in stale_registry:
        failures.append(
            AuditIssue(
                severity="failure",
                detail=f"blocker registry entry `{blocker_id}` is not present in TODO Blocked",
            )
        )

    for entry in entries:
        for field_name in (
            "source_registry",
            "handoff_report",
            "generated_report_json",
            "generated_report_md",
        ):
            field_value = getattr(entry, field_name)
            target_path = relative_file(field_value)
            if not target_path.is_file():
                failures.append(
                    AuditIssue(
                        severity="failure",
                        detail=f"{entry.id} missing file `{field_value}`",
                    )
                )

        if entry.source_registry == "specs/domains/FORM_METADATA_COVERAGE.toml":
            validate_form_metadata_blocker(
                entry,
                failures=failures,
                warnings=warnings,
                notes=notes,
                evidence=evidence,
            )
        else:
            warnings.append(
                AuditIssue(
                    severity="warning",
                    detail=(
                        f"{entry.id} uses unsupported blocker source `{entry.source_registry}`; "
                        "extend check_blocker_registry.py for deeper validation"
                    ),
                )
            )

    notes.append(f"blocked_todo_items={len(blocked_todo_ids)}")
    notes.append(f"registry_entries={len(entries)}")
    notes.append(f"failure_count={len(failures)}")
    notes.append(f"warning_count={len(warnings)}")

    print_section("blocker_registry")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT)}")
    print(f"blocked_todo_items={len(blocked_todo_ids)}")
    print(f"registry_entries={len(entries)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")

    print_section("notes")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")

    print_section("evidence")
    if evidence:
        for item in evidence:
            print(f"EVIDENCE {item}")
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
    else:
        print("none")

    append_step_summary(
        render_markdown_summary(
            failures=failures,
            warnings=warnings,
            notes=notes,
            evidence=evidence,
        )
    )

    if failures:
        raise SystemExit(1)
    print("PASS: blocker registry audit")


if __name__ == "__main__":
    main()
