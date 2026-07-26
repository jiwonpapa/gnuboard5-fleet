from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .batch import (
    audit_batch_ownership,
    batch_scope,
    load_batch_manifest,
    scoped_findings,
)
from .inventory import build_active_inventory, build_legacy_inventory
from .manifest import ManifestError, PROFILES, load_manifest
from .parity import audit_parity
from .runtime import run_live_probes


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PARITY_MANIFEST = Path("governance/MIGRATION_PARITY.json")
DEFAULT_BATCH_MANIFEST = Path("governance/MIGRATION_BATCHES.json")


def _git_revision(root: Path) -> str:
    completed = subprocess.run(
        ("git", "rev-parse", "HEAD"),
        cwd=root,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return completed.stdout.strip()


def _arguments(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit one fail-closed migration batch while reporting global debt."
    )
    parser.add_argument("--batch", required=True)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_PARITY_MANIFEST)
    parser.add_argument(
        "--batch-manifest",
        type=Path,
        default=DEFAULT_BATCH_MANIFEST,
    )
    parser.add_argument("--profile", choices=PROFILES, default="static")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--no-output", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--finding-limit", type=int, default=30)
    return parser.parse_args(argv)


def _resolve(root: Path, value: Path) -> Path:
    return value.resolve() if value.is_absolute() else (root / value).resolve()


def _write_json_atomic(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{output.name}.",
        suffix=".tmp",
        dir=output.parent,
        text=True,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, output)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def main(argv: list[str] | None = None) -> int:
    arguments = _arguments(argv)
    root = arguments.root.resolve()
    manifest_path = _resolve(root, arguments.manifest)
    batch_manifest_path = _resolve(root, arguments.batch_manifest)
    try:
        parity_manifest = load_manifest(manifest_path)
        migration_batches = load_batch_manifest(batch_manifest_path)
        batches = {batch["id"]: batch for batch in migration_batches["batches"]}
        if arguments.batch not in batches:
            raise ManifestError(f"unknown batch: {arguments.batch}")
        revision = _git_revision(root)
        legacy = build_legacy_inventory(root)
        active = build_active_inventory(root)
        ownership = audit_batch_ownership(
            migration_batches,
            parity_manifest,
            legacy,
            active,
            root=root,
        )
    except (
        ManifestError,
        OSError,
        ValueError,
        KeyError,
        subprocess.CalledProcessError,
    ) as error:
        print(f"[migration-batch] HARNESS_ERROR: {error}", file=sys.stderr)
        return 2

    global_findings, coverage, capabilities, _ = audit_parity(
        root,
        parity_manifest,
        legacy,
        active,
        profile=arguments.profile,
        git_revision=revision,
    )
    live_probes: list[dict[str, Any]] = []
    if arguments.profile == "staging":
        live_probes, probe_findings = run_live_probes(
            parity_manifest["staging"],
            git_revision=revision,
        )
        global_findings.extend(probe_findings)

    batch = batches[arguments.batch]
    findings = scoped_findings(batch, ownership, global_findings)
    scope = batch_scope(arguments.batch, ownership)
    now = datetime.now(UTC)
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")
    run_id = (
        f"migration-batch-{arguments.batch}-{timestamp}-{uuid.uuid4().hex[:8]}"
    )
    status = "PASS" if not findings else "FAIL"
    global_status = "PASS" if not global_findings else "FAIL"
    report = {
        "schema": "g5-fleet.migration-batch-report/v1",
        "run_id": run_id,
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "batch": {
            "id": batch["id"],
            "title": batch["title"],
            "state": batch["state"],
            "control_only": batch.get("control_only", False),
            "status": status,
            "proof_level": "BATCH_GATE_PASS" if status == "PASS" else None,
        },
        "profile": arguments.profile,
        "git_revision": revision,
        "manifests": {
            "parity": {
                "path": manifest_path.relative_to(root).as_posix(),
                "sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
            },
            "batches": {
                "path": batch_manifest_path.relative_to(root).as_posix(),
                "sha256": hashlib.sha256(
                    batch_manifest_path.read_bytes()
                ).hexdigest(),
            },
        },
        "ownership": ownership.summary(),
        "scope": scope,
        "summary": {
            "batch_finding_count": len(findings),
            "global_status": global_status,
            "global_finding_count": len(global_findings),
            "global_coverage": coverage,
            "global_capabilities": capabilities,
        },
        "batch_findings": [finding.to_dict() for finding in findings],
        "global_findings": [finding.to_dict() for finding in global_findings],
        "live_probes": live_probes,
    }

    output: Path | None = None
    if not arguments.no_output:
        output = arguments.output
        if output is None:
            output = root / "output/audit/runs" / run_id / "result.json"
        elif not output.is_absolute():
            output = root / output
        try:
            _write_json_atomic(report, output)
        except OSError as error:
            print(
                f"[migration-batch] HARNESS_ERROR: report write failed: {error}",
                file=sys.stderr,
            )
            return 2

    print(
        f"[migration-batch] {status} batch={batch['id']} "
        f"profile={arguments.profile} revision={revision[:12]} "
        f"batch_findings={len(findings)} "
        f"global_status={global_status} "
        f"global_findings={len(global_findings)}"
    )
    print(
        "  ownership: "
        f"legacy={sum(ownership.summary()['legacy'].values())}/"
        f"{sum(len(items) for items in legacy.categories.values())} "
        f"core={len(ownership.core_owners)}/"
        f"{len(active.categories['core_operations'])} "
        f"capabilities={len(ownership.capability_owners)}/"
        f"{len(parity_manifest['required_capabilities'])}"
    )
    print(
        "  scope: "
        f"legacy={sum(len(values) for values in scope['legacy'].values())} "
        f"core={len(scope['core_operations'])} "
        f"capabilities={len(scope['required_capabilities'])}"
    )
    for finding in findings[: max(0, arguments.finding_limit)]:
        location = "/".join(
            value for value in (finding.category, finding.item_id) if value
        )
        print(f"  - {finding.code} [{location or '-'}] {finding.message}")
    if output is not None:
        print(f"  report: {output}")
    if arguments.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
