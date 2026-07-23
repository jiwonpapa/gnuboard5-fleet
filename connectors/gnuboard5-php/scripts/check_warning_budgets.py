#!/usr/bin/env python3
from __future__ import annotations

from datetime import date
import sys
import tomllib
from pathlib import Path

from php_structure_findings import Finding, collect_findings

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "docs" / "audits" / "WARNING_BUDGETS.toml"
SUPPORTED_AUDITS = {"structure"}
REQUIRED_FIELDS = (
    "id",
    "audit",
    "rule",
    "path",
    "owner",
    "reason",
    "introduced_on",
    "expires_on",
    "removal_criteria",
)


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def budget_matches(*, audit: str, rule: str, path: str, budget: dict[str, str]) -> bool:
    return (
        budget.get("audit") == audit
        and budget.get("rule") == rule
        and budget.get("path") == path
    )


def active_structure_warnings() -> list[Finding]:
    return [finding for finding in collect_findings() if finding.severity == "warning"]


def main() -> int:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    failures: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    if document.get("version") != 1:
        failures.append(f"registry version must be 1 (got {document.get('version')!r})")

    raw_budgets = document.get("budgets", [])
    if not isinstance(raw_budgets, list):
        failures.append("top-level `budgets` must be an array of tables")
        raw_budgets = []

    seen_ids: set[str] = set()
    seen_targets: set[tuple[str, str, str]] = set()
    today = date.today()

    for index, raw in enumerate(raw_budgets, start=1):
        prefix = f"budget[{index}]"
        if not isinstance(raw, dict):
            failures.append(f"{prefix} must be a table")
            continue

        missing = [
            field
            for field in REQUIRED_FIELDS
            if not isinstance(raw.get(field), str) or not str(raw.get(field)).strip()
        ]
        if missing:
            failures.append(f"{prefix} missing required fields: {', '.join(missing)}")
            continue

        budget_id = str(raw["id"]).strip()
        audit = str(raw["audit"]).strip()
        rule = str(raw["rule"]).strip()
        path = str(raw["path"]).strip()
        owner = str(raw["owner"]).strip()
        expires_on = str(raw["expires_on"]).strip()
        introduced_on = str(raw["introduced_on"]).strip()

        if budget_id in seen_ids:
            failures.append(f"{prefix} duplicates budget id `{budget_id}`")
            continue
        seen_ids.add(budget_id)

        if audit not in SUPPORTED_AUDITS:
            failures.append(
                f"{prefix} has unsupported audit `{audit}`; supported: {', '.join(sorted(SUPPORTED_AUDITS))}"
            )
            continue

        try:
            introduced = parse_date(introduced_on)
            expires = parse_date(expires_on)
        except ValueError:
            failures.append(f"{prefix} date must use YYYY-MM-DD")
            continue

        if introduced > expires:
            failures.append(f"{prefix} introduced_on is after expires_on")
            continue

        target = (audit, rule, path)
        if target in seen_targets:
            failures.append(f"{prefix} duplicates target {audit}/{rule}/{path}")
            continue
        seen_targets.add(target)

        if expires < today:
            failures.append(f"{prefix} `{budget_id}` expired on {expires_on}")
            continue

        days_left = (expires - today).days
        if days_left <= 7:
            warnings.append(f"{prefix} `{budget_id}` expires in {days_left} day(s) on {expires_on}")

        notes.append(
            f"{budget_id} {audit}/{rule} {path} owner={owner} expires={expires_on}"
        )

    active_warnings = active_structure_warnings()
    for finding in active_warnings:
        if any(
            budget_matches(
                audit="structure",
                rule=finding.rule,
                path=finding.path,
                budget=raw,
            )
            for raw in raw_budgets
            if isinstance(raw, dict)
        ):
            continue
        failures.append(
            f"active warning `{finding.rule}` `{finding.path}` has no warning budget entry"
        )

    for raw in raw_budgets:
        if not isinstance(raw, dict):
            continue
        if str(raw.get("audit", "")).strip() != "structure":
            continue
        if any(
            budget_matches(
                audit="structure",
                rule=finding.rule,
                path=finding.path,
                budget=raw,
            )
            for finding in active_warnings
        ):
            continue
        warnings.append(
            f"budget `{str(raw.get('id', '')).strip()}` no longer matches an active structure warning"
        )

    print("[warning_budget_registry]")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT).as_posix()}")
    print(f"active_budgets={len(raw_budgets)}")
    print(f"active_structure_warnings={len(active_warnings)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")
    print()

    print("[notes]")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")
    print()

    print("[warnings]")
    if warnings:
        for warning in warnings:
            print(f"WARN {warning}")
    else:
        print("none")
    print()

    print("[failures]")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        print("FAIL: warning budget registry")
        return 1

    print("none")
    print("PASS: warning budget registry")
    return 0


if __name__ == "__main__":
    sys.exit(main())
