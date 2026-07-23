#!/usr/bin/env python3

from __future__ import annotations

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import re
import tomllib

from audit_waivers import Waiver, find_matching_waiver, load_waivers
from core_split_readiness import collect_service_readiness, first_core_boundary
from domain_boundary_watch import (
    collect_app_state_service_wrapper_findings,
    collect_frontend_feature_boundary_findings,
    collect_support_root_boundary_findings,
    domain_boundary_notes,
)
from ownership_watch import (
    collect_giant_priority_statuses,
    collect_registry_alignment_report,
    collect_source_of_truth_results,
    core_ports_concrete_budget,
)


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_MANIFEST = ROOT / "Cargo.toml"
ACTIVE_CRATE_ROOT = ROOT / "g5-admin" / "src-tauri" / "src"
COMMANDS_ROOT = ACTIVE_CRATE_ROOT / "commands"
APP_STATE_MOD = ACTIVE_CRATE_ROOT / "app_state" / "mod.rs"
APP_STATE_ROOT = ACTIVE_CRATE_ROOT / "app_state"
MODELS_CRATE_ROOT = ROOT / "g5-admin-models" / "src"
CORE_PORTS_FILE = ACTIVE_CRATE_ROOT / "core" / "ports.rs"

ROOT_ORCHESTRATOR_WARNING_LIMIT = 220
ROOT_ORCHESTRATOR_FAILURE_LIMIT = 320
SERVICE_OWNERSHIP_WARNING_BACKENDS = 3
ROOT_ORCHESTRATOR_CANDIDATES: tuple[str, ...] = (
    "g5-admin/src/features/layout/navigation.ts",
    "g5-admin/src/features/layout/AppShell.tsx",
    "g5-admin-models/src/lib.rs",
    "g5-admin-models/src/models/mod.rs",
    "g5-admin/src-tauri/src/lib.rs",
    "g5-admin/src-tauri/src/api_client/mod.rs",
    "g5-admin/src-tauri/src/error/mod.rs",
    "g5-admin/src-tauri/src/db/mod.rs",
    "g5-admin/src-tauri/src/app_state/mod.rs",
    "g5-admin/src-tauri/src/commands/registry.rs",
)

ALLOWED_COMMAND_APP_STATE_METHODS = {
    "admin_api",
    "database_path",
    "site_catalog_service",
    "security_settings_service",
    "master_lock_service",
    "session_service",
}

SERVICE_BACKEND_MARKERS: tuple[tuple[str, str], ...] = (
    ("session_store", ".session_store("),
    ("site_catalog_store", ".site_catalog_store("),
    ("security_store", ".security_store("),
    ("backup_store", ".backup_store("),
    ("admin_api", ".admin_api("),
    ("site_manager", ".site_manager"),
)

MODELS_CRATE_FORBIDDEN_IMPORTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\breqwest::"),
        "models crate must not depend on HTTP client types",
    ),
    (
        re.compile(r"\brusqlite::"),
        "models crate must not depend on database types",
    ),
    (
        re.compile(r"\btauri::"),
        "models crate must not depend on Tauri runtime types",
    ),
    (
        re.compile(r"\btokio::"),
        "models crate must not depend on async runtime types",
    ),
    (
        re.compile(r"\bkeyring::"),
        "models crate must not depend on secure storage types",
    ),
    (
        re.compile(r"\bdirs::"),
        "models crate must not depend on filesystem location helpers",
    ),
    (
        re.compile(r"\bcrate::(?:app_state|db|token_store|runtime_config|site_manager|api_client)\b"),
        "models crate must not reference shell/infra modules",
    ),
)

TRANSACTION_BOUNDARY_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\.transaction\("),
        "transaction API usage must stay inside db layer",
    ),
    (
        re.compile(r"\bTransaction\b"),
        "rusqlite Transaction type usage must stay inside db layer",
    ),
    (
        re.compile(r'execute_batch\(\s*"[^"]*\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b'),
        "manual SQL transaction control must stay inside db layer",
    ),
)

