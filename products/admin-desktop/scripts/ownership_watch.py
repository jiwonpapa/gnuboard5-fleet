#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "g5-admin" / "src"
BACKEND_ROOT = ROOT / "g5-admin" / "src-tauri" / "src"
COMMAND_CONTEXT_BUILDERS_ROOT = (
    FRONTEND_ROOT / "api" / "client" / "core" / "command-context-builders"
)
COMMAND_CONTEXT_REGISTRY = (
    FRONTEND_ROOT / "api" / "client" / "core" / "command-context-registry.ts"
)
API_TARGET_REGISTRY = (
    FRONTEND_ROOT / "api" / "client" / "core" / "api-target-registry.ts"
)
API_TARGET_REGISTRY_GROUPS_ROOT = (
    FRONTEND_ROOT / "api" / "client" / "core" / "api-target-registry-groups"
)
NAVIGATION_MANIFEST = FRONTEND_ROOT / "features" / "layout" / "navigation-manifest.ts"
SCHEMA_DOMAIN_FILE = FRONTEND_ROOT / "features" / "schema" / "useAdminFieldSchema.ts"
IPC_REGISTRY = BACKEND_ROOT / "commands" / "registry.rs"
IPC_REGISTRY_GROUPS = BACKEND_ROOT / "commands" / "registry_groups.rs"
CORE_PORTS_FILE = BACKEND_ROOT / "core" / "ports.rs"

ALLOWED_IPC_ONLY_COMMANDS: set[str] = set()

COMMAND_KEY_PATTERN = re.compile(r'"(cmd_[a-z0-9_]+)"\s*:')
IPC_COMMAND_PATTERN = re.compile(r"::(cmd_[a-z0-9_]+)")
NAVIGATION_API_TARGET_PATTERN = re.compile(
    r'"(?:GET|POST|PUT|PATCH|DELETE)\s+(/admin/[^"]+)"'
)
API_TARGET_VALUE_PATTERN = re.compile(r'"cmd_[a-z0-9_]+"\s*:\s*"([^"]+)"')

PORTS_CONCRETE_MARKERS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\buse\s+crate::api_client::ApiClient\b"),
        "imports ApiClient concrete adapter",
    ),
    (
        re.compile(
            r"\buse\s+crate::db::(?:BackupImportSummary|SiteInsert|SiteRepository|SiteUpdateRecord|AppLockRecord)\b"
        ),
        "imports SiteRepository-backed storage types",
    ),
    (
        re.compile(r"\buse\s+crate::token_store::TokenStore\b"),
        "imports TokenStore concrete adapter",
    ),
    (
        re.compile(
            r"\bimpl\s+(?:[A-Za-z_][A-Za-z0-9_]*Port)\s+for\s+(?:ApiClient|SiteRepository|TokenStore)\b"
        ),
        "co-locates concrete adapter impls with port definitions",
    ),
)


@dataclass(frozen=True)
class SourceOfTruthRule:
    rule: str
    description: str
    expected_path: str
    pattern: re.Pattern[str]
    glob_patterns: tuple[str, ...]


@dataclass(frozen=True)
class SourceOfTruthResult:
    rule: str
    description: str
    expected_path: str
    hits: tuple[str, ...]


@dataclass(frozen=True)
class RegistryAlignmentReport:
    command_context_commands: frozenset[str]
    api_target_commands: frozenset[str]
    ipc_commands: frozenset[str]
    missing_api_targets_for_context: frozenset[str]
    missing_context_for_api_targets: frozenset[str]
    missing_ipc_for_api_targets: frozenset[str]
    unexpected_ipc_only_commands: frozenset[str]
    allowed_ipc_only_commands: frozenset[str]
    navigation_admin_paths: frozenset[str]
    api_target_admin_paths: frozenset[str]
    missing_navigation_paths: frozenset[str]


@dataclass(frozen=True)
class PriorityCandidate:
    path: str
    kind: str
    warning_limit: int
    failure_limit: int


@dataclass(frozen=True)
class PriorityStatus:
    path: str
    kind: str
    lines: int
    status: str
    warning_limit: int
    failure_limit: int


