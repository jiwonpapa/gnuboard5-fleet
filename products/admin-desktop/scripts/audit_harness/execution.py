"""Fail-closed subprocess execution with bounded, redacted evidence."""

from __future__ import annotations

import shlex
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CheckSpec:
    id: str
    title: str
    command: tuple[str, ...]
    cwd: Path
    live_only: bool = False
    blocked_reason: str | None = None
    timeout_seconds: int = 1800
    tail_limit: int = 80


@dataclass(frozen=True)
class CheckResult:
    id: str
    title: str
    status: str
    command: str
    cwd: str
    returncode: int | None
    duration_ms: int
    stdout_tail: list[str]
    stderr_tail: list[str]
    reason: str | None = None


def redact(value: str, secrets: tuple[str, ...]) -> str:
    redacted = value
    for secret in secrets:
        if secret:
            redacted = redacted.replace(secret, "$ADMIN_SCHEMA_INSPECT_SECRET")
    return redacted


def tail_lines(value: str, secrets: tuple[str, ...], limit: int = 80) -> list[str]:
    lines = [redact(line.rstrip(), secrets) for line in value.splitlines() if line.strip()]
    return lines[-limit:]


def failed_result(
    spec: CheckSpec,
    command_text: str,
    duration_ms: int,
    reason: str,
    *,
    stdout: str = "",
    stderr: str = "",
    secrets: tuple[str, ...] = (),
) -> CheckResult:
    return CheckResult(
        id=spec.id,
        title=spec.title,
        status="failed",
        command=command_text,
        cwd=str(spec.cwd),
        returncode=None,
        duration_ms=duration_ms,
        stdout_tail=tail_lines(stdout, secrets, spec.tail_limit),
        stderr_tail=tail_lines(stderr, secrets, spec.tail_limit),
        reason=reason,
    )


def run_check(
    spec: CheckSpec,
    env: dict[str, str],
    secrets: tuple[str, ...] = (),
) -> CheckResult:
    command_text = redact(shlex.join(spec.command), secrets)
    if spec.blocked_reason:
        return CheckResult(
            id=spec.id,
            title=spec.title,
            status="blocked",
            command=command_text,
            cwd=str(spec.cwd),
            returncode=None,
            duration_ms=0,
            stdout_tail=[],
            stderr_tail=[],
            reason=spec.blocked_reason,
        )
    if not spec.cwd.is_dir():
        return failed_result(spec, command_text, 0, "working directory is missing")

    started = time.monotonic()
    try:
        completed = subprocess.run(
            list(spec.command),
            cwd=str(spec.cwd),
            env=env,
            text=True,
            capture_output=True,
            check=False,
            timeout=spec.timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout if isinstance(error.stdout, str) else ""
        stderr = error.stderr if isinstance(error.stderr, str) else ""
        return failed_result(
            spec,
            command_text,
            int((time.monotonic() - started) * 1000),
            f"command timed out after {spec.timeout_seconds} seconds",
            stdout=stdout,
            stderr=stderr,
            secrets=secrets,
        )
    except OSError as error:
        return failed_result(
            spec,
            command_text,
            int((time.monotonic() - started) * 1000),
            f"command could not start: {error}",
        )

    duration_ms = int((time.monotonic() - started) * 1000)
    return CheckResult(
        id=spec.id,
        title=spec.title,
        status="passed" if completed.returncode == 0 else "failed",
        command=command_text,
        cwd=str(spec.cwd),
        returncode=completed.returncode,
        duration_ms=duration_ms,
        stdout_tail=tail_lines(completed.stdout, secrets, spec.tail_limit),
        stderr_tail=tail_lines(completed.stderr, secrets, spec.tail_limit),
    )
