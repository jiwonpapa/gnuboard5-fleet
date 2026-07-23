#!/usr/bin/env python3
from __future__ import annotations

import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "docs" / "audits" / "ADMIN_SCHEMA_PROVIDER_READINESS.toml"
SCHEMA_MANIFEST_PATH = ROOT / "api" / "v1" / "Admin" / "Schema" / "schema-domains.json"
GENERATED_ROOT = ROOT / "api" / "v1" / "Admin" / "Schema" / "Data" / "generated"
SUPPORTED_STATUSES = {"implemented", "blocked"}


def load_registry() -> list[dict[str, object]]:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if document.get("version") != 1:
        raise ValueError("registry version must be 1")
    features = document.get("features", [])
    if not isinstance(features, list):
        raise ValueError("top-level `features` must be an array of tables")
    return features


def load_schema_domains() -> set[str]:
    import json

    document = json.loads(SCHEMA_MANIFEST_PATH.read_text(encoding="utf-8"))
    domains = set()
    for raw in document.get("domains", []):
        if not isinstance(raw, dict):
            continue
        domain = str(raw.get("domain", "")).strip()
        if domain:
            domains.add(domain)
    return domains


def read_string_list(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [value.strip() for value in raw if isinstance(value, str) and value.strip()]


def main() -> int:
    failures: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []
    evidence: list[str] = []
    blocked: list[str] = []

    try:
        registry = load_registry()
    except (OSError, ValueError, tomllib.TOMLDecodeError) as exc:
        print("[admin_schema_provider_readiness]")
        print("failures=1")
        print("warnings=0")
        print("blocked=0")
        print()
        print("[failures]")
        print(f"FAIL {exc}")
        print("FAIL: admin schema provider readiness")
        return 1

    schema_domains = load_schema_domains()
    implemented_domains_seen: set[str] = set()
    blocked_domains_seen: set[str] = set()
    seen_features: set[str] = set()

    for index, raw in enumerate(registry, start=1):
        if not isinstance(raw, dict):
            failures.append(f"feature[{index}] must be a table")
            continue

        feature = str(raw.get("feature", "")).strip()
        status = str(raw.get("status", "")).strip()
        owner = str(raw.get("owner", "")).strip()
        next_action = str(raw.get("next_action", "")).strip()
        summary = str(raw.get("summary", "")).strip()

        if not feature:
            failures.append(f"feature[{index}] missing feature")
            continue
        if feature in seen_features:
            failures.append(f"feature `{feature}` is duplicated")
            continue
        seen_features.add(feature)

        if status not in SUPPORTED_STATUSES:
            failures.append(f"feature `{feature}` has unsupported status `{status}`")
            continue

        if not owner:
            failures.append(f"feature `{feature}` missing owner")
        if not next_action:
            failures.append(f"feature `{feature}` missing next_action")
        if not summary:
            failures.append(f"feature `{feature}` missing summary")

        if status == "implemented":
            domains = read_string_list(raw.get("schema_domains"))
            if not domains:
                failures.append(f"feature `{feature}` must declare schema_domains")
                continue

            notes.append(f"{feature} implemented domains={','.join(domains)} owner={owner}")
            for domain in domains:
                implemented_domains_seen.add(domain)
                if domain not in schema_domains:
                    failures.append(
                        f"feature `{feature}` expects implemented domain `{domain}` but schema-domains.json does not contain it"
                    )
                    continue
                generated_path = GENERATED_ROOT / f"{domain}.json"
                if not generated_path.is_file():
                    failures.append(
                        f"feature `{feature}` domain `{domain}` missing generated schema file `{generated_path.relative_to(ROOT).as_posix()}`"
                    )
        else:
            planned_domains = read_string_list(raw.get("planned_schema_domains"))
            blocker = str(raw.get("blocker", "")).strip()
            if blocker != "provider_domain_missing":
                failures.append(
                    f"feature `{feature}` blocked entry must use blocker `provider_domain_missing`"
                )
            if not planned_domains:
                failures.append(f"feature `{feature}` blocked entry must declare planned_schema_domains")
                continue

            blocked.append(
                f"{feature} planned_domains={','.join(planned_domains)} blocker={blocker or '-'}"
            )
            for domain in planned_domains:
                blocked_domains_seen.add(domain)
                if domain in schema_domains:
                    failures.append(
                        f"feature `{feature}` is still marked blocked but planned domain `{domain}` already exists in schema-domains.json"
                    )

    untracked_manifest_domains = sorted(schema_domains - implemented_domains_seen)
    if untracked_manifest_domains:
        failures.append(
            "schema-domains.json contains untracked provider domains: "
            + ", ".join(untracked_manifest_domains)
        )

    overlap = sorted(implemented_domains_seen & blocked_domains_seen)
    if overlap:
        failures.append(
            "domain cannot be both implemented and blocked: " + ", ".join(overlap)
        )

    evidence.append(f"registry=`{REGISTRY_PATH.relative_to(ROOT).as_posix()}`")
    evidence.append(f"schema_manifest=`{SCHEMA_MANIFEST_PATH.relative_to(ROOT).as_posix()}`")
    evidence.append(f"generated_root=`{GENERATED_ROOT.relative_to(ROOT).as_posix()}`")
    evidence.append(f"implemented_domains={len(implemented_domains_seen)}")
    evidence.append(f"blocked_planned_domains={len(blocked_domains_seen)}")
    evidence.append(f"manifest_domains={len(schema_domains)}")

    print("[admin_schema_provider_readiness]")
    print(f"registry={REGISTRY_PATH.relative_to(ROOT).as_posix()}")
    print(f"implemented_features={sum(1 for entry in registry if isinstance(entry, dict) and str(entry.get('status', '')).strip() == 'implemented')}")
    print(f"blocked_features={sum(1 for entry in registry if isinstance(entry, dict) and str(entry.get('status', '')).strip() == 'blocked')}")
    print(f"manifest_domains={len(schema_domains)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print(f"blocked={len(blocked)}")
    print(f"notes={len(notes)}")
    print()

    print("[notes]")
    if notes:
        for note in notes:
            print(f"NOTE {note}")
    else:
        print("none")
    print()

    print("[evidence]")
    for item in evidence:
        print(f"EVIDENCE {item}")
    print()

    print("[blocked]")
    if blocked:
        for item in blocked:
            print(f"BLOCKED {item}")
    else:
        print("none")
    print()

    print("[warnings]")
    if warnings:
        for item in warnings:
            print(f"WARN {item}")
    else:
        print("none")
    print()

    print("[failures]")
    if failures:
        for item in failures:
            print(f"FAIL {item}")
        print("FAIL: admin schema provider readiness")
        return 1

    print("none")
    print("PASS: admin schema provider readiness")
    return 0


if __name__ == "__main__":
    sys.exit(main())
