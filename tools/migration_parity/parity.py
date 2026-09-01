from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .inventory import category_fingerprint
from .manifest import DISPOSITIONS, LEGACY_CATEGORIES
from .model import Finding, Inventory
from .runtime import validate_evidence_file


def _path_has_symlink(root: Path, relative: Path) -> bool:
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            return True
    return False


def _validate_artifact_path(
    root: Path,
    relative_value: Any,
    *,
    allowed_roots: tuple[Path, ...],
    owner_id: str,
    role: str,
) -> tuple[Path | None, list[Finding]]:
    if not isinstance(relative_value, str) or not relative_value:
        return None, [
            Finding(
                f"mapping.{role}_path_invalid",
                f"{role} 경로는 비어 있지 않은 상대 경로여야 합니다.",
                item_id=owner_id,
            )
        ]
    relative = Path(relative_value)
    if relative.is_absolute() or ".." in relative.parts:
        return None, [
            Finding(
                f"mapping.{role}_path_escape",
                f"{role} 경로가 저장소 상대 경계를 벗어납니다: {relative_value}",
                item_id=owner_id,
            )
        ]
    if _path_has_symlink(root, relative):
        return None, [
            Finding(
                f"mapping.{role}_path_symlink",
                f"{role} 경로에 symlink가 포함됩니다: {relative_value}",
                item_id=owner_id,
            )
        ]
    path = (root / relative).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError:
        return None, [
            Finding(
                f"mapping.{role}_path_escape",
                f"{role} 경로가 저장소를 벗어납니다: {relative_value}",
                item_id=owner_id,
            )
        ]
    if not any(path == allowed or path.is_relative_to(allowed) for allowed in allowed_roots):
        return None, [
            Finding(
                f"mapping.{role}_path_forbidden",
                f"{role} 경로가 활성 제품 허용 범위가 아닙니다: {relative_value}",
                item_id=owner_id,
            )
        ]
    if not path.exists():
        return None, [
            Finding(
                f"mapping.{role}_path_missing",
                f"{role} 경로가 없습니다: {relative_value}",
                item_id=owner_id,
            )
        ]
    return path, []


def _validate_checks(
    root: Path,
    checks: Any,
    *,
    allowed_roots: tuple[Path, ...],
    owner_id: str,
) -> list[Finding]:
    if not isinstance(checks, list) or not checks:
        return [
            Finding(
                "mapping.checks_missing",
                "구현 symbol/계약 검사가 하나 이상 필요합니다.",
                item_id=owner_id,
            )
        ]
    findings: list[Finding] = []
    for index, check in enumerate(checks):
        if not isinstance(check, dict):
            findings.append(
                Finding(
                    "mapping.check_invalid",
                    f"checks[{index}]는 object여야 합니다.",
                    item_id=owner_id,
                )
            )
            continue
        path, path_findings = _validate_artifact_path(
            root,
            check.get("path"),
            allowed_roots=allowed_roots,
            owner_id=owner_id,
            role="check",
        )
        findings.extend(path_findings)
        if path is None or not path.is_file():
            continue
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as error:
            findings.append(
                Finding(
                    "mapping.check_unreadable",
                    f"검사 대상 파일을 읽을 수 없습니다: {error}",
                    item_id=owner_id,
                )
            )
            continue
        contains = check.get("contains")
        pattern = check.get("regex")
        if isinstance(contains, str):
            if contains not in source:
                findings.append(
                    Finding(
                        "mapping.check_missing",
                        f"{check.get('path')}: required token not found: {contains}",
                        item_id=owner_id,
                    )
                )
        elif isinstance(pattern, str):
            try:
                matched = re.search(pattern, source, re.S)
            except re.error as error:
                findings.append(
                    Finding(
                        "mapping.check_regex_invalid",
                        f"유효하지 않은 regex입니다: {error}",
                        item_id=owner_id,
                    )
                )
            else:
                if matched is None:
                    findings.append(
                        Finding(
                            "mapping.check_missing",
                            f"{check.get('path')}: regex did not match: {pattern}",
                            item_id=owner_id,
                        )
                    )
        else:
            findings.append(
                Finding(
                    "mapping.check_assertion_missing",
                    "각 check에는 contains 또는 regex가 필요합니다.",
                    item_id=owner_id,
                )
            )
    return findings


