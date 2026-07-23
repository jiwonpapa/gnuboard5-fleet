#!/usr/bin/env python3
from __future__ import annotations

from datetime import date
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "docs" / "audits" / "WAIVERS.toml"
SUPPORTED_AUDITS = {"implementation", "structure", "porting", "integrated", "blockers"}
SUPPORTED_SEVERITIES = {"failure", "warning"}
REQUIRED_FIELDS = (
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


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def main() -> int:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    failures: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    if document.get("version") != 1:
        failures.append(f"registry version must be 1 (got {document.get('version')!r})")

    raw_waivers = document.get("waivers", [])
    if not isinstance(raw_waivers, list):
        failures.append("top-level `waivers` must be an array of tables")
        raw_waivers = []

    seen_ids: set[str] = set()
    seen_targets: set[tuple[str, str, str, str]] = set()
    today = date.today()

    for index, raw in enumerate(raw_waivers, start=1):
        prefix = f"waiver[{index}]"
        if not isinstance(raw, dict):
            failures.append(f"{prefix} must be a table")
            continue

        missing = [
            field
            for field in REQUIRED_FIELDS
            if not isinstance(raw.get(field), str) or not str(raw.get(field)).strip()
        ]
        if missing:
            failures.append(f"{prefix} missing required fields: {', '.join(missing)}")
            continue

        waiver_id = str(raw["id"]).strip()
        audit = str(raw["audit"]).strip()
        severity = str(raw["severity"]).strip()
        rule = str(raw["rule"]).strip()
        path = str(raw["path"]).strip()
        owner = str(raw["owner"]).strip()
        expires_on = str(raw["expires_on"]).strip()
        introduced_on = str(raw["introduced_on"]).strip()

        if waiver_id in seen_ids:
            failures.append(f"{prefix} duplicates waiver id `{waiver_id}`")
            continue
        seen_ids.add(waiver_id)

        if audit not in SUPPORTED_AUDITS:
            failures.append(
                f"{prefix} has unsupported audit `{audit}`; supported: {', '.join(sorted(SUPPORTED_AUDITS))}"
            )
            continue

        if severity not in SUPPORTED_SEVERITIES:
            failures.append(
                f"{prefix} has unsupported severity `{severity}`; supported: {', '.join(sorted(SUPPORTED_SEVERITIES))}"
            )
            continue

        try:
            introduced = parse_date(introduced_on)
            expires = parse_date(expires_on)
        except ValueError:
            failures.append(f"{prefix} date must use YYYY-MM-DD")
            continue

        if introduced > expires:
            failures.append(f"{prefix} introduced_on is after expires_on")
            continue

        target = (audit, severity, rule, path)
        if target in seen_targets:
            failures.append(f"{prefix} duplicates target {audit}/{severity}/{rule}/{path}")
            continue
        seen_targets.add(target)

        if expires < today:
            failures.append(f"{prefix} `{waiver_id}` expired on {expires_on}")
            continue

        days_left = (expires - today).days
        if days_left <= 7:
            warnings.append(f"{prefix} `{waiver_id}` expires in {days_left} day(s) on {expires_on}")

        notes.append(
            f"{waiver_id} {audit}/{severity} {rule} {path} owner={owner} expires={expires_on}"
        )

    print("[audit_waiver_registry]")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT).as_posix()}")
    print(f"active_waivers={len(raw_waivers)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"notes={len(notes)}")
    print()

    print("[notes]")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")
    print()

    print("[warnings]")
    if warnings:
        for warning in warnings:
            print(f"WARN {warning}")
    else:
        print("none")
    print()

    print("[failures]")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        print("FAIL: audit waiver registry")
        return 1

    print("none")
    print("PASS: audit waiver registry")
    return 0


if __name__ == "__main__":
    sys.exit(main())
