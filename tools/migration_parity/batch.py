from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .manifest import LEGACY_CATEGORIES, ManifestError
from .model import Finding, Inventory


SCHEMA_ID = "g5-fleet.migration-batches/v1"
BATCH_STATES = ("planned", "active", "batch_pass")
_BATCH_ID_RE = re.compile(r"R\d{2}")
_FORBIDDEN_CATCH_ALL = {".*", ".+", "^.*$", "^.+$"}


@dataclass
class OwnershipAudit:
    findings: list[Finding]
    legacy_owners: dict[str, dict[str, str]]
    core_owners: dict[str, str]
    capability_owners: dict[str, str]

    def summary(self) -> dict[str, Any]:
        return {
            "legacy": {
                category: len(owners)
                for category, owners in sorted(self.legacy_owners.items())
            },
            "core_operations": len(self.core_owners),
            "required_capabilities": len(self.capability_owners),
            "finding_count": len(self.findings),
        }


def load_batch_manifest(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ManifestError(f"batch manifest read failed: {error}") from error
    validate_batch_manifest_shape(data)
    return data


def _require_string_list(value: Any, location: str) -> list[str]:
    if not isinstance(value, list) or any(
        not isinstance(item, str) or not item for item in value
    ):
        raise ManifestError(f"{location}: non-empty string array required")
    if len(value) != len(set(value)):
        raise ManifestError(f"{location}: duplicate values")
    return value


def validate_batch_manifest_shape(data: dict[str, Any]) -> None:
    if not isinstance(data, dict):
        raise ManifestError("batch $: object required")
    if data.get("schema") != SCHEMA_ID:
        raise ManifestError(f"batch $.schema: expected {SCHEMA_ID}")
    policy = data.get("policy")
    if not isinstance(policy, dict):
        raise ManifestError("batch $.policy: object required")
    final_batch = policy.get("final_batch")
    if not isinstance(final_batch, str) or _BATCH_ID_RE.fullmatch(final_batch) is None:
        raise ManifestError("batch $.policy.final_batch: RNN batch ID required")

    batches = data.get("batches")
    if not isinstance(batches, list) or not batches:
        raise ManifestError("batch $.batches: non-empty array required")
    ids: set[str] = set()
    sequences: set[int] = set()
    active_count = 0
    for index, batch in enumerate(batches):
        location = f"batch $.batches[{index}]"
        if not isinstance(batch, dict):
            raise ManifestError(f"{location}: object required")
        batch_id = batch.get("id")
        if not isinstance(batch_id, str) or _BATCH_ID_RE.fullmatch(batch_id) is None:
            raise ManifestError(f"{location}.id: RNN batch ID required")
        if batch_id in ids:
            raise ManifestError(f"{location}.id: duplicate {batch_id}")
        ids.add(batch_id)
        sequence = batch.get("sequence")
        if not isinstance(sequence, int) or sequence < 0:
            raise ManifestError(f"{location}.sequence: non-negative integer required")
        if sequence in sequences:
            raise ManifestError(f"{location}.sequence: duplicate {sequence}")
        sequences.add(sequence)
        if not isinstance(batch.get("title"), str) or not batch["title"]:
            raise ManifestError(f"{location}.title: non-empty string required")
        state = batch.get("state")
        if state not in BATCH_STATES:
            raise ManifestError(
                f"{location}.state: one of {', '.join(BATCH_STATES)} required"
            )
        if state == "active":
            active_count += 1
        completion = batch.get("completion")
        if state == "batch_pass":
            if not isinstance(completion, dict):
                raise ManifestError(
                    f"{location}.completion: batch_pass evidence required"
                )
            implementation_commit = completion.get("implementation_commit")
            if not isinstance(implementation_commit, str) or re.fullmatch(
                r"[a-f0-9]{40}",
                implementation_commit,
            ) is None:
                raise ManifestError(
                    f"{location}.completion.implementation_commit: Git SHA required"
                )
            evidence_path = completion.get("evidence_path")
            if (
                not isinstance(evidence_path, str)
                or not evidence_path
                or Path(evidence_path).is_absolute()
                or ".." in Path(evidence_path).parts
            ):
                raise ManifestError(
                    f"{location}.completion.evidence_path: repository path required"
                )
            if not isinstance(completion.get("closed_at"), str) or not completion[
                "closed_at"
            ]:
                raise ManifestError(
                    f"{location}.completion.closed_at: timestamp required"
                )
        elif completion is not None:
            raise ManifestError(
                f"{location}.completion: only batch_pass may carry completion"
            )
        _require_string_list(batch.get("depends_on"), f"{location}.depends_on")
        if not isinstance(batch.get("control_only", False), bool):
            raise ManifestError(f"{location}.control_only: boolean required")

        core = batch.get("core")
        if not isinstance(core, dict):
            raise ManifestError(f"{location}.core: object required")
        _require_string_list(core.get("domains"), f"{location}.core.domains")
        _require_string_list(
            core.get("operation_ids"),
            f"{location}.core.operation_ids",
        )
        expected_count = core.get("expected_count")
        if not isinstance(expected_count, int) or expected_count < 0:
            raise ManifestError(
                f"{location}.core.expected_count: non-negative integer required"
            )

        legacy = batch.get("legacy")
        if not isinstance(legacy, dict):
            raise ManifestError(f"{location}.legacy: object required")
        unknown_categories = set(legacy) - set(LEGACY_CATEGORIES)
        if unknown_categories:
            raise ManifestError(
                f"{location}.legacy: unknown categories "
                f"{sorted(unknown_categories)}"
            )
        for category in LEGACY_CATEGORIES:
            rules = legacy.get(category, [])
            if not isinstance(rules, list):
                raise ManifestError(f"{location}.legacy.{category}: array required")
            for rule_index, rule in enumerate(rules):
                rule_location = (
                    f"{location}.legacy.{category}[{rule_index}]"
                )
                if not isinstance(rule, dict):
                    raise ManifestError(f"{rule_location}: object required")
                pattern = rule.get("pattern")
                if (
                    not isinstance(pattern, str)
                    or not pattern
                    or pattern in _FORBIDDEN_CATCH_ALL
                ):
                    raise ManifestError(
                        f"{rule_location}.pattern: scoped regex required"
                    )
                try:
                    re.compile(pattern)
                except re.error as error:
                    raise ManifestError(
                        f"{rule_location}.pattern: invalid regex: {error}"
                    ) from error
                rule_count = rule.get("expected_count")
                if not isinstance(rule_count, int) or rule_count < 1:
                    raise ManifestError(
                        f"{rule_location}.expected_count: positive integer required"
                    )
        _require_string_list(
            batch.get("capability_ids"),
            f"{location}.capability_ids",
        )

    if final_batch not in ids:
        raise ManifestError(f"batch $.policy.final_batch: unknown {final_batch}")
    if active_count != 1:
        raise ManifestError(
            f"batch $.batches: exactly one active batch required, got {active_count}"
        )

    by_id = {batch["id"]: batch for batch in batches}
    for batch in batches:
        for dependency in batch["depends_on"]:
            if dependency not in by_id:
                raise ManifestError(
                    f"batch {batch['id']}.depends_on: unknown {dependency}"
                )
            if by_id[dependency]["sequence"] >= batch["sequence"]:
                raise ManifestError(
                    f"batch {batch['id']}.depends_on: {dependency} must precede it"
                )
            if batch["state"] in ("active", "batch_pass") and by_id[dependency][
                "state"
            ] != "batch_pass":
                raise ManifestError(
                    f"batch {batch['id']}.depends_on: {dependency} is not batch_pass"
                )


def _ownership_finding(
    code: str,
    message: str,
    *,
    category: str,
    item_id: str | None = None,
) -> Finding:
    return Finding(code, message, category, item_id)


def audit_batch_ownership(
    batch_manifest: dict[str, Any],
    parity_manifest: dict[str, Any],
    legacy: Inventory,
    active: Inventory,
    *,
    root: Path | None = None,
) -> OwnershipAudit:
    findings: list[Finding] = []
    batches = batch_manifest["batches"]
    legacy_owners: dict[str, dict[str, str]] = {
        category: {} for category in LEGACY_CATEGORIES
    }

    if root is not None:
        for batch in batches:
            if batch["state"] != "batch_pass":
                continue
            completion = batch["completion"]
            evidence_path = root / completion["evidence_path"]
            try:
                evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                findings.append(
                    _ownership_finding(
                        "batch.completion_evidence_invalid",
                        f"완료 증거를 읽을 수 없습니다: {error}",
                        category="batch_manifest",
                        item_id=batch["id"],
                    )
                )
                continue
            expected = {
                "schema": "g5-fleet.migration-batch-evidence/v1",
                "batch": batch["id"],
                "status": "BATCH_GATE_PASS",
                "implementation_commit": completion["implementation_commit"],
            }
            mismatched = [
                key for key, value in expected.items() if evidence.get(key) != value
            ]
            if mismatched:
                findings.append(
                    _ownership_finding(
                        "batch.completion_evidence_mismatch",
                        f"완료 증거 필드가 일치하지 않습니다: {mismatched}",
                        category="batch_manifest",
                        item_id=batch["id"],
                    )
                )

    for category in LEGACY_CATEGORIES:
        items = legacy.categories[category]
        matches: dict[str, list[str]] = {item.item_id: [] for item in items}
        for batch in batches:
            for rule in batch["legacy"].get(category, []):
                pattern = re.compile(rule["pattern"])
                matched_ids = [
                    item.item_id
                    for item in items
                    if pattern.fullmatch(item.item_id) is not None
                ]
                if len(matched_ids) != rule["expected_count"]:
                    findings.append(
                        _ownership_finding(
                            "batch.rule_count_mismatch",
                            f"{batch['id']} rule count={len(matched_ids)}, "
                            f"expected={rule['expected_count']}: {rule['pattern']}",
                            category=category,
                            item_id=batch["id"],
                        )
                    )
                for item_id in matched_ids:
                    matches[item_id].append(batch["id"])

        for item_id, owners in sorted(matches.items()):
            unique_owners = sorted(set(owners))
            if len(owners) == 1:
                legacy_owners[category][item_id] = owners[0]
            elif not owners:
                findings.append(
                    _ownership_finding(
                        "batch.ownership_unassigned",
                        "legacy 항목에 배치 소유권이 없습니다.",
                        category=category,
                        item_id=item_id,
                    )
                )
            else:
                findings.append(
                    _ownership_finding(
                        "batch.ownership_ambiguous",
                        f"legacy 항목이 여러 규칙에 걸립니다: {unique_owners}",
                        category=category,
                        item_id=item_id,
                    )
                )

    operation_items = active.categories.get("core_operations", [])
    operation_ids = {item.item_id for item in operation_items}
    operation_domains = {
        item.item_id: item.metadata.get("domain") for item in operation_items
    }
    known_domains = {value for value in operation_domains.values() if value}
    core_matches: dict[str, list[str]] = {
        operation_id: [] for operation_id in operation_ids
    }
    for batch in batches:
        core = batch["core"]
        unknown_domains = sorted(set(core["domains"]) - known_domains)
        for domain in unknown_domains:
            findings.append(
                _ownership_finding(
                    "batch.core_domain_unknown",
                    f"canonical Core domain이 아닙니다: {domain}",
                    category="core_operations",
                    item_id=batch["id"],
                )
            )
        unknown_ids = sorted(set(core["operation_ids"]) - operation_ids)
        for operation_id in unknown_ids:
            findings.append(
                _ownership_finding(
                    "batch.core_operation_unknown",
                    f"canonical Core operation이 아닙니다: {operation_id}",
                    category="core_operations",
                    item_id=batch["id"],
                )
            )
        selected = {
            operation_id
            for operation_id, domain in operation_domains.items()
            if domain in core["domains"] or operation_id in core["operation_ids"]
        }
        if len(selected) != core["expected_count"]:
            findings.append(
                _ownership_finding(
                    "batch.core_count_mismatch",
                    f"{batch['id']} Core count={len(selected)}, "
                    f"expected={core['expected_count']}",
                    category="core_operations",
                    item_id=batch["id"],
                )
            )
        for operation_id in selected:
            core_matches[operation_id].append(batch["id"])

    core_owners: dict[str, str] = {}
    for operation_id, owners in sorted(core_matches.items()):
        if len(owners) == 1:
            core_owners[operation_id] = owners[0]
        elif not owners:
            findings.append(
                _ownership_finding(
                    "batch.core_unassigned",
                    "Core operation에 배치 소유권이 없습니다.",
                    category="core_operations",
                    item_id=operation_id,
                )
            )
        else:
            findings.append(
                _ownership_finding(
                    "batch.core_ambiguous",
                    f"Core operation이 여러 배치에 배정됐습니다: {sorted(set(owners))}",
                    category="core_operations",
                    item_id=operation_id,
                )
            )

    required_ids = {
        capability["id"] for capability in parity_manifest["required_capabilities"]
    }
    capability_matches: dict[str, list[str]] = {
        capability_id: [] for capability_id in required_ids
    }
    for batch in batches:
        for capability_id in batch["capability_ids"]:
            if capability_id not in required_ids:
                findings.append(
                    _ownership_finding(
                        "batch.capability_unknown",
                        f"필수 capability가 아닙니다: {capability_id}",
                        category="required_capabilities",
                        item_id=batch["id"],
                    )
                )
                continue
            capability_matches[capability_id].append(batch["id"])

    capability_owners: dict[str, str] = {}
    for capability_id, owners in sorted(capability_matches.items()):
        if len(owners) == 1:
            capability_owners[capability_id] = owners[0]
        elif not owners:
            findings.append(
                _ownership_finding(
                    "batch.capability_unassigned",
                    "필수 capability에 배치 소유권이 없습니다.",
                    category="required_capabilities",
                    item_id=capability_id,
                )
            )
        else:
            findings.append(
                _ownership_finding(
                    "batch.capability_ambiguous",
                    f"필수 capability가 여러 배치에 배정됐습니다: "
                    f"{sorted(set(owners))}",
                    category="required_capabilities",
                    item_id=capability_id,
                )
            )

    control_batches = [batch for batch in batches if batch.get("control_only")]
    if len(control_batches) != 1:
        findings.append(
            _ownership_finding(
                "batch.control_count_invalid",
                f"control_only 배치는 정확히 하나여야 합니다: {len(control_batches)}",
                category="batch_manifest",
            )
        )
    else:
        control_id = control_batches[0]["id"]
        owns_legacy = any(
            control_id in owners.values() for owners in legacy_owners.values()
        )
        owns_core = control_id in core_owners.values()
        owns_capability = control_id in capability_owners.values()
        if owns_legacy or owns_core or owns_capability:
            findings.append(
                _ownership_finding(
                    "batch.control_owns_migration_scope",
                    "control_only 배치는 제품 이관 항목을 소유할 수 없습니다.",
                    category="batch_manifest",
                    item_id=control_id,
                )
            )

    return OwnershipAudit(
        findings=findings,
        legacy_owners=legacy_owners,
        core_owners=core_owners,
        capability_owners=capability_owners,
    )


def batch_scope(
    batch_id: str,
    ownership: OwnershipAudit,
) -> dict[str, Any]:
    return {
        "legacy": {
            category: sorted(
                item_id
                for item_id, owner in owners.items()
                if owner == batch_id
            )
            for category, owners in sorted(ownership.legacy_owners.items())
        },
        "core_operations": sorted(
            operation_id
            for operation_id, owner in ownership.core_owners.items()
            if owner == batch_id
        ),
        "required_capabilities": sorted(
            capability_id
            for capability_id, owner in ownership.capability_owners.items()
            if owner == batch_id
        ),
    }


def scoped_findings(
    batch: dict[str, Any],
    ownership: OwnershipAudit,
    global_findings: list[Finding],
) -> list[Finding]:
    selected: list[Finding] = list(ownership.findings)
    control_only = bool(batch.get("control_only"))
    batch_id = batch["id"]

    for finding in global_findings:
        owner: str | None = None
        if finding.item_id is not None:
            if finding.category in LEGACY_CATEGORIES:
                owner = ownership.legacy_owners[finding.category].get(finding.item_id)
            elif finding.category == "core_operations":
                owner = ownership.core_owners.get(finding.item_id)
            elif finding.category == "required_capabilities":
                owner = ownership.capability_owners.get(finding.item_id)

        is_global_blocker = (
            finding.item_id is None
            or finding.code.startswith(("baseline.", "active.", "legacy."))
        )
        if is_global_blocker or (not control_only and owner == batch_id):
            selected.append(finding)

    unique: dict[tuple[str, str | None, str | None, str], Finding] = {}
    for finding in selected:
        key = (
            finding.code,
            finding.category,
            finding.item_id,
            finding.message,
        )
        unique[key] = finding
    return list(unique.values())