def _validate_implementation(
    root: Path,
    entry: dict[str, Any],
    *,
    owner_id: str,
    allowed_roots: tuple[Path, ...],
) -> list[Finding]:
    findings: list[Finding] = []
    target_paths = entry.get("target_paths")
    if not isinstance(target_paths, list) or not target_paths:
        findings.append(
            Finding(
                "mapping.targets_missing",
                "활성 구현 target_paths가 하나 이상 필요합니다.",
                item_id=owner_id,
            )
        )
    else:
        for value in target_paths:
            path, path_findings = _validate_artifact_path(
                root,
                value,
                allowed_roots=allowed_roots,
                owner_id=owner_id,
                role="target",
            )
            findings.extend(path_findings)
            if path is not None and not path.is_file():
                findings.append(
                    Finding(
                        "mapping.target_not_file",
                        f"활성 구현 target 경로가 파일이 아닙니다: {value}",
                        item_id=owner_id,
                    )
                )

    test_paths = entry.get("test_paths")
    if not isinstance(test_paths, list) or not test_paths:
        findings.append(
            Finding(
                "mapping.tests_missing",
                "활성 회귀 test_paths가 하나 이상 필요합니다.",
                item_id=owner_id,
            )
        )
    else:
        for value in test_paths:
            path, path_findings = _validate_artifact_path(
                root,
                value,
                allowed_roots=allowed_roots,
                owner_id=owner_id,
                role="test",
            )
            findings.extend(path_findings)
            if path is not None and not path.is_file():
                findings.append(
                    Finding(
                        "mapping.test_not_file",
                        f"회귀 test 경로가 파일이 아닙니다: {value}",
                        item_id=owner_id,
                    )
                )
    execution_tests = entry.get("execution_tests")
    if execution_tests is not None:
        if not isinstance(execution_tests, list) or not execution_tests:
            findings.append(Finding(
                "mapping.execution_tests_invalid",
                "execution_tests는 하나 이상의 exact runner·file·name selector여야 합니다.",
                item_id=owner_id,
            ))
        else:
            seen_execution_tests: set[tuple[str, str, str]] = set()
            for selector in execution_tests:
                if not isinstance(selector, dict):
                    findings.append(Finding(
                        "mapping.execution_test_invalid",
                        "execution_tests selector는 object여야 합니다.",
                        item_id=owner_id,
                    ))
                    continue
                identity = (
                    selector.get("runner"),
                    selector.get("file"),
                    selector.get("name"),
                )
                if (
                    identity[0] not in {"vitest", "libtest"}
                    or not all(isinstance(value, str) and value for value in identity)
                    or not isinstance(test_paths, list)
                    or identity[1] not in test_paths
                    or identity in seen_execution_tests
                ):
                    findings.append(Finding(
                        "mapping.execution_test_invalid",
                        "execution_tests는 test_paths 안의 중복 없는 exact 실행 case여야 합니다.",
                        item_id=owner_id,
                    ))
                    continue
                seen_execution_tests.add(identity)
    findings.extend(
        _validate_checks(
            root,
            entry.get("checks"),
            allowed_roots=allowed_roots,
            owner_id=owner_id,
        )
    )
    rationale = entry.get("rationale")
    if not isinstance(rationale, str) or not rationale.strip():
        findings.append(
            Finding(
                "mapping.rationale_missing",
                "이관 판단 근거가 필요합니다.",
                item_id=owner_id,
            )
        )
    return findings


def _validate_evidence_ids(
    entry: dict[str, Any],
    registry: dict[str, Any],
    *,
    owner_id: str,
    required: bool,
) -> tuple[set[str], list[Finding]]:
    evidence_ids = entry.get("evidence_ids", [])
    if not isinstance(evidence_ids, list):
        return set(), [
            Finding(
                "evidence.ids_invalid",
                "evidence_ids는 문자열 배열이어야 합니다.",
                item_id=owner_id,
            )
        ]
    if required and not evidence_ids:
        return set(), [
            Finding(
                "evidence.ids_missing",
                "runtime/staging 등급에는 revision-bound evidence가 필요합니다.",
                item_id=owner_id,
            )
        ]
    findings: list[Finding] = []
    valid: set[str] = set()
    for evidence_id in evidence_ids:
        if not isinstance(evidence_id, str) or evidence_id not in registry:
            findings.append(
                Finding(
                    "evidence.id_unknown",
                    f"evidence registry에 없는 ID입니다: {evidence_id!r}",
                    item_id=owner_id,
                )
            )
        else:
            valid.add(evidence_id)
    return valid, findings


