#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
import re

from core_split_readiness import (
    collect_service_readiness,
    core_split_blockers,
    first_core_boundary,
)
from domain_boundary_watch import domain_boundary_watch_rows
from ownership_watch import (
    collect_giant_priority_statuses,
    collect_registry_alignment_report,
    collect_source_of_truth_results,
    core_ports_concrete_budget,
)


ROOT = Path(__file__).resolve().parents[1]
G5_ADMIN = ROOT / "g5-admin"
FRONTEND_ROOT = G5_ADMIN / "src"
FEATURES_ROOT = FRONTEND_ROOT / "features"
BACKEND_ROOT = G5_ADMIN / "src-tauri" / "src"
DOMAINS_ROOT = ROOT / "specs" / "domains"
APP_STATE_ROOT = BACKEND_ROOT / "app_state"
CORE_PORTS_FILE = BACKEND_ROOT / "core" / "ports.rs"

FRONTEND_LIMIT = 300
COMMAND_LIMIT = 300
ROOT_WARNING_LIMIT = 220
ROOT_FAILURE_LIMIT = 320
SERVICE_OWNERSHIP_WARNING_BACKENDS = 3

IMPORT_PATTERN = re.compile(r"""from\s+["'][^"']*features/([^/"']+)""")
ADMIN_PATH_PATTERN = re.compile(r'"/admin/[^"]*"')
FUNCTION_PATTERN = re.compile(
    r"\b(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\("
)
TRANSACTION_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\.transaction\("), "transaction_call"),
    (re.compile(r"\bTransaction\b"), "transaction_type"),
    (re.compile(r'execute_batch\(\s*"[^"]*\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b'), "manual_sql_transaction"),
)
SERVICE_BACKEND_MARKERS: tuple[tuple[str, str], ...] = (
    ("session_store", ".session_store("),
    ("site_catalog_store", ".site_catalog_store("),
    ("security_store", ".security_store("),
    ("backup_store", ".backup_store("),
    ("admin_api", ".admin_api("),
    ("site_manager", ".site_manager"),
)

def count_lines(path: Path) -> int:
    return sum(1 for _ in path.open("r", encoding="utf-8", errors="ignore"))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_functions(text: str) -> list[tuple[str, str]]:
    functions: list[tuple[str, str]] = []
    for match in FUNCTION_PATTERN.finditer(text):
        name = match.group("name")
        brace_start = text.find("{", match.end())
        if brace_start < 0:
            continue
        depth = 1
        cursor = brace_start + 1
        while cursor < len(text) and depth > 0:
            if text[cursor] == "{":
                depth += 1
            elif text[cursor] == "}":
                depth -= 1
            cursor += 1
        if depth != 0:
            continue
        functions.append((name, text[brace_start + 1: cursor - 1]))
    return functions


def feature_dirs_with_pages() -> list[str]:
    names: list[str] = []
    for feature_dir in sorted(p for p in FEATURES_ROOT.iterdir() if p.is_dir()):
        has_page = any(feature_dir.rglob("*Page.tsx")) or any(feature_dir.rglob("*Workspace.tsx"))
        if has_page:
            names.append(feature_dir.name)
    return names


def domain_sdds() -> list[str]:
    return sorted(
        path.name
        for path in DOMAINS_ROOT.glob("*.md")
        if path.name != "README.md"
    )


def oversized_files(root: Path, patterns: tuple[str, ...], limit: int) -> list[tuple[str, int]]:
    items: list[tuple[str, int]] = []
    for pattern in patterns:
        for path in root.rglob(pattern):
            lines = count_lines(path)
            if lines > limit:
                items.append((str(path.relative_to(ROOT)), lines))
    return sorted(items, key=lambda item: (-item[1], item[0]))


