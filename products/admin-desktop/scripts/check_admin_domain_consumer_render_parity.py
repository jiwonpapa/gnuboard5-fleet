#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from audit_harness.paths import resolve_php_root

RUST_ROOT = Path(__file__).resolve().parents[1]
PHP_ROOT = resolve_php_root(RUST_ROOT)
G5_ADMIN_ROOT = RUST_ROOT / "g5-admin"
DEFAULT_SECRET_FILE = Path("/tmp/g5_admin_inspect_secret")


@dataclass(frozen=True)
class DomainRenderAdapter:
    domain: str
    vitest_target: str
    audited_checks: tuple[str, ...]
    notes: tuple[str, ...]
    fetch_mode: str = "config"


CONFIG_ADAPTER = DomainRenderAdapter(
    domain="config",
    vitest_target="src/features/config/AdminConfigPage.render-audit.test.tsx",
    audited_checks=(
        "cf_admin 이 select 로 렌더되고 현재 DB 관리자 계정이 선택 상태인지 확인",
        "짧은 URL 설정이 기본환경 탭이 아니라 짧은주소 탭에만 radio 로 노출되는지 확인",
        "회원가입 탭의 회원아이콘 관련 필드가 select 로 편집 가능한지 확인",
        "본인확인 설정이 boolean switch 가 아니라 select 로 렌더되는지 확인",
        "SNS 사용 여부와 여분필드 제목/값이 실제 DOM 에서 editable 인지 확인",
        "live baseline 을 수정해 저장 payload 를 만들고, mocked API 성공 응답 뒤 폼이 새 값으로 rehydrate 되는지 확인",
    ),
    notes=(
        "render parity 는 live inspect fixture 를 내려받아 React DOM 에 직접 주입합니다.",
        "정적 consumer parity 와 달리 실제 control kind/value/editable 상태를 검증합니다.",
        "저장과 재수화는 Vitest mocked API state 검증이며 실제 서버 write/readback 증적이 아닙니다.",
    ),
)

MEMBERS_ADAPTER = DomainRenderAdapter(
    domain="members",
    vitest_target="src/features/members/AdminMembersPage.render-audit.test.tsx",
    audited_checks=(
        "회원 수정 화면이 live schema 기준 핵심 control 을 실제 DOM 에서 렌더하는지 확인",
        "mb_level 이 별도 레벨 select 로 동작하고 현재 회원 레벨이 초기값으로 보이는지 확인",
        "mb_certify 가 radio 로 렌더되고 live detail 값이 선택 상태인지 확인",
        "mb_addr_jibeon 이 hidden surface 로 빠지고 editable 노출이 없는지 확인",
        "mb_1~mb_10 여분필드가 editable text control 로 노출되는지 확인",
        "mb_icon/mb_img media 카드가 file input 과 업로드/삭제 액션을 노출하는지 확인",
        "live detail baseline 을 수정해 저장 payload 를 만들고, mocked API 성공 응답 뒤 폼이 새 값으로 rehydrate 되는지 확인",
    ),
    notes=(
        "members render parity 는 live list/detail/schema fixture 를 같이 주입합니다.",
        "레거시와 계약 차이는 provider pipeline 에서 보고, consumer render parity 는 계약 대비 UI 실렌더를 검증합니다.",
        "저장과 재수화는 Vitest mocked API state 검증이며 실제 서버 write/readback 증적이 아닙니다.",
    ),
    fetch_mode="members",
)

DOMAIN_ADAPTERS: dict[str, DomainRenderAdapter] = {
    CONFIG_ADAPTER.domain: CONFIG_ADAPTER,
    MEMBERS_ADAPTER.domain: MEMBERS_ADAPTER,
}


def sanitize_command(args: list[str], inspect_secret: str | None) -> str:
    sanitized: list[str] = []
    secret = inspect_secret or ""
    for arg in args:
        if secret and arg == secret:
            sanitized.append("$ADMIN_SCHEMA_INSPECT_SECRET")
            continue
        sanitized.append(arg)
    return " ".join(sanitized)


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# {report['domain']} Consumer Render Parity",
        "",
        "## 1. Status",
        f"- status: `{report['status']}`",
        f"- mode: `{report['mode']}`",
        "",
        "## 2. Commands",
    ]

    for name, value in report.get("commands", {}).items():
        lines.append(f"- {name}: `{value}`")

    lines.extend(
        [
            "",
            "## 3. Artifacts",
        ]
    )

    for name, value in report.get("artifacts", {}).items():
        lines.append(f"- {name}: `{value}`")

    lines.extend(
        [
            "",
            "## 4. Audited Checks",
        ]
    )

    for check in report.get("audited_checks", []):
        lines.append(f"- {check}")

    lines.extend(
        [
            "",
            "## 5. Notes",
        ]
    )

    for note in report.get("notes", []):
        lines.append(f"- {note}")

    if report.get("blocked_reason"):
        lines.extend(
            [
                "",
                "## 6. Blocked",
                f"- {report['blocked_reason']}",
            ]
        )

    return "\n".join(lines) + "\n"


