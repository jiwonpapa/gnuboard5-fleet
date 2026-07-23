#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from fnmatch import fnmatch
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[1]
WAIVER_REGISTRY = ROOT / "specs" / "audits" / "WAIVERS.toml"
SUPPORTED_AUDITS = {"implementation", "consumer", "structure", "integrated", "all"}
SUPPORTED_SEVERITIES = {"warning", "failure"}
REQUIRED_WAIVER_FIELDS = (
    "id",
    "audit",
    "severity",
    "rule",
    "path",
    "owner",
    "reason",
    "introduced_on",
    "expires_on",
    "removal_criteria",
)


@dataclass(frozen=True)
class Waiver:
    id: str
    audit: str
    severity: str
    rule: str
    path: str
    owner: str
    reason: str
    introduced_on: str
    expires_on: str
    removal_criteria: str

    def introduced_date(self) -> date:
        return date.fromisoformat(self.introduced_on)

    def expires_date(self) -> date:
        return date.fromisoformat(self.expires_on)


def load_registry_document() -> dict[str, object]:
    if not WAIVER_REGISTRY.exists():
        return {"version": 1, "waivers": []}
    return tomllib.loads(WAIVER_REGISTRY.read_text(encoding="utf-8"))


def _string_value(raw: dict[str, object], key: str) -> str:
    value = raw.get(key)
    if not isinstance(value, str):
        return ""
    return value.strip()


def load_waivers() -> list[Waiver]:
    document = load_registry_document()
    raw_waivers = document.get("waivers", [])
    if not isinstance(raw_waivers, list):
        return []

    waivers: list[Waiver] = []
    for raw in raw_waivers:
        if not isinstance(raw, dict):
            continue
        waivers.append(
            Waiver(
                id=_string_value(raw, "id"),
                audit=_string_value(raw, "audit"),
                severity=_string_value(raw, "severity"),
                rule=_string_value(raw, "rule"),
                path=_string_value(raw, "path"),
                owner=_string_value(raw, "owner"),
                reason=_string_value(raw, "reason"),
                introduced_on=_string_value(raw, "introduced_on"),
                expires_on=_string_value(raw, "expires_on"),
                removal_criteria=_string_value(raw, "removal_criteria"),
            )
        )
    return waivers


def waiver_is_structurally_valid(waiver: Waiver) -> bool:
    if not all(getattr(waiver, field) for field in REQUIRED_WAIVER_FIELDS):
        return False
    if waiver.audit not in SUPPORTED_AUDITS:
        return False
    if waiver.severity not in SUPPORTED_SEVERITIES:
        return False
    try:
        introduced = waiver.introduced_date()
        expires = waiver.expires_date()
    except ValueError:
        return False
    return introduced <= expires


def waiver_is_active(waiver: Waiver, today: date | None = None) -> bool:
    if not waiver_is_structurally_valid(waiver):
        return False
    baseline = today or date.today()
    return waiver.expires_date() >= baseline


def waiver_matches(
    waiver: Waiver,
    *,
    audit: str,
    severity: str,
    rule: str,
    path: str,
    today: date | None = None,
) -> bool:
    if not waiver_is_active(waiver, today=today):
        return False
    if waiver.audit not in {audit, "all"}:
        return False
    if waiver.severity != severity:
        return False
    if not fnmatch(rule, waiver.rule):
        return False
    if not fnmatch(path, waiver.path):
        return False
    return True


def find_matching_waiver(
    waivers: list[Waiver],
    *,
    audit: str,
    severity: str,
    rule: str,
    path: str,
    today: date | None = None,
) -> Waiver | None:
    for waiver in waivers:
        if waiver_matches(
            waiver,
            audit=audit,
            severity=severity,
            rule=rule,
            path=path,
            today=today,
        ):
            return waiver
    return None
