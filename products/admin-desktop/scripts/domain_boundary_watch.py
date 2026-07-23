#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import tomllib


ROOT = Path(__file__).resolve().parents[1]
RULES_FILE = ROOT / "specs" / "audits" / "DOMAIN_BOUNDARY_RULES.toml"
FEATURES_ROOT = ROOT / "g5-admin" / "src" / "features"

IMPORT_PATTERN = re.compile(r"""from\s+["'](?P<target>[^"']+)["']""")
APP_STATE_FIELD_PATTERN = re.compile(r"\bstate:\s*&'[_A-Za-z][_A-Za-z0-9]*\s+AppState\b")
APP_STATE_NEW_PATTERN = re.compile(r"\bfn\s+new\(\s*state:\s*&'[_A-Za-z][_A-Za-z0-9]*\s+AppState\b")


@dataclass(frozen=True)
class BoundaryFinding:
    severity: str
    rule: str
    path: str
    detail: str


@dataclass(frozen=True)
class FrontendFeatureRule:
    id: str
    severity: str
    owner: str
    feature: str
    path: str
    allowed_targets: tuple[str, ...]
    reason: str
    remediation: str


@dataclass(frozen=True)
class SupportRootRule:
    id: str
    severity: str
    owner: str
    path: str
    allowed_targets: tuple[str, ...]
    reason: str
    remediation: str


@dataclass(frozen=True)
class AppStateServiceRule:
    id: str
    severity: str
    owner: str
    path: str
    reason: str
    remediation: str


def _read_registry() -> dict[str, object]:
    if not RULES_FILE.exists():
        raise FileNotFoundError(f"domain boundary registry missing: {RULES_FILE}")
    document = tomllib.loads(RULES_FILE.read_text(encoding="utf-8"))
    version = document.get("version")
    if version != 1:
        raise ValueError(f"domain boundary registry version must be 1 (got {version!r})")
    return document


def _require_string(raw: dict[str, object], field: str, *, prefix: str) -> str:
    value = raw.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{prefix} missing required string field `{field}`")
    return value.strip()


def _require_string_list(raw: dict[str, object], field: str, *, prefix: str) -> tuple[str, ...]:
    value = raw.get(field, [])
    if not isinstance(value, list):
        raise ValueError(f"{prefix} field `{field}` must be an array")
    items: list[str] = []
    for index, entry in enumerate(value, start=1):
        if not isinstance(entry, str) or not entry.strip():
            raise ValueError(f"{prefix} field `{field}[{index}]` must be a non-empty string")
        items.append(entry.strip())
    return tuple(items)


def frontend_feature_rules() -> list[FrontendFeatureRule]:
    document = _read_registry()
    rows = document.get("frontend_feature_rules", [])
    if not isinstance(rows, list):
        raise ValueError("`frontend_feature_rules` must be an array")
    rules: list[FrontendFeatureRule] = []
    for index, raw in enumerate(rows, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"frontend_feature_rules[{index}] must be a table")
        prefix = f"frontend_feature_rules[{index}]"
        rules.append(
            FrontendFeatureRule(
                id=_require_string(raw, "id", prefix=prefix),
                severity=_require_string(raw, "severity", prefix=prefix),
                owner=_require_string(raw, "owner", prefix=prefix),
                feature=_require_string(raw, "feature", prefix=prefix),
                path=_require_string(raw, "path", prefix=prefix),
                allowed_targets=_require_string_list(raw, "allowed_targets", prefix=prefix),
                reason=_require_string(raw, "reason", prefix=prefix),
                remediation=_require_string(raw, "remediation", prefix=prefix),
            )
        )
    return rules


def support_root_rules() -> list[SupportRootRule]:
    document = _read_registry()
    rows = document.get("support_root_rules", [])
    if not isinstance(rows, list):
        raise ValueError("`support_root_rules` must be an array")
    rules: list[SupportRootRule] = []
    for index, raw in enumerate(rows, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"support_root_rules[{index}] must be a table")
        prefix = f"support_root_rules[{index}]"
        rules.append(
            SupportRootRule(
                id=_require_string(raw, "id", prefix=prefix),
                severity=_require_string(raw, "severity", prefix=prefix),
                owner=_require_string(raw, "owner", prefix=prefix),
                path=_require_string(raw, "path", prefix=prefix),
                allowed_targets=_require_string_list(raw, "allowed_targets", prefix=prefix),
                reason=_require_string(raw, "reason", prefix=prefix),
                remediation=_require_string(raw, "remediation", prefix=prefix),
            )
        )
    return rules


def app_state_service_rules() -> list[AppStateServiceRule]:
    document = _read_registry()
    rows = document.get("app_state_service_rules", [])
    if not isinstance(rows, list):
        raise ValueError("`app_state_service_rules` must be an array")
    rules: list[AppStateServiceRule] = []
    for index, raw in enumerate(rows, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"app_state_service_rules[{index}] must be a table")
        prefix = f"app_state_service_rules[{index}]"
        rules.append(
            AppStateServiceRule(
                id=_require_string(raw, "id", prefix=prefix),
                severity=_require_string(raw, "severity", prefix=prefix),
                owner=_require_string(raw, "owner", prefix=prefix),
                path=_require_string(raw, "path", prefix=prefix),
                reason=_require_string(raw, "reason", prefix=prefix),
                remediation=_require_string(raw, "remediation", prefix=prefix),
            )
        )
    return rules


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def _is_test_path(path: Path) -> bool:
    name = path.name
    return ".test." in name or ".spec." in name or "tests" in path.parts


def _typescript_files(root: Path) -> list[Path]:
    return sorted(
        path
        for pattern in ("*.ts", "*.tsx")
        for path in root.rglob(pattern)
        if path.is_file() and not _is_test_path(path)
    )


