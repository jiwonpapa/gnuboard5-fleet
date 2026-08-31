from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .execution import execution_timestamp, safe_evidence_path, validate_execution_claims
from .model import Finding


def _parse_timestamp(value: Any) -> datetime | None:
    try:
        return execution_timestamp(value)
    except ValueError:
        return None


def validate_evidence_file(
    root: Path,
    evidence: dict[str, Any],
    *,
    git_revision: str,
    max_age_hours: int,
    owner_id: str,
    required_items: set[tuple[str, str]] | None = None,
) -> list[Finding]:
    findings: list[Finding] = []
    relative = evidence.get("path")
    if not isinstance(relative, str) or not relative:
        return [
            Finding(
                "evidence.path_missing",
                "runtime evidence 경로가 없습니다.",
                item_id=owner_id,
            )
        ]
    try:
        path = safe_evidence_path(root, relative)
    except (OSError, ValueError) as error:
        return [
            Finding(
                "evidence.path_unsafe",
                f"{relative}: {error}",
                item_id=owner_id,
            )
        ]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        return [
            Finding(
                "evidence.invalid_json",
                f"runtime evidence JSON을 읽을 수 없습니다: {relative}: {error}",
                item_id=owner_id,
            )
        ]

    if not isinstance(data, dict):
        return [Finding("evidence.invalid_json", "evidence must be an object", item_id=owner_id)]

    expected_status = evidence.get("status", "PASS")
    actual_status = data.get("status")
    if actual_status != expected_status:
        findings.append(
            Finding(
                "evidence.status_mismatch",
                f"{relative}: status={actual_status!r}, expected={expected_status!r}",
                item_id=owner_id,
            )
        )
    revision_field = evidence.get("revision_field", "git_revision")
    if data.get(revision_field) != git_revision:
        findings.append(
            Finding(
                "evidence.revision_mismatch",
                f"{relative}: 현재 Git revision과 evidence가 다릅니다.",
                item_id=owner_id,
            )
        )
    timestamp_field = evidence.get("timestamp_field", "generated_at")
    timestamp = _parse_timestamp(data.get(timestamp_field))
    if timestamp is None:
        findings.append(
            Finding(
                "evidence.timestamp_invalid",
                f"{relative}: 유효한 {timestamp_field}가 없습니다.",
                item_id=owner_id,
            )
        )
    else:
        age_hours = (datetime.now(UTC) - timestamp).total_seconds() / 3600
        if age_hours < -1 or age_hours > max_age_hours:
            findings.append(
                Finding(
                    "evidence.stale",
                    f"{relative}: evidence age {age_hours:.1f}h exceeds {max_age_hours}h.",
                    item_id=owner_id,
                )
            )
    findings.extend(validate_execution_claims(
        root,
        data,
        required_items=required_items or set(),
        git_revision=git_revision,
        owner_id=owner_id,
    ))
    return findings


def run_live_probes(
    staging: dict[str, Any],
    *,
    git_revision: str,
) -> tuple[list[dict[str, Any]], list[Finding]]:
    env_name = staging["base_url_env"]
    base_url = os.environ.get(env_name, "").rstrip("/")
    if not base_url:
        return [], [
            Finding(
                "staging.base_url_missing",
                f"실시간 staging 감사를 위해 {env_name}가 필요합니다.",
                "staging",
            )
        ]

    ca_env = staging.get("ca_file_env")
    context = ssl.create_default_context()
    if isinstance(ca_env, str) and ca_env:
        ca_file = os.environ.get(ca_env)
        if ca_file:
            context = ssl.create_default_context(cafile=ca_file)

    timeout = int(staging.get("timeout_seconds", 10))
    results: list[dict[str, Any]] = []
    findings: list[Finding] = []
    for probe in staging["probes"]:
        path = probe.get("path")
        probe_id = probe.get("id", path)
        if not isinstance(path, str) or not path.startswith("/"):
            findings.append(
                Finding(
                    "staging.probe_invalid",
                    "staging probe path는 /로 시작해야 합니다.",
                    "staging",
                    str(probe_id),
                )
            )
            continue
        url = f"{base_url}{path}"
        request = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "Cache-Control": "no-cache"},
            method=probe.get("method", "GET"),
        )
        result: dict[str, Any] = {"id": probe_id, "url": url}
        try:
            with urllib.request.urlopen(
                request,
                context=context,
                timeout=timeout,
            ) as response:
                result["status_code"] = response.status
                body = response.read()
                result["content_type"] = response.headers.get("Content-Type", "")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            result["error"] = str(error)
            results.append(result)
            findings.append(
                Finding(
                    "staging.probe_failed",
                    f"실시간 probe 실패: {probe_id}: {error}",
                    "staging",
                    str(probe_id),
                )
            )
            continue

        expected_status = int(probe.get("status", 200))
        if result["status_code"] != expected_status:
            findings.append(
                Finding(
                    "staging.status_mismatch",
                    f"{probe_id}: HTTP {result['status_code']}, expected {expected_status}",
                    "staging",
                    str(probe_id),
                )
            )
        if probe.get("json", True):
            try:
                payload = json.loads(body)
                result["json"] = payload
            except json.JSONDecodeError:
                findings.append(
                    Finding(
                        "staging.json_invalid",
                        f"{probe_id}: JSON 응답이 아닙니다.",
                        "staging",
                        str(probe_id),
                    )
                )
                results.append(result)
                continue
            for field, expected in probe.get("expect", {}).items():
                actual = payload
                for segment in field.split("."):
                    actual = actual.get(segment) if isinstance(actual, dict) else None
                if expected == "$GIT_REVISION":
                    expected = git_revision
                if actual != expected:
                    findings.append(
                        Finding(
                            "staging.field_mismatch",
                            f"{probe_id}: {field}={actual!r}, expected={expected!r}",
                            "staging",
                            str(probe_id),
                        )
                    )
        results.append(result)
    return results, findings
