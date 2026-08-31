from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import yaml


class StackSafetyTests(unittest.TestCase):
    def test_only_inbound_relay_can_reach_non_internal_network(self) -> None:
        compose = yaml.safe_load((Path(__file__).resolve().parents[1] / "local-g5.compose.yaml").read_text())
        self.assertTrue(compose["networks"]["certification"]["internal"])
        for service in ("g5", "db"):
            self.assertEqual(["certification"], compose["services"][service]["networks"])
            self.assertNotIn("ports", compose["services"][service])
        ingress = compose["services"]["ingress"]
        self.assertEqual({"ingress", "certification"}, set(ingress["networks"]))
        self.assertTrue(all(value.startswith("127.0.0.1:") for value in ingress["ports"]))
        self.assertIn("http://g5:80", ingress["command"])
        self.assertEqual(":80", ingress["command"][ingress["command"].index("--from") + 1])

    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.log = self.root / "actions.log"
        self.session = self.root / ".cache/certification/local/session.env"
        self.session.parent.mkdir(parents=True)
        self.script = self.root / "tools/certification/local_stack.sh"
        self.script.parent.mkdir(parents=True)
        source = (Path(__file__).resolve().parents[1] / "local_stack.sh").read_text()
        # Never signal a real process: even a regressed implementation is safe
        # to test, and its attempted signal is visible in the action log.
        source = source.replace("set -eu", '''set -eu
kill() { printf 'kill %s\\n' "$*" >> "$TEST_ACTION_LOG"; return 0; }
sleep() { return 0; }
''', 1)
        self.script.write_text(source)
        binaries = self.root / "bin"
        binaries.mkdir()
        for name in ("docker", "git", "curl", "openssl", "python3", "cargo", "bun", "ps"):
            command = binaries / name
            command.write_text('#!/bin/sh\nprintf "%s %s\\n" "' + name + '" "$*" >> "$TEST_ACTION_LOG"\necho unrelated-process\n')
            command.chmod(0o700)
        self.environment = {**os.environ, "PATH": f"{binaries}:/usr/bin:/bin", "TEST_ACTION_LOG": str(self.log)}

    def run_stack(self, command: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["/bin/sh", str(self.script), command], env=self.environment,
            capture_output=True, text=True, timeout=10,
        )

    def test_rejected_up_does_not_run_cleanup_trap_on_existing_session(self) -> None:
        self.session.write_text("G5_CERT_FLEET_PID=12345\n")
        result = self.run_stack("up")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("state already exists", result.stderr)
        self.assertFalse(self.log.exists(), "rejected startup must not touch existing stack")
        self.assertTrue(self.session.exists())

    def test_pid_without_matching_start_identity_is_not_signalled_or_cleaned(self) -> None:
        self.session.write_text("G5_CERT_FLEET_PID=12345\nG5_CERT_FLEET_STARTED_AT=old-process\n")
        result = self.run_stack("clean")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("unverified/reused", result.stderr)
        actions = self.log.read_text()
        self.assertNotIn("kill 12345\n", actions)
        self.assertNotIn("docker", actions)
        self.assertTrue(self.session.exists())

    def test_absent_session_does_not_remove_legacy_project_volumes(self) -> None:
        result = self.run_stack("down")
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
