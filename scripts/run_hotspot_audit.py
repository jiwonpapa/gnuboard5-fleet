#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import tomllib
from dataclasses import asdict, dataclass
from pathlib import Path

from check_active_crate_boundaries import (
    ROOT,
    ROOT_ORCHESTRATOR_CANDIDATES,
    ROOT_ORCHESTRATOR_FAILURE_LIMIT,
    ROOT_ORCHESTRATOR_WARNING_LIMIT,
)
from ownership_watch import GIANT_PRIORITY_CANDIDATES, count_lines

OUTPUT_DIR = ROOT / "output" / "hotspot-audit"
OUTPUT_JSON = OUTPUT_DIR / "latest.json"
OUTPUT_MD = OUTPUT_DIR / "latest.md"
WARNING_BUDGETS_PATH = ROOT / "specs" / "audits" / "WARNING_BUDGETS.toml"
GENERIC_WARNING_THRESHOLD = 350
GENERIC_FAILURE_THRESHOLD = 500
GENERATED_MARKER_SCAN_BYTES = 512


def discover_unit_roots() -> dict[str, Path]:
    """Return every hand-written frontend and Rust workspace source root.

    Crate discovery deliberately follows the filesystem instead of a fixed
    allowlist so extracting code into a new workspace crate cannot make it
    disappear from the hotspot gate.
    """

    roots = {
        "frontend": ROOT / "g5-admin" / "src",
        "desktop": ROOT / "g5-admin" / "src-tauri" / "src",
    }
    for manifest in sorted(ROOT.glob("g5-*/Cargo.toml")):
        source_root = manifest.parent / "src"
        if source_root.is_dir():
            roots[manifest.parent.name] = source_root
    return roots