FORBIDDEN_COMMAND_IMPORTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\b(?:use\s+)?crate::db(?:::|;)"),
        "commands must not import db concrete implementations directly",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::token_store(?:::|;)"),
        "commands must not import token_store directly",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::runtime_config(?:::|;)"),
        "commands must not import runtime_config directly",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::api_client(?:::|;)"),
        "commands must not import api_client concrete modules directly",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::site_manager(?:::|;)"),
        "commands must not import site_manager directly",
    ),
)

FORBIDDEN_SHARED_COMMON_IMPORTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\b(?:use\s+)?crate::db(?:::|;)"),
        "shared/common must not depend on db concrete implementations",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::token_store(?:::|;)"),
        "shared/common must not depend on token_store",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::runtime_config(?:::|;)"),
        "shared/common must not depend on runtime_config",
    ),
    (
        re.compile(r"\b(?:use\s+)?crate::api_client::ApiClient\b"),
        "shared/common must not depend on ApiClient concrete type",
    ),
    (
        re.compile(r"\bstd::fs\b|\btokio::fs\b"),
        "shared/common must not perform filesystem IO directly",
    ),
    (
        re.compile(r"\brusqlite::"),
        "shared/common must not open database dependencies directly",
    ),
    (
        re.compile(r"\breqwest::"),
        "shared/common must not perform HTTP client work directly",
    ),
    (
        re.compile(r"\bkeyring::"),
        "shared/common must not talk to secure storage directly",
    ),
)

LEGACY_REFERENCE_PATTERN = re.compile(
    r"::legacy::|use\s+super::legacy\b|use\s+crate::commands::[^\n;]*::legacy\b"
)
APP_STATE_METHOD_CALL_PATTERN = re.compile(
    r"\bstate(?:\.inner\(\))?\.(?P<method>[A-Za-z_][A-Za-z0-9_]*)\("
)
FUNCTION_PATTERN = re.compile(
    r"\b(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\("
)


@dataclass(frozen=True)
class Finding:
    severity: str
    rule: str
    path: str
    detail: str


def rust_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*.rs") if path.is_file())


def is_test_path(path: Path) -> bool:
    return "tests" in path.parts


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def workspace_members() -> list[str]:
    manifest = tomllib.loads(WORKSPACE_MANIFEST.read_text(encoding="utf-8"))
    return list(manifest["workspace"]["members"])


def crate_rust_sources(crate_root: Path) -> list[Path]:
    src_root = crate_root / "src"
    if not src_root.exists():
        return []
    return rust_files(src_root)


def count_lines(path: Path) -> int:
    return sum(1 for _ in path.open("r", encoding="utf-8", errors="ignore"))


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


def placeholder_notes() -> list[str]:
    notes: list[str] = []
    for member in workspace_members():
        crate_root = ROOT / member
        sources = crate_rust_sources(crate_root)
        line_count = sum(count_lines(path) for path in sources)
        readme = crate_root / "README.md"
        readme_text = read_text(readme) if readme.exists() else ""
        if line_count <= 20 or "placeholder" in readme_text.lower() or "구현 예정" in readme_text:
            notes.append(
                f"{member}: placeholder crate로 분류 (rust_loc={line_count})"
            )
    return notes


def command_import_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in rust_files(COMMANDS_ROOT):
        if is_test_path(path) or path.name == "registry.rs":
            continue
        text = read_text(path)
        for pattern, message in FORBIDDEN_COMMAND_IMPORTS:
            if pattern.search(text):
                findings.append(
                    Finding(
                        severity="failure",
                        rule="commands_direct_infra_import",
                        path=relative(path),
                        detail=message,
                    )
                )
    return findings


def command_app_state_bypass_findings() -> list[Finding]:
    findings: list[Finding] = []
    app_state_methods = app_state_public_methods()
    forbidden_methods = app_state_methods - ALLOWED_COMMAND_APP_STATE_METHODS
    if not forbidden_methods:
        return findings

    for path in rust_files(COMMANDS_ROOT):
        if is_test_path(path) or path.name == "registry.rs":
            continue
        text = read_text(path)
        for match in APP_STATE_METHOD_CALL_PATTERN.finditer(text):
            method = match.group("method")
            if method not in forbidden_methods:
                continue
            findings.append(
                Finding(
                    severity="failure",
                    rule="commands_app_state_wrapper_bypass",
                    path=relative(path),
                    detail=(
                        f"commands must not call AppState::{method} directly; "
                        "go through service/core::ports seams instead"
                    ),
                )
            )
    return findings


