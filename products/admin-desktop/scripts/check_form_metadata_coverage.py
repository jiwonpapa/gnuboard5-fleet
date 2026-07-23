#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

from audit_harness.paths import resolve_php_root

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "specs" / "domains" / "FORM_METADATA_COVERAGE.toml"
PROVIDER_SCHEMA_PATH = (
    resolve_php_root(ROOT)
    / "api"
    / "v1"
    / "Admin"
    / "Schema"
    / "schema-domains.json"
)
SOURCE_SUFFIXES = {".ts", ".tsx"}
IGNORE_PARTS = {".test.", ".spec."}

HOOK_PATTERN = re.compile(r"\buseAdminFieldSchema\(")
GATE_PATTERN = re.compile(r"\b(?:FieldSchemaStatePanel|hasFieldSchemaState)\b")
SCHEMA_NULL_PATTERN = re.compile(r"\b(?:fieldSchema|schema)\s*===\s*null\b")
SCHEMA_LOADING_PATTERN = re.compile(r"\bschemaLoading\b")
SCHEMA_HIDE_MESSAGE_PATTERN = re.compile(r"숨겼습니다|메타데이터를 불러오는 중")
LABEL_PATTERN = re.compile(r"\bgetFieldLabel\(")
DESCRIPTION_PATTERN = re.compile(r"\bgetFieldDescription\(")
OPTIONS_PATTERN = re.compile(r"\bgetFieldOptions\(")
WIDGET_PATTERN = re.compile(r"\binput_type\b")


@dataclass(frozen=True)
class RegistryEntry:
    feature: str
    path: Path
    mode: str
    schema_domains: tuple[str, ...]
    priority: str
    target_level: str
    provider_blocker: str
    next_action: str


@dataclass(frozen=True)
class MetadataAuditResult:
    feature: str
    mode: str
    schema_domains: tuple[str, ...]
    priority: str
    target_level: str
    provider_blocker: str
    next_action: str
    source_files: int
    schema_hook: bool
    schema_gate: bool
    label: bool
    description: bool
    options: bool
    widget: bool

    @property
    def level(self) -> str:
        if not self.schema_hook:
            return "local_only"
        if self.schema_gate and self.label and self.description and (self.options or self.widget):
            return "schema_full"
        if self.schema_gate and self.label:
            return "schema_labels"
        if self.schema_gate:
            return "schema_gate_only"
        return "schema_partial"

    def capability_summary(self) -> str:
        return (
            f"level={self.level} files={self.source_files} hook={flag(self.schema_hook)} "
            f"gate={flag(self.schema_gate)} label={flag(self.label)} "
            f"description={flag(self.description)} options={flag(self.options)} "
            f"widget={flag(self.widget)} blocker={self.provider_blocker or '-'}"
        )


@dataclass(frozen=True)
class CoverageFinding:
    severity: str
    feature: str
    detail: str


def flag(value: bool) -> str:
    return "yes" if value else "no"


def load_registry() -> list[RegistryEntry]:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    raw_entries = document.get("features", [])
    entries: list[RegistryEntry] = []
    if not isinstance(raw_entries, list):
        return entries

    for raw in raw_entries:
        if not isinstance(raw, dict):
            continue
        feature = str(raw.get("feature", "")).strip()
        path_value = str(raw.get("path", "")).strip()
        mode = str(raw.get("mode", "")).strip()
        priority = str(raw.get("priority", "")).strip()
        target_level = str(raw.get("target_level", "")).strip()
        provider_blocker = str(raw.get("provider_blocker", "")).strip()
        next_action = str(raw.get("next_action", "")).strip()
        schema_domains = tuple(
            value.strip()
            for value in raw.get("schema_domains", [])
            if isinstance(value, str) and value.strip()
        )
        if not feature or not path_value or not mode or not priority or not target_level or not next_action:
            continue
        entries.append(
            RegistryEntry(
                feature=feature,
                path=ROOT / path_value,
                mode=mode,
                schema_domains=schema_domains,
                priority=priority,
                target_level=target_level,
                provider_blocker=provider_blocker,
                next_action=next_action,
            )
        )
    return entries


