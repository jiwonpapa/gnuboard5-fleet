from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

import check_admin_domain_consumer_parity as parity  # noqa: E402
import run_all_admin_domain_consumer_parity as runner  # noqa: E402


class AdminDomainConsumerParityTest(unittest.TestCase):
    def test_all_non_shop_domains_have_reachable_strong_source_graphs(self) -> None:
        self.assertEqual(len(parity.SOURCE_GRAPH_ADAPTERS), 17)
        for adapter in parity.SOURCE_GRAPH_ADAPTERS:
            with self.subTest(domain=adapter.domain):
                report = parity.compare_source_graph_consumer(adapter)
                self.assertEqual(report["status"], "pass")
                self.assertEqual(report["adapter_kind"], "reachable_source_graph")
                self.assertGreater(len(report["expected_fields"]), 0)
                self.assertGreater(len(report["save_fields"]), 0)
                self.assertEqual(report["missing_fields"], [])
                self.assertEqual(report["missing_save_fields"], [])

    def test_reachable_source_field_deletion_is_a_hard_failure(self) -> None:
        source = next(
            adapter
            for adapter in parity.SOURCE_GRAPH_ADAPTERS
            if adapter.domain == "boards"
        )
        with tempfile.TemporaryDirectory(
            prefix="consumer-source-mutation-", dir=parity.RUST_ROOT
        ) as directory:
            feature_dir = Path(directory) / "boards"
            shutil.copytree(source.feature_dir, feature_dir)
            owner = feature_dir / "board-field-meta.ts"
            owner.write_text(
                owner.read_text(encoding="utf-8").replace('"bo_10"', '"bo_removed"'),
                encoding="utf-8",
            )
            mutated = parity.SourceGraphAdapter(
                domain=source.domain,
                feature_dir=feature_dir,
                entity_schema=source.entity_schema,
                write_schemas=source.write_schemas,
                read_only_fields=source.read_only_fields,
            )
            report = parity.compare_source_graph_consumer(mutated)

        self.assertEqual(report["status"], "fail")
        self.assertIn("bo_10", report["missing_fields"])

    def test_config_adapter_uses_current_renderable_metadata_owner(self) -> None:
        expected = "g5-admin/src/features/config/admin-config-renderable.ts"
        source_paths = {
            str(source.file.relative_to(parity.RUST_ROOT))
            for source in (
                *parity.CONFIG_ADAPTER.top_level_text_sources,
                *parity.CONFIG_ADAPTER.top_level_boolean_sources,
            )
        }

        self.assertEqual(source_paths, {expected})
        self.assertEqual(
            parity.CONFIG_ADAPTER.section_order_file,
            parity.RUST_ROOT / expected,
        )

    def test_strong_adapters_require_render_and_save_field_bijection(self) -> None:
        for adapter in (parity.CONFIG_ADAPTER, parity.MEMBERS_ADAPTER):
            with self.subTest(domain=adapter.domain):
                report = parity.compare_consumer_vs_schema(adapter)
                self.assertEqual(report["missing_fields"], [])
                self.assertEqual(report["consumer_only_fields"], [])
                self.assertEqual(report["missing_save_fields"], [])
                self.assertEqual(report["save_only_fields"], [])

    def test_unproven_password_hidden_and_file_control_kinds_fail_closed(self) -> None:
        expected = {
            "config": {"cf_icode_pw", "cf_icode_server_ip", "cf_icode_server_port"},
            "members": {"mb_password", "mb_addr_jibeon", "mb_icon", "mb_img"},
        }
        for adapter in (parity.CONFIG_ADAPTER, parity.MEMBERS_ADAPTER):
            with self.subTest(domain=adapter.domain):
                report = parity.compare_consumer_vs_schema(adapter)
                mismatch_fields = {item["field"] for item in report["type_mismatches"]}
                self.assertEqual("fail", report["status"])
                self.assertTrue(expected[adapter.domain].issubset(mismatch_fields))

    def test_manual_field_declarations_are_unverified_not_pass_evidence(self) -> None:
        report = parity.compare_consumer_vs_schema(parity.MEMBERS_ADAPTER)

        self.assertEqual("fail", report["status"])
        self.assertTrue(
            {"mb_level", "mb_password", "mb_icon", "mb_img"}.issubset(
                set(report["unverified_manual_fields"])
            )
        )

    def test_heuristic_footprint_can_never_pass_or_claim_save_coverage(self) -> None:
        report = parity.compare_consumer_with_generic_heuristic("boards")

        self.assertEqual(report["status"], "blocked")
        self.assertEqual(report["mode"], "heuristic_only")
        self.assertGreater(len(report["missing_save_fields"]), 0)


class AllDomainRunnerTest(unittest.TestCase):
    def test_command_start_failure_becomes_nonzero_domain_run(self) -> None:
        with (
            tempfile.TemporaryDirectory() as directory,
            mock.patch.object(runner.subprocess, "run", side_effect=OSError("missing python")),
        ):
            run = runner.run_report("config", Path(directory))

        self.assertEqual(run.returncode, 127)
        self.assertIn("failed to start", run.stderr)

    def test_nonzero_subprocess_with_pass_payload_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            report_path = Path(directory) / "latest.json"
            report_path.write_text(
                json.dumps({"domain": "config", "status": "pass", "mode": "strong_adapter"}),
                encoding="utf-8",
            )
            run = runner.DomainRun(
                domain="config",
                returncode=7,
                stdout="",
                stderr="boom",
                report_path=report_path,
                markdown_path=Path(directory) / "latest.md",
            )

            payload = runner.load_current_payload(run)

        self.assertEqual(payload["status"], "blocked")
        self.assertEqual(payload["mode"], "subprocess_status_mismatch")
        self.assertEqual(payload["subprocess_exit_code"], 7)

    def test_zero_evidence_pass_payload_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            report_path = Path(directory) / "latest.json"
            report_path.write_text(
                json.dumps(
                    {
                        "domain": "config",
                        "status": "pass",
                        "mode": "strong_adapter",
                        "consumer_field_sets": {},
                        "save_fields": [],
                    }
                ),
                encoding="utf-8",
            )
            run = runner.DomainRun(
                domain="config",
                returncode=0,
                stdout="",
                stderr="",
                report_path=report_path,
                markdown_path=Path(directory) / "latest.md",
            )

            payload = runner.load_current_payload(run)

        self.assertEqual("blocked", payload["status"])
        self.assertEqual("scanner_zero_or_invalid_pass", payload["mode"])

    def test_main_never_reuses_a_stale_latest_report(self) -> None:
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
                    }
                ),
                encoding="utf-8",
            )

            def failed_run(domain: str, staging_root: Path) -> runner.DomainRun:
                return runner.DomainRun(
                    domain=domain,
                    returncode=9,
                    stdout="",
                    stderr="subprocess crashed",
                    report_path=staging_root / domain / "latest.json",
                    markdown_path=staging_root / domain / "latest.md",
                )

            argv = [
                "run_all_admin_domain_consumer_parity.py",
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
        self.assertEqual(index["counts"]["blocked"], 1)
        self.assertEqual(index["subprocess_nonzero_count"], 1)

    def test_manifest_domain_shrink_cannot_redefine_expected_inventory(self) -> None:
        with (
            mock.patch.object(sys, "argv", ["runner"]),
            mock.patch.object(runner, "load_domain_names", return_value=["config"]),
            self.assertRaises(SystemExit) as raised,
        ):
            runner.main()

        self.assertNotEqual(raised.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
