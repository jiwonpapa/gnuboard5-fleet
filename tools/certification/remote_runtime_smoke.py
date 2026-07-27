#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import subprocess
import tempfile
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the ignored fleet-remote SSH/SFTP certification test."
    )
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--private-key-file", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("docs/audits/evidence/R04_REMOTE_RUNTIME_CERTIFICATION.json"),
    )
    return parser.parse_args()


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

    environment = os.environ.copy()
    environment.update(
        {
            "G5_FLEET_REMOTE_HOST": args.host,
            "G5_FLEET_REMOTE_USER": args.user,
            "G5_FLEET_REMOTE_PORT": str(args.port),
            "G5_FLEET_REMOTE_PRIVATE_KEY_FILE": str(key_path),
            "CARGO_NET_OFFLINE": "true",
        }
    )
    completed = subprocess.run(
        [
            "cargo",
            "test",
            "-p",
            "g5-fleet-remote",
            "--test",
            "runtime_certification",
            "--locked",
            "--offline",
            "--",
            "--ignored",
            "--exact",
            "managed_remote_survives_terminal_interrupt_reconnect_and_sftp_roundtrip",
        ],
        cwd=ROOT,
        env=environment,
        check=False,
        text=True,
    )
    if completed.returncode != 0:
        return completed.returncode

    revision = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    payload = {
        "schema": "g5-fleet.remote-runtime-certification/v1",
        "status": "PASS",
        "proof_level": "LOCAL_RUNTIME_PASS",
        "git_revision": revision,
        "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "target": {
            "host_sha256": hashlib.sha256(args.host.encode()).hexdigest(),
            "port": args.port,
            "user_sha256": hashlib.sha256(args.user.encode()).hexdigest(),
        },
        "verified": [
            "managed_private_network_target_pin",
            "strict_observed_host_key",
            "terminal_connect_interrupt_reconnect",
            "terminal_command_readback",
            "sftp_mkdir_upload_stat_chmod_copy_move_download",
            "sftp_byte_for_byte_readback",
            "sftp_running_transfer_process_abort",
            "sftp_fixture_cleanup",
        ],
        "secrets_recorded": False,
    }
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=output.parent,
        prefix=f".{output.name}.",
        delete=False,
    ) as handle:
        temporary = Path(handle.name)
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, output)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
