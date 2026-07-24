from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


SCHEMA_ID = "g5-fleet.migration-parity/v1"
LEGACY_CATEGORIES = (
    "tauri_commands",
    "react_pages",
    "rust_workspace_members",
    "frontend_tests",
    "rust_tests",
)
PROFILES = ("static", "runtime", "staging")
DISPOSITIONS = ("reused", "adapted", "redesigned", "deferred")


class ManifestError(ValueError):
    pass


def _require_type(
    value: Any,
    expected_type: type | tuple[type, ...],
    location: str,
) -> None:
    if not isinstance(value, expected_type):
        expected = (
            ", ".join(item.__name__ for item in expected_type)
            if isinstance(expected_type, tuple)
            else expected_type.__name__
        )
        raise ManifestError(f"{location}: expected {expected}")


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ManifestError(f"manifest read failed: {error}") from error
    validate_manifest_shape(data)
    return data


def validate_manifest_shape(data: dict[str, Any]) -> None:
    _require_type(data, dict, "$")
    if data.get("schema") != SCHEMA_ID:
        raise ManifestError(f"$.schema: expected {SCHEMA_ID}")

    policy = data.get("policy")
    _require_type(policy, dict, "$.policy")
    roots = policy.get("allowed_target_roots")
    _require_type(roots, list, "$.policy.allowed_target_roots")
    if not roots or any(not isinstance(root, str) or not root for root in roots):
        raise ManifestError("$.policy.allowed_target_roots: non-empty strings required")

    baseline = data.get("legacy_baseline")
    _require_type(baseline, dict, "$.legacy_baseline")
    mappings = data.get("mappings")
    _require_type(mappings, dict, "$.mappings")
    for category in LEGACY_CATEGORIES:
        entry = baseline.get(category)
        _require_type(entry, dict, f"$.legacy_baseline.{category}")
        _require_type(entry.get("count"), int, f"$.legacy_baseline.{category}.count")
        if entry["count"] < 0:
            raise ManifestError(
                f"$.legacy_baseline.{category}.count: non-negative required"
            )
        fingerprint = entry.get("fingerprint")
        if not isinstance(fingerprint, str) or re.fullmatch(
            r"[a-f0-9]{64}",
            fingerprint,
        ) is None:
            raise ManifestError(
                f"$.legacy_baseline.{category}.fingerprint: sha256 required"
            )
        _require_type(mappings.get(category), list, f"$.mappings.{category}")

    expectations = data.get("active_expectations")
    _require_type(expectations, dict, "$.active_expectations")
    for category, expectation in expectations.items():
        _require_type(expectation, dict, f"$.active_expectations.{category}")
        if "exact" not in expectation and "minimum" not in expectation:
            raise ManifestError(
                f"$.active_expectations.{category}: exact or minimum required"
            )
        for field in ("exact", "minimum"):
            if field in expectation and (
                not isinstance(expectation[field], int) or expectation[field] < 0
            ):
                raise ManifestError(
                    f"$.active_expectations.{category}.{field}: "
                    "non-negative integer required"
                )

    capabilities = data.get("required_capabilities")
    _require_type(capabilities, list, "$.required_capabilities")
    capability_ids: set[str] = set()
    for index, capability in enumerate(capabilities):
        location = f"$.required_capabilities[{index}]"
        _require_type(capability, dict, location)
        capability_id = capability.get("id")
        if not isinstance(capability_id, str) or not capability_id:
            raise ManifestError(f"{location}.id: non-empty string required")
        if capability_id in capability_ids:
            raise ManifestError(f"{location}.id: duplicate {capability_id}")
        capability_ids.add(capability_id)
        if capability.get("state") not in ("implemented", "pending"):
            raise ManifestError(f"{location}.state: implemented or pending required")
        if not isinstance(capability.get("description"), str) or not capability[
            "description"
        ]:
            raise ManifestError(f"{location}.description: non-empty string required")

    evidence_registry = data.get("evidence_registry")
    _require_type(evidence_registry, dict, "$.evidence_registry")
    for evidence_id, evidence in evidence_registry.items():
        location = f"$.evidence_registry.{evidence_id}"
        if not isinstance(evidence_id, str) or not evidence_id:
            raise ManifestError("$.evidence_registry: non-empty IDs required")
        _require_type(evidence, dict, location)
        if not isinstance(evidence.get("path"), str) or not evidence["path"]:
            raise ManifestError(f"{location}.path: non-empty string required")

    profile_evidence = data.get("profile_evidence")
    _require_type(profile_evidence, dict, "$.profile_evidence")
    for profile in PROFILES:
        values = profile_evidence.get(profile)
        _require_type(values, list, f"$.profile_evidence.{profile}")
        if any(not isinstance(value, str) or not value for value in values):
            raise ManifestError(
                f"$.profile_evidence.{profile}: non-empty string IDs required"
            )
        if len(values) != len(set(values)):
            raise ManifestError(f"$.profile_evidence.{profile}: duplicate IDs")

    staging = data.get("staging")
    _require_type(staging, dict, "$.staging")
    _require_type(staging.get("base_url_env"), str, "$.staging.base_url_env")
    probes = staging.get("probes")
    _require_type(probes, list, "$.staging.probes")
    if not probes:
        raise ManifestError("$.staging.probes: at least one live probe required")
    for index, probe in enumerate(probes):
        location = f"$.staging.probes[{index}]"
        _require_type(probe, dict, location)
        if not isinstance(probe.get("id"), str) or not probe["id"]:
            raise ManifestError(f"{location}.id: non-empty string required")
        if not isinstance(probe.get("path"), str) or not probe["path"].startswith("/"):
            raise ManifestError(f"{location}.path: absolute HTTP path required")