SOURCE_OF_TRUTH_RULES: tuple[SourceOfTruthRule, ...] = (
    SourceOfTruthRule(
        rule="navigation_api_targets_owner",
        description="navigation apiTargets manifest owner",
        expected_path="g5-admin/src/features/layout/navigation-manifest.ts",
        pattern=re.compile(r"\bapiTargets\s*:\s*\["),
        glob_patterns=("g5-admin/src/**/*.ts", "g5-admin/src/**/*.tsx"),
    ),
    SourceOfTruthRule(
        rule="schema_domain_union_owner",
        description="schema domain union owner",
        expected_path="g5-admin/src/features/schema/useAdminFieldSchema.ts",
        pattern=re.compile(r"\bexport\s+type\s+AdminFieldSchemaDomain\b"),
        glob_patterns=("g5-admin/src/**/*.ts", "g5-admin/src/**/*.tsx"),
    ),
    SourceOfTruthRule(
        rule="command_context_registry_owner",
        description="command context registry owner",
        expected_path="g5-admin/src/api/client/core/command-context-registry.ts",
        pattern=re.compile(r"\bexport\s+const\s+commandContextBuilders\b"),
        glob_patterns=("g5-admin/src/**/*.ts", "g5-admin/src/**/*.tsx"),
    ),
    SourceOfTruthRule(
        rule="api_target_registry_owner",
        description="api target registry owner",
        expected_path="g5-admin/src/api/client/core/api-target-registry.ts",
        pattern=re.compile(r"\bexport\s+const\s+apiTargetsByCommand\b"),
        glob_patterns=("g5-admin/src/**/*.ts", "g5-admin/src/**/*.tsx"),
    ),
    SourceOfTruthRule(
        rule="ipc_registry_owner",
        description="IPC invoke handler registry owner",
        expected_path="g5-admin/src-tauri/src/commands/registry.rs",
        pattern=re.compile(r"\bmacro_rules!\s+app_invoke_handler\b"),
        glob_patterns=("g5-admin/src-tauri/src/**/*.rs",),
    ),
)

