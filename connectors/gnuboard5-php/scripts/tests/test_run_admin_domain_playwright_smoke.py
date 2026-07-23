from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/run_admin_domain_playwright_smoke.py"
SPEC = importlib.util.spec_from_file_location(
    "run_admin_domain_playwright_smoke", MODULE_PATH
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PlaywrightEvidenceTest(unittest.TestCase):
    def test_current_cli_network_command_and_artifacts_are_secret_safe(self) -> None:
        self.assertEqual("requests", MODULE.PLAYWRIGHT_NETWORK_COMMAND)
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "network.log"
            relative = MODULE.materialize_text_artifact(
                None,
                "GET https://example.test/dev/bootstrap?secret=do-not-leak 200",
                destination,
                "do-not-leak",
            )

            self.assertIsNotNone(relative)
            text = destination.read_text(encoding="utf-8")
            self.assertNotIn("do-not-leak", text)
            self.assertIn("$ADMIN_SCHEMA_INSPECT_SECRET", text)

    def test_bootstrap_secret_is_header_only_and_never_part_of_navigation_url(self) -> None:
        url = MODULE.build_bootstrap_url(
            "https://example.test",
            "/adm/config_form.php",
        )
        code = MODULE.build_navigation_code(url)

        self.assertNotIn("secret=", url)
        self.assertIn("next=%2Fadm%2Fconfig_form.php", url)
        self.assertIn("process.env.ADMIN_SCHEMA_INSPECT_SECRET", code)
        self.assertIn("X-G5-Admin-Inspect-Secret", code)

    def test_playwright_command_timeout_is_reported_as_exit_124(self) -> None:
        class TimeoutProcess:
            pid = 4321
            returncode = None
            communicate_calls = 0

            def communicate(self, timeout=None):
                self.communicate_calls += 1
                if self.communicate_calls == 1:
                    raise MODULE.subprocess.TimeoutExpired(["pwcli", "open"], timeout)
                self.returncode = -15
                return "", ""

        process = TimeoutProcess()
        with (
            patch.object(MODULE.subprocess, "Popen", return_value=process),
            patch.object(MODULE.os, "killpg") as killpg,
        ):
            result = MODULE.run_command(["pwcli", "open"], {})

        self.assertEqual(124, result.returncode)
        self.assertIn("timed out", result.stderr)
        killpg.assert_called_once_with(4321, MODULE.signal.SIGTERM)

    def test_missing_artifacts_and_wrong_final_url_are_failures(self) -> None:
        failures = MODULE.validate_page_evidence(
            target="/adm/config_form.php",
            final_url="https://example.test/login",
            snapshot_path=None,
            console_path=None,
            network_path=None,
        )

        self.assertTrue(any("URL path mismatch" in item for item in failures))
        self.assertEqual(
            3,
            sum("artifact is missing or empty" in item for item in failures),
        )

    def test_error_surfaces_and_failed_network_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            snapshot = root / "snapshot.yml"
            console = root / "console.log"
            network = root / "network.log"
            snapshot.write_text("PHP Fatal error", encoding="utf-8")
            console.write_text("Uncaught exception", encoding="utf-8")
            network.write_text("GET /api/v1/admin/config 500", encoding="utf-8")

            failures = MODULE.validate_page_evidence(
                target="/adm/config_form.php",
                final_url="https://example.test/adm/config_form.php",
                snapshot_path=snapshot,
                console_path=console,
                network_path=network,
            )

        self.assertEqual(3, len(failures))


if __name__ == "__main__":
    unittest.main()