def shared_common_findings() -> list[Finding]:
    findings: list[Finding] = []
    candidates: list[Path] = []
    for path in rust_files(ACTIVE_CRATE_ROOT):
        if is_test_path(path):
            continue
        if is_shared_common_candidate(path):
            candidates.append(path)

    for path in candidates:
        text = read_text(path)
        for pattern, message in FORBIDDEN_SHARED_COMMON_IMPORTS:
            if pattern.search(text):
                findings.append(
                    Finding(
                        severity="warning",
                        rule="shared_common_boundary_leak",
                        path=relative(path),
                        detail=message,
                    )
                )
    return findings


def is_shared_common_candidate(path: Path) -> bool:
    if path.name in {"common.rs", "shared.rs"}:
        return True

    parts = path.relative_to(ACTIVE_CRATE_ROOT).parts
    for index, part in enumerate(parts[:-1]):
        if part in {"shared", "common"}:
            # shared/common namespace의 바로 아래 파일까지만 1차 감사 대상으로 본다.
            return len(parts) - index - 1 == 1

    return False


def app_state_public_methods() -> set[str]:
    text = read_text(APP_STATE_MOD)
    impl_marker = "impl AppState {"
    start = text.find(impl_marker)
    if start < 0:
        return set()

    body = text[start + len(impl_marker):]
    brace_depth = 1
    collected: list[str] = []
    for char in body:
        if char == "{":
            brace_depth += 1
        elif char == "}":
            brace_depth -= 1
            if brace_depth == 0:
                break
        collected.append(char)

    impl_body = "".join(collected)
    methods = re.findall(
        r"pub(?:\([^)]*\))?\s+(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(",
        impl_body,
    )
    return set(methods)


def legacy_quarantine_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in rust_files(ACTIVE_CRATE_ROOT):
        if is_test_path(path):
            continue
        text = read_text(path)
        if not LEGACY_REFERENCE_PATTERN.search(text):
            continue

        relative_path = relative(path)
        allowed = (
            "/legacy/" in relative_path
            or relative_path.endswith("/legacy.rs")
            or relative_path.endswith("commands/registry.rs")
            or relative_path.endswith("commands/registry_groups.rs")
        )
        if not allowed:
            findings.append(
                Finding(
                    severity="failure",
                    rule="legacy_quarantine_violation",
                    path=relative_path,
                    detail="legacy 구현은 registry 또는 legacy namespace 밖에서 직접 참조하면 안 됩니다.",
                )
            )
    return findings


def root_orchestrator_findings() -> list[Finding]:
    findings: list[Finding] = []
    for candidate in ROOT_ORCHESTRATOR_CANDIDATES:
        path = ROOT / candidate
        if not path.exists():
            continue
        lines = count_lines(path)
        if lines > ROOT_ORCHESTRATOR_FAILURE_LIMIT:
            findings.append(
                Finding(
                    severity="failure",
                    rule="root_orchestrator_too_large",
                    path=candidate,
                    detail=(
                        f"root orchestrator/module is {lines} LOC; "
                        f"limit is {ROOT_ORCHESTRATOR_FAILURE_LIMIT}"
                    ),
                )
            )
        elif lines > ROOT_ORCHESTRATOR_WARNING_LIMIT:
            findings.append(
                Finding(
                    severity="warning",
                    rule="root_orchestrator_growth",
                    path=candidate,
                    detail=(
                        f"root orchestrator/module is {lines} LOC; "
                        f"warning threshold is {ROOT_ORCHESTRATOR_WARNING_LIMIT}"
                    ),
                )
            )
    return findings


