from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

from .inventory import build_active_inventory, build_legacy_inventory
from .manifest import ManifestError, PROFILES, load_manifest
from .model import AuditReport
from .parity import audit_parity
from .report import write_report
from .runtime import run_live_probes


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = Path("governance/MIGRATION_PARITY.json")
PROOF_LEVELS = {
    "static": "MIGRATION_STATIC_PASS",
    "runtime": "LOCAL_RUNTIME_PASS",
    "staging": "STAGING_PASS",
}


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


def _run_id(now: datetime) -> str:
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")
    return f"migration-parity-{timestamp}-{uuid.uuid4().hex[:8]}"


def _arguments(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit legacy Tauri-to-server migration parity."
    )
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--profile", choices=PROFILES, default="static")
    parser.add_argument(
        "--output",
        type=Path,
        help="Report path. Defaults to output/audit/runs/<run_id>/result.json.",
    )
    parser.add_argument("--no-output", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument(
        "--finding-limit",
        type=int,
        default=30,
        help="Human summary finding limit.",
    )
    return parser.parse_args(argv)


def _print_summary(report: AuditReport, output: Path | None, limit: int) -> None:
    print(
        f"[migration-parity] {report.status} profile={report.profile} "
        f"revision={report.git_revision[:12]} findings={len(report.findings)}"
    )
    for category, values in report.coverage.items():
        print(
            f"  {category}: valid={values['valid']}/{values['total']} "
            f"mapped={values['mapped']} deferred={values['deferred']} "
            f"unmapped={values['unmapped']}"
        )
    capabilities = report.capabilities
    print(
        "  required_capabilities: "
        f"valid={capabilities['valid']}/{capabilities['total']} "
        f"implemented={capabilities['implemented']} pending={capabilities['pending']}"
    )
    for finding in report.findings[: max(0, limit)]:
        location = "/".join(
            value for value in (finding.category, finding.item_id) if value
        )
        print(f"  - {finding.code} [{location or '-'}] {finding.message}")
    remaining = len(report.findings) - max(0, limit)
    if remaining > 0:
        print(f"  ... {remaining} additional findings are in the JSON report")
    if output is not None:
        print(f"  report: {output}")


def main(argv: list[str] | None = None) -> int:
    arguments = _arguments(argv)
    root = arguments.root.resolve()
    manifest_path = (
        arguments.manifest
        if arguments.manifest.is_absolute()
        else root / arguments.manifest
    ).resolve()
    try:
        manifest = load_manifest(manifest_path)
        revision = _git_revision(root)
        legacy = build_legacy_inventory(root)
        active = build_active_inventory(root)
    except (ManifestError, OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"[migration-parity] HARNESS_ERROR: {error}", file=sys.stderr)
        return 2

    findings, coverage, capabilities, _ = audit_parity(
        root,
        manifest,
        legacy,
        active,
        profile=arguments.profile,
        git_revision=revision,
    )
    live_probes: list[dict] = []
    if arguments.profile == "staging":
        live_probes, probe_findings = run_live_probes(
            manifest["staging"],
            git_revision=revision,
        )
        findings.extend(probe_findings)

    now = datetime.now(UTC)
    run_id = _run_id(now)
    status = "PASS" if not findings else "FAIL"
    proof_level = PROOF_LEVELS[arguments.profile] if status == "PASS" else None
    report = AuditReport(
        schema="g5-fleet.migration-parity-report/v1",
        run_id=run_id,
        generated_at=now.isoformat().replace("+00:00", "Z"),
        profile=arguments.profile,
        status=status,
        proof_level=proof_level,
        git_revision=revision,
        manifest_path=manifest_path.relative_to(root).as_posix(),
        manifest_sha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        legacy=legacy,
        active=active,
        coverage=coverage,
        capabilities=capabilities,
        findings=findings,
        live_probes=live_probes,
    )

    output: Path | None = None
    if not arguments.no_output:
        output = arguments.output
        if output is None:
            output = root / "output/audit/runs" / run_id / "result.json"
        elif not output.is_absolute():
            output = root / output
        try:
            write_report(report, output)
        except OSError as error:
            print(f"[migration-parity] HARNESS_ERROR: report write failed: {error}", file=sys.stderr)
            return 2

    if arguments.json:
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
    else:
        _print_summary(report, output, arguments.finding_limit)
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
