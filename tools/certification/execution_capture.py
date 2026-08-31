"""Capture actual local HTTP / Rust-to-PHP execution, without credentials.

A source checkpoint is reached only after its readback/cleanup guards pass.
Neither a route catalog nor HTTP 200 alone is allowed to certify an operation.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from tools.migration_parity.execution import CASE_SCHEMA, EXECUTION_SCHEMA, execution_inputs

EVENT_PREFIX = "G5_CERTIFICATION_EVENT "


def clean_revision(root: Path) -> str:
    if subprocess.check_output(
        ["git", "status", "--porcelain", "--untracked-files=normal"], cwd=root, text=True,
    ).strip():
        raise RuntimeError("execution certification requires a clean checkout")
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()


def write_json(path: Path, data: dict[str, Any], *, immutable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink() or (immutable and path.exists()):
        raise RuntimeError("execution output is unsafe or would overwrite an immutable run")
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    with temporary.open("x", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


class ExecutionCapture:
    def __init__(self, root: Path, revision: str, fleet_base: str) -> None:
        self.root = root
        self.revision = revision
        self.fleet_base = fleet_base
        self.inputs = execution_inputs(root)
        self.run_id = f"r36-{uuid.uuid4().hex}"
        self.operations = {
            row["operation_id"]: row
            for row in json.loads((root / "contracts/core-operations.json").read_bytes())["operations"]
        }
        self.observations: list[dict[str, Any]] = []
        self.checkpoints: list[dict[str, Any]] = []
        self.next_index = 0
        self.checkpoint_start = 0

    def request_id(self) -> str:
        self.next_index += 1
        return f"{self.run_id}-{self.next_index}"

    def candidate_operation(self, method: str, path: str) -> str | None:
        relative = re.sub(r"^/api/v1/sites/[^/]+", "", urlsplit(path).path)
        matches = []
        for operation_id, operation in self.operations.items():
            pattern = re.sub(r"\\\{[^{}]+\\\}", r"[^/]+", re.escape(operation["path"]))
            if operation["method"] == method and re.fullmatch(pattern, relative):
                matches.append(operation_id)
        # Prefer fixed paths over dynamic parameters (e.g. /members/export).
        fixed = [value for value in matches if "{" not in self.operations[value]["path"]]
        if len(fixed) == 1:
            return fixed[0]
        return matches[0] if len(matches) == 1 else None

    def observe(
        self, request_id: str, base: str, method: str, path: str,
        status: int, body: bytes, source_line: int,
    ) -> None:
        error_code, semantic_status = None, None
        try:
            payload = json.loads(body)
            if isinstance(payload, dict):
                error = payload.get("error")
                if isinstance(error, dict):
                    # Only keep the one fixed boundary code, never arbitrary error text.
                    if error.get("code") == "external_effect_confirmation_required":
                        error_code = "external_effect_confirmation_required"
                if payload.get("status") == "skipped":
                    semantic_status = "skipped"
        except (ValueError, UnicodeError):
            pass
        self.observations.append({
            "request_id": request_id, "source_line": source_line,
            "via_fleet": base == self.fleet_base, "status": status,
            "candidate_operation": self.candidate_operation(method, path),
            "error_code": error_code, "semantic_status": semantic_status,
        })

    def checkpoint(
        self, case_id: str, *assertions: str, external_delivery_disabled: bool = False,
    ) -> None:
        if not case_id or not assertions or any(not item for item in assertions):
            raise RuntimeError("execution checkpoint requires explicit assertions")
        if any(row["id"] == case_id for row in self.checkpoints):
            raise RuntimeError("duplicate execution checkpoint")
        self.checkpoints.append({
            "id": case_id, "assertions": list(assertions),
            "external_delivery_disabled": external_delivery_disabled,
            "request_ids": [
                row["request_id"] for row in self.observations[self.checkpoint_start:]
            ],
        })
        self.checkpoint_start = len(self.observations)

    def cases(self, log: str) -> list[dict[str, Any]]:
        events: dict[str, list[dict[str, Any]]] = {}
        for line in log.splitlines():
            if not line.startswith(EVENT_PREFIX):
                continue
            event = json.loads(line[len(EVENT_PREFIX):])
            request_id = event.get("request_id")
            if not isinstance(request_id, str) or not request_id.startswith(f"{self.run_id}-"):
                continue
            if (
                event.get("schema") != "g5-fleet.provider-response/v1"
                or event.get("operation_id") not in self.operations
                or type(event.get("upstream_status")) is not int
                or not 100 <= event["upstream_status"] <= 599
            ):
                raise RuntimeError("invalid observed Rust-to-PHP event")
            if event in events.setdefault(request_id, []):
                raise RuntimeError("duplicated Rust-to-PHP event")
            events[request_id].append(event)

        observations = {row["request_id"]: row for row in self.observations}
        if set(events) - set(observations):
            raise RuntimeError("provider event has no matching HTTP request in this run")
        if self.checkpoint_start != len(self.observations):
            raise RuntimeError("HTTP observations are missing their final readback checkpoint")

        cases: list[dict[str, Any]] = []
        for checkpoint in self.checkpoints:
            for kind in ("provider_readback", "safe_external_boundary"):
                subjects: set[str] = set()
                proof = []
                for request_id in checkpoint["request_ids"]:
                    observation = observations[request_id]
                    if not observation["via_fleet"] or observation["semantic_status"] == "skipped":
                        continue
                    for event in events.get(request_id, []):
                        operation_id = event["operation_id"]
                        actual_kind = (
                            "safe_external_boundary"
                            if self.operations[operation_id]["risk"] == "external_effect"
                            else "provider_readback"
                        )
                        if (
                            kind == actual_kind
                            and (kind != "safe_external_boundary" or checkpoint["external_delivery_disabled"])
                            and 200 <= observation["status"] < 300
                            and 200 <= event["upstream_status"] < 300
                        ):
                            subjects.add(operation_id)
                            proof.append({**observation, "provider": event})
                    operation_id = observation["candidate_operation"]
                    if (
                        kind == "safe_external_boundary"
                        and observation["status"] == 400
                        and observation["error_code"] == "external_effect_confirmation_required"
                        and operation_id in self.operations
                        and self.operations[operation_id]["risk"] == "external_effect"
                    ):
                        if events.get(request_id):
                            raise RuntimeError("blocked external action unexpectedly reached PHP")
                        subjects.add(operation_id)
                        proof.append(observation)
                if subjects:
                    cases.append({
                        "id": f"{checkpoint['id']}:{kind}", "status": "PASS", "kind": kind,
                        "assertions": checkpoint["assertions"], "observations": proof,
                        "subjects": [
                            {"category": "core_operations", "item_id": value}
                            for value in sorted(subjects)
                        ],
                    })
        if not cases:
            raise RuntimeError("no checkpoint-bound Rust-to-PHP operations were observed")
        return cases

    def finish(self, server_log: Path, output: Path) -> dict[str, Any]:
        if clean_revision(self.root) != self.revision or execution_inputs(self.root) != self.inputs:
            raise RuntimeError("checkout/provider inputs changed during execution")
        cases = self.cases(server_log.read_text(encoding="utf-8"))
        generated_at = datetime.now(UTC).isoformat()
        artifact_path = self.root / f"output/certification/r36/{self.run_id}/provider-cases.json"
        source = {
            "schema": CASE_SCHEMA, "status": "PASS", "git_revision": self.revision,
            "inputs": self.inputs, "generated_at": generated_at,
            "parent_run_id": self.run_id, "run_id": f"{self.run_id}-provider",
            "producer": "tools/certification/local_runtime_smoke.py", "cases": cases,
        }
        write_json(artifact_path, source, immutable=True)
        content = artifact_path.read_bytes()
        observed = sorted({subject["item_id"] for case in cases for subject in case["subjects"]})
        receipt = {
            "schema": EXECUTION_SCHEMA, "status": "PASS", "proof_level": "LOCAL_RUNTIME_PASS",
            "git_revision": self.revision, "inputs": self.inputs,
            "generated_at": generated_at, "run_id": self.run_id,
            "artifacts": [{
                "path": artifact_path.relative_to(self.root).as_posix(), "bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(), "run_id": source["run_id"],
            }],
            # This is measured coverage, never a declaration of whole-product completion.
            "coverage": {
                "observed_core_operations": observed,
                "unobserved_core_operations": sorted(set(self.operations) - set(observed)),
                "browser_workflows": 0,
            },
        }
        write_json(output, receipt)
        return receipt