def run_command(args: list[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(cwd),
        text=True,
        capture_output=True,
        check=False,
        env=env,
    )


def resolve_inspect_secret(explicit_secret: str | None) -> str:
    if explicit_secret:
        return explicit_secret

    env_secret = os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "").strip()
    if env_secret:
        return env_secret

    if DEFAULT_SECRET_FILE.is_file():
        return DEFAULT_SECRET_FILE.read_text(encoding="utf-8").strip()

    return ""


def write_report(output_dir: Path, report: dict[str, Any]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "latest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "latest.md").write_text(render_markdown(report), encoding="utf-8")


def select_member_id_from_list(list_json: Path) -> str:
    payload = json.loads(list_json.read_text(encoding="utf-8"))
    data = payload.get("data")
    if isinstance(data, list):
        members = data
    elif isinstance(data, dict):
        members = data.get("members") or []
    else:
        members = []
    bootstrap_member_id = os.getenv("ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID", "neojins").strip() or "neojins"
    for item in members:
        if not isinstance(item, dict):
            continue
        member_id = str(item.get("mb_id") or "").strip()
        if member_id and member_id != bootstrap_member_id:
            return member_id
    for item in members:
        if not isinstance(item, dict):
            continue
        member_id = str(item.get("mb_id") or "").strip()
        if member_id:
            return member_id
    raise ValueError("members list 에서 render parity 대상 회원을 선택하지 못했습니다.")


def build_fetch_bundle(
    adapter: DomainRenderAdapter,
    live_base_url: str,
    inspect_secret: str,
    output_dir: Path,
) -> tuple[dict[str, str], dict[str, str], dict[str, list[str]], dict[str, subprocess.CompletedProcess[str]]]:
    if adapter.fetch_mode == "config":
        live_config_json = output_dir / "live-config.json"
        live_schema_json = output_dir / "live-schema.json"
        commands = {
            "fetch_config": [
                "bash",
                str(PHP_ROOT / "scripts/fetch_live_admin_config.sh"),
                live_base_url,
                inspect_secret,
                str(live_config_json),
            ],
            "fetch_schema": [
                "bash",
                str(PHP_ROOT / "scripts/fetch_live_admin_schema.sh"),
                live_base_url,
                adapter.domain,
                inspect_secret,
                str(live_schema_json),
            ],
        }
        env_updates = {
            "ADMIN_CONFIG_RENDER_AUDIT_CONFIG_JSON": str(live_config_json),
            "ADMIN_CONFIG_RENDER_AUDIT_SCHEMA_JSON": str(live_schema_json),
        }
        artifacts = {
            "live_config_json": str(live_config_json.relative_to(RUST_ROOT)),
            "live_schema_json": str(live_schema_json.relative_to(RUST_ROOT)),
        }
    elif adapter.fetch_mode == "members":
        live_members_json = output_dir / "live-members.json"
        live_detail_json = output_dir / "live-member-detail.json"
        live_schema_json = output_dir / "live-schema.json"
        commands = {
            "fetch_members": [
                "bash",
                str(PHP_ROOT / "scripts/fetch_live_admin_members.sh"),
                live_base_url,
                inspect_secret,
                str(live_members_json),
                "page=1&per_page=20",
            ],
            "fetch_schema": [
                "bash",
                str(PHP_ROOT / "scripts/fetch_live_admin_schema.sh"),
                live_base_url,
                adapter.domain,
                inspect_secret,
                str(live_schema_json),
            ],
        }
        results: dict[str, subprocess.CompletedProcess[str]] = {}
        results["fetch_members"] = run_command(commands["fetch_members"], cwd=PHP_ROOT)
        results["fetch_schema"] = run_command(commands["fetch_schema"], cwd=PHP_ROOT)
        if any(result.returncode != 0 for result in results.values()):
            return {}, {}, commands, results

        selected_member_id = select_member_id_from_list(live_members_json)
        commands["fetch_member_detail"] = [
            "bash",
            str(PHP_ROOT / "scripts/fetch_live_admin_member_detail.sh"),
            live_base_url,
            selected_member_id,
            inspect_secret,
            str(live_detail_json),
        ]
        results["fetch_member_detail"] = run_command(commands["fetch_member_detail"], cwd=PHP_ROOT)
        env_updates = {
            "ADMIN_MEMBERS_RENDER_AUDIT_LIST_JSON": str(live_members_json),
            "ADMIN_MEMBERS_RENDER_AUDIT_DETAIL_JSON": str(live_detail_json),
            "ADMIN_MEMBERS_RENDER_AUDIT_SCHEMA_JSON": str(live_schema_json),
            "ADMIN_MEMBERS_RENDER_AUDIT_BOOTSTRAP_MEMBER_ID": os.getenv(
                "ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID",
                "neojins",
            ).strip()
            or "neojins",
        }
        artifacts = {
            "live_members_json": str(live_members_json.relative_to(RUST_ROOT)),
            "live_member_detail_json": str(live_detail_json.relative_to(RUST_ROOT)),
            "live_schema_json": str(live_schema_json.relative_to(RUST_ROOT)),
        }
        return env_updates, artifacts, commands, results
    else:
        raise ValueError(f"지원하지 않는 fetch_mode={adapter.fetch_mode}")

    results = {
        name: run_command(command, cwd=PHP_ROOT)
        for name, command in commands.items()
    }
    return env_updates, artifacts, commands, results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--live-base-url", default="https://gnurestapi.cc/api/v1")
    parser.add_argument("--inspect-secret")
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    output_dir = Path(
        args.output_dir
        or (RUST_ROOT / "output/admin-domain-consumer-render-parity" / args.domain)
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    adapter = DOMAIN_ADAPTERS.get(args.domain)
    inspect_secret = resolve_inspect_secret(args.inspect_secret)

    if adapter is None:
        report = {
            "status": "blocked",
            "mode": "missing_adapter",
            "domain": args.domain,
            "audited_checks": [],
            "notes": [
                "render parity 엔진은 공용이지만, 실제 DOM assertion 은 도메인 adapter 가 필요합니다.",
            ],
            "blocked_reason": "이 도메인용 render parity adapter 가 아직 없습니다.",
            "commands": {},
            "artifacts": {},
        }
        write_report(output_dir, report)
        raise SystemExit(1)

    if not inspect_secret:
        report = {
            "status": "blocked",
            "mode": "missing_secret",
            "domain": args.domain,
            "audited_checks": list(adapter.audited_checks),
            "notes": list(adapter.notes),
            "blocked_reason": "ADMIN_SCHEMA_INSPECT_SECRET 또는 /tmp/g5_admin_inspect_secret 이 필요합니다.",
            "commands": {},
            "artifacts": {},
        }
        write_report(output_dir, report)
        raise SystemExit(1)

    env_updates, artifacts, fetch_commands, fetch_results = build_fetch_bundle(
        adapter,
        args.live_base_url,
        inspect_secret,
        output_dir,
    )

    if any(result.returncode != 0 for result in fetch_results.values()):
        report = {
            "status": "fail",
            "mode": "fetch_error",
            "domain": args.domain,
            "audited_checks": list(adapter.audited_checks),
            "notes": list(adapter.notes),
            "blocked_reason": None,
            "commands": {
                name: sanitize_command(command, inspect_secret)
                for name, command in fetch_commands.items()
            },
            "artifacts": artifacts,
            "fetch": {
                name: {
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
                for name, result in fetch_results.items()
            },
        }
        write_report(output_dir, report)
        raise SystemExit(1)

    vitest_cmd = [
        "bunx",
        "vitest",
        "run",
        adapter.vitest_target,
    ]
    env = os.environ.copy()
    env.update(env_updates)
    vitest = run_command(vitest_cmd, cwd=G5_ADMIN_ROOT, env=env)

    report = {
        "status": "pass" if vitest.returncode == 0 else "fail",
        "mode": "strong_render_adapter",
        "domain": args.domain,
        "audited_checks": list(adapter.audited_checks),
        "notes": list(adapter.notes),
        "blocked_reason": None,
        "commands": {
            **{
                name: sanitize_command(command, inspect_secret)
                for name, command in fetch_commands.items()
            },
            "vitest": " ".join(vitest_cmd),
        },
        "artifacts": artifacts,
        "fetch": {
            name: {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
            for name, result in fetch_results.items()
        },
        "vitest": {
            "returncode": vitest.returncode,
            "stdout": vitest.stdout,
            "stderr": vitest.stderr,
        },
    }
    write_report(output_dir, report)
    raise SystemExit(0 if vitest.returncode == 0 else 1)


if __name__ == "__main__":
    main()
