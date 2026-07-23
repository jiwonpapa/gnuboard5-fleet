from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class CiPolicyTest(unittest.TestCase):
    def test_repository_keeps_automatic_pull_request_gates(self) -> None:
        for relative_path in (
            ".github/workflows/contract.yml",
            ".github/workflows/docs.yml",
            ".github/workflows/structure.yml",
        ):
            workflow = (ROOT / relative_path).read_text(encoding="utf-8")
            self.assertIn("pull_request:", workflow, relative_path)
            self.assertIn("workflow_dispatch:", workflow, relative_path)

    def test_pre_push_uses_scoped_checks_not_full_local_ci(self) -> None:
        hook = (ROOT / ".githooks/pre-push").read_text(encoding="utf-8")

        self.assertIn("run_pre_push_checks.sh", hook)
        self.assertNotIn("run_local_ci.sh", hook)

    def test_local_ci_does_not_nest_deep_and_pipeline_aggregators(self) -> None:
        script = (ROOT / "scripts/run_local_ci.sh").read_text(encoding="utf-8")

        self.assertNotIn("audit:deep", script)
        self.assertEqual(1, script.count("audit:api-pipeline:static"))
        self.assertIn("audit:harness:quality", script)
        self.assertIn("ensure_frontend_dependencies", script)
        self.assertNotIn("RUN_WINDOWS_TARGET=auto", script)
        self.assertEqual(1, script.count("cargo test --manifest-path"))

    def test_structure_gate_includes_check_only_hotspot_audit(self) -> None:
        script = (ROOT / "scripts/run_structure_audit.sh").read_text(encoding="utf-8")

        self.assertIn("run_hotspot_audit.py", script)
        self.assertIn("--check", script)


if __name__ == "__main__":
    unittest.main()