def root_orchestrators() -> list[tuple[str, int, str]]:
    candidates = [
        "g5-admin/src/features/layout/navigation.ts",
        "g5-admin/src/features/layout/AppShell.tsx",
        "g5-admin/src-tauri/src/lib.rs",
        "g5-admin/src-tauri/src/api_client/mod.rs",
        "g5-admin/src-tauri/src/error/mod.rs",
        "g5-admin/src-tauri/src/db/mod.rs",
        "g5-admin/src-tauri/src/app_state/mod.rs",
        "g5-admin/src-tauri/src/commands/registry.rs",
    ]
    result: list[tuple[str, int, str]] = []
    for candidate in candidates:
        path = ROOT / candidate
        if not path.exists():
            result.append((candidate, 0, "missing"))
            continue
        lines = count_lines(path)
        if lines > ROOT_FAILURE_LIMIT:
            status = "fail"
        elif lines > ROOT_WARNING_LIMIT:
            status = "warn"
        else:
            status = "ok"
        result.append((candidate, lines, status))
    return result


def cross_feature_pairs() -> list[str]:
    pairs: set[str] = set()
    for path in FEATURES_ROOT.rglob("*.ts*"):
        source_feature = path.relative_to(FEATURES_ROOT).parts[0]
        text = read_text(path)
        for match in IMPORT_PATTERN.finditer(text):
            target_feature = match.group(1)
            if target_feature and target_feature != source_feature:
                pairs.add(f"{source_feature} -> {target_feature}")
    return sorted(pairs)


def count_admin_paths() -> int:
    count = 0
    for root in (FRONTEND_ROOT, BACKEND_ROOT):
        for path in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")) + list(root.rglob("*.rs")):
            text = read_text(path)
            count += len(ADMIN_PATH_PATTERN.findall(text))
    return count


def count_schema_consumers() -> int:
    count = 0
    for path in FEATURES_ROOT.rglob("*.ts*"):
        text = read_text(path)
        count += text.count("useAdminFieldSchema(")
    return count


def app_state_service_hotspots() -> list[tuple[str, str, int, str]]:
    hotspots: list[tuple[str, str, int, str]] = []
    for path in sorted(APP_STATE_ROOT.glob("*service.rs")):
        text = read_text(path)
        file_touched = [
            label
            for label, marker in SERVICE_BACKEND_MARKERS
            if marker in text
        ]
        if len(file_touched) >= SERVICE_OWNERSHIP_WARNING_BACKENDS:
            hotspots.append(
                (
                    "file",
                    str(path.relative_to(ROOT)),
                    len(file_touched),
                    ", ".join(file_touched),
                )
            )
        for function_name, body in extract_functions(text):
            touched = [
                label
                for label, marker in SERVICE_BACKEND_MARKERS
                if marker in body
            ]
            if len(touched) < SERVICE_OWNERSHIP_WARNING_BACKENDS:
                continue
            hotspots.append(
                (
                    "fn",
                    f"{path.relative_to(ROOT)}::{function_name}",
                    len(touched),
                    ", ".join(touched),
                )
            )
    return hotspots


def transaction_boundary_watch() -> list[tuple[str, str]]:
    findings: list[tuple[str, str]] = []
    for path in BACKEND_ROOT.rglob("*.rs"):
        if "tests" in path.parts:
            continue
        if path.is_relative_to(BACKEND_ROOT / "db"):
            continue
        text = read_text(path)
        for pattern, reason in TRANSACTION_PATTERNS:
            if pattern.search(text):
                findings.append((str(path.relative_to(ROOT)), reason))
                break
    return findings


def core_ports_watch() -> list[str]:
    return core_ports_concrete_budget()


def source_of_truth_watch() -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for result in collect_source_of_truth_results():
        hits = ", ".join(result.hits) if result.hits else "none"
        status = "ok" if list(result.hits) == [result.expected_path] else "fail"
        rows.append((status, result.rule, hits))
    return rows


def registry_alignment_watch() -> list[str]:
    report = collect_registry_alignment_report()
    rows = [
        (
            "counts "
            f"context={len(report.command_context_commands)} "
            f"api_targets={len(report.api_target_commands)} "
            f"ipc={len(report.ipc_commands)} "
            f"navigation_admin_paths={len(report.navigation_admin_paths)}"
        )
    ]
    if report.missing_api_targets_for_context:
        rows.append(
            "fail missing_api_targets_for_context :: "
            + ", ".join(sorted(report.missing_api_targets_for_context))
        )
    if report.missing_context_for_api_targets:
        rows.append(
            "fail missing_context_for_api_targets :: "
            + ", ".join(sorted(report.missing_context_for_api_targets))
        )
    if report.unexpected_ipc_only_commands:
        rows.append(
            "fail unexpected_ipc_only_commands :: "
            + ", ".join(sorted(report.unexpected_ipc_only_commands))
        )
    if report.allowed_ipc_only_commands:
        rows.append(
            "note allowed_ipc_only_commands :: "
            + ", ".join(sorted(report.allowed_ipc_only_commands))
        )
    if report.missing_navigation_paths:
        rows.append(
            "fail missing_navigation_paths :: "
            + ", ".join(sorted(report.missing_navigation_paths))
        )
    if len(rows) == 1:
        rows.append("none")
    return rows


