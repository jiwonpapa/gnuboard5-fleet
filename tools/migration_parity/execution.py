"""Validate item-scoped execution receipts, never a bare PASS assertion.

The raw case artifact is written by an execution producer.  A receipt may only
claim the subjects actually present in passing cases in that hash-bound artifact.
Mock/regression cases cannot certify a real browser or PHP provider workflow.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .model import Finding


EXECUTION_SCHEMA = "g5-fleet.migration-execution/v1"
CASE_SCHEMA = "g5-fleet.execution-cases/v1"
KINDS = {
    "provider_readback", "browser_workflow", "remote_roundtrip",
    "regression", "safe_external_boundary",
}
REQUIRED_KINDS = {
    "core_operations": {"provider_readback", "safe_external_boundary"},
    "react_pages": {"browser_workflow"},
    "rust_workspace_members": {"regression", "remote_roundtrip"},
    "frontend_tests": {"regression"},
    "rust_tests": {"regression", "remote_roundtrip"},
    "tauri_commands": KINDS,
}


def execution_inputs(root: Path) -> dict[str, str]:
    """Fingerprint the canonical provider inputs, not producer-supplied labels."""
    contract = safe_evidence_path(root, "connectors/gnuboard5-php/api/docs/openapi.yaml")
    lock = json.loads(safe_evidence_path(root, "UPSTREAMS.lock.json").read_bytes())
    upstreams = [row for row in lock["upstreams"] if row.get("id") == "gnuboard5"]
    if len(upstreams) != 1 or not re.fullmatch(r"[0-9a-f]{40}", upstreams[0]["commit"]):
        raise ValueError("canonical upstream identity is invalid")
    return {
        "openapi_sha256": hashlib.sha256(contract.read_bytes()).hexdigest(),
        "upstream_commit": upstreams[0]["commit"],
    }


def execution_timestamp(value: Any) -> datetime:
    if not isinstance(value, str):
        raise ValueError("execution timestamp is missing")
    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if timestamp.tzinfo is None:
        raise ValueError("execution timestamp must include a timezone")
    return timestamp.astimezone(UTC)


def safe_evidence_path(root: Path, value: Any) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError("non-empty repository-relative path required")
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("evidence path escapes repository")
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("evidence path contains a symlink")
    if not current.is_file() or not current.resolve().is_relative_to(root.resolve()):
        raise ValueError("evidence path must be a regular repository file")
    return current


def validate_execution_claims(
    root: Path,
    data: dict[str, Any],
    *,
    required_items: set[tuple[str, str]],
    git_revision: str,
    owner_id: str,
) -> list[Finding]:
    if not required_items:
        return []
    findings: list[Finding] = []

    def fail(code: str, message: str) -> None:
        findings.append(Finding(f"evidence.{code}", message, item_id=owner_id))

    if data.get("schema") != EXECUTION_SCHEMA:
        fail("execution_schema", "항목별 실행 receipt schema가 필요합니다.")
        return findings
    run_id = data.get("run_id")
    if not isinstance(run_id, str) or not run_id:
        fail("run_id_missing", "실행 receipt run_id가 필요합니다.")
        return findings
    if data.get("proof_level") != "LOCAL_RUNTIME_PASS":
        fail("execution_level", "정적 결과를 실행 증거로 승격할 수 없습니다.")
    try:
        inputs = execution_inputs(root)
        if data.get("inputs") != inputs:
            raise ValueError("receipt OpenAPI/upstream inputs differ from this checkout")
        receipt_time = execution_timestamp(data.get("generated_at"))
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as error:
        fail("execution_identity", str(error))
        return findings
    artifacts = data.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        fail("artifacts_missing", "hash-bound 원본 실행 case artifact가 필요합니다.")
        return findings

    covered: set[tuple[str, str]] = set()
    seen_paths: set[str] = set()
    seen_cases: set[str] = set()
    for artifact in artifacts:
        try:
            if not isinstance(artifact, dict):
                raise ValueError("artifact metadata must be an object")
            path = safe_evidence_path(root, artifact.get("path"))
            relative = path.relative_to(root).as_posix()
            if relative in seen_paths:
                raise ValueError("duplicate artifact path")
            seen_paths.add(relative)
            content = path.read_bytes()
            if (
                type(artifact.get("bytes")) is not int
                or len(content) != artifact["bytes"]
                or hashlib.sha256(content).hexdigest() != artifact.get("sha256")
            ):
                raise ValueError("artifact checksum/size mismatch")
            source = json.loads(content)
            if not isinstance(source, dict) or (
                source.get("schema") != CASE_SCHEMA
                or source.get("status") != "PASS"
                or source.get("git_revision") != git_revision
                or source.get("parent_run_id") != run_id
                or source.get("run_id") != artifact.get("run_id")
                or not isinstance(source.get("run_id"), str)
                or not source["run_id"]
                or source.get("inputs") != inputs
            ):
                raise ValueError("case artifact identity/status/revision/parent mismatch")
            source_time = execution_timestamp(source.get("generated_at"))
            if not 0 <= (receipt_time - source_time).total_seconds() <= 24 * 3600:
                raise ValueError("case timestamp is newer than receipt or over 24h older")
            raw_artifacts = source.get("raw_artifacts")
            if source.get("producer") == "tools/certification/regression_runtime.py" and not raw_artifacts:
                raise ValueError("regression producer must retain original runner artifacts")
            if raw_artifacts is not None:
                if not isinstance(raw_artifacts, list) or not raw_artifacts:
                    raise ValueError("raw runner artifacts must be a non-empty list")
                raw_paths: set[str] = set()
                for raw in raw_artifacts:
                    if not isinstance(raw, dict):
                        raise ValueError("raw runner artifact must be an object")
                    raw_path = safe_evidence_path(root, raw.get("path"))
                    if raw["path"] in raw_paths:
                        raise ValueError("duplicate raw runner artifact")
                    raw_paths.add(raw["path"])
                    raw_content = raw_path.read_bytes()
                    if (type(raw.get("bytes")) is not int or len(raw_content) != raw["bytes"]
                            or hashlib.sha256(raw_content).hexdigest() != raw.get("sha256")):
                        raise ValueError("raw runner artifact checksum/size mismatch")
            cases = source.get("cases")
            if not isinstance(cases, list) or not cases:
                raise ValueError("executed cases are missing")
            artifact_covered: set[tuple[str, str]] = set()
            for case in cases:
                if not isinstance(case, dict):
                    raise ValueError("case must be an object")
                case_id = case.get("id")
                if not isinstance(case_id, str) or not case_id or case_id in seen_cases:
                    raise ValueError("missing or duplicate case id")
                seen_cases.add(case_id)
                assertions = case.get("assertions")
                kind = case.get("kind")
                if (
                    case.get("status") != "PASS"
                    or kind not in KINDS
                    or not isinstance(assertions, list)
                    or not assertions
                    or any(not isinstance(value, str) or not value for value in assertions)
                ):
                    raise ValueError("failed/skipped/assertion-free execution case")
                subjects = case.get("subjects")
                if not isinstance(subjects, list) or not subjects:
                    raise ValueError("execution case has no observed subjects")
                for subject in subjects:
                    if not isinstance(subject, dict):
                        raise ValueError("execution subject must be an object")
                    category, item_id = subject.get("category"), subject.get("item_id")
                    if (
                        category not in REQUIRED_KINDS
                        or not isinstance(item_id, str)
                        or not item_id
                    ):
                        raise ValueError("invalid execution subject")
                    if kind in REQUIRED_KINDS[category]:
                        artifact_covered.add((category, item_id))
            covered.update(artifact_covered)
        except (OSError, ValueError, TypeError, KeyError) as error:
            fail("artifact_invalid", str(error))

    for category, item_id in sorted(required_items - covered):
        findings.append(Finding(
            "evidence.item_unverified",
            "이 항목에 해당하는 실제 실행 case·assertion이 없습니다.",
            category,
            item_id,
        ))
    return findings
