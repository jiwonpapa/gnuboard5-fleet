#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DOMAINS_PATH = ROOT / "api/v1/Admin/Schema/schema-domains.json"
DEFAULT_OUTPUT_ROOT = ROOT / "output/admin-domain-pipeline"
VALID_STAGE_STATUSES = frozenset({"pass", "fail", "blocked"})


@dataclass(frozen=True)
class PipelineRun:
    domain: str
    returncode: int
    stdout: str
    stderr: str
    summary_path: Path
    started_at_ns: int
    previous_summary_mtime_ns: int | None
    audit_run_id: str


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


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


def run_pipeline(
    domain: str,
    audit_run_id: str,
    base_url: str | None,
    live_base_url: str | None,
    inspect_secret: str | None,
    strict_choice_options: bool,
    playwright_smoke: bool,
    output_root: Path,
) -> PipelineRun:
    domain_output = output_root / domain
    summary_path = domain_output / "pipeline-summary.json"
    cmd = [
        "python3",
        str(ROOT / "scripts/run_admin_domain_pipeline.py"),
        f"--domain={domain}",
        f"--output-dir={domain_output}",
        f"--audit-run-id={audit_run_id}",
    ]
    if base_url:
        cmd.append(f"--base-url={base_url}")
    if live_base_url:
        cmd.append(f"--live-base-url={live_base_url}")
    if inspect_secret:
        cmd.append(f"--inspect-secret={inspect_secret}")
    if strict_choice_options:
        cmd.append("--strict-choice-options")
    if playwright_smoke:
        cmd.append("--playwright-smoke")

    env = os.environ.copy()
    if inspect_secret:
        env["ADMIN_SCHEMA_INSPECT_SECRET"] = inspect_secret
    previous_summary_mtime_ns = (
        summary_path.stat().st_mtime_ns if summary_path.is_file() else None
    )
    started_at_ns = time.time_ns()
    try:
        completed = subprocess.run(
            cmd,
            cwd=str(ROOT),
            text=True,
            capture_output=True,
            check=False,
            env=env,
        )
        return PipelineRun(
            domain=domain,
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
            summary_path=summary_path,
            started_at_ns=started_at_ns,
            previous_summary_mtime_ns=previous_summary_mtime_ns,
            audit_run_id=audit_run_id,
        )
    except OSError as error:
        return PipelineRun(
            domain=domain,
            returncode=127,
            stdout="",
            stderr=f"failed to start admin domain pipeline: {error}",
            summary_path=summary_path,
            started_at_ns=started_at_ns,
            previous_summary_mtime_ns=previous_summary_mtime_ns,
            audit_run_id=audit_run_id,
        )


def run_manifest_check(include_shop: bool, selected_domains: set[str]) -> tuple[int, str, str]:
    cmd = [
        "python3",
        str(ROOT / "scripts/check_admin_domain_manifest.py"),
    ]
    if include_shop:
        cmd.append("--include-shop")
    if selected_domains:
        cmd.append(f"--domains={','.join(sorted(selected_domains))}")

    completed = subprocess.run(
        cmd,
        cwd=str(ROOT),
        text=True,
        capture_output=True,
        check=False,
    )
    return completed.returncode, completed.stdout, completed.stderr