def giant_registry_priority_watch() -> list[str]:
    rows: list[str] = []
    for status in collect_giant_priority_statuses():
        rows.append(
            f"{status.status:>4} {status.lines:>4} {status.path} :: "
            f"{status.kind} budget {status.warning_limit}/{status.failure_limit}"
        )
    return rows


def core_split_readiness_watch() -> list[str]:
    rows: list[str] = [f"boundary {first_core_boundary()}"]
    for item in collect_service_readiness():
        blocker_text = ", ".join(item.blockers) if item.blockers else "none"
        rows.append(
            f"{item.recommended_stage:>12} blockers={item.blocker_count} "
            f"{item.path} :: {blocker_text}"
        )
    port_blockers = core_split_blockers()
    if port_blockers:
        for detail in port_blockers:
            rows.append(f"port-blocker {detail}")
    else:
        rows.append("port-blocker none")
    return rows


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def main() -> None:
    features = feature_dirs_with_pages()
    sdds = domain_sdds()
    oversized_frontend = oversized_files(
        FEATURES_ROOT,
        ("*.ts", "*.tsx"),
        FRONTEND_LIMIT,
    )
    oversized_commands = oversized_files(
        BACKEND_ROOT / "commands",
        ("*.rs",),
        COMMAND_LIMIT,
    )
    pairs = cross_feature_pairs()

    print_section("counts")
    print(f"feature_dirs_with_pages={len(features)}")
    print(f"domain_sdd_count={len(sdds)}")
    print(f"cross_feature_import_pairs={len(pairs)}")
    print(f"hardcoded_admin_path_literals={count_admin_paths()}")
    print(f"schema_consumer_calls={count_schema_consumers()}")

    print_section("oversized_frontend_files")
    if oversized_frontend:
        for path, lines in oversized_frontend[:20]:
            print(f"{lines:>4} {path}")
    else:
        print("none")

    print_section("oversized_command_files")
    if oversized_commands:
        for path, lines in oversized_commands[:20]:
            print(f"{lines:>4} {path}")
    else:
        print("none")

    print_section("root_orchestrators")
    for path, lines, status in root_orchestrators():
        print(f"{status:>4} {lines:>4} {path}")

    print_section("app_state_service_hotspots")
    hotspots = app_state_service_hotspots()
    if hotspots:
        for level, path, count, detail in hotspots:
            print(f"{level:>4} {count:>2} {path} :: {detail}")
    else:
        print("none")

    print_section("transaction_boundary_watch")
    transaction_findings = transaction_boundary_watch()
    if transaction_findings:
        for path, reason in transaction_findings:
            print(f"fail {path} :: {reason}")
    else:
        print("none")

    print_section("core_ports_watch")
    port_findings = core_ports_watch()
    if port_findings:
        for detail in port_findings:
            print(f"warn g5-admin/src-tauri/src/core/ports.rs :: {detail}")
    else:
        print("none")

    print_section("source_of_truth_watch")
    for status, rule, hits in source_of_truth_watch():
        print(f"{status:>4} {rule} :: {hits}")

    print_section("registry_alignment_watch")
    for row in registry_alignment_watch():
        print(row)

    print_section("giant_registry_orchestrator_priority")
    for row in giant_registry_priority_watch():
        print(row)

    print_section("core_split_readiness")
    for row in core_split_readiness_watch():
        print(row)

    print_section("domain_boundary_watch")
    for row in domain_boundary_watch_rows():
        print(row)

    print_section("cross_feature_import_examples")
    if pairs:
        for pair in pairs[:20]:
            print(pair)
    else:
        print("none")


if __name__ == "__main__":
    main()