GIANT_PRIORITY_CANDIDATES: tuple[PriorityCandidate, ...] = (
    PriorityCandidate(
        path="g5-admin/src/features/layout/navigation-manifest.ts",
        kind="data-manifest",
        warning_limit=700,
        failure_limit=900,
    ),
    PriorityCandidate(
        path="g5-admin/src/api/client/core/api-target-registry.ts",
        kind="registry",
        warning_limit=220,
        failure_limit=320,
    ),
    PriorityCandidate(
        path="g5-admin/src/api/client/core/command-context-registry.ts",
        kind="registry",
        warning_limit=220,
        failure_limit=320,
    ),
    PriorityCandidate(
        path="g5-admin/src-tauri/src/commands/registry.rs",
        kind="registry",
        warning_limit=220,
        failure_limit=320,
    ),
    PriorityCandidate(
        path="g5-admin/src-tauri/src/error/mod.rs",
        kind="root-orchestrator",
        warning_limit=220,
        failure_limit=320,
    ),
    PriorityCandidate(
        path="g5-admin/src-tauri/src/app_state/mod.rs",
        kind="root-orchestrator",
        warning_limit=220,
        failure_limit=320,
    ),
    PriorityCandidate(
        path="g5-admin/src-tauri/src/core/ports.rs",
        kind="port-definition",
        warning_limit=220,
        failure_limit=320,
    ),
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def count_lines(path: Path) -> int:
    return sum(1 for _ in path.open("r", encoding="utf-8", errors="ignore"))


def normalize_path(path: str) -> str:
    return re.sub(r"\{[^}]*\}", "{param}", path)


def _iter_globbed_files(glob_patterns: tuple[str, ...]) -> list[Path]:
    files: set[Path] = set()
    for pattern in glob_patterns:
        files.update(path for path in ROOT.glob(pattern) if path.is_file())
    return sorted(files)


def collect_source_of_truth_results() -> list[SourceOfTruthResult]:
    results: list[SourceOfTruthResult] = []
    for rule in SOURCE_OF_TRUTH_RULES:
        hits = tuple(
            relative(path)
            for path in _iter_globbed_files(rule.glob_patterns)
            if rule.pattern.search(read_text(path))
        )
        results.append(
            SourceOfTruthResult(
                rule=rule.rule,
                description=rule.description,
                expected_path=rule.expected_path,
                hits=hits,
            )
        )
    return results


def extract_command_context_commands() -> set[str]:
    commands: set[str] = set()
    if not COMMAND_CONTEXT_BUILDERS_ROOT.exists():
        return commands
    for path in sorted(COMMAND_CONTEXT_BUILDERS_ROOT.rglob("*.ts")):
        text = read_text(path)
        commands.update(COMMAND_KEY_PATTERN.findall(text))
    return commands


def iter_api_target_registry_texts() -> list[str]:
    texts: list[str] = []
    if API_TARGET_REGISTRY.exists():
        texts.append(read_text(API_TARGET_REGISTRY))
    if API_TARGET_REGISTRY_GROUPS_ROOT.is_dir():
        for path in sorted(API_TARGET_REGISTRY_GROUPS_ROOT.rglob("*.ts")):
            texts.append(read_text(path))
    return texts


def extract_api_target_commands() -> set[str]:
    commands: set[str] = set()
    for text in iter_api_target_registry_texts():
        commands.update(COMMAND_KEY_PATTERN.findall(text))
    return commands


def extract_api_target_admin_paths() -> set[str]:
    values: list[str] = []
    for text in iter_api_target_registry_texts():
        values.extend(API_TARGET_VALUE_PATTERN.findall(text))
    return {
        normalize_path(value)
        for value in values
        if value.startswith("/admin/")
    }


def extract_navigation_manifest_admin_paths() -> set[str]:
    if not NAVIGATION_MANIFEST.exists():
        return set()
    return {
        normalize_path(path)
        for path in NAVIGATION_API_TARGET_PATTERN.findall(read_text(NAVIGATION_MANIFEST))
    }


def extract_ipc_registry_commands() -> set[str]:
    commands: set[str] = set()
    for path in (IPC_REGISTRY_GROUPS, IPC_REGISTRY):
        if path.exists():
            commands.update(IPC_COMMAND_PATTERN.findall(read_text(path)))
    return commands


def collect_registry_alignment_report() -> RegistryAlignmentReport:
    command_context_commands = extract_command_context_commands()
    api_target_commands = extract_api_target_commands()
    ipc_commands = extract_ipc_registry_commands()
    navigation_admin_paths = extract_navigation_manifest_admin_paths()
    api_target_admin_paths = extract_api_target_admin_paths()

    missing_api_targets_for_context = command_context_commands - api_target_commands
    missing_context_for_api_targets = api_target_commands - command_context_commands
    missing_ipc_for_api_targets = api_target_commands - ipc_commands
    ipc_only_commands = ipc_commands - api_target_commands
    allowed_ipc_only_commands = ipc_only_commands & ALLOWED_IPC_ONLY_COMMANDS
    unexpected_ipc_only_commands = ipc_only_commands - ALLOWED_IPC_ONLY_COMMANDS
    missing_navigation_paths = navigation_admin_paths - api_target_admin_paths

    return RegistryAlignmentReport(
        command_context_commands=frozenset(command_context_commands),
        api_target_commands=frozenset(api_target_commands),
        ipc_commands=frozenset(ipc_commands),
        missing_api_targets_for_context=frozenset(missing_api_targets_for_context),
        missing_context_for_api_targets=frozenset(missing_context_for_api_targets),
        missing_ipc_for_api_targets=frozenset(missing_ipc_for_api_targets),
        unexpected_ipc_only_commands=frozenset(unexpected_ipc_only_commands),
        allowed_ipc_only_commands=frozenset(allowed_ipc_only_commands),
        navigation_admin_paths=frozenset(navigation_admin_paths),
        api_target_admin_paths=frozenset(api_target_admin_paths),
        missing_navigation_paths=frozenset(missing_navigation_paths),
    )


def collect_giant_priority_statuses() -> list[PriorityStatus]:
    statuses: list[PriorityStatus] = []
    for candidate in GIANT_PRIORITY_CANDIDATES:
        path = ROOT / candidate.path
        if not path.exists():
            statuses.append(
                PriorityStatus(
                    path=candidate.path,
                    kind=candidate.kind,
                    lines=0,
                    status="missing",
                    warning_limit=candidate.warning_limit,
                    failure_limit=candidate.failure_limit,
                )
            )
            continue
        lines = count_lines(path)
        if lines > candidate.failure_limit:
            status = "fail"
        elif lines > candidate.warning_limit:
            status = "warn"
        else:
            status = "ok"
        statuses.append(
            PriorityStatus(
                path=candidate.path,
                kind=candidate.kind,
                lines=lines,
                status=status,
                warning_limit=candidate.warning_limit,
                failure_limit=candidate.failure_limit,
            )
        )
    return statuses


def core_ports_concrete_budget() -> list[str]:
    if not CORE_PORTS_FILE.exists():
        return []
    text = read_text(CORE_PORTS_FILE)
    return [message for pattern, message in PORTS_CONCRETE_MARKERS if pattern.search(text)]
