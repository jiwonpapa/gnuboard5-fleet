from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

import run_all_admin_domain_consumer_render_parity as runner  # noqa: E402


def write_child_report(
    staging_root: Path,
    domain: str,
    payload: dict[str, object],
    returncode: int,
) -> runner.DomainRun:
    domain_output = staging_root / domain
    domain_output.mkdir(parents=True)
    report_path = domain_output / "latest.json"
    markdown_path = domain_output / "latest.md"
    report_path.write_text(json.dumps(payload), encoding="utf-8")
    markdown_path.write_text("# current child report\n", encoding="utf-8")
    return runner.DomainRun(
        domain=domain,
        returncode=returncode,
        stdout="",
        stderr="",
        report_path=report_path,
        markdown_path=markdown_path,
    )


class RenderParityRunnerTest(unittest.TestCase):
    def test_command_start_failure_becomes_nonzero_domain_run(self) -> None:
        with (
            tempfile.TemporaryDirectory() as directory,
            mock.patch.object(runner.subprocess, "run", side_effect=OSError("missing python")),
        ):
            run = runner.run_report(
                "config",
                "https://example.test/api/v1",
                None,
                Path(directory),
            )

        self.assertEqual(run.returncode, 127)
        self.assertIn("failed to start", run.stderr)

    def test_nonzero_subprocess_with_pass_payload_is_blocked_and_redacted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            run = write_child_report(
                Path(directory),
                "config",
                {
                    "domain": "config",
                    "status": "pass",
                    "mode": "strong_render_adapter",
                    "audited_checks": ["render"],
                },
                returncode=7,
            )
            run = runner.DomainRun(
                **{
                    **run.__dict__,
                    "stderr": "request failed with top-secret",
                }
            )

            payload = runner.load_current_payload(run, "top-secret")

        self.assertEqual(payload["status"], "blocked")
        self.assertEqual(payload["mode"], "subprocess_status_mismatch")
        self.assertNotIn("top-secret", payload["subprocess_stderr"])
        self.assertIn("$ADMIN_SCHEMA_INSPECT_SECRET", payload["subprocess_stderr"])

    def test_pass_with_zero_audited_checks_is_never_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            run = write_child_report(
                Path(directory),
                "config",
                {
                    "domain": "config",
                    "status": "pass",
                    "mode": "strong_render_adapter",
                    "audited_checks": [],
                },
                returncode=0,
            )

            payload = runner.load_current_payload(run, None)

        self.assertEqual(payload["status"], "blocked")
        self.assertEqual(payload["mode"], "scanner_zero_or_invalid_pass")

    def test_main_never_reuses_stale_latest_after_child_crash(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory) / "output"
            stale_dir = output_root / "config"
            stale_dir.mkdir(parents=True)
            (stale_dir / "latest.json").write_text(
                json.dumps(
                    {
                        "domain": "config",
                        "status": "pass",
                        "mode": "stale_report",
                        "audited_checks": ["stale"],
                    }
                ),
                encoding="utf-8",
            )

            def failed_run(
                domain: str,
                live_base_url: str,
                inspect_secret: str | None,
                staging_root: Path,
            ) -> runner.DomainRun:
                del live_base_url, inspect_secret
                return runner.DomainRun(
                    domain=domain,
                    returncode=9,
                    stdout="",
                    stderr="child crashed",
                    report_path=staging_root / domain / "latest.json",
                    markdown_path=staging_root / domain / "latest.md",
                )

            argv = [
                "run_all_admin_domain_consumer_render_parity.py",
                "--domains=config",
                f"--output-dir={output_root}",
            ]
            with (
                mock.patch.object(sys, "argv", argv),
                mock.patch.object(runner, "load_domain_names", return_value=["config"]),
                mock.patch.object(runner, "run_report", side_effect=failed_run),
                self.assertRaises(SystemExit) as raised,
            ):
                runner.main()

            current = json.loads((stale_dir / "latest.json").read_text(encoding="utf-8"))
            index = json.loads((output_root / "index.json").read_text(encoding="utf-8"))

        self.assertEqual(raised.exception.code, 1)
        self.assertEqual(current["status"], "blocked")
        self.assertEqual(current["mode"], "subprocess_failure")
        self.assertNotEqual(current["mode"], "stale_report")
        self.assertTrue(index["domain_count_match"])
        self.assertEqual(index["subprocess_nonzero_count"], 1)

    def test_current_strong_report_can_pass_with_exact_domain_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory) / "output"

            def successful_run(
                domain: str,
                live_base_url: str,
                inspect_secret: str | None,
                staging_root: Path,
            ) -> runner.DomainRun:
                del live_base_url, inspect_secret
                return write_child_report(
                    staging_root,
                    domain,
                    {
                        "domain": domain,
                        "status": "pass",
                        "mode": "strong_render_adapter",
                        "audited_checks": ["render", "save", "readback"],
                    },
                    returncode=0,
                )

            argv = [
                "run_all_admin_domain_consumer_render_parity.py",
                "--domains=config",
                f"--output-dir={output_root}",
            ]
            with (
                mock.patch.object(sys, "argv", argv),
                mock.patch.object(runner, "load_domain_names", return_value=["config"]),
                mock.patch.object(runner, "run_report", side_effect=successful_run),
                self.assertRaises(SystemExit) as raised,
            ):
                runner.main()

            index = json.loads((output_root / "index.json").read_text(encoding="utf-8"))

        self.assertEqual(raised.exception.code, 0)
        self.assertEqual(index["expected_domain_count"], 1)
        self.assertEqual(index["actual_domain_count"], 1)
        self.assertEqual(index["audited_check_count"], 3)

    def test_zero_or_duplicate_domain_scan_is_a_hard_failure(self) -> None:
        for domains in ([], ["config", "config"]):
            with self.subTest(domains=domains):
                with (
                    mock.patch.object(sys, "argv", ["runner"]),
                    mock.patch.object(runner, "load_domain_names", return_value=domains),
                    self.assertRaises(SystemExit) as raised,
                ):
                    runner.main()

                self.assertNotEqual(raised.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