def summarize_domain(
    domain: str,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    current_run_started_at_ns: int | None = None,
    previous_summary_mtime_ns: int | None = None,
    expected_audit_run_id: str | None = None,
) -> dict[str, Any]:
    summary_path = output_root / domain / "pipeline-summary.json"
    empty_statuses = {
        "playwright_smoke": None,
        "schema_check": None,
        "source_observation": None,
        "legacy_vs_contract": None,
        "contract_vs_live": None,
    }
    if not summary_path.is_file():
        return {
            "domain": domain,
            "status": "blocked",
            "summary_path": display_path(summary_path),
            "statuses": empty_statuses,
            "blocked_count": 1,
            "reason": "pipeline-summary.json 이 생성되지 않았습니다.",
            "current_run_report": False,
        }

    summary_mtime_ns = summary_path.stat().st_mtime_ns
    if current_run_started_at_ns is not None and (
        summary_mtime_ns < current_run_started_at_ns
        or (
            previous_summary_mtime_ns is not None
            and summary_mtime_ns <= previous_summary_mtime_ns
        )
    ):
        return {
            "domain": domain,
            "status": "blocked",
            "summary_path": display_path(summary_path),
            "statuses": empty_statuses,
            "blocked_count": 1,
            "reason": "현재 실행보다 오래된 pipeline-summary.json 은 재사용할 수 없습니다.",
            "current_run_report": False,
        }

    try:
        payload = json.loads(summary_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {
            "domain": domain,
            "status": "blocked",
            "summary_path": display_path(summary_path),
            "statuses": empty_statuses,
            "blocked_count": 1,
            "reason": f"pipeline-summary.json 파싱 실패: {error}",
            "current_run_report": False,
        }
    if not isinstance(payload, dict) or payload.get("domain") != domain:
        return {
            "domain": domain,
            "status": "blocked",
            "summary_path": display_path(summary_path),
            "statuses": empty_statuses,
            "blocked_count": 1,
            "reason": "pipeline-summary.json root/domain schema 가 올바르지 않습니다.",
            "current_run_report": False,
        }
    if expected_audit_run_id is not None and payload.get("audit_run_id") != expected_audit_run_id:
        return {
            "domain": domain,
            "status": "blocked",
            "summary_path": display_path(summary_path),
            "statuses": empty_statuses,
            "blocked_count": 1,
            "reason": "pipeline-summary.json audit_run_id 가 현재 실행과 일치하지 않습니다.",
            "current_run_report": False,
        }
    raw_blocked_items = payload.get("blocked_items", [])
    blocked_items = raw_blocked_items if isinstance(raw_blocked_items, list) else []
    if not isinstance(raw_blocked_items, list):
        blocked_items.append(
            {
                "area": "summary_schema",
                "reason": "blocked_items must be a list",
            }
        )
    statuses = {
        "playwright_smoke": payload.get("playwright_smoke", {}).get("status"),
        "schema_check": payload.get("schema_check", {}).get("status"),
        "source_observation": payload.get("source_observation", {}).get("status"),
        "legacy_vs_contract": payload.get("legacy_vs_contract", {}).get("status"),
        "contract_vs_live": payload.get("contract_vs_live", {}).get("status"),
    }

    status_values = list(statuses.values())
    status = "blocked"
    if any(value not in VALID_STAGE_STATUSES for value in status_values):
        blocked_items = [
            *blocked_items,
            {
                "area": "summary_schema",
                "reason": "필수 stage status 가 없거나 허용값이 아닙니다.",
            },
        ]
    elif any(value == "fail" for value in status_values):
        status = "fail"
    elif any(value == "blocked" for value in status_values) or blocked_items:
        status = "blocked"
    elif all(value == "pass" for value in status_values):
        status = "pass"

    return {
        "domain": domain,
        "status": status,
        "summary_path": display_path(summary_path),
        "statuses": statuses,
        "blocked_count": len(blocked_items),
        "current_run_report": current_run_started_at_ns is not None,
    }


def build_report(
    domains: list[str],
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    current_run_starts: dict[str, int] | None = None,
    previous_summary_mtimes: dict[str, int | None] | None = None,
    current_run_ids: dict[str, str] | None = None,
    execution_mode: str = "current_run",
) -> dict[str, Any]:
    domain_summaries = [
        summarize_domain(
            domain,
            output_root,
            (current_run_starts or {}).get(domain),
            (previous_summary_mtimes or {}).get(domain),
            (current_run_ids or {}).get(domain),
        )
        for domain in domains
    ]
    return build_report_from_summaries(
        domain_summaries, execution_mode=execution_mode
    )


def build_report_from_summaries(
    domain_summaries: list[dict[str, Any]],
    *,
    execution_mode: str = "current_run",
) -> dict[str, Any]:
    counts = {
        "pass": sum(1 for item in domain_summaries if item["status"] == "pass"),
        "fail": sum(1 for item in domain_summaries if item["status"] == "fail"),
        "blocked": sum(1 for item in domain_summaries if item["status"] == "blocked"),
    }
    subprocess_nonzero_count = sum(
        1
        for item in domain_summaries
        if isinstance(item.get("pipeline_result"), dict)
        and item["pipeline_result"].get("returncode") != 0
    )

    domain_names = [str(item.get("domain") or "") for item in domain_summaries]
    return {
        "execution_mode": execution_mode,
        "certifying": (
            execution_mode == "current_run"
            and bool(domain_summaries)
            and len(domain_names) == len(set(domain_names))
            and all(item.get("current_run_report") is True for item in domain_summaries)
        ),
        "expected_domain_count": len(domain_summaries),
        "actual_domain_count": len(domain_summaries),
        "domain_count_match": bool(domain_summaries)
        and len(domain_names) == len(set(domain_names)),
        "total_domains": len(domain_summaries),
        "counts": counts,
        "subprocess_nonzero_count": subprocess_nonzero_count,
        "domains": domain_summaries,
    }


def truncate_tail(value: str, limit: int = 4000) -> str:
    if len(value) <= limit:
        return value
    return value[-limit:]


def redact(value: str, secret: str | None) -> str:
    if not secret:
        return value
    return value.replace(secret, "$ADMIN_SCHEMA_INSPECT_SECRET")


def apply_pipeline_results(
    report: dict[str, Any],
    pipeline_results: dict[str, PipelineRun],
    inspect_secret: str | None = None,
) -> dict[str, Any]:
    if not pipeline_results:
        return report

    domain_summaries: list[dict[str, Any]] = []
    for item in report["domains"]:
        domain = item["domain"]
        result = pipeline_results.get(domain)
        if result is None:
            domain_summaries.append(item)
            continue

        current_item = dict(item)
        current_item["subprocess_exit_code"] = result.returncode
        current_item["pipeline_result"] = {
            "returncode": result.returncode,
            "stdout_tail": redact(truncate_tail(result.stdout), inspect_secret),
            "stderr_tail": redact(truncate_tail(result.stderr), inspect_secret),
        }
        if result.returncode != 0:
            current_item["status"] = "fail"
            current_item["reason"] = "per-domain pipeline command failed."
        domain_summaries.append(current_item)

    return build_report_from_summaries(
        domain_summaries,
        execution_mode=str(report.get("execution_mode") or "current_run"),
    )


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Admin Domain Pipeline Index",
        "",
        f"- execution_mode: `{report['execution_mode']}`",
        f"- certifying: `{str(report['certifying']).lower()}`",
        f"- domain_count_match: `{str(report['domain_count_match']).lower()}`",
        f"- total_domains: `{report['total_domains']}`",
        f"- passed: `{report['counts']['pass']}`",
        f"- failed: `{report['counts']['fail']}`",
        f"- blocked: `{report['counts']['blocked']}`",
        "",
        "## Domains",
    ]

    for item in report["domains"]:
        lines.append(
            f"- `{item['domain']}`: status=`{item['status']}` "
            f"(pw={item['statuses'].get('playwright_smoke')}, "
            f"schema={item['statuses'].get('schema_check')}, "
            f"observe={item['statuses'].get('source_observation')}, "
            f"legacy={item['statuses'].get('legacy_vs_contract')}, "
            f"live={item['statuses'].get('contract_vs_live')}) "
            f"current_run={item.get('current_run_report') is True} "
            f"summary=`{item['summary_path']}`"
        )

    return "\n".join(lines) + "\n"