def load_provider_schema_domains() -> set[str]:
    if not PROVIDER_SCHEMA_PATH.is_file():
        return set()
    document = json.loads(PROVIDER_SCHEMA_PATH.read_text(encoding="utf-8"))
    domains_raw = document.get("domains", [])
    if not isinstance(domains_raw, list):
        return set()
    domains: set[str] = set()
    for item in domains_raw:
        if not isinstance(item, dict):
            continue
        domain = str(item.get("domain", "")).strip()
        if domain:
            domains.add(domain)
    return domains


def iter_source_files(path: Path) -> list[Path]:
    files: list[Path] = []
    if path.is_file():
        if path.suffix in SOURCE_SUFFIXES and not any(part in path.name for part in IGNORE_PARTS):
            files.append(path)
        return files
    if not path.is_dir():
        return files
    for candidate in sorted(path.rglob("*")):
        if candidate.suffix not in SOURCE_SUFFIXES:
            continue
        if any(part in candidate.name for part in IGNORE_PARTS):
            continue
        files.append(candidate)
    return files


def scan_feature(entry: RegistryEntry) -> MetadataAuditResult:
    source_files = iter_source_files(entry.path)
    combined = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in source_files)
    schema_gate = bool(
        GATE_PATTERN.search(combined)
        or (
            SCHEMA_NULL_PATTERN.search(combined)
            and SCHEMA_LOADING_PATTERN.search(combined)
            and SCHEMA_HIDE_MESSAGE_PATTERN.search(combined)
        )
    )
    return MetadataAuditResult(
        feature=entry.feature,
        mode=entry.mode,
        schema_domains=entry.schema_domains,
        priority=entry.priority,
        target_level=entry.target_level,
        provider_blocker=entry.provider_blocker,
        next_action=entry.next_action,
        source_files=len(source_files),
        schema_hook=bool(HOOK_PATTERN.search(combined)),
        schema_gate=schema_gate,
        label=bool(LABEL_PATTERN.search(combined)),
        description=bool(DESCRIPTION_PATTERN.search(combined)),
        options=bool(OPTIONS_PATTERN.search(combined)),
        widget=bool(WIDGET_PATTERN.search(combined)),
    )


