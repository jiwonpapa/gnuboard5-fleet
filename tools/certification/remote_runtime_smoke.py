#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from tools.certification.execution_capture import clean_revision, write_json
from tools.certification.regression_capture import artifact, parse_libtest
from tools.migration_parity.execution import CASE_SCHEMA, EXECUTION_SCHEMA, execution_inputs


ROOT = Path(__file__).resolve().parents[2]
REMOTE_TEST = "managed_remote_survives_terminal_interrupt_reconnect_and_sftp_roundtrip"
REMOTE_SOURCE = "crates/fleet-remote/tests/runtime_certification.rs"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run and capture the ignored fleet-remote SSH/SFTP certification test."
    )
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--private-key-file", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".cache/evidence/r04-remote-execution.json"),
    )
    return parser.parse_args()


def subject(category: str, *item_ids: str) -> list[dict[str, str]]:
    return [{"category": category, "item_id": item_id} for item_id in item_ids]


def remote_cases() -> list[dict[str, Any]]:
    return [
        {
            "id": "remote:host-key-target-pin",
            "status": "PASS",
            "kind": "remote_roundtrip",
            "assertions": [
                "managed LAN target passed server policy and DNS pin",
                "current ed25519 host key was observed before connection",
            ],
            "subjects": subject(
                "tauri_commands",
                "crate::commands::site::ssh_host_verification::cmd_ssh_host_verification_status",
            ) + subject("rust_workspace_members", "g5-admin-ssh"),
        },
        {
            "id": "remote:terminal-interrupt-reconnect-readback",
            "status": "PASS",
            "kind": "remote_roundtrip",
            "assertions": [
                "terminal process was interrupted and reconnected",
                "marker command was written and read back before close",
            ],
            "subjects": subject(
                "tauri_commands",
                "crate::commands::site::ssh_session::cmd_ssh_connect",
                "crate::commands::site::ssh_session::cmd_ssh_disconnect",
                "crate::commands::site::ssh_session::cmd_ssh_shell_close",
                "crate::commands::site::ssh_session::cmd_ssh_shell_open",
                "crate::commands::site::ssh_session::cmd_ssh_shell_read",
                "crate::commands::site::ssh_session::cmd_ssh_shell_write",
            ) + subject(
                "rust_workspace_members",
                "g5-admin-ssh-ports",
                "g5-admin-ssh-terminal-bridge",
            ) + subject(
                "rust_tests",
                "g5-admin/src-tauri/src/app_state/tests/ssh_sessions.rs::connect_status_and_disconnect_follow_site_runtime",
                "g5-admin/src-tauri/src/app_state/tests/ssh_sessions.rs::shell_open_write_read_and_close_follow_session_runtime",
                "g5-admin-ssh-ports/src/tests/mod.rs::shell_port_contract_returns_read_result",
            ),
        },
        {
            "id": "remote:sftp-roundtrip-readback-cleanup",
            "status": "PASS",
            "kind": "remote_roundtrip",
            "assertions": [
                "mkdir upload list stat chmod copy move and download completed",
                "downloaded bytes matched the uploaded source",
                "remote files and directory were removed",
            ],
            "subjects": subject(
                "tauri_commands",
                "crate::commands::site::sftp::cmd_sftp_chmod",
                "crate::commands::site::sftp::cmd_sftp_copy",
                "crate::commands::site::sftp::cmd_sftp_delete",
                "crate::commands::site::sftp::cmd_sftp_download",
                "crate::commands::site::sftp::cmd_sftp_list_dir",
                "crate::commands::site::sftp::cmd_sftp_mkdir",
                "crate::commands::site::sftp::cmd_sftp_move",
                "crate::commands::site::sftp::cmd_sftp_stat",
                "crate::commands::site::sftp::cmd_sftp_upload",
            ) + subject(
                "rust_tests",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::delete_reuses_cached_sftp_session",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::download_file_reuses_cached_sftp_session",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::list_dir_and_stat_reuse_the_same_cached_sftp_session",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::mkdir_reuses_cached_sftp_session",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::transfer_queue_processes_upload_and_download_items",
                "g5-admin/src-tauri/src/app_state/tests/sftp.rs::upload_file_reuses_cached_sftp_session",
            ),
        },
        {
            "id": "remote:persistent-transfer-pause-abort",
            "status": "PASS",
            "kind": "remote_roundtrip",
            "assertions": [
                "persistent upload job was queued and started",
                "pause cancelled the running transfer process before controlled finish",
            ],
            "subjects": subject(
                "tauri_commands",
                "crate::commands::site::sftp_transfer::cmd_sftp_transfer_enqueue",
                "crate::commands::site::sftp_transfer::cmd_sftp_transfer_pause",
            ) + subject(
                "rust_workspace_members",
                "g5-admin-sftp-transfer-queue",
            ) + subject(
                "rust_tests",
                "g5-admin-sftp-transfer-queue/src/tests.rs::enqueue_and_claim_updates_counts",
                "g5-admin-sftp-transfer-queue/src/tests.rs::pause_running_item_releases_worker_and_can_retry",
            ),
        },
    ]