def _audit_core_operation_mappings(
    root: Path,
    manifest: dict[str, Any],
    active: Inventory,
    *,
    profile: str,
    allowed_roots: tuple[Path, ...],
    evidence_registry: dict[str, Any],
) -> tuple[list[Finding], dict[str, int], set[str], set[str]]:
    findings: list[Finding] = []
    evidence_to_validate: set[str] = set()
    items = active.categories.get("core_operations", [])
    expected_ids = {item.item_id for item in items}
    seen: dict[str, int] = {}
    valid_ids: set[str] = set()

    for index, entry in enumerate(manifest["core_operation_mappings"]):
        if not isinstance(entry, dict):
            findings.append(
                Finding(
                    "operation.entry_invalid",
                    f"core_operation_mappings[{index}]는 object여야 합니다.",
                    "core_operations",
                )
            )
            continue
        operation_id = entry.get("operation_id")
        if not isinstance(operation_id, str) or not operation_id:
            findings.append(
                Finding(
                    "operation.id_missing",
                    "operation_id가 없습니다.",
                    "core_operations",
                )
            )
            continue
        seen[operation_id] = seen.get(operation_id, 0) + 1
        if operation_id not in expected_ids:
            findings.append(
                Finding(
                    "operation.id_unknown",
                    "canonical Core operation inventory에 없는 ID입니다.",
                    "core_operations",
                    operation_id,
                )
            )
            continue

        implementation_findings = _validate_implementation(
            root,
            entry,
            owner_id=operation_id,
            allowed_roots=allowed_roots,
        )
        findings.extend(
            Finding(
                finding.code.replace("mapping.", "operation.", 1),
                finding.message,
                "core_operations",
                finding.item_id,
                finding.severity,
            )
            for finding in implementation_findings
        )
        evidence_ids, evidence_findings = _validate_evidence_ids(
            entry,
            evidence_registry,
            owner_id=operation_id,
            required=profile in ("runtime", "staging"),
        )
        evidence_to_validate.update(evidence_ids)
        findings.extend(
            Finding(
                finding.code,
                finding.message,
                "core_operations",
                finding.item_id,
                finding.severity,
            )
            for finding in evidence_findings
        )
        if not implementation_findings and not evidence_findings:
            valid_ids.add(operation_id)

    for operation_id, count in sorted(seen.items()):
        if count > 1:
            findings.append(
                Finding(
                    "operation.duplicate",
                    "동일 Core operation이 두 번 이상 매핑됐습니다.",
                    "core_operations",
                    operation_id,
                )
            )
            valid_ids.discard(operation_id)

    unmapped_ids = expected_ids - set(seen)
    for operation_id in sorted(unmapped_ids):
        findings.append(
            Finding(
                "operation.unmapped",
                "Core operation의 typed 서버·웹 소비 매핑이 없습니다.",
                "core_operations",
                operation_id,
            )
        )

    coverage = {
        "total": len(expected_ids),
        "mapped": len(expected_ids & set(seen)),
        "valid": len(valid_ids),
        "deferred": 0,
        "unmapped": len(unmapped_ids),
    }
    return findings, coverage, evidence_to_validate, valid_ids