def service_ownership_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(APP_STATE_ROOT.glob("*service.rs")):
        text = read_text(path)
        touched = [
            label
            for label, marker in SERVICE_BACKEND_MARKERS
            if marker in text
        ]
        if len(touched) < SERVICE_OWNERSHIP_WARNING_BACKENDS:
            continue
        findings.append(
            Finding(
                severity="warning",
                rule="service_ownership_hotspot",
                path=relative(path),
                detail=(
                    "service touches multiple backend seams: "
                    + ", ".join(touched)
                ),
            )
        )
    return findings


def service_method_ownership_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(APP_STATE_ROOT.glob("*service.rs")):
        text = read_text(path)
        for function_name, body in extract_functions(text):
            touched = [
                label
                for label, marker in SERVICE_BACKEND_MARKERS
                if marker in body
            ]
            if len(touched) < SERVICE_OWNERSHIP_WARNING_BACKENDS:
                continue
            findings.append(
                Finding(
                    severity="warning",
                    rule="service_method_ownership_hotspot",
                    path=relative(path),
                    detail=(
                        f"{function_name} touches multiple backend seams: "
                        + ", ".join(touched)
                    ),
                )
            )
    return findings


def models_crate_purity_findings() -> list[Finding]:
    findings: list[Finding] = []
    if not MODELS_CRATE_ROOT.exists():
        return findings

    for path in rust_files(MODELS_CRATE_ROOT):
        if is_test_path(path):
            continue
        text = read_text(path)
        for pattern, message in MODELS_CRATE_FORBIDDEN_IMPORTS:
            if pattern.search(text):
                findings.append(
                    Finding(
                        severity="failure",
                        rule="models_crate_purity_violation",
                        path=relative(path),
                        detail=message,
                    )
                )
    return findings


def transaction_boundary_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in rust_files(ACTIVE_CRATE_ROOT):
        if is_test_path(path):
            continue
        if path.is_relative_to(ACTIVE_CRATE_ROOT / "db"):
            continue
        text = read_text(path)
        for pattern, message in TRANSACTION_BOUNDARY_PATTERNS:
            if pattern.search(text):
                findings.append(
                    Finding(
                        severity="failure",
                        rule="transaction_boundary_violation",
                        path=relative(path),
                        detail=message,
                    )
                )
                break
    return findings


def ports_concrete_coupling_findings() -> list[Finding]:
    findings: list[Finding] = []
    for message in core_ports_concrete_budget():
        findings.append(
            Finding(
                severity="warning",
                rule="core_ports_concrete_coupling",
                path=relative(CORE_PORTS_FILE),
                detail=message,
            )
        )
    return findings


def source_of_truth_findings() -> list[Finding]:
    findings: list[Finding] = []
    for result in collect_source_of_truth_results():
        hits = list(result.hits)
        if hits == [result.expected_path]:
            continue
        if not hits:
            detail = (
                f"{result.description} marker must be owned by "
                f"{result.expected_path}, but no active source was found"
            )
        else:
            detail = (
                f"{result.description} marker must be owned by "
                f"{result.expected_path}, found hits={', '.join(hits)}"
            )
        findings.append(
            Finding(
                severity="failure",
                rule="source_of_truth_conflict",
                path=result.expected_path,
                detail=detail,
            )
        )
    return findings