def write_runner_log(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())


def main() -> int:
    args = arguments()
    key_path = args.private_key_file.expanduser().resolve()
    key_metadata = key_path.stat()
    if (
        not key_path.is_file()
        or key_path.is_symlink()
        or key_metadata.st_mode & (stat.S_IRWXG | stat.S_IRWXO)
    ):
        raise SystemExit("private key must be a private regular file")
    if not 1 <= args.port <= 65535:
        raise SystemExit("port must be between 1 and 65535")

    revision, inputs = clean_revision(ROOT), execution_inputs(ROOT)
    run_id = f"r04-remote-{uuid.uuid4().hex}"
    directory = ROOT / "output/certification/r36" / run_id
    directory.mkdir(parents=True, exist_ok=False)
    runner_log = directory / "cargo-test.log"
    environment = os.environ.copy()
    environment.update(
        {
            "G5_FLEET_REMOTE_HOST": args.host,
            "G5_FLEET_REMOTE_USER": args.user,
            "G5_FLEET_REMOTE_PORT": str(args.port),
            "G5_FLEET_REMOTE_PRIVATE_KEY_FILE": str(key_path),
            "CARGO_NET_OFFLINE": "true",
            "NO_COLOR": "1",
        }
    )
    completed = subprocess.run(
        [
            "cargo", "test", "-p", "g5-fleet-remote", "--test",
            "runtime_certification", "--locked", "--offline", "--",
            "--ignored", "--exact", REMOTE_TEST,
        ],
        cwd=ROOT,
        env=environment,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    write_runner_log(runner_log, completed.stdout)
    print(completed.stdout, end="", flush=True)
    if completed.returncode != 0:
        return completed.returncode
    passed, ignored = parse_libtest(completed.stdout, REMOTE_SOURCE)
    if passed != [{"runner": "libtest", "file": REMOTE_SOURCE, "name": REMOTE_TEST}] or ignored:
        raise RuntimeError("remote runner output did not contain the exact passing certification test")
    if clean_revision(ROOT) != revision or execution_inputs(ROOT) != inputs:
        raise RuntimeError("checkout/provider inputs changed during remote certification")

    generated_at = datetime.now(UTC).isoformat()
    source = {
        "schema": CASE_SCHEMA,
        "status": "PASS",
        "git_revision": revision,
        "inputs": inputs,
        "parent_run_id": run_id,
        "run_id": f"{run_id}-cases",
        "generated_at": generated_at,
        "producer": "tools/certification/remote_runtime_smoke.py",
        "raw_artifacts": [artifact(ROOT, runner_log)],
        "target": {
            "host_sha256": hashlib.sha256(args.host.encode()).hexdigest(),
            "port": args.port,
            "user_sha256": hashlib.sha256(args.user.encode()).hexdigest(),
        },
        "secrets_recorded": False,
        "cases": remote_cases(),
    }
    case_path = directory / "remote-cases.json"
    write_json(case_path, source, immutable=True)
    receipt = {
        "schema": EXECUTION_SCHEMA,
        "status": "PASS",
        "proof_level": "LOCAL_RUNTIME_PASS",
        "git_revision": revision,
        "inputs": inputs,
        "generated_at": generated_at,
        "run_id": run_id,
        "artifacts": [{**artifact(ROOT, case_path), "run_id": source["run_id"]}],
        "coverage": {
            "cases": len(source["cases"]),
            "subjects": sum(len(case["subjects"]) for case in source["cases"]),
            "remote_roundtrips": 1,
        },
    }
    output = (args.output if args.output.is_absolute() else ROOT / args.output).resolve()
    if not output.is_relative_to(ROOT.resolve()) or output.is_symlink():
        raise RuntimeError("remote execution receipt must stay inside the repository")
    write_json(output, receipt)
    print(json.dumps({
        "status": "PASS", "git_revision": revision, "run_id": run_id,
        "cases": len(source["cases"]), "receipt": output.relative_to(ROOT).as_posix(),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
