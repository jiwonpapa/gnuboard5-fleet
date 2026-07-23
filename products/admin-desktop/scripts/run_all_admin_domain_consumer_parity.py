#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from audit_harness.paths import resolve_php_root

RUST_ROOT = Path(__file__).resolve().parents[1]
PHP_ROOT = resolve_php_root(RUST_ROOT)
SCHEMA_DOMAINS_PATH = PHP_ROOT / "api/v1/Admin/Schema/schema-domains.json"
ACTIVE_SCOPE_PATH = RUST_ROOT / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
DEFAULT_OUTPUT_ROOT = RUST_ROOT / "output/admin-domain-consumer-parity"
VALID_STATUSES = frozenset({"pass", "fail", "blocked"})


def load_expected_domain_names(selected_domains: set[str]) -> set[str]:
    payload = json.loads(ACTIVE_SCOPE_PATH.read_text(encoding="utf-8"))
    raw_domains = payload.get("audit_contract", {}).get(
        "expected_schema_domains", []
    )
    expected = {
        str(domain).strip()
        for domain in raw_domains
        if isinstance(domain, str) and domain.strip()
    }
    return expected & selected_domains if selected_domains else expected


@dataclass(frozen=True)
class DomainRun:
    domain: str
    returncode: int
    stdout: str
    stderr: str
    report_path: Path
    markdown_path: Path


def load_domain_names(include_shop: bool, selected_domains: set[str]) -> list[str]:
    manifest = json.loads(SCHEMA_DOMAINS_PATH.read_text(encoding="utf-8"))
    raw_domains = manifest.get("domains", manifest)
    domains: list[str] = []
    for item in raw_domains:
        domain = str(item.get("domain") or "").strip()
        if domain == "":
            continue
        if selected_domains and domain not in selected_domains:
            continue
        if not include_shop and domain.startswith("shop-"):
            continue
        domains.append(domain)
    return domains


def run_report(domain: str, staging_root: Path) -> DomainRun:
    domain_output = staging_root / domain
    cmd = [
        "python3",
        str(RUST_ROOT / "scripts/check_admin_domain_consumer_parity.py"),
        f"--domain={domain}",
        f"--output-dir={domain_output}",
    ]
    try:
        completed = subprocess.run(
            cmd,
            cwd=str(RUST_ROOT),
            text=True,
            capture_output=True,
            check=False,
        )
    except OSError as error:
        return DomainRun(
            domain=domain,
            returncode=127,
            stdout="",
            stderr=f"failed to start consumer parity subprocess: {error}",
            report_path=domain_output / "latest.json",
            markdown_path=domain_output / "latest.md",
        )
    return DomainRun(
        domain=domain,
        returncode=completed.returncode,
        stdout=completed.stdout,
        stderr=completed.stderr,
        report_path=domain_output / "latest.json",
        markdown_path=domain_output / "latest.md",
    )


def _blocked_payload(run: DomainRun, mode: str, error: str) -> dict[str, Any]:
    return {
        "status": "blocked",
        "mode": mode,
        "domain": run.domain,
        "notes": [
            "이번 실행에서 유효한 consumer parity 보고서를 생성하지 못했습니다.",
            "이전 latest 보고서는 재사용하지 않았습니다.",
        ],
        "schema_json": "",
        "missing_fields": [],
        "consumer_only_fields": [],
        "save_fields": [],
        "missing_save_fields": [],
        "save_only_fields": [],
        "type_mismatches": [],
        "missing_sections": [],
        "consumer_only_sections": [],
        "candidate_files": [],
        "subprocess_exit_code": run.returncode,
        "subprocess_stdout": run.stdout,
        "subprocess_stderr": run.stderr,
        "error": error,
    }