def registry_alignment_findings() -> list[Finding]:
    findings: list[Finding] = []
    report = collect_registry_alignment_report()

    if not report.command_context_commands:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_empty_command_context_registry",
                path="g5-admin/src/api/client/core/command-context-registry.ts",
                detail="command context registry scanner returned zero commands",
            )
        )

    if not report.api_target_commands:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_empty_api_target_registry",
                path="g5-admin/src/api/client/core/api-target-registry.ts",
                detail="api target registry scanner returned zero commands",
            )
        )

    if not report.ipc_commands:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_empty_ipc_registry",
                path="g5-admin/src-tauri/src/commands/registry_groups.rs",
                detail="IPC registry scanner returned zero commands",
            )
        )

    if report.missing_api_targets_for_context:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_missing_api_target",
                path="g5-admin/src/api/client/core/api-target-registry.ts",
                detail=(
                    "command context registry commands missing api target entries: "
                    + ", ".join(sorted(report.missing_api_targets_for_context))
                ),
            )
        )

    if report.missing_context_for_api_targets:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_missing_context",
                path="g5-admin/src/api/client/core/command-context-registry.ts",
                detail=(
                    "api target registry commands missing diagnostic context builders: "
                    + ", ".join(sorted(report.missing_context_for_api_targets))
                ),
            )
        )

    if report.missing_ipc_for_api_targets:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_missing_ipc_command",
                path="g5-admin/src-tauri/src/commands/registry_groups.rs",
                detail=(
                    "api target registry commands missing from the IPC registry: "
                    + ", ".join(sorted(report.missing_ipc_for_api_targets))
                ),
            )
        )

    if report.unexpected_ipc_only_commands:
        findings.append(
            Finding(
                severity="failure",
                rule="registry_alignment_unexpected_ipc_only_command",
                path="g5-admin/src-tauri/src/commands/registry.rs",
                detail=(
                    "IPC registry exposes commands without approved frontend metadata coverage: "
                    + ", ".join(sorted(report.unexpected_ipc_only_commands))
                ),
            )
        )

    if report.missing_navigation_paths:
        findings.append(
            Finding(
                severity="failure",
                rule="navigation_api_target_drift",
                path="g5-admin/src/features/layout/navigation-manifest.ts",
                detail=(
                    "navigation manifest admin apiTargets are not covered by api-target-registry: "
                    + ", ".join(sorted(report.missing_navigation_paths))
                ),
            )
        )

    return findings


def giant_registry_priority_findings() -> list[Finding]:
    findings: list[Finding] = []
    for status in collect_giant_priority_statuses():
        if status.kind == "root-orchestrator" or status.path in ROOT_ORCHESTRATOR_CANDIDATES:
            continue
        if status.status == "warn":
            findings.append(
                Finding(
                    severity="warning",
                    rule="giant_registry_priority",
                    path=status.path,
                    detail=(
                        f"{status.kind} is {status.lines} LOC; "
                        f"warning threshold is {status.warning_limit}"
                    ),
                )
            )
        elif status.status == "fail":
            findings.append(
                Finding(
                    severity="failure",
                    rule="giant_registry_priority",
                    path=status.path,
                    detail=(
                        f"{status.kind} is {status.lines} LOC; "
                        f"limit is {status.failure_limit}"
                    ),
                )
            )
    return findings


def registry_alignment_notes() -> list[str]:
    report = collect_registry_alignment_report()
    notes: list[str] = []
    if report.allowed_ipc_only_commands:
        notes.append(
            "approved IPC-only commands: "
            + ", ".join(sorted(report.allowed_ipc_only_commands))
        )
    notes.append(
        "registry_alignment_counts: "
        f"context={len(report.command_context_commands)}, "
        f"api_targets={len(report.api_target_commands)}, "
        f"ipc={len(report.ipc_commands)}"
    )
    return notes


def ownership_watch_notes() -> list[str]:
    notes = registry_alignment_notes()
    notes.append(first_core_boundary())
    readiness = collect_service_readiness()
    if readiness:
        first_candidate = min(readiness, key=lambda item: (item.blocker_count, item.name))
        notes.append(
            "core_split_first_candidate: "
            f"{first_candidate.name} blockers={first_candidate.blocker_count}"
        )
    return notes


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def collect_findings() -> list[Finding]:
    return (
        command_import_findings()
        + command_app_state_bypass_findings()
        + legacy_quarantine_findings()
        + shared_common_findings()
        + [
            Finding(
                severity=finding.severity,
                rule=finding.rule,
                path=finding.path,
                detail=finding.detail,
            )
            for finding in collect_frontend_feature_boundary_findings()
        ]
        + [
            Finding(
                severity=finding.severity,
                rule=finding.rule,
                path=finding.path,
                detail=finding.detail,
            )
            for finding in collect_support_root_boundary_findings()
        ]
        + source_of_truth_findings()
        + registry_alignment_findings()
        + root_orchestrator_findings()
        + giant_registry_priority_findings()
        + service_ownership_findings()
        + service_method_ownership_findings()
        + [
            Finding(
                severity=finding.severity,
                rule=finding.rule,
                path=finding.path,
                detail=finding.detail,
            )
            for finding in collect_app_state_service_wrapper_findings()
        ]
        + models_crate_purity_findings()
        + transaction_boundary_findings()
        + ports_concrete_coupling_findings()
    )


