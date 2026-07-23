from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

from audit_harness.execution import CheckSpec, run_check  # noqa: E402


class AuditHarnessExecutionTest(unittest.TestCase):
    def test_success_output_is_bounded_and_secret_is_redacted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = run_check(
                CheckSpec(
                    id="success",
                    title="success",
                    command=("python3", "-c", "print('first\\nsecret-value\\nlast')"),
                    cwd=Path(directory),
                    tail_limit=2,
                ),
                env={},
                secrets=("secret-value",),
            )

        self.assertEqual("passed", result.status)
        self.assertEqual(
            ["$ADMIN_SCHEMA_INSPECT_SECRET", "last"], result.stdout_tail
        )

    def test_missing_working_directory_fails_without_starting(self) -> None:
        result = run_check(
            CheckSpec(
                id="missing-cwd",
                title="missing cwd",
                command=("true",),
                cwd=Path("/definitely/missing/audit-directory"),
            ),
            env={},
        )

        self.assertEqual("failed", result.status)
        self.assertEqual("working directory is missing", result.reason)

    def test_timeout_is_reported_as_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = run_check(
                CheckSpec(
                    id="timeout",
                    title="timeout",
                    command=("python3", "-c", "import time; time.sleep(1)"),
                    cwd=Path(directory),
                    timeout_seconds=0,
                ),
                env={},
            )

        self.assertEqual("failed", result.status)
        self.assertIn("timed out", result.reason or "")

    def test_blocked_check_never_executes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = run_check(
                CheckSpec(
                    id="blocked",
                    title="blocked",
                    command=("definitely-not-a-command",),
                    cwd=Path(directory),
                    blocked_reason="live inputs missing",
                ),
                env={},
            )

        self.assertEqual("blocked", result.status)
        self.assertEqual("live inputs missing", result.reason)


if __name__ == "__main__":
    unittest.main()
