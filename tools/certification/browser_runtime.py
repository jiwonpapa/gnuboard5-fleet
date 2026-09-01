"""Validate in-app browser observations and emit item-scoped execution proof."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from tools.certification.execution_capture import clean_revision, write_json
from tools.migration_parity.execution import (
    CASE_SCHEMA,
    EXECUTION_SCHEMA,
    execution_inputs,
    execution_timestamp,
)

ROOT = Path(__file__).resolve().parents[2]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def safe_file(root: Path, value: Any) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError("browser artifact path must be repository-relative")
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("browser artifact path escapes the repository")
    current = root
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise ValueError("browser artifact path contains a symlink")
    if not current.is_file() or not current.resolve().is_relative_to(root.resolve()):
        raise ValueError("browser artifact must be a regular repository file")
    return current


def fingerprint(root: Path, path: Path) -> dict[str, Any]:
    content = path.read_bytes()
    return {
        "path": path.relative_to(root).as_posix(),
        "sha256": hashlib.sha256(content).hexdigest(),
        "bytes": len(content),
    }


def secret_values(root: Path) -> set[str]:
    values: set[str] = set()
    for relative in (
        ".cache/certification/local/session.env",
        ".cache/certification/local/browser.env",
    ):
        path = root / relative
        if not path.is_file() or path.is_symlink():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.removeprefix("export ").strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if (
                key.endswith("_VALUE")
                or key.endswith("_SECRET")
                or "TOTP" in key
                or "MASTER" in key
                or "JWT" in key
            ) and len(value) >= 8:
                values.add(value.strip("'\""))
    return values


def validate_browser_cases(
    root: Path,
    source: dict[str, Any],
    *,
    revision: str,
    inputs: dict[str, str],
    secrets: set[str],
) -> dict[str, int]:
    if (
        source.get("schema") != CASE_SCHEMA
        or source.get("status") != "PASS"
        or source.get("git_revision") != revision
        or source.get("inputs") != inputs
        or source.get("driver") != "codex-in-app-browser"
    ):
        raise ValueError("browser case identity/status/revision is invalid")
    parent_run_id = source.get("parent_run_id")
    run_id = source.get("run_id")
    if (
        not isinstance(parent_run_id, str)
        or not parent_run_id
        or not isinstance(run_id, str)
        or not run_id
    ):
        raise ValueError("browser case run identity is missing")
    execution_timestamp(source.get("generated_at"))
    cases = source.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("browser cases are missing")
    manifest = json.loads((root / "governance/MIGRATION_PARITY.json").read_bytes())
    known_pages = {
        row["legacy_id"] for row in manifest["mappings"]["react_pages"]
    }
    seen_cases: set[str] = set()
    observed_pages: set[str] = set()
    artifact_paths: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("browser case must be an object")
        case_id = case.get("id")
        assertions = case.get("assertions")
        actions = case.get("actions")
        negative = case.get("negative_assertions", [])
        if (
            not isinstance(case_id, str)
            or not case_id
            or case_id in seen_cases
            or case.get("status") != "PASS"
            or case.get("kind") != "browser_workflow"
            or not isinstance(assertions, list)
            or not assertions
            or not isinstance(actions, list)
            or not actions
            or not isinstance(negative, list)
            or any(not isinstance(value, str) or not value for value in assertions + actions + negative)
        ):
            raise ValueError("browser case is duplicate, empty, failed, or assertion-free")
        seen_cases.add(case_id)
        subjects = case.get("subjects")
        if not isinstance(subjects, list) or not subjects:
            raise ValueError("browser case subjects are missing")
        for subject in subjects:
            if (
                not isinstance(subject, dict)
                or subject.get("category") != "react_pages"
                or subject.get("item_id") not in known_pages
            ):
                raise ValueError("browser case claims an unknown React page")
            observed_pages.add(subject["item_id"])
        artifacts = case.get("artifacts")
        if not isinstance(artifacts, list) or len(artifacts) < 2:
            raise ValueError("browser case requires DOM and PNG artifacts")
        dom_text: str | None = None
        png_seen = False
        for metadata in artifacts:
            if not isinstance(metadata, dict):
                raise ValueError("browser artifact metadata must be an object")
            path = safe_file(root, metadata.get("path"))
            relative = path.relative_to(root).as_posix()
            if relative in artifact_paths:
                raise ValueError("browser artifact path is reused")
            artifact_paths.add(relative)
            content = path.read_bytes()
            if (
                type(metadata.get("bytes")) is not int
                or metadata["bytes"] != len(content)
                or metadata.get("sha256") != hashlib.sha256(content).hexdigest()
            ):
                raise ValueError("browser artifact checksum/size mismatch")
            if path.suffix == ".txt":
                dom_text = content.decode("utf-8")
            elif path.suffix == ".png" and content.startswith(PNG_SIGNATURE):
                png_seen = True
        if dom_text is None or not png_seen:
            raise ValueError("browser case requires a UTF-8 DOM snapshot and valid PNG")
        if any(value not in dom_text for value in assertions):
            raise ValueError("browser DOM does not contain every claimed assertion")
        if any(value in dom_text for value in negative):
            raise ValueError("browser DOM contains a forbidden negative assertion")
        if "BEGIN OPENSSH PRIVATE KEY" in dom_text or any(value in dom_text for value in secrets):
            raise ValueError("browser DOM artifact contains a certification secret")
    return {"cases": len(cases), "react_pages": len(observed_pages)}


def raw_browser_artifacts(source: dict[str, Any]) -> list[dict[str, Any]]:
    """Retain every already-validated DOM/PNG artifact in the generic receipt chain."""
    return [
        dict(metadata)
        for case in source["cases"]
        for metadata in case["artifacts"]
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument(
        "--local-runtime",
        type=Path,
        default=ROOT / ".cache/evidence/local-runtime.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".cache/evidence/r36-browser-execution.json",
    )
    args = parser.parse_args()
    revision, inputs = clean_revision(ROOT), execution_inputs(ROOT)
    local_runtime = json.loads(args.local_runtime.read_bytes())
    if (
        local_runtime.get("schema") != "g5-fleet.local-runtime/v1"
        or local_runtime.get("status") != "passed"
        or local_runtime.get("revision") != revision
        or not isinstance(local_runtime.get("execution_run_id"), str)
        or not local_runtime["execution_run_id"]
    ):
        raise RuntimeError("browser execution local runtime parent is stale")
    case_path = args.cases.resolve()
    if not case_path.is_relative_to(ROOT.resolve()):
        raise RuntimeError("browser case file must be inside the repository")
    source = json.loads(case_path.read_bytes())
    coverage = validate_browser_cases(
        ROOT,
        source,
        revision=revision,
        inputs=inputs,
        secrets=secret_values(ROOT),
    )
    if clean_revision(ROOT) != revision or execution_inputs(ROOT) != inputs:
        raise RuntimeError("checkout/provider inputs changed during browser validation")
    normalized_source = {
        **source,
        "producer": "tools/certification/browser_runtime.py",
        "local_runtime_run_id": local_runtime["execution_run_id"],
        "raw_artifacts": raw_browser_artifacts(source),
    }
    normalized_path = case_path.with_name(f"validated-{source['run_id']}.json")
    write_json(normalized_path, normalized_source, immutable=True)
    timestamp = datetime.now(UTC).isoformat()
    receipt = {
        "schema": EXECUTION_SCHEMA,
        "status": "PASS",
        "proof_level": "LOCAL_RUNTIME_PASS",
        "git_revision": revision,
        "inputs": inputs,
        "generated_at": timestamp,
        "run_id": source["parent_run_id"],
        "artifacts": [
            {
                **fingerprint(ROOT, normalized_path),
                "run_id": source["run_id"],
            }
        ],
        "coverage": coverage,
        "parent_local_runtime_sha256": hashlib.sha256(
            args.local_runtime.read_bytes()
        ).hexdigest(),
        "validator_run_id": f"browser-validator-{uuid.uuid4().hex}",
    }
    write_json(args.output, receipt)
    print(json.dumps({"status": "PASS", "git_revision": revision, "coverage": coverage}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
