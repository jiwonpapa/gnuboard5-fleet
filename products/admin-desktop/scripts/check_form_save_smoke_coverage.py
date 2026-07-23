#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import tomllib


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "specs" / "domains" / "FORM_SAVE_SMOKE_COVERAGE.toml"
SOURCE_SUFFIXES = {".ts", ".tsx"}
INTERACTION_PATTERN = re.compile(
    r"\b(?:fireEvent|userEvent)\.(?:click|submit|change|type|clear|selectOptions)\("
)
VALIDATION_PATTERN = re.compile(
    r"\b(?:rejects?|requires?|invalid|validation|zod)\b|유효성|빈 값|빈 변경|선택된|비활성화",
    re.IGNORECASE,
)
UNSUPPORTED_PATTERN = re.compile(
    r"status\s*:\s*404|resource\.not_found|unsupported|기능을 사용할 수 없습니다|제공하지 않거나 비활성화",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class RegistryEntry:
    feature: str
    path: Path
    transport: str
    priority: str
    target_level: str
    page_tests: tuple[Path, ...]
    supporting_tests: tuple[Path, ...]
    save_symbols: tuple[str, ...]
    next_action: str

    @property
    def requires_unsupported_404(self) -> bool:
        return self.transport == "remote"


@dataclass(frozen=True)
class SmokeAuditResult:
    feature: str
    transport: str
    priority: str
    target_level: str
    next_action: str
    page_tests_total: int
    page_tests_existing: int
    supporting_tests_total: int
    supporting_tests_existing: int
    page_save: bool
    validation_guard: bool
    unsupported_404: bool

    @property
    def level(self) -> str:
        target_ready = self.page_save and self.validation_guard
        if target_ready and (self.transport == "local" or self.unsupported_404):
            return "save_ready"
        if self.page_save and self.validation_guard:
            return "save_without_404"
        if self.page_save:
            return "page_save_only"
        if self.validation_guard and (self.transport == "local" or self.unsupported_404):
            return "validation_only"
        if self.unsupported_404:
            return "unsupported_only"
        if self.page_tests_existing > 0:
            return "render_only"
        return "no_page_smoke"

    def capability_summary(self) -> str:
        return (
            f"level={self.level} page_tests={self.page_tests_existing}/{self.page_tests_total} "
            f"supporting_tests={self.supporting_tests_existing}/{self.supporting_tests_total} "
            f"page_save={flag(self.page_save)} validation={flag(self.validation_guard)} "
            f"unsupported_404={flag(self.unsupported_404)}"
        )


@dataclass(frozen=True)
class CoverageFinding:
    severity: str
    feature: str
    detail: str


def flag(value: bool) -> str:
    return "yes" if value else "no"


def string_list(raw: object) -> tuple[str, ...]:
    if not isinstance(raw, list):
        return ()
    return tuple(value.strip() for value in raw if isinstance(value, str) and value.strip())


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
        transport = str(raw.get("transport", "")).strip()
        priority = str(raw.get("priority", "")).strip()
        target_level = str(raw.get("target_level", "")).strip()
        next_action = str(raw.get("next_action", "")).strip()
        page_tests = tuple(ROOT / value for value in string_list(raw.get("page_tests")))
        supporting_tests = tuple(ROOT / value for value in string_list(raw.get("supporting_tests")))
        save_symbols = string_list(raw.get("save_symbols"))
        if (
            not feature
            or not path_value
            or transport not in {"remote", "local"}
            or not priority
            or not target_level
            or not next_action
            or not save_symbols
        ):
            continue
        entries.append(
            RegistryEntry(
                feature=feature,
                path=ROOT / path_value,
                transport=transport,
                priority=priority,
                target_level=target_level,
                page_tests=page_tests,
                supporting_tests=supporting_tests,
                save_symbols=save_symbols,
                next_action=next_action,
            )
        )
    return entries


def read_existing(paths: tuple[Path, ...]) -> tuple[str, int]:
    texts: list[str] = []
    existing = 0
    for path in paths:
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
            continue
        existing += 1
        texts.append(path.read_text(encoding="utf-8", errors="ignore"))
    return "\n".join(texts), existing


def has_symbol_assertion(text: str, symbols: tuple[str, ...]) -> bool:
    for symbol in symbols:
        escaped = re.escape(symbol)
        if re.search(rf"{escaped}[^\n]{{0,180}}toHaveBeenCalled", text):
            return True
        if re.search(rf"toHaveBeenCalled(?:With|Times)?[^\n]{{0,180}}{escaped}", text):
            return True
    return False


def scan_feature(entry: RegistryEntry) -> SmokeAuditResult:
    page_text, page_existing = read_existing(entry.page_tests)
    supporting_text, supporting_existing = read_existing(entry.supporting_tests)
    combined_support = "\n".join(part for part in [page_text, supporting_text] if part)
    page_save = bool(
        page_text
        and INTERACTION_PATTERN.search(page_text)
        and has_symbol_assertion(page_text, entry.save_symbols)
    )
    validation_guard = bool(combined_support and VALIDATION_PATTERN.search(combined_support))
    unsupported_404 = bool(page_text and UNSUPPORTED_PATTERN.search(page_text))
    return SmokeAuditResult(
        feature=entry.feature,
        transport=entry.transport,
        priority=entry.priority,
        target_level=entry.target_level,
        next_action=entry.next_action,
        page_tests_total=len(entry.page_tests),
        page_tests_existing=page_existing,
        supporting_tests_total=len(entry.supporting_tests),
        supporting_tests_existing=supporting_existing,
        page_save=page_save,
        validation_guard=validation_guard,
        unsupported_404=unsupported_404,
    )


def collect_findings() -> tuple[list[CoverageFinding], list[str], list[SmokeAuditResult]]:
    findings: list[CoverageFinding] = []
    notes: list[str] = []
    results: list[SmokeAuditResult] = []

    registry = load_registry()
    for entry in registry:
        if not entry.path.is_dir():
            findings.append(
                CoverageFinding(
                    severity="failure",
                    feature=entry.feature,
                    detail=f"save smoke registry path is missing: {entry.path.relative_to(ROOT)}",
                )
            )
            continue

        result = scan_feature(entry)
        results.append(result)

        gaps: list[str] = []
        if result.page_tests_existing == 0:
            gaps.append("page_evidence_missing")
        if not result.page_save:
            gaps.append("page_save_missing")
        if not result.validation_guard:
            gaps.append("validation_missing")
        if entry.requires_unsupported_404 and not result.unsupported_404:
            gaps.append("unsupported_404_missing")

        if gaps:
            findings.append(
                CoverageFinding(
                    severity="warning",
                    feature=entry.feature,
                    detail=(
                        f"gaps={','.join(gaps)}; priority={entry.priority}; "
                        f"next_action={entry.next_action}"
                    ),
                )
            )

    notes.append(f"features={len(results)}")
    notes.append(f"remote_features={sum(1 for result in results if result.transport == 'remote')}")
    notes.append(f"local_features={sum(1 for result in results if result.transport == 'local')}")
    notes.append(f"page_save_features={sum(1 for result in results if result.page_save)}")
    notes.append(
        f"validation_guard_features={sum(1 for result in results if result.validation_guard)}"
    )
    notes.append(
        f"unsupported_404_features={sum(1 for result in results if result.unsupported_404)}"
    )
    notes.append(f"save_ready_features={sum(1 for result in results if result.level == 'save_ready')}")
    notes.append(
        "rollout_priority="
        + ",".join(result.feature for result in results if result.priority == "p1")
    )
    return findings, notes, results


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def main() -> None:
    findings, notes, results = collect_findings()
    failures = [finding for finding in findings if finding.severity == "failure"]
    warnings = [finding for finding in findings if finding.severity == "warning"]

    print_section("form_save_smoke_coverage")
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
        print(
            f"EVIDENCE {result.feature} :: priority={result.priority} target={result.target_level} "
            f"transport={result.transport} {result.capability_summary()}"
        )

    print_section("warnings")
    if warnings:
        for finding in warnings:
            print(f"WARN {finding.feature} :: {finding.detail}")
    else:
        print("none")

    print_section("failures")
    if failures:
        for finding in failures:
            print(f"FAIL {finding.feature} :: {finding.detail}")
        raise SystemExit(1)
    print("none")
    print("PASS: form save smoke coverage audit")


if __name__ == "__main__":
    main()
