#!/usr/bin/env python3
from __future__ import annotations

import os
import shlex
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
AUDITS_DIR = ROOT / "docs" / "audits"
REPORT_LATEST_PATH = AUDITS_DIR / "AUDIT_LATEST.md"
KST = ZoneInfo("Asia/Seoul")


@dataclass
class CheckResult:
    id: str
    title: str
    command: list[str]
    cwd: Path
    status: str
    duration_ms: int
    returncode: int
    stdout_tail: list[str]
    stderr_tail: list[str]

    @property
    def command_text(self) -> str:
        return shlex.join(self.command)


def tail_lines(value: str, limit: int = 20) -> list[str]:
    lines = [line.rstrip() for line in value.splitlines() if line.strip()]
    return lines[-limit:]


def run_check(check_id: str, title: str, command: list[str], cwd: Path, env: dict[str, str]) -> CheckResult:
    started = time.monotonic()
    process = subprocess.run(
        command,
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    duration_ms = int((time.monotonic() - started) * 1000)
    status = "passed" if process.returncode == 0 else "failed"
    return CheckResult(
        id=check_id,
        title=title,
        command=command,
        cwd=cwd,
        status=status,
        duration_ms=duration_ms,
        returncode=process.returncode,
        stdout_tail=tail_lines(process.stdout),
        stderr_tail=tail_lines(process.stderr),
    )


def git_lines(*args: str) -> list[str]:
    process = subprocess.run(
        ["git", *args],
        cwd=str(ROOT),
        text=True,
        capture_output=True,
        check=False,
    )
    if process.returncode != 0:
        return []
    return [line.rstrip() for line in process.stdout.splitlines() if line.strip()]


def collect_changed_paths() -> list[str]:
    diff_base = os.environ.get("AUDIT_AUTO_DIFF_BASE", "").strip()
    diff_head = os.environ.get("AUDIT_AUTO_DIFF_HEAD", "HEAD").strip() or "HEAD"
    if diff_base:
        verify_base = subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", diff_base],
            cwd=str(ROOT),
            capture_output=True,
            check=False,
        )
        verify_head = subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", diff_head],
            cwd=str(ROOT),
            capture_output=True,
            check=False,
        )
        if verify_base.returncode == 0 and verify_head.returncode == 0:
            return git_lines("diff", "--name-only", f"{diff_base}...{diff_head}")
    status_lines = git_lines("status", "--short")
    paths: list[str] = []
    for line in status_lines:
        if len(line) < 4:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.rsplit(" -> ", 1)[1]
        paths.append(path)
    return paths


def build_scope_summary(changed_paths: list[str]) -> list[str]:
    if not changed_paths:
        return ["현재 `php` worktree, 변경 경로 감지 없음(기본 구현 감사 baseline)"]
    preview = changed_paths[:12]
    rendered = ", ".join(f"`{path}`" for path in preview)
    if len(changed_paths) > len(preview):
        rendered += f", 외 {len(changed_paths) - len(preview)}건"
    return [f"변경 경로 {len(changed_paths)}건: {rendered}"]


def render_status(result: CheckResult) -> str:
    return "✅ 통과" if result.status == "passed" else "❌ 실패"


def render_output_block(lines: list[str]) -> list[str]:
    if not lines:
        return ["```text", "(없음)", "```"]
    return ["```text", *lines, "```"]


def write_report(report_path: Path, content: str) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(content, encoding="utf-8")


def sync_document_registry() -> None:
    subprocess.run(["python3", "scripts/doc-processor.py", "--write"], cwd=str(ROOT), check=True)
    subprocess.run(["python3", "scripts/doc-index.py"], cwd=str(ROOT), check=True)


