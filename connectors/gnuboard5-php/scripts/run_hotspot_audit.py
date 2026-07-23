#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import subprocess
import sys
import tomllib
from pathlib import Path

from php_structure_findings import (
    ROOT,
    ROOT_FAILURE_THRESHOLD,
    ROOT_ORCHESTRATORS,
    ROOT_WARNING_THRESHOLD,
    SERVICE_REPOSITORY_FAILURE_THRESHOLD,
    SERVICE_REPOSITORY_WARNING_THRESHOLD,
    php_line_count,
)


OUTPUT_DIR = ROOT / "output" / "php-hotspot-audit"
OUTPUT_JSON = OUTPUT_DIR / "latest.json"
OUTPUT_MD = OUTPUT_DIR / "latest.md"
WARNING_BUDGETS_PATH = ROOT / "docs" / "audits" / "WARNING_BUDGETS.toml"
GENERIC_WARNING_THRESHOLD = 320
GENERIC_FAILURE_THRESHOLD = 480


@dataclass(frozen=True)
class HotspotEntry:
    path: str
    lines: int
    category: str
    rule: str
    warning_threshold: int
    failure_threshold: int
    status: str
    budget_ids: tuple[str, ...]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a delta hotspot audit against changed PHP files.",
    )
    parser.add_argument(
        "--base-ref",
        help="Optional git base ref. If omitted, use current worktree changes or HEAD~1 when clean.",
    )
    return parser.parse_args()


def run_git(*args: str) -> list[str]:
    process = subprocess.run(
        ["git", "-C", str(ROOT), *args],
        capture_output=True,
        check=True,
        text=True,
    )
    return [line.strip() for line in process.stdout.splitlines() if line.strip()]


def collect_changed_paths(base_ref: str | None) -> list[str]:
    changed: set[str] = set()
    if base_ref:
        changed.update(run_git("diff", "--name-only", "--diff-filter=ACMR", f"{base_ref}...HEAD"))
        return sorted(changed)

    changed.update(run_git("diff", "--name-only", "--diff-filter=ACMR", "HEAD"))
    changed.update(run_git("diff", "--cached", "--name-only", "--diff-filter=ACMR"))
    changed.update(run_git("ls-files", "--others", "--exclude-standard"))

    if changed:
        return sorted(changed)

    head_parent = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "--verify", "HEAD~1"],
        capture_output=True,
        text=True,
    )
    if head_parent.returncode == 0:
        changed.update(run_git("diff", "--name-only", "--diff-filter=ACMR", "HEAD~1..HEAD"))

    return sorted(changed)


def load_warning_budgets() -> dict[tuple[str, str], list[str]]:
    if not WARNING_BUDGETS_PATH.is_file():
        return {}

    document = tomllib.loads(WARNING_BUDGETS_PATH.read_text(encoding="utf-8"))
    budgets: dict[tuple[str, str], list[str]] = {}
    for entry in document.get("budgets", []):
        if entry.get("audit") != "structure":
            continue
        rule = str(entry.get("rule", "")).strip()
        path = str(entry.get("path", "")).strip()
        budget_id = str(entry.get("id", "")).strip()
        if not rule or not path or not budget_id:
            continue
        budgets.setdefault((rule, path), []).append(budget_id)
    return budgets


def classify(path: str, lines: int, budgets: dict[tuple[str, str], list[str]]) -> HotspotEntry:
    if path in ROOT_ORCHESTRATORS:
        category = "root_orchestrator"
        rule = "root_orchestrator_growth"
        warning_threshold = ROOT_WARNING_THRESHOLD
        failure_threshold = ROOT_FAILURE_THRESHOLD
    elif "/Service/" in path or "/Repository/" in path:
        category = "service_repository"
        rule = "oversized_service_or_repository"
        warning_threshold = SERVICE_REPOSITORY_WARNING_THRESHOLD
        failure_threshold = SERVICE_REPOSITORY_FAILURE_THRESHOLD
    else:
        category = "changed_php_file"
        rule = "oversized_changed_php_file"
        warning_threshold = GENERIC_WARNING_THRESHOLD
        failure_threshold = GENERIC_FAILURE_THRESHOLD

    budget_ids = tuple(budgets.get((rule, path), []))
    if lines >= failure_threshold:
        status = "failure"
    elif lines >= warning_threshold:
        status = "budgeted_warning" if budget_ids else "warning"
    else:
        status = "ok"

    return HotspotEntry(
        path=path,
        lines=lines,
        category=category,
        rule=rule,
        warning_threshold=warning_threshold,
        failure_threshold=failure_threshold,
        status=status,
        budget_ids=budget_ids,
    )


def write_markdown(
    *,
    changed_paths: list[str],
    analyzed: list[HotspotEntry],
    skipped: list[str],
    status: str,
) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "# PHP Delta Hotspot Audit",
        "",
        f"- status: `{status}`",
        f"- changed_paths: `{len(changed_paths)}`",
        f"- analyzed_php_files: `{len(analyzed)}`",
        f"- skipped_non_php_or_missing: `{len(skipped)}`",
        "",
        "## Hotspots",
        "",
        "| path | lines | category | status | budget |",
        "| --- | ---: | --- | --- | --- |",
    ]

    for entry in analyzed:
        budget = ", ".join(entry.budget_ids) if entry.budget_ids else "-"
        lines.append(
            f"| `{entry.path}` | `{entry.lines}` | `{entry.category}` | `{entry.status}` | `{budget}` |"
        )

    if not analyzed:
        lines.extend(["없음", ""])

    if skipped:
        lines.extend(["", "## Skipped", ""])
        for path in skipped:
            lines.append(f"- `{path}`")

    OUTPUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    changed_paths = collect_changed_paths(args.base_ref)
    budgets = load_warning_budgets()

    analyzed: list[HotspotEntry] = []
    skipped: list[str] = []
    for path in changed_paths:
        if not path.endswith(".php"):
            skipped.append(path)
            continue
        full_path = ROOT / path
        if not full_path.is_file():
            skipped.append(path)
            continue
        analyzed.append(classify(path, php_line_count(full_path), budgets))

    failure_count = sum(1 for entry in analyzed if entry.status == "failure")
    warning_count = sum(1 for entry in analyzed if entry.status == "warning")
    budgeted_warning_count = sum(1 for entry in analyzed if entry.status == "budgeted_warning")
    status = "failed" if failure_count or warning_count else ("warning" if budgeted_warning_count else "passed")

    payload = {
        "status": status,
        "base_ref": args.base_ref,
        "changed_paths": changed_paths,
        "analyzed_count": len(analyzed),
        "skipped_count": len(skipped),
        "failure_count": failure_count,
        "warning_count": warning_count,
        "budgeted_warning_count": budgeted_warning_count,
        "hotspots": [asdict(entry) for entry in analyzed],
        "skipped_paths": skipped,
        "output_json": str(OUTPUT_JSON),
        "output_md": str(OUTPUT_MD),
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(
        changed_paths=changed_paths,
        analyzed=analyzed,
        skipped=skipped,
        status=status,
    )

    print(f"[php_hotspot_audit] status={status} analyzed={len(analyzed)} failures={failure_count} warnings={warning_count} budgeted={budgeted_warning_count}")
    print(f"json={OUTPUT_JSON.relative_to(ROOT)}")
    print(f"markdown={OUTPUT_MD.relative_to(ROOT)}")
    return 1 if status == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