UNIT_ROOTS = discover_unit_roots()


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
    unit: str
    unit_total_lines: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a delta hotspot audit against changed Rust/TS source files.",
    )
    parser.add_argument(
        "--base-ref",
        help="Optional git base ref. If omitted, use current worktree changes or HEAD~1 when clean.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Evaluate only; do not rewrite tracked output artifacts.",
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


def relevant_source_file(path: str) -> bool:
    if not path.endswith((".rs", ".ts", ".tsx")):
        return False
    return any(
        path.startswith(f"{root.relative_to(ROOT).as_posix()}/")
        for root in UNIT_ROOTS.values()
    )


def generated_source_file(path: Path) -> bool:
    """Return true only for source files carrying an explicit generator marker."""

    try:
        prefix = path.read_text(encoding="utf-8")[:GENERATED_MARKER_SCAN_BYTES]
    except (OSError, UnicodeError):
        return False
    return "@generated" in prefix


def resolve_unit(path: str) -> tuple[str, Path]:
    for unit, root in UNIT_ROOTS.items():
        relative_root = root.relative_to(ROOT).as_posix()
        if path.startswith(f"{relative_root}/"):
            return unit, root
    return "unknown", ROOT


def unit_total_lines(root: Path) -> int:
    total = 0
    for path in root.rglob("*"):
        if path.suffix not in {".rs", ".ts", ".tsx"} or not path.is_file():
            continue
        total += count_lines(path)
    return total


def giant_priority_lookup() -> dict[str, tuple[str, int, int]]:
    return {
        candidate.path: (
            "giant_priority",
            candidate.warning_limit,
            candidate.failure_limit,
        )
        for candidate in GIANT_PRIORITY_CANDIDATES
    }


def derive_status(
    failure_count: int,
    warning_count: int,
    budgeted_warning_count: int,
) -> str:
    if failure_count:
        return "failed"
    if warning_count or budgeted_warning_count:
        return "warning"
    return "passed"


def classify(
    *,
    path: str,
    budgets: dict[tuple[str, str], list[str]],
    unit_line_totals: dict[str, int],
) -> HotspotEntry:
    giant_candidates = giant_priority_lookup()
    if path in giant_candidates:
        category, warning_threshold, failure_threshold = giant_candidates[path]
        rule = "giant_registry_priority"
    elif path in ROOT_ORCHESTRATOR_CANDIDATES:
        category = "root_orchestrator"
        rule = "root_orchestrator_growth"
        warning_threshold = ROOT_ORCHESTRATOR_WARNING_LIMIT
        failure_threshold = ROOT_ORCHESTRATOR_FAILURE_LIMIT
    else:
        category = "changed_code_file"
        rule = "oversized_changed_code_file"
        warning_threshold = GENERIC_WARNING_THRESHOLD
        failure_threshold = GENERIC_FAILURE_THRESHOLD

    full_path = ROOT / path
    lines = count_lines(full_path)
    budget_ids = tuple(budgets.get((rule, path), []))
    if lines >= failure_threshold:
        status = "failure"
    elif lines >= warning_threshold:
        status = "budgeted_warning" if budget_ids else "warning"
    else:
        status = "ok"

    unit, _ = resolve_unit(path)
    return HotspotEntry(
        path=path,
        lines=lines,
        category=category,
        rule=rule,
        warning_threshold=warning_threshold,
        failure_threshold=failure_threshold,
        status=status,
        budget_ids=budget_ids,
        unit=unit,
        unit_total_lines=unit_line_totals.get(unit, 0),
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
        "# Rust Delta Hotspot Audit",
        "",
        f"- status: `{status}`",
        f"- changed_paths: `{len(changed_paths)}`",
        f"- analyzed_source_files: `{len(analyzed)}`",
        f"- skipped_paths: `{len(skipped)}`",
        "",
        "## Hotspots",
        "",
        "| path | lines | category | status | unit | budget |",
        "| --- | ---: | --- | --- | --- | --- |",
    ]

    for entry in analyzed:
        budget = ", ".join(entry.budget_ids) if entry.budget_ids else "-"
        lines.append(
            f"| `{entry.path}` | `{entry.lines}` | `{entry.category}` | `{entry.status}` | `{entry.unit}` | `{budget}` |"
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
    unit_line_totals = {unit: unit_total_lines(root) for unit, root in UNIT_ROOTS.items()}

    analyzed: list[HotspotEntry] = []
    skipped: list[str] = []
    for path in changed_paths:
        if not relevant_source_file(path):
            skipped.append(path)
            continue
        full_path = ROOT / path
        if not full_path.is_file():
            skipped.append(path)
            continue
        if generated_source_file(full_path):
            skipped.append(path)
            continue
        analyzed.append(
            classify(path=path, budgets=budgets, unit_line_totals=unit_line_totals)
        )

    failure_count = sum(1 for entry in analyzed if entry.status == "failure")
    warning_count = sum(1 for entry in analyzed if entry.status == "warning")
    budgeted_warning_count = sum(1 for entry in analyzed if entry.status == "budgeted_warning")
    status = derive_status(
        failure_count,
        warning_count,
        budgeted_warning_count,
    )

    payload = {
        "status": status,
        "base_ref": args.base_ref,
        "changed_paths": changed_paths,
        "analyzed_count": len(analyzed),
        "skipped_count": len(skipped),
        "failure_count": failure_count,
        "warning_count": warning_count,
        "budgeted_warning_count": budgeted_warning_count,
        "unit_line_totals": unit_line_totals,
        "hotspots": [asdict(entry) for entry in analyzed],
        "skipped_paths": skipped,
        "output_json": str(OUTPUT_JSON),
        "output_md": str(OUTPUT_MD),
    }

    if not args.check:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        OUTPUT_JSON.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        write_markdown(
            changed_paths=changed_paths,
            analyzed=analyzed,
            skipped=skipped,
            status=status,
        )

    print(
        f"[rust_hotspot_audit] status={status} analyzed={len(analyzed)} "
        f"failures={failure_count} warnings={warning_count} budgeted={budgeted_warning_count}"
    )
    for entry in analyzed:
        if entry.status in {"failure", "warning", "budgeted_warning"}:
            print(f"- {entry.status}: {entry.path} ({entry.lines} lines)")
    if args.check:
        print("mode=check-only (artifacts unchanged)")
    else:
        print(f"json={OUTPUT_JSON.relative_to(ROOT)}")
        print(f"markdown={OUTPUT_MD.relative_to(ROOT)}")
    return 1 if failure_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
