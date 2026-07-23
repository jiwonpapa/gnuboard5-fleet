#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import random
import re
import signal
import subprocess
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SECRET_FILE = Path("/tmp/g5_admin_inspect_secret")
PLAYWRIGHT_CLI_DIR = ROOT / ".playwright-cli"
PAGE_URL_PATTERN = re.compile(r"Page URL:\s*(\S+)")
SNAPSHOT_FAILURE_PATTERN = re.compile(
    r"(?i)(404\s+not\s+found|page\s+not\s+found|php\s+fatal\s+error|"
    r"로그인\s*(?:페이지|아이디|비밀번호)|접근\s*(?:권한|거부))"
)
CONSOLE_FAILURE_PATTERN = re.compile(r"(?i)\b(?:uncaught|exception|fatal error)\b")
NETWORK_FAILURE_PATTERN = re.compile(r"(?<!\d)(?:4\d\d|5\d\d)(?!\d)")
PLAYWRIGHT_NETWORK_COMMAND = "requests"
PLAYWRIGHT_COMMAND_TIMEOUT_SECONDS = 45


def sanitize_secret(text: str, secret: str) -> str:
    if not secret:
        return text
    return text.replace(secret, "$ADMIN_SCHEMA_INSPECT_SECRET")


def resolve_secret(explicit_secret: str | None) -> str:
    if explicit_secret:
        return explicit_secret.strip()
    env_secret = os.getenv("ADMIN_SCHEMA_INSPECT_SECRET", "").strip()
    if env_secret:
        return env_secret
    if DEFAULT_SECRET_FILE.is_file():
        return DEFAULT_SECRET_FILE.read_text(encoding="utf-8").strip()
    return ""


def normalize_target(target: str) -> str:
    value = "/" + target.lstrip("/")
    if not value.startswith("/adm/"):
        return "/adm" + value
    return value


def build_bootstrap_url(base_url: str, target: str) -> str:
    return (
        f"{base_url.rstrip('/')}/dev/local_admin_bootstrap.php"
        f"?next={quote(normalize_target(target), safe='')}"
    )


def build_navigation_code(bootstrap_url: str) -> str:
    encoded_url = json.dumps(bootstrap_url)
    return (
        'await page.context().setExtraHTTPHeaders({'
        '"X-G5-Admin-Inspect-Secret": process.env.ADMIN_SCHEMA_INSPECT_SECRET'
        "}); "
        f"await page.goto({encoded_url});"
    )