def render_markdown_summary(
    *,
    failures: list[Finding],
    warnings: list[Finding],
    notes: list[str],
    waived: list[tuple[Finding, Waiver]],
) -> str:
    lines = [
        "## Structure Audit Summary",
        "",
        "### Failure",
    ]
    if failures:
        for finding in failures:
            lines.append(f"- `{finding.rule}` `{finding.path}` :: {finding.detail}")
    else:
        lines.append("- none")

    lines.extend(["", "### Warning"])
    if warnings:
        for finding in warnings:
            lines.append(f"- `{finding.rule}` `{finding.path}` :: {finding.detail}")
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
            f"- workspace_members: `{len(workspace_members())}`",
            "- active_crate: `g5-admin/src-tauri`",
            f"- failure_count: `{len(failures)}`",
            f"- warning_count: `{len(warnings)}`",
            f"- waived_count: `{len(waived)}`",
            f"- note_count: `{len(notes)}`",
        ]
    )

    lines.extend(["", "### Waived"])
    if waived:
        for finding, waiver in waived:
            lines.append(
                f"- `{waiver.id}` `{finding.rule}` `{finding.path}` "
                f"(owner={waiver.owner}, expires={waiver.expires_on}) :: {waiver.reason}"
            )
    else:
        lines.append("- none")

    return "\n".join(lines) + "\n"


def append_step_summary(markdown: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(markdown)
        if not markdown.endswith("\n"):
            handle.write("\n")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--registry-only",
        action="store_true",
        help="run only registry scanner-zero and bilateral alignment checks",
    )
    args = parser.parse_args(argv)

    waivers = load_waivers()
    findings = registry_alignment_findings() if args.registry_only else collect_findings()
    waived: list[tuple[Finding, object]] = []
    active_findings: list[Finding] = []
    for finding in findings:
        waiver = find_matching_waiver(
            waivers,
            audit="structure",
            severity=finding.severity,
            rule=finding.rule,
            path=finding.path,
        )
        if waiver is None:
            active_findings.append(finding)
            continue
        waived.append((finding, waiver))

    failures = [finding for finding in active_findings if finding.severity == "failure"]
    warnings = [finding for finding in active_findings if finding.severity == "warning"]
    notes = (
        registry_alignment_notes()
        if args.registry_only
        else placeholder_notes() + ownership_watch_notes() + domain_boundary_notes()
    )

    print_section(
        "registry_alignment_audit" if args.registry_only else "active_crate_boundary_audit"
    )
    print(f"workspace_members={len(workspace_members())}")
    print(f"active_crate=g5-admin/src-tauri")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"waived={len(waived)}")
    print(f"notes={len(notes)}")

    print_section("notes")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")

    print_section("waived")
    if waived:
        for finding, waiver in waived:
            print(
                "WAIVED "
                f"{waiver.id} {finding.rule} {finding.path} "
                f"owner={waiver.owner} expires={waiver.expires_on} :: {waiver.reason}"
            )
    else:
        print("none")

    print_section("warnings")
    if warnings:
        for finding in warnings:
            print(
                f"WARN {finding.rule} {finding.path} :: {finding.detail}"
            )
    else:
        print("none")

    print_section("failures")
    if failures:
        for finding in failures:
            print(
                f"FAIL {finding.rule} {finding.path} :: {finding.detail}"
            )
        append_step_summary(
            render_markdown_summary(
                failures=failures,
                warnings=warnings,
                notes=notes,
                waived=waived,
            )
        )
        raise SystemExit(1)
    print("none")
    append_step_summary(
        render_markdown_summary(
            failures=failures,
            warnings=warnings,
            notes=notes,
            waived=waived,
        )
    )
    print(
        "PASS: registry alignment audit"
        if args.registry_only
        else "PASS: active crate boundary audit"
    )


if __name__ == "__main__":
    main()