def write_report(
    report: dict[str, Any], output_dir: Path = DEFAULT_OUTPUT_ROOT
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "index.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "index.md").write_text(render_markdown(report), encoding="utf-8")
    return output_dir / "index.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url")
    parser.add_argument("--live-base-url")
    parser.add_argument("--inspect-secret")
    parser.add_argument("--output-dir", help="current-run report output root")
    parser.add_argument("--audit-run-id")
    parser.add_argument("--include-shop", action="store_true")
    parser.add_argument("--domains", help="comma separated domain names")
    parser.add_argument("--strict-choice-options", action="store_true")
    parser.add_argument("--playwright-smoke", action="store_true")
    parser.add_argument(
        "--summarize-existing",
        action="store_true",
        help="Do not rerun per-domain pipeline; rebuild index from existing pipeline-summary.json files.",
    )
    args = parser.parse_args()
    inspect_secret = (
        args.inspect_secret or os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "")
    ).strip()
    output_root = Path(args.output_dir or DEFAULT_OUTPUT_ROOT).resolve()
    audit_run_id = args.audit_run_id or (
        None if args.summarize_existing else uuid.uuid4().hex
    )

    selected_domains = {
        item.strip()
        for item in (args.domains or "").split(",")
        if item.strip() != ""
    }
    domains = load_domain_names(args.include_shop, selected_domains)
    if not domains:
        raise SystemExit("실행할 도메인이 없습니다.")
    if len(domains) != len(set(domains)):
        raise SystemExit("도메인 manifest 에 중복 domain 이 있습니다.")

    manifest_check = run_manifest_check(args.include_shop, selected_domains)
    if manifest_check[0] != 0:
        if manifest_check[1]:
            print(manifest_check[1].strip())
        if manifest_check[2]:
            print(manifest_check[2].strip())
        raise SystemExit(manifest_check[0])

    pipeline_results: dict[str, PipelineRun] = {}
    if not args.summarize_existing:
        if audit_run_id is None:
            raise RuntimeError("current run audit_run_id was not generated")
        for domain in domains:
            pipeline_results[domain] = run_pipeline(
                domain=domain,
                audit_run_id=audit_run_id,
                base_url=args.base_url,
                live_base_url=args.live_base_url,
                inspect_secret=inspect_secret,
                strict_choice_options=args.strict_choice_options,
                playwright_smoke=args.playwright_smoke,
                output_root=output_root,
            )

    execution_mode = (
        "existing_artifacts_report_only" if args.summarize_existing else "current_run"
    )
    report = build_report(
        domains,
        output_root=output_root,
        current_run_starts={
            domain: result.started_at_ns
            for domain, result in pipeline_results.items()
        }
        if pipeline_results
        else None,
        previous_summary_mtimes={
            domain: result.previous_summary_mtime_ns
            for domain, result in pipeline_results.items()
        }
        if pipeline_results
        else None,
        current_run_ids={
            domain: result.audit_run_id
            for domain, result in pipeline_results.items()
        }
        if pipeline_results
        else None,
        execution_mode=execution_mode,
    )
    report = apply_pipeline_results(report, pipeline_results, inspect_secret)
    report["audit_run_id"] = audit_run_id
    output_path = write_report(report, output_root)
    print(str(output_path))

    clean_report = (
        report["domain_count_match"]
        and report["counts"]["fail"] == 0
        and report["counts"]["blocked"] == 0
    )
    if args.summarize_existing:
        raise SystemExit(0 if clean_report else 1)
    raise SystemExit(0 if clean_report and report["certifying"] else 1)


if __name__ == "__main__":
    main()
