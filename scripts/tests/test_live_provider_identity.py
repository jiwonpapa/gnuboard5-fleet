from __future__ import annotations

import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "check_live_provider_identity.py"
SPEC = importlib.util.spec_from_file_location("check_live_provider_identity", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class LiveProviderIdentityTest(unittest.TestCase):
    def evaluate(self, **overrides):
        inputs = {
            "live_base_url": "https://example.test/api/v1",
            "local_revision": "abcdef1234567890",
            "local_openapi": b"openapi",
            "health": {"status": "ok", "g5_independent": True},
            "runtime": {"git_commit": "abcdef1234"},
            "live_openapi": b"openapi",
            "inspect_config": {
                "data": {"cf_admin": "admin", "cf_title": "Audit Site"}
            },
            "audit_run_id": "run-1",
        }
        inputs.update(overrides)
        return MODULE.evaluate_identity(**inputs)

    def test_matching_live_identity_passes_without_raw_site_values(self) -> None:
        report = self.evaluate()

        self.assertEqual("passed", report["status"])
        self.assertTrue(report["certified"])
        self.assertNotIn("Audit Site", str(report))
        self.assertNotIn("admin", str(report))

    def test_revision_or_openapi_drift_fails_closed(self) -> None:
        revision_drift = self.evaluate(runtime={"git_commit": "deadbeef"})
        contract_drift = self.evaluate(live_openapi=b"drift")

        self.assertEqual("failed", revision_drift["status"])
        self.assertFalse(
            revision_drift["checks"]["provider_revision_matches"]
        )
        self.assertEqual("failed", contract_drift["status"])
        self.assertFalse(contract_drift["checks"]["openapi_sha_matches"])

    def test_missing_site_identity_fails_closed(self) -> None:
        report = self.evaluate(inspect_config={"data": {}})

        self.assertEqual("failed", report["status"])
        self.assertFalse(report["checks"]["site_identity_present"])

    def test_fetch_sends_sensitive_header_via_stdin_not_argv(self) -> None:
        observed = {}

        def fake_run(command, **kwargs):
            observed["command"] = command
            observed["input"] = kwargs["input"]
            return subprocess.CompletedProcess(command, 0, stdout="{}", stderr="")

        original = MODULE.subprocess.run
        MODULE.subprocess.run = fake_run
        try:
            MODULE.fetch(
                "https://example.test/api/v1/admin-inspect/config",
                headers={"X-G5-Admin-Inspect-Secret": "do-not-leak"},
            )
        finally:
            MODULE.subprocess.run = original

        self.assertNotIn("do-not-leak", " ".join(observed["command"]))
        self.assertIn("do-not-leak", observed["input"])


if __name__ == "__main__":
    unittest.main()
