#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[1]
FEATURES_ROOT = ROOT / "g5-admin" / "src" / "features"
REGISTRY_PATH = ROOT / "specs" / "domains" / "DOMAIN_COVERAGE.toml"
REQUIRED_FEATURES = {
    "contents",
    "faqs",
    "menus",
    "mails",
    "points",
    "reports",
    "visits",
    "theme",
    "security",
    "system-tools",
    "board-groups",
    "layouts",
    "system",
    "sms-contacts",
    "sms-history",
    "sms-messages",
    "sms-templates",
}
SMOKE_CHECKLIST_HEADING = "## 최소 smoke checklist"


@dataclass(frozen=True)
class CoverageFinding:
    severity: str
    feature: str
    detail: str


def load_registry() -> list[dict[str, object]]:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    entries = document.get("domains", [])
    if not isinstance(entries, list):
        return []
    return [entry for entry in entries if isinstance(entry, dict)]


def string_list(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [value.strip() for value in raw if isinstance(value, str) and value.strip()]


def feature_has_surface(feature: str) -> bool:
    feature_dir = FEATURES_ROOT / feature
    if not feature_dir.is_dir():
        return False
    return any(feature_dir.glob("*Page.tsx")) or any(feature_dir.glob("*Workspace.tsx"))


def sdd_has_smoke_checklist(path: Path) -> bool:
    return SMOKE_CHECKLIST_HEADING in path.read_text(encoding="utf-8", errors="ignore")


def is_page_or_flow_evidence(path_str: str) -> bool:
    name = Path(path_str).name
    return name.endswith("Page.test.tsx") or name.endswith("flow.test.ts")


def collect_findings() -> tuple[list[CoverageFinding], list[str]]:
    findings: list[CoverageFinding] = []
    notes: list[str] = []
    registry = load_registry()
    indexed_features: set[str] = set()
    automated_coverage_count = 0
    page_smoke_count = 0

    for entry in registry:
        feature = str(entry.get("feature", "")).strip()
        if not feature:
            continue
        indexed_features.add(feature)
        if not feature_has_surface(feature):
            findings.append(
                CoverageFinding(
                    severity="failure",
                    feature=feature,
                    detail="registry feature has no route-native page/workspace surface",
                )
            )

        sdds = string_list(entry.get("sdds"))
        if not sdds:
            findings.append(
                CoverageFinding(
                    severity="failure",
                    feature=feature,
                    detail="registry feature has no linked SDD document",
                )
            )
        for sdd in sdds:
            sdd_path = ROOT / sdd
            if not sdd_path.is_file():
                findings.append(
                    CoverageFinding(
                        severity="failure",
                        feature=feature,
                        detail=f"missing SDD document: {sdd}",
                    )
                )
                continue
            if not sdd_has_smoke_checklist(sdd_path):
                findings.append(
                    CoverageFinding(
                        severity="failure",
                        feature=feature,
                        detail=f"SDD is missing '{SMOKE_CHECKLIST_HEADING}' section: {sdd}",
                    )
                )

        automated_evidence = string_list(entry.get("automated_evidence"))
        if not automated_evidence:
            findings.append(
                CoverageFinding(
                    severity="warning",
                    feature=feature,
                    detail="no automated smoke evidence declared; manual checklist only",
                )
            )
        else:
            automated_coverage_count += 1
            has_page_or_flow = False
            for evidence in automated_evidence:
                evidence_path = ROOT / evidence
                if not evidence_path.is_file():
                    findings.append(
                        CoverageFinding(
                            severity="failure",
                            feature=feature,
                            detail=f"missing automated evidence file: {evidence}",
                        )
                    )
                    continue
                if is_page_or_flow_evidence(evidence):
                    has_page_or_flow = True
            if has_page_or_flow:
                page_smoke_count += 1
            else:
                findings.append(
                    CoverageFinding(
                        severity="warning",
                        feature=feature,
                        detail="automated evidence is form/helper-only; page/flow smoke is not declared",
                    )
                )

    for feature in sorted(REQUIRED_FEATURES - indexed_features):
        findings.append(
            CoverageFinding(
                severity="failure",
                feature=feature,
                detail="required route-native domain is missing from DOMAIN_COVERAGE registry",
            )
        )

    notes.append(
        f"target_features={len(REQUIRED_FEATURES)} covered_features={len(indexed_features & REQUIRED_FEATURES)}"
    )
    notes.append(f"automated_smoke_features={automated_coverage_count}")
    notes.append(f"page_or_flow_smoke_features={page_smoke_count}")
    return findings, notes


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def main() -> None:
    findings, notes = collect_findings()
    failures = [item for item in findings if item.severity == "failure"]
    warnings = [item for item in findings if item.severity == "warning"]

    print_section("domain_coverage_audit")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT)}")
    print(f"required_features={len(REQUIRED_FEATURES)}")
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
    print("PASS: domain coverage audit")


if __name__ == "__main__":
    main()