def build_markdown(
    generated_at: datetime,
    changed_paths: list[str],
    checks: list[CheckResult],
    run_blackbox: bool,
    run_integrated: bool,
) -> str:
    failed_checks = [check for check in checks if check.status == "failed"]
    overall_status = "미통과" if failed_checks else "통과"
    status_badge = "🔴" if failed_checks else "🟢"

    lines = [
        f"# 표준 감사 보고서 — {generated_at.strftime('%Y-%m-%d')}",
        "",
        f"> **기준 시점**: {generated_at.strftime('%Y-%m-%d %H:%M KST')}",
        f"> **범위**: {'; '.join(build_scope_summary(changed_paths))}",
        "",
        "## 결론",
        "",
        f"**{status_badge} {overall_status}**",
        "",
        f"- `quality-gate`는 {'실행' if checks else '미실행'}되었습니다.",
        f"- `blackbox`는 {'실행' if run_blackbox else '생략'}되었습니다.",
        f"- `integrated audit`는 {'실행' if run_integrated else '생략'}되었습니다.",
        "",
        "## Failure",
    ]

    if failed_checks:
        for check in failed_checks:
            lines.append(
                f"- `{check.id}` {check.title} 실패 (`exit={check.returncode}`, `{check.duration_ms}ms`)"
            )
    else:
        lines.append("- none")

    lines.extend(
        [
            "",
            "## Note",
            f"- 실행 체크 수: `{len(checks)}`",
            f"- 감지된 변경 경로 수: `{len(changed_paths)}`",
            "- `AUDIT_LATEST.md`는 같은 날짜의 최신 표준 감사본과 자동 동기화됩니다.",
            "- `docs/DOCUMENT_REGISTRY.md`와 `docs/docs.db`는 보고서 작성 뒤 자동 갱신됩니다.",
            "",
            "## Evidence",
        ]
    )

    for check in checks:
        lines.append(
            f"- `{check.id}` status=`{check.status}` cwd=`{check.cwd.relative_to(ROOT).as_posix()}` "
            f"command=`{check.command_text}`"
        )

    lines.extend(["", "## 실행 체크 결과"])

    for check in checks:
        lines.extend(
            [
                "",
                f"### {check.title}",
                "",
                f"- 상태: {render_status(check)}",
                f"- 실행 위치: `{check.cwd.relative_to(ROOT).as_posix()}`",
                f"- 명령: `{check.command_text}`",
                f"- 소요 시간: `{check.duration_ms}ms`",
                "",
                "#### stdout tail",
                *render_output_block(check.stdout_tail),
                "",
                "#### stderr tail",
                *render_output_block(check.stderr_tail),
            ]
        )

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    generated_at = datetime.now(KST)
    report_path = AUDITS_DIR / f"AUDIT_REPORT_{generated_at.strftime('%Y-%m-%d')}.md"
    run_blackbox = os.environ.get("RUN_BLACKBOX", "0") == "1"
    run_integrated = os.environ.get("RUN_INTEGRATED", "0") == "1"
    env = os.environ.copy()

    checks = [
        run_check(
            "quality_gate",
            "Implementation quality gate",
            ["composer", "run", "quality-gate"],
            ROOT,
            env,
        )
    ]
    if run_blackbox:
        checks.append(
            run_check(
                "blackbox",
                "API blackbox contract suite",
                ["composer", "run", "test:api:blackbox"],
                ROOT,
                env,
            )
        )
    if run_integrated:
        checks.append(
            run_check(
                "integrated",
                "PHP + Rust integrated audit",
                ["composer", "run", "audit:integrated"],
                ROOT,
                env,
            )
        )

    markdown = build_markdown(
        generated_at=generated_at,
        changed_paths=collect_changed_paths(),
        checks=checks,
        run_blackbox=run_blackbox,
        run_integrated=run_integrated,
    )
    write_report(report_path, markdown)
    write_report(REPORT_LATEST_PATH, markdown)
    sync_document_registry()

    print(f"implementation audit report written: {report_path.relative_to(ROOT)}")
    print(f"implementation audit report written: {REPORT_LATEST_PATH.relative_to(ROOT)}")
    return 1 if any(check.status == "failed" for check in checks) else 0


if __name__ == "__main__":
    raise SystemExit(main())
