from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "run_all_admin_domain_pipelines.py"
SPEC = importlib.util.spec_from_file_location("run_all_admin_domain_pipelines", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PipelineIndexReportTest(unittest.TestCase):
    def test_parent_audit_run_id_is_passed_to_domain_pipeline(self) -> None:
        completed = Mock(returncode=1, stdout="", stderr="failed")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            MODULE.subprocess, "run", return_value=completed
        ) as run:
            result = MODULE.run_pipeline(
                domain="config",
                audit_run_id="parent-run",
                base_url=None,
                live_base_url=None,
                inspect_secret=None,
                strict_choice_options=False,
                playwright_smoke=False,
                output_root=Path(directory),
            )

        self.assertEqual("parent-run", result.audit_run_id)
        self.assertIn("--audit-run-id=parent-run", run.call_args.args[0])

    def test_existing_artifact_report_is_explicitly_non_certifying(self) -> None:
        report = MODULE.build_report_from_summaries(
            [
                {
                    "domain": "config",
                    "status": "pass",
                    "statuses": {},
                    "blocked_count": 0,
                    "current_run_report": False,
                }
            ],
            execution_mode="existing_artifacts_report_only",
        )

        self.assertFalse(report["certifying"])

    def test_workspace_summary_paths_are_portable(self) -> None:
        path = MODULE.ROOT / "output/admin-domain-pipeline/config/pipeline-summary.json"

        self.assertEqual(
            "output/admin-domain-pipeline/config/pipeline-summary.json",
            MODULE.display_path(path),
        )

    def test_build_report_counts_pass_fail_and_blocked_domains(self) -> None:
        summaries = {
            "boards": {"domain": "boards", "status": "pass", "statuses": {}, "blocked_count": 0},
            "config": {"domain": "config", "status": "fail", "statuses": {}, "blocked_count": 0},
            "members": {"domain": "members", "status": "blocked", "statuses": {}, "blocked_count": 1},
        }

        with patch.object(
            MODULE,
            "summarize_domain",
            side_effect=lambda domain, *_: summaries[domain],
        ):
            report = MODULE.build_report(["boards", "config", "members"])

        self.assertEqual(3, report["total_domains"])
        self.assertEqual({"pass": 1, "fail": 1, "blocked": 1}, report["counts"])

    def test_missing_pipeline_summary_renders_as_blocked_without_crashing(self) -> None:
        with patch.object(MODULE.Path, "is_file", return_value=False):
            summary = MODULE.summarize_domain("missing-domain")

        self.assertEqual("blocked", summary["status"])
        self.assertEqual(1, summary["blocked_count"])
        self.assertIn("pipeline-summary.json", summary["summary_path"])
        self.assertEqual(
            {
                "playwright_smoke": None,
                "schema_check": None,
                "source_observation": None,
                "legacy_vs_contract": None,
                "contract_vs_live": None,
            },
            summary["statuses"],
        )

    def test_pipeline_command_failure_overrides_stale_pass_summary(self) -> None:
        report = {
            "total_domains": 1,
            "counts": {"pass": 1, "fail": 0, "blocked": 0},
            "domains": [
                {
                    "domain": "boards",
                    "status": "pass",
                    "summary_path": "output/admin-domain-pipeline/boards/pipeline-summary.json",
                    "statuses": {},
                    "blocked_count": 0,
                    "current_run_report": True,
                }
            ],
        }

        result = MODULE.apply_pipeline_results(
            report,
            {
                "boards": MODULE.PipelineRun(
                    domain="boards",
                    returncode=1,
                    stdout="old stdout",
                    stderr="pipeline failed",
                    summary_path=Path("/tmp/summary.json"),
                    started_at_ns=1,
                    previous_summary_mtime_ns=None,
                    audit_run_id="test-run",
                )
            },
        )

        self.assertEqual({"pass": 0, "fail": 1, "blocked": 0}, result["counts"])
        self.assertEqual("fail", result["domains"][0]["status"])
        self.assertEqual(1, result["domains"][0]["pipeline_result"]["returncode"])

    def test_empty_json_summary_can_never_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory)
            domain_output = output_root / "config"
            domain_output.mkdir()
            (domain_output / "pipeline-summary.json").write_text(
                json.dumps({}), encoding="utf-8"
            )

            summary = MODULE.summarize_domain("config", output_root)

        self.assertEqual("blocked", summary["status"])
        self.assertFalse(summary["current_run_report"])

    def test_stale_summary_is_rejected_even_when_payload_says_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory)
            domain_output = output_root / "config"
            domain_output.mkdir()
            summary_path = domain_output / "pipeline-summary.json"
            summary_path.write_text(
                json.dumps(
                    {
                        "domain": "config",
                        "blocked_items": [],
                        "playwright_smoke": {"status": "pass"},
                        "schema_check": {"status": "pass"},
                        "source_observation": {"status": "pass"},
                        "legacy_vs_contract": {"status": "pass"},
                        "contract_vs_live": {"status": "pass"},
                    }
                ),
                encoding="utf-8",
            )

            summary = MODULE.summarize_domain(
                "config",
                output_root,
                time.time_ns(),
                summary_path.stat().st_mtime_ns,
            )

        self.assertEqual("blocked", summary["status"])
        self.assertIn("오래된", summary["reason"])

    def test_ancient_summary_in_new_output_root_is_not_current_run(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory)
            domain_output = output_root / "config"
            domain_output.mkdir()
            summary_path = domain_output / "pipeline-summary.json"
            summary_path.write_text(
                json.dumps(
                    {
                        "audit_run_id": "current-run",
                        "domain": "config",
                        "blocked_items": [],
                        "playwright_smoke": {"status": "pass"},
                        "schema_check": {"status": "pass"},
                        "source_observation": {"status": "pass"},
                        "legacy_vs_contract": {"status": "pass"},
                        "contract_vs_live": {"status": "pass"},
                    }
                ),
                encoding="utf-8",
            )
            summary_path.touch()
            started_at_ns = time.time_ns()
            old_seconds = (started_at_ns - 10_000_000_000) / 1_000_000_000
            import os

            os.utime(summary_path, (old_seconds, old_seconds))

            summary = MODULE.summarize_domain(
                "config",
                output_root,
                started_at_ns,
                None,
                "current-run",
            )

        self.assertEqual("blocked", summary["status"])
        self.assertFalse(summary["current_run_report"])

    def test_summary_run_id_must_match_parent_process(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_root = Path(directory)
            domain_output = output_root / "config"
            domain_output.mkdir()
            summary_path = domain_output / "pipeline-summary.json"
            summary_path.write_text(
                json.dumps(
                    {
                        "audit_run_id": "stale-run",
                        "domain": "config",
                        "blocked_items": [],
                        "playwright_smoke": {"status": "pass"},
                        "schema_check": {"status": "pass"},
                        "source_observation": {"status": "pass"},
                        "legacy_vs_contract": {"status": "pass"},
                        "contract_vs_live": {"status": "pass"},
                    }
                ),
                encoding="utf-8",
            )

            summary = MODULE.summarize_domain(
                "config",
                output_root,
                None,
                None,
                "current-run",
            )

        self.assertEqual("blocked", summary["status"])
        self.assertIn("audit_run_id", summary["reason"])


if __name__ == "__main__":
    unittest.main()