def _extract_target_feature(source_path: Path, import_target: str) -> str | None:
    normalized = import_target.strip()
    if not normalized:
        return None

    if normalized.startswith("@/features/"):
        parts = Path(normalized.removeprefix("@/")).parts
    elif "/features/" in normalized:
        marker_index = normalized.find("/features/")
        parts = Path(normalized[marker_index + 1:]).parts
    elif normalized.startswith("."):
        parts = (source_path.parent / normalized).resolve().parts
        if "features" not in parts:
            return None
        index = parts.index("features")
        if index + 1 >= len(parts):
            return None
        return parts[index + 1]
    else:
        return None

    if "features" not in parts:
        return None
    index = parts.index("features")
    if index + 1 >= len(parts):
        return None
    return parts[index + 1]


def collect_frontend_feature_boundary_findings() -> list[BoundaryFinding]:
    findings: list[BoundaryFinding] = []
    seen: set[tuple[str, str, str]] = set()
    for rule in frontend_feature_rules():
        root = ROOT / rule.path
        if not root.exists():
            continue
        for path in _typescript_files(root):
            text = _read_text(path)
            for match in IMPORT_PATTERN.finditer(text):
                target_feature = _extract_target_feature(path, match.group("target"))
                if not target_feature or target_feature == rule.feature:
                    continue
                if target_feature in rule.allowed_targets:
                    continue
                key = (rule.id, _relative(path), target_feature)
                if key in seen:
                    continue
                seen.add(key)
                findings.append(
                    BoundaryFinding(
                        severity=rule.severity,
                        rule="frontend_domain_direct_import",
                        path=_relative(path),
                        detail=(
                            f"{rule.feature} feature must not import `{target_feature}` directly; "
                            f"allowed targets: {', '.join(rule.allowed_targets)}. "
                            f"{rule.reason}. 처리: {rule.remediation}"
                        ),
                    )
                )
    return findings


def collect_support_root_boundary_findings() -> list[BoundaryFinding]:
    findings: list[BoundaryFinding] = []
    seen: set[tuple[str, str, str]] = set()
    for rule in support_root_rules():
        root = ROOT / rule.path
        if not root.exists():
            continue
        own_feature: str | None = None
        try:
            relative_parts = root.relative_to(FEATURES_ROOT).parts
            if relative_parts:
                own_feature = relative_parts[0]
        except ValueError:
            own_feature = None

        for path in _typescript_files(root):
            text = _read_text(path)
            for match in IMPORT_PATTERN.finditer(text):
                target_feature = _extract_target_feature(path, match.group("target"))
                if not target_feature:
                    continue
                if own_feature and target_feature == own_feature:
                    continue
                if target_feature in rule.allowed_targets:
                    continue
                key = (rule.id, _relative(path), target_feature)
                if key in seen:
                    continue
                seen.add(key)
                findings.append(
                    BoundaryFinding(
                        severity=rule.severity,
                        rule="support_namespace_business_dependency",
                        path=_relative(path),
                        detail=(
                            f"{rule.path} must stay support-only, but imports `{target_feature}`. "
                            f"allowed targets: {', '.join(rule.allowed_targets) or 'none'}. "
                            f"{rule.reason}. 처리: {rule.remediation}"
                        ),
                    )
                )
    return findings


def collect_app_state_service_wrapper_findings() -> list[BoundaryFinding]:
    findings: list[BoundaryFinding] = []
    for rule in app_state_service_rules():
        path = ROOT / rule.path
        if not path.exists():
            continue
        text = _read_text(path)
        has_wrapper_field = APP_STATE_FIELD_PATTERN.search(text) is not None
        has_wrapper_constructor = APP_STATE_NEW_PATTERN.search(text) is not None
        wrapper_dereferences = text.count("self.state.")
        if not has_wrapper_field and not has_wrapper_constructor and wrapper_dereferences == 0:
            continue
        findings.append(
            BoundaryFinding(
                severity=rule.severity,
                rule="app_state_service_wrapper_coupling",
                path=rule.path,
                detail=(
                    f"service still depends on `&AppState` wrapper "
                    f"(constructor={has_wrapper_constructor}, field={has_wrapper_field}, "
                    f"self.state references={wrapper_dereferences}). "
                    f"{rule.reason}. 처리: {rule.remediation}"
                ),
            )
        )
    return findings


def domain_boundary_notes() -> list[str]:
    frontend_rules = frontend_feature_rules()
    support_rules = support_root_rules()
    service_rules = app_state_service_rules()
    monitored_features = ", ".join(rule.feature for rule in frontend_rules)
    notes = [
        "domain_boundary_scope: "
        f"frontend_features={len(frontend_rules)}, "
        f"support_roots={len(support_rules)}, "
        f"app_state_services={len(service_rules)}",
    ]
    if monitored_features:
        notes.append(f"domain_boundary_monitored_features: {monitored_features}")
    return notes


def domain_boundary_watch_rows() -> list[str]:
    rows = domain_boundary_notes()
    feature_findings = collect_frontend_feature_boundary_findings()
    support_findings = collect_support_root_boundary_findings()
    wrapper_findings = collect_app_state_service_wrapper_findings()
    if not feature_findings:
        rows.append("ok frontend_domain_direct_import")
    else:
        for finding in feature_findings:
            rows.append(f"{finding.severity} {finding.path} :: {finding.detail}")
    if not support_findings:
        rows.append("ok support_namespace_business_dependency")
    else:
        for finding in support_findings:
            rows.append(f"{finding.severity} {finding.path} :: {finding.detail}")
    for finding in wrapper_findings:
        rows.append(f"{finding.severity} {finding.path} :: {finding.detail}")
    if not wrapper_findings:
        rows.append("ok app_state_service_wrapper_coupling")
    return rows