def load_current_payload(run: DomainRun) -> dict[str, Any]:
    if not run.report_path.is_file():
        return _blocked_payload(
            run,
            "subprocess_failure",
            f"current run report missing: {run.report_path}",
        )

    try:
        payload = json.loads(run.report_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return _blocked_payload(run, "invalid_current_report", str(error))

    if not isinstance(payload, dict):
        return _blocked_payload(run, "invalid_current_report", "report root must be an object")
    if payload.get("domain") != run.domain:
        return _blocked_payload(
            run,
            "invalid_current_report",
            f"report domain mismatch: expected={run.domain!r} actual={payload.get('domain')!r}",
        )

    status = payload.get("status")
    if status not in VALID_STATUSES:
        return _blocked_payload(
            run,
            "invalid_current_report",
            f"unsupported report status: {status!r}",
        )

    expected_returncode = 0 if status == "pass" else 1
    if run.returncode != expected_returncode:
        return _blocked_payload(
            run,
            "subprocess_status_mismatch",
            (
                f"report status={status!r} requires exit={expected_returncode}, "
                f"actual exit={run.returncode}"
            ),
        )

    if status == "pass":
        consumer_field_sets = payload.get("consumer_field_sets")
        consumer_field_count = (
            sum(
                len(values)
                for values in consumer_field_sets.values()
                if isinstance(values, list)
            )
            if isinstance(consumer_field_sets, dict)
            else 0
        )
        save_fields = payload.get("save_fields")
        drift_keys = (
            "missing_fields",
            "consumer_only_fields",
            "missing_save_fields",
            "save_only_fields",
            "type_mismatches",
            "missing_sections",
            "consumer_only_sections",
            "unverified_manual_fields",
        )
        has_drift = any(payload.get(key) for key in drift_keys)
        if (
            payload.get("mode") != "strong_adapter"
            or consumer_field_count <= 0
            or not isinstance(save_fields, list)
            or not save_fields
            or has_drift
        ):
            return _blocked_payload(
                run,
                "scanner_zero_or_invalid_pass",
                "pass requires a strong adapter, nonzero render/save fields, and zero drift",
            )

    payload["subprocess_exit_code"] = run.returncode
    payload["current_run_report"] = True
    return payload


def summarize_payload(payload: dict[str, Any], report_path: Path) -> dict[str, Any]:
    return {
        "domain": str(payload.get("domain") or ""),
        "status": str(payload.get("status") or "blocked"),
        "mode": str(payload.get("mode") or "unknown"),
        "report_path": str(report_path),
        "missing_field_count": len(payload.get("missing_fields") or []),
        "missing_save_field_count": len(payload.get("missing_save_fields") or []),
        "type_mismatch_count": len(payload.get("type_mismatches") or []),
        "unverified_manual_field_count": len(
            payload.get("unverified_manual_fields") or []
        ),
        "candidate_file_count": len(payload.get("candidate_files") or []),
        "subprocess_exit_code": int(payload.get("subprocess_exit_code", -1)),
        "current_run_report": payload.get("current_run_report") is True,
        "error": payload.get("error"),
    }


def render_domain_markdown(payload: dict[str, Any]) -> str:
    lines = [
        f"# {payload.get('domain', 'unknown')} Consumer Parity Report",
        "",
        f"- status: `{payload.get('status', 'blocked')}`",
        f"- mode: `{payload.get('mode', 'unknown')}`",
        f"- subprocess_exit_code: `{payload.get('subprocess_exit_code', -1)}`",
        f"- current_run_report: `{payload.get('current_run_report') is True}`",
    ]
    error = payload.get("error")
    if error:
        lines.extend(["", "## Error", f"- {error}"])
    return "\n".join(lines) + "\n"


def publish_current_report(
    run: DomainRun,
    payload: dict[str, Any],
    output_root: Path,
) -> Path:
    domain_output = output_root / run.domain
    domain_output.mkdir(parents=True, exist_ok=True)
    json_path = domain_output / "latest.json"
    markdown_path = domain_output / "latest.md"
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if run.markdown_path.is_file() and payload.get("current_run_report") is True:
        shutil.copyfile(run.markdown_path, markdown_path)
    else:
        markdown_path.write_text(render_domain_markdown(payload), encoding="utf-8")
    return json_path


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Admin Domain Consumer Parity Index",
        "",
        f"- run_started_at_utc: `{report['run_started_at_utc']}`",
        f"- total_domains: `{report['total_domains']}`",
        f"- passed: `{report['counts']['pass']}`",
        f"- failed: `{report['counts']['fail']}`",
        f"- blocked: `{report['counts']['blocked']}`",
        f"- subprocess_nonzero: `{report['subprocess_nonzero_count']}`",
        "",
        "## Domains",
    ]

    for item in report["domains"]:
        lines.append(
            f"- `{item['domain']}`: status=`{item['status']}` mode=`{item['mode']}` "
            f"exit={item['subprocess_exit_code']} "
            f"current_run={item['current_run_report']} "
            f"missing_fields={item['missing_field_count']} "
            f"missing_save_fields={item['missing_save_field_count']} "
            f"type_mismatches={item['type_mismatch_count']} "
            f"unverified_manual={item['unverified_manual_field_count']} "
            f"candidate_files={item['candidate_file_count']} "
            f"report=`{item['report_path']}`"
        )

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-shop", action="store_true")
    parser.add_argument("--domains", help="comma separated domain names")
    parser.add_argument("--output-dir", help="report output root")
    parser.add_argument("--audit-run-id")
    args = parser.parse_args()

    selected_domains = {
        item.strip()
        for item in (args.domains or "").split(",")
        if item.strip() != ""
    }
    domains = load_domain_names(args.include_shop, selected_domains)
    if not domains:
        raise SystemExit("도메인 스캐너가 0개를 반환했습니다.")
    if len(domains) != len(set(domains)):
        raise SystemExit("도메인 스캐너가 중복 도메인을 반환했습니다.")
    expected_domains = (
        set(domains)
        if args.include_shop
        else load_expected_domain_names(selected_domains)
    )
    if not expected_domains or set(domains) != expected_domains:
        raise SystemExit(
            "PHP domain manifest 가 ACTIVE_CONSUMER_SCOPE v1 domain inventory 와 다릅니다."
        )

    output_root = Path(args.output_dir or DEFAULT_OUTPUT_ROOT).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    run_started_at_utc = datetime.now(UTC).isoformat()

    domain_summaries: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="g5-admin-consumer-parity-") as staging:
        staging_root = Path(staging)
        for domain in domains:
            run = run_report(domain, staging_root)
            payload = load_current_payload(run)
            published_path = publish_current_report(run, payload, output_root)
            domain_summaries.append(
                summarize_payload(payload, published_path.relative_to(output_root))
            )

    counts = {
        "pass": sum(1 for item in domain_summaries if item["status"] == "pass"),
        "fail": sum(1 for item in domain_summaries if item["status"] == "fail"),
        "blocked": sum(1 for item in domain_summaries if item["status"] == "blocked"),
    }
    subprocess_nonzero_count = sum(
        1 for item in domain_summaries if item["subprocess_exit_code"] != 0
    )
    report = {
        "audit_run_id": args.audit_run_id,
        "run_started_at_utc": run_started_at_utc,
        "expected_domain_count": len(expected_domains),
        "actual_domain_count": len(domain_summaries),
        "domain_count_match": len(domains) == len(domain_summaries),
        "total_domains": len(domain_summaries),
        "counts": counts,
        "subprocess_nonzero_count": subprocess_nonzero_count,
        "domains": domain_summaries,
    }

    (output_root / "index.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_root / "index.md").write_text(render_markdown(report), encoding="utf-8")
    print(str(output_root / "index.json"))

    has_failure = (
        not report["domain_count_match"]
        or counts["fail"] > 0
        or counts["blocked"] > 0
        or subprocess_nonzero_count > 0
    )
    raise SystemExit(1 if has_failure else 0)


if __name__ == "__main__":
    main()