def audit_parity(
    root: Path,
    manifest: dict[str, Any],
    legacy: Inventory,
    active: Inventory,
    *,
    profile: str,
    git_revision: str,
) -> tuple[
    list[Finding],
    dict[str, dict[str, int]],
    dict[str, int],
    set[str],
]:
    findings = [*legacy.anomalies, *active.anomalies]
    coverage: dict[str, dict[str, int]] = {}
    valid_items: dict[str, set[str]] = {}
    evidence_to_validate: set[str] = set()
    allowed_roots = tuple(
        (root / value).resolve() for value in manifest["policy"]["allowed_target_roots"]
    )
    evidence_registry = manifest.get("evidence_registry", {})

    for category in LEGACY_CATEGORIES:
        items = legacy.categories[category]
        baseline = manifest["legacy_baseline"][category]
        actual_fingerprint = category_fingerprint(items)
        if len(items) != baseline["count"]:
            findings.append(
                Finding(
                    "baseline.count_drift",
                    f"legacy count={len(items)}, locked={baseline['count']}",
                    category,
                )
            )
        if actual_fingerprint != baseline["fingerprint"]:
            findings.append(
                Finding(
                    "baseline.fingerprint_drift",
                    "봉인된 legacy source fingerprint가 변경됐습니다.",
                    category,
                )
            )

        expected_ids = {item.item_id for item in items}
        seen: dict[str, int] = {}
        deferred = 0
        valid_mapping_ids: set[str] = set()
        entries = manifest["mappings"][category]
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                findings.append(
                    Finding(
                        "mapping.entry_invalid",
                        f"mapping[{index}]는 object여야 합니다.",
                        category,
                    )
                )
                continue
            item_id = entry.get("legacy_id")
            if not isinstance(item_id, str) or not item_id:
                findings.append(
                    Finding(
                        "mapping.id_missing",
                        "legacy_id가 없습니다.",
                        category,
                    )
                )
                continue
            seen[item_id] = seen.get(item_id, 0) + 1
            if item_id not in expected_ids:
                findings.append(
                    Finding(
                        "mapping.id_unknown",
                        "legacy inventory에 없는 ID입니다.",
                        category,
                        item_id,
                    )
                )
                continue
            disposition = entry.get("disposition")
            if disposition not in DISPOSITIONS:
                findings.append(
                    Finding(
                        "mapping.disposition_invalid",
                        f"허용되지 않은 disposition입니다: {disposition!r}",
                        category,
                        item_id,
                    )
                )
                continue
            if disposition == "deferred":
                deferred += 1
                tracking = entry.get("tracking")
                required_tracking = ("owner", "issue", "review_after")
                if not isinstance(tracking, dict) or any(
                    not isinstance(tracking.get(field), str) or not tracking.get(field)
                    for field in required_tracking
                ):
                    findings.append(
                        Finding(
                            "mapping.defer_unbounded",
                            "deferred에는 owner, issue, review_after가 필요합니다.",
                            category,
                            item_id,
                        )
                    )
                findings.append(
                    Finding(
                        "mapping.deferred",
                        "이 항목은 아직 활성 제품으로 이관되지 않았습니다.",
                        category,
                        item_id,
                    )
                )
                valid_mapping_ids.add(item_id)
                continue

            entry_findings = _validate_implementation(
                root,
                entry,
                owner_id=item_id,
                allowed_roots=allowed_roots,
            )
            findings.extend(
                Finding(
                    finding.code,
                    finding.message,
                    category,
                    finding.item_id,
                    finding.severity,
                )
                for finding in entry_findings
            )
            evidence_ids, evidence_findings = _validate_evidence_ids(
                entry,
                evidence_registry,
                owner_id=item_id,
                required=profile in ("runtime", "staging"),
            )
            evidence_to_validate.update(evidence_ids)
            findings.extend(
                Finding(
                    finding.code,
                    finding.message,
                    category,
                    finding.item_id,
                    finding.severity,
                )
                for finding in evidence_findings
            )
            if not entry_findings and not evidence_findings:
                valid_mapping_ids.add(item_id)

        duplicate_ids = {item_id for item_id, count in seen.items() if count > 1}
        for item_id in sorted(duplicate_ids):
            findings.append(
                Finding(
                    "mapping.duplicate",
                    "동일 legacy ID가 두 번 이상 매핑됐습니다.",
                    category,
                    item_id,
                )
            )
            valid_mapping_ids.discard(item_id)

        unmapped_ids = expected_ids - set(seen)
        for item_id in sorted(unmapped_ids):
            findings.append(
                Finding(
                    "mapping.unmapped",
                    "legacy 항목의 이관 매핑이 없습니다.",
                    category,
                    item_id,
                )
            )
        coverage[category] = {
            "total": len(expected_ids),
            "mapped": len(expected_ids & set(seen)),
            "valid": len(valid_mapping_ids),
            "deferred": deferred,
            "unmapped": len(unmapped_ids),
        }
        valid_items[category] = valid_mapping_ids

    operation_findings, operation_coverage, operation_evidence, valid_operations = (
        _audit_core_operation_mappings(
            root,
            manifest,
            active,
            profile=profile,
            allowed_roots=allowed_roots,
            evidence_registry=evidence_registry,
        )
    )
    findings.extend(operation_findings)
    coverage["core_operations"] = operation_coverage
    valid_items["core_operations"] = valid_operations
    evidence_to_validate.update(operation_evidence)

    for category, expectation in manifest["active_expectations"].items():
        items = active.categories.get(category)
        if items is None:
            findings.append(
                Finding(
                    "active.category_missing",
                    "active inventory category가 없습니다.",
                    category,
                )
            )
            continue
        count = len(items)
        if "exact" in expectation and count != expectation["exact"]:
            findings.append(
                Finding(
                    "active.count_mismatch",
                    f"active count={count}, expected exact={expectation['exact']}",
                    category,
                )
            )
        if "minimum" in expectation and count < expectation["minimum"]:
            findings.append(
                Finding(
                    "active.count_below_minimum",
                    f"active count={count}, expected minimum={expectation['minimum']}",
                    category,
                )
            )

    capability_summary = {
        "total": len(manifest["required_capabilities"]),
        "implemented": 0,
        "pending": 0,
        "valid": 0,
    }
    for capability in manifest["required_capabilities"]:
        capability_id = capability["id"]
        state = capability["state"]
        capability_summary[state] += 1
        if state == "pending":
            findings.append(
                Finding(
                    "capability.pending",
                    "서버 전환 필수 capability가 아직 pending입니다.",
                    "required_capabilities",
                    capability_id,
                )
            )
            continue
        implementation_findings = _validate_implementation(
            root,
            capability,
            owner_id=capability_id,
            allowed_roots=allowed_roots,
        )
        findings.extend(
            Finding(
                finding.code,
                finding.message,
                "required_capabilities",
                finding.item_id,
                finding.severity,
            )
            for finding in implementation_findings
        )
        profiles = capability.get("profiles", ["static", "runtime", "staging"])
        required = profile in ("runtime", "staging") and profile in profiles
        evidence_ids, evidence_findings = _validate_evidence_ids(
            capability,
            evidence_registry,
            owner_id=capability_id,
            required=required,
        )
        evidence_to_validate.update(evidence_ids)
        findings.extend(
            Finding(
                finding.code,
                finding.message,
                "required_capabilities",
                finding.item_id,
                finding.severity,
            )
            for finding in evidence_findings
        )
        if not implementation_findings and not evidence_findings:
            capability_summary["valid"] += 1

    required_profile_evidence = manifest.get("profile_evidence", {}).get(profile, [])
    for evidence_id in required_profile_evidence:
        if evidence_id not in evidence_registry:
            findings.append(
                Finding(
                    "evidence.profile_id_unknown",
                    f"profile evidence ID가 registry에 없습니다: {evidence_id}",
                    profile,
                )
            )
        else:
            evidence_to_validate.add(evidence_id)

    if profile in ("runtime", "staging"):
        max_age = int(manifest["policy"].get("runtime_evidence_max_age_hours", 24))
        # An evidence id is not proof that the mapped item ran.  Bind every
        # legacy/Core consumer to observed cases in the hash-checked raw report.
        evidence_items: dict[str, set[tuple[str, str]]] = {}
        entries = [
            (category, entry.get("legacy_id"), entry)
            for category in LEGACY_CATEGORIES
            for entry in manifest["mappings"][category]
            if isinstance(entry, dict)
        ] + [
            ("core_operations", entry.get("operation_id"), entry)
            for entry in manifest["core_operation_mappings"]
            if isinstance(entry, dict)
        ]
        for category, item_id, entry in entries:
            ids = entry.get("evidence_ids", [])
            if not isinstance(ids, list):
                continue
            for evidence_id in ids:
                if isinstance(evidence_id, str) and isinstance(item_id, str):
                    evidence_items.setdefault(evidence_id, set()).add((category, item_id))
        for evidence_id in sorted(evidence_to_validate):
            consumers = evidence_items.get(evidence_id, set())
            receipt_findings = validate_evidence_file(
                root,
                evidence_registry[evidence_id],
                git_revision=git_revision,
                max_age_hours=max_age,
                owner_id=evidence_id,
                required_items=consumers,
            )
            findings.extend(receipt_findings)
            invalid_items = {
                (finding.category, finding.item_id)
                for finding in receipt_findings
                if finding.code == "evidence.item_unverified"
            }
            if any(finding.code != "evidence.item_unverified" for finding in receipt_findings):
                invalid_items.update(consumers)
            for category, item_id in invalid_items:
                if category in valid_items:
                    valid_items[category].discard(item_id)
        for category, ids in valid_items.items():
            coverage[category]["valid"] = len(ids)

    return findings, coverage, capability_summary, evidence_to_validate
