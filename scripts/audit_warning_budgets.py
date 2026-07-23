#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[1]
BUDGET_REGISTRY = ROOT / "specs" / "audits" / "WARNING_BUDGETS.toml"
SUPPORTED_AUDITS = {"structure"}
REQUIRED_BUDGET_FIELDS = (
    "id",
    "audit",
    "rule",
    "path",
    "owner",
    "reason",
    "introduced_on",
    "expires_on",
    "removal_criteria",
)


@dataclass(frozen=True)
class WarningBudget:
    id: str
    audit: str
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


def load_registry_document() -> dict:
    if not BUDGET_REGISTRY.exists():
        return {"version": 1, "budgets": []}
    return tomllib.loads(BUDGET_REGISTRY.read_text(encoding="utf-8"))


def _string_value(raw: dict, field: str) -> str:
    value = raw.get(field)
    if not isinstance(value, str):
        return ""
    return value.strip()


def load_budgets() -> list[WarningBudget]:
    document = load_registry_document()
    budgets: list[WarningBudget] = []
    for raw in document.get("budgets", []):
        if not isinstance(raw, dict):
            continue
        budgets.append(
            WarningBudget(
                id=_string_value(raw, "id"),
                audit=_string_value(raw, "audit"),
                rule=_string_value(raw, "rule"),
                path=_string_value(raw, "path"),
                owner=_string_value(raw, "owner"),
                reason=_string_value(raw, "reason"),
                introduced_on=_string_value(raw, "introduced_on"),
                expires_on=_string_value(raw, "expires_on"),
                removal_criteria=_string_value(raw, "removal_criteria"),
            )
        )
    return budgets


def budget_matches(*, budget: WarningBudget, audit: str, rule: str, path: str) -> bool:
    return (
        budget.audit == audit
        and budget.rule == rule
        and budget.path == path
    )