def run_command(args: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    process = subprocess.Popen(
        args,
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        start_new_session=True,
    )
    try:
        stdout, stderr = process.communicate(timeout=PLAYWRIGHT_COMMAND_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as error:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            stdout, stderr = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stdout, stderr = process.communicate()
        stdout = stdout or (error.stdout if isinstance(error.stdout, str) else "")
        stderr = stderr or (error.stderr if isinstance(error.stderr, str) else "")
        return subprocess.CompletedProcess(
            args,
            124,
            stdout=stdout,
            stderr=(stderr + "\nplaywright command timed out").strip(),
        )
    return subprocess.CompletedProcess(args, process.returncode, stdout, stderr)


def extract_reference_path(output: str, label: str) -> Path | None:
    pattern = re.compile(rf"\[{re.escape(label)}\]\(([^)]+)\)")
    match = pattern.search(output)
    if not match:
        return None
    return (ROOT / match.group(1)).resolve()


def slugify_target(target: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", normalize_target(target).lstrip("/")).strip("-")


def materialize_text_artifact(
    source: Path | None,
    fallback_text: str,
    destination: Path,
    secret: str,
) -> str | None:
    text = (
        source.read_text(encoding="utf-8", errors="ignore")
        if source is not None and source.is_file()
        else fallback_text
    )
    text = sanitize_secret(text, secret)
    if not text.strip():
        return None
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(text, encoding="utf-8")
    try:
        return str(destination.relative_to(ROOT))
    except ValueError:
        return str(destination)


def is_browser_already_closed(stdout: str) -> bool:
    return "is not open, please run open first" in stdout


def extract_page_url(*outputs: str) -> str | None:
    for output in outputs:
        matches = PAGE_URL_PATTERN.findall(output)
        if matches:
            return matches[-1]
    return None


def validate_page_evidence(
    *,
    target: str,
    final_url: str | None,
    snapshot_path: Path | None,
    console_path: Path | None,
    network_path: Path | None,
) -> list[str]:
    failures: list[str] = []
    expected_path = normalize_target(target)
    if not final_url:
        failures.append("final page URL evidence is missing")
    elif urlparse(final_url).path.rstrip("/") != expected_path.rstrip("/"):
        failures.append(
            f"final page URL path mismatch: expected={expected_path} actual={urlparse(final_url).path}"
        )

    artifacts = {
        "snapshot": snapshot_path,
        "console": console_path,
        "network": network_path,
    }
    for label, artifact in artifacts.items():
        if artifact is None or not artifact.is_file() or artifact.stat().st_size == 0:
            failures.append(f"{label} artifact is missing or empty")

    if snapshot_path is not None and snapshot_path.is_file():
        snapshot_text = snapshot_path.read_text(encoding="utf-8", errors="ignore")
        if SNAPSHOT_FAILURE_PATTERN.search(snapshot_text):
            failures.append("snapshot contains an error/login surface marker")
    if console_path is not None and console_path.is_file():
        console_text = console_path.read_text(encoding="utf-8", errors="ignore")
        if CONSOLE_FAILURE_PATTERN.search(console_text):
            failures.append("console contains an uncaught/fatal marker")
    if network_path is not None and network_path.is_file():
        network_text = network_path.read_text(encoding="utf-8", errors="ignore")
        if NETWORK_FAILURE_PATTERN.search(network_text):
            failures.append("network log contains a 4xx/5xx status")
    return failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--target", action="append", default=[])
    parser.add_argument("--inspect-secret")
    parser.add_argument("--output-dir")
    parser.add_argument("--audit-run-id")
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()

    targets = [normalize_target(target) for target in args.target if target.strip()]
    if not targets:
        raise SystemExit("--target 이 최소 1개 필요합니다.")

    inspect_secret = resolve_secret(args.inspect_secret)
    if not inspect_secret:
        raise SystemExit("ADMIN_SCHEMA_INSPECT_SECRET 또는 /tmp/g5_admin_inspect_secret 이 필요합니다.")

    pwcli = Path(os.getenv("CODEX_HOME", str(Path.home() / ".codex"))) / "skills/playwright/scripts/playwright_cli.sh"
    if not pwcli.is_file():
        raise SystemExit(f"playwright cli wrapper 가 없습니다: {pwcli}")

    output_dir = Path(args.output_dir or (ROOT / "output/playwright" / args.domain))
    output_dir.mkdir(parents=True, exist_ok=True)

    pages: list[dict[str, object]] = []
    status = "pass"
    run_suffix = f"{os.getpid():x}{random.randint(0, 0xFF):02x}"

    for index, target in enumerate(targets, start=1):
        slug = slugify_target(target)
        session_name = f"g5{args.domain[:1]}{run_suffix}{index:02d}"
        page_dir = output_dir / slug
        page_dir.mkdir(parents=True, exist_ok=True)

        bootstrap_url = build_bootstrap_url(args.base_url, target)
        env = os.environ.copy()
        env["PLAYWRIGHT_CLI_SESSION"] = session_name
        env["ADMIN_SCHEMA_INSPECT_SECRET"] = inspect_secret

        open_cmd = ["bash", str(pwcli), "open", args.base_url.rstrip("/")]
        if args.headed:
            open_cmd.append("--headed")
        navigate_cmd = [
            "bash",
            str(pwcli),
            "run-code",
            build_navigation_code(bootstrap_url),
        ]
        snapshot_cmd = ["bash", str(pwcli), "snapshot"]
        console_cmd = ["bash", str(pwcli), "console"]
        network_cmd = ["bash", str(pwcli), PLAYWRIGHT_NETWORK_COMMAND]
        close_cmd = ["bash", str(pwcli), "close"]

        open_result = run_command(open_cmd, env)
        navigate_result = run_command(navigate_cmd, env) if open_result.returncode == 0 else None
        navigation_succeeded = bool(navigate_result and navigate_result.returncode == 0)
        snapshot_result = run_command(snapshot_cmd, env) if navigation_succeeded else None
        console_result = run_command(console_cmd, env) if navigation_succeeded else None
        network_result = run_command(network_cmd, env) if navigation_succeeded else None
        close_result = run_command(close_cmd, env) if open_result.returncode == 0 else None

        tolerated_console_failure = bool(
            open_result.returncode == 0
            and snapshot_result
            and snapshot_result.returncode == 0
            and console_result
            and console_result.returncode != 0
            and is_browser_already_closed(console_result.stdout)
        )
        tolerated_network_failure = bool(
            open_result.returncode == 0
            and snapshot_result
            and snapshot_result.returncode == 0
            and network_result
            and network_result.returncode != 0
            and is_browser_already_closed(network_result.stdout)
        )

        page_status = "pass"
        if open_result.returncode != 0:
            page_status = "fail"
        elif not navigation_succeeded:
            page_status = "fail"
        elif snapshot_result and snapshot_result.returncode != 0:
            page_status = "fail"
        elif console_result and console_result.returncode != 0 and not tolerated_console_failure:
            page_status = "fail"
        elif network_result and network_result.returncode != 0 and not tolerated_network_failure:
            page_status = "fail"

        snapshot_ref = extract_reference_path(snapshot_result.stdout if snapshot_result else "", "Snapshot")
        console_ref = extract_reference_path(console_result.stdout if console_result else "", "Console")
        network_ref = extract_reference_path(network_result.stdout if network_result else "", "Network")

        copied_snapshot = materialize_text_artifact(
            snapshot_ref,
            snapshot_result.stdout if snapshot_result else "",
            page_dir / "snapshot.yml",
            inspect_secret,
        )
        copied_console = materialize_text_artifact(
            console_ref,
            console_result.stdout if console_result else "",
            page_dir / "console.log",
            inspect_secret,
        )
        copied_network = materialize_text_artifact(
            network_ref,
            network_result.stdout if network_result else "",
            page_dir / "network.log",
            inspect_secret,
        )
        copied_paths = {
            "snapshot": Path(copied_snapshot) if copied_snapshot and Path(copied_snapshot).is_absolute() else ROOT / copied_snapshot if copied_snapshot else None,
            "console": Path(copied_console) if copied_console and Path(copied_console).is_absolute() else ROOT / copied_console if copied_console else None,
            "network": Path(copied_network) if copied_network and Path(copied_network).is_absolute() else ROOT / copied_network if copied_network else None,
        }
        final_url = extract_page_url(
            snapshot_result.stdout if snapshot_result else "",
            navigate_result.stdout if navigate_result else "",
            open_result.stdout,
        )
        evidence_failures = validate_page_evidence(
            target=target,
            final_url=final_url,
            snapshot_path=copied_paths["snapshot"],
            console_path=copied_paths["console"],
            network_path=copied_paths["network"],
        )
        if evidence_failures:
            page_status = "fail"
        if page_status == "fail":
            status = "fail"

        pages.append(
            {
                "target": target,
                "status": page_status,
                "final_url": sanitize_secret(final_url or "", inspect_secret) or None,
                "evidence_failures": evidence_failures,
                "artifacts": {
                    "snapshot": copied_snapshot,
                    "console": copied_console,
                    "network": copied_network,
                },
                "commands": {
                    "open": sanitize_secret(" ".join(open_cmd), inspect_secret),
                    "navigate": " ".join(navigate_cmd),
                    "snapshot": " ".join(snapshot_cmd),
                    "console": " ".join(console_cmd),
                    "network": " ".join(network_cmd),
                    "close": " ".join(close_cmd),
                },
                "results": {
                    "open": {
                        "returncode": open_result.returncode,
                        "stdout": sanitize_secret(open_result.stdout, inspect_secret),
                        "stderr": sanitize_secret(open_result.stderr, inspect_secret),
                    },
                    "navigate": {
                        "returncode": navigate_result.returncode if navigate_result else None,
                        "stdout": sanitize_secret(navigate_result.stdout, inspect_secret) if navigate_result else "",
                        "stderr": sanitize_secret(navigate_result.stderr, inspect_secret) if navigate_result else "",
                    },
                    "snapshot": {
                        "returncode": snapshot_result.returncode if snapshot_result else None,
                        "stdout": sanitize_secret(snapshot_result.stdout, inspect_secret) if snapshot_result else "",
                        "stderr": sanitize_secret(snapshot_result.stderr, inspect_secret) if snapshot_result else "",
                    },
                    "console": {
                        "returncode": console_result.returncode if console_result else None,
                        "stdout": sanitize_secret(console_result.stdout, inspect_secret) if console_result else "",
                        "stderr": sanitize_secret(console_result.stderr, inspect_secret) if console_result else "",
                        "ignored": tolerated_console_failure,
                    },
                    "network": {
                        "returncode": network_result.returncode if network_result else None,
                        "stdout": sanitize_secret(network_result.stdout, inspect_secret) if network_result else "",
                        "stderr": sanitize_secret(network_result.stderr, inspect_secret) if network_result else "",
                        "ignored": tolerated_network_failure,
                    },
                    "close": {
                        "returncode": close_result.returncode if close_result else None,
                        "stdout": sanitize_secret(close_result.stdout, inspect_secret) if close_result else "",
                        "stderr": sanitize_secret(close_result.stderr, inspect_secret) if close_result else "",
                    },
                },
            }
        )

    manifest = {
        "audit_run_id": args.audit_run_id,
        "domain": args.domain,
        "status": status,
        "base_url": args.base_url.rstrip("/"),
        "page_count": len(pages),
        "pages": pages,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest_path = output_dir / "manifest.json"
    try:
        print(str(manifest_path.relative_to(ROOT)))
    except ValueError:
        print(str(manifest_path))
    raise SystemExit(0 if status == "pass" else 1)


if __name__ == "__main__":
    main()