def collect_findings() -> tuple[list[CoverageFinding], list[str], list[MetadataAuditResult]]:
    findings: list[CoverageFinding] = []
    notes: list[str] = []
    results: list[MetadataAuditResult] = []

    registry = load_registry()
    provider_domains = load_provider_schema_domains()
    for entry in registry:
        result = scan_feature(entry)
        results.append(result)

        if result.source_files == 0:
            findings.append(
                CoverageFinding(
                    severity="failure",
                    feature=entry.feature,
                    detail=f"metadata registry path has no source files: {entry.path.relative_to(ROOT)}",
                )
            )
            continue

        if entry.mode == "schema_live":
            missing_provider_domains = [
                domain for domain in entry.schema_domains if domain not in provider_domains
            ]
            if provider_domains and missing_provider_domains:
                findings.append(
                    CoverageFinding(
                        severity="failure",
                        feature=entry.feature,
                        detail=(
                            "schema_live feature references missing provider schema domains: "
                            + ",".join(missing_provider_domains)
                        ),
                    )
                )
            if not result.schema_hook:
                findings.append(
                    CoverageFinding(
                        severity="failure",
                        feature=entry.feature,
                        detail="schema_live feature does not call useAdminFieldSchema",
                    )
                )
            if not result.schema_gate:
                findings.append(
                    CoverageFinding(
                        severity="failure",
                        feature=entry.feature,
                        detail="schema_live feature has no FieldSchemaStatePanel/hasFieldSchemaState gate",
                    )
                )
            if result.schema_hook and not result.label:
                findings.append(
                    CoverageFinding(
                        severity="warning",
                        feature=entry.feature,
                        detail="schema_live feature does not consume getFieldLabel helper",
                    )
                )
            if result.schema_hook and not result.description:
                findings.append(
                    CoverageFinding(
                        severity="warning",
                        feature=entry.feature,
                        detail="schema_live feature does not consume getFieldDescription helper",
                    )
                )
            if entry.target_level == "schema_full" and result.level != "schema_full":
                findings.append(
                    CoverageFinding(
                        severity="warning",
                        feature=entry.feature,
                        detail=(
                            f"target_level is schema_full but current level is {result.level}; "
                            f"next_action={entry.next_action}"
                        ),
                    )
                )
        elif entry.mode == "schema_planned":
            if result.level == "local_only":
                blocker = (
                    f"; blocked_by={entry.provider_blocker}"
                    if entry.provider_blocker
                    else ""
                )
                findings.append(
                    CoverageFinding(
                        severity="warning",
                        feature=entry.feature,
                        detail=(
                            "route-native admin form is still local-metadata only; "
                            f"priority={entry.priority}{blocker}; next_action={entry.next_action}"
                        ),
                    )
                )

    notes.append(f"features={len(results)}")
    notes.append(
        f"schema_live_features={sum(1 for result in results if result.mode == 'schema_live')}"
    )
    notes.append(
        f"schema_planned_features={sum(1 for result in results if result.mode == 'schema_planned')}"
    )
    notes.append(
        f"local_canonical_features={sum(1 for result in results if result.mode == 'local_canonical')}"
    )
    notes.append(f"provider_schema_domains={len(provider_domains)}")
    notes.append(
        f"provider_blocked_features={sum(1 for result in results if result.provider_blocker)}"
    )
    notes.append(
        f"schema_full_features={sum(1 for result in results if result.level == 'schema_full')}"
    )
    notes.append(
        f"schema_labels_features={sum(1 for result in results if result.level == 'schema_labels')}"
    )
    notes.append(
        f"local_only_features={sum(1 for result in results if result.level == 'local_only')}"
    )
    notes.append(
        "rollout_priority="
        + ",".join(
            result.feature
            for result in results
            if result.mode == "schema_planned" and result.priority == "p1"
        )
    )
    local_canonical = [
        result.feature for result in results if result.mode == "local_canonical"
    ]
    if local_canonical:
        notes.append("local_canonical=" + ",".join(local_canonical))
    return findings, notes, results


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def main() -> None:
    findings, notes, results = collect_findings()
    failures = [finding for finding in findings if finding.severity == "failure"]
    warnings = [finding for finding in findings if finding.severity == "warning"]
    blocked = [
        result
        for result in results
        if result.mode == "schema_planned" and result.provider_blocker
    ]

    print_section("form_metadata_coverage")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT)}")
    print(f"features={len(results)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")

    print_section("notes")
    for note in notes:
        print(f"NOTE {note}")

    print_section("evidence")
    for result in results:
        domains = ",".join(result.schema_domains) if result.schema_domains else "-"
        print(
            f"EVIDENCE {result.feature} :: priority={result.priority} target={result.target_level} "
            f"mode={result.mode} domains={domains} {result.capability_summary()}"
        )

    print_section("warnings")
    if warnings:
        for finding in warnings:
            print(f"WARN {finding.feature} :: {finding.detail}")
    else:
        print("none")

    print_section("blocked")
    if blocked:
        for result in blocked:
            print(
                f"BLOCKED {result.feature} :: owner=php_api blocker={result.provider_blocker} "
                f"priority={result.priority} target={result.target_level} next_action={result.next_action}"
            )
    else:
        print("none")

    print_section("failures")
    if failures:
        for finding in failures:
            print(f"FAIL {finding.feature} :: {finding.detail}")
        raise SystemExit(1)
    print("none")
    print("PASS: form metadata coverage audit")


if __name__ == "__main__":
    main()
