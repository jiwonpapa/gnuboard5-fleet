from __future__ import annotations

import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from dataclasses import replace
from io import StringIO
from pathlib import Path
from unittest import mock

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

import check_active_crate_boundaries as boundaries  # noqa: E402
import ownership_watch  # noqa: E402


class OwnershipWatchRegistryTest(unittest.TestCase):
    def test_distinct_openapi_paths_are_never_collapsed_as_aliases(self) -> None:
        self.assertEqual(
            ownership_watch.normalize_path("/admin/system/mails"),
            "/admin/system/mails",
        )
        self.assertEqual(
            ownership_watch.normalize_path("/admin/mails"),
            "/admin/mails",
        )
        self.assertNotEqual(
            ownership_watch.normalize_path("/admin/system/mail-recipients"),
            ownership_watch.normalize_path("/admin/mails/recipients"),
        )

    def test_reads_real_registry_groups_and_checks_both_directions(self) -> None:
        report = ownership_watch.collect_registry_alignment_report()

        self.assertEqual(len(report.ipc_commands), 253)
        self.assertEqual(len(report.api_target_commands), 253)
        self.assertEqual(report.missing_ipc_for_api_targets, frozenset())
        self.assertEqual(report.unexpected_ipc_only_commands, frozenset())
        self.assertEqual(report.allowed_ipc_only_commands, frozenset())

    def test_registry_parser_detects_api_target_missing_from_ipc(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            api_registry = root / "api-target-registry.ts"
            api_groups = root / "api-target-registry-groups"
            context_builders = root / "command-context-builders"
            ipc_registry = root / "registry.rs"
            ipc_groups = root / "registry_groups.rs"
            api_groups.mkdir()
            context_builders.mkdir()
            api_registry.write_text(
                '"cmd_present": "/admin/present",\n'
                '"cmd_missing": "/admin/missing",\n',
                encoding="utf-8",
            )
            (context_builders / "all.ts").write_text(
                '"cmd_present": () => ({}),\n"cmd_missing": () => ({}),\n',
                encoding="utf-8",
            )
            ipc_registry.write_text("", encoding="utf-8")
            ipc_groups.write_text("crate::commands::cmd_present,\n", encoding="utf-8")

            with (
                mock.patch.object(ownership_watch, "API_TARGET_REGISTRY", api_registry),
                mock.patch.object(
                    ownership_watch,
                    "API_TARGET_REGISTRY_GROUPS_ROOT",
                    api_groups,
                ),
                mock.patch.object(
                    ownership_watch,
                    "COMMAND_CONTEXT_BUILDERS_ROOT",
                    context_builders,
                ),
                mock.patch.object(ownership_watch, "IPC_REGISTRY", ipc_registry),
                mock.patch.object(ownership_watch, "IPC_REGISTRY_GROUPS", ipc_groups),
                mock.patch.object(ownership_watch, "NAVIGATION_MANIFEST", root / "missing.ts"),
            ):
                report = ownership_watch.collect_registry_alignment_report()

        self.assertEqual(report.ipc_commands, frozenset({"cmd_present"}))
        self.assertEqual(report.missing_ipc_for_api_targets, frozenset({"cmd_missing"}))

    def test_api_target_missing_from_ipc_is_a_hard_failure(self) -> None:
        report = ownership_watch.collect_registry_alignment_report()
        mutated = replace(
            report,
            ipc_commands=report.ipc_commands - {"cmd_admin_board_get"},
            missing_ipc_for_api_targets=frozenset({"cmd_admin_board_get"}),
        )

        with mock.patch.object(
            boundaries,
            "collect_registry_alignment_report",
            return_value=mutated,
        ):
            findings = boundaries.registry_alignment_findings()

        self.assertIn(
            "registry_alignment_missing_ipc_command",
            {finding.rule for finding in findings},
        )

    def test_zero_ipc_scanner_result_is_a_hard_failure(self) -> None:
        report = ownership_watch.collect_registry_alignment_report()
        mutated = replace(
            report,
            ipc_commands=frozenset(),
            missing_ipc_for_api_targets=report.api_target_commands,
            unexpected_ipc_only_commands=frozenset(),
            allowed_ipc_only_commands=frozenset(),
        )

        with mock.patch.object(
            boundaries,
            "collect_registry_alignment_report",
            return_value=mutated,
        ):
            findings = boundaries.registry_alignment_findings()

        self.assertIn(
            "registry_alignment_empty_ipc_registry",
            {finding.rule for finding in findings},
        )

    def test_registry_only_mode_does_not_run_unrelated_structure_checks(self) -> None:
        stdout = StringIO()
        with (
            mock.patch.object(boundaries, "collect_findings", side_effect=AssertionError),
            mock.patch.object(boundaries, "registry_alignment_findings", return_value=[]),
            mock.patch.object(boundaries, "registry_alignment_notes", return_value=[]),
            mock.patch.object(boundaries, "load_waivers", return_value=[]),
            redirect_stdout(stdout),
        ):
            boundaries.main(["--registry-only"])

        self.assertIn("PASS: registry alignment audit", stdout.getvalue())

    def test_registry_only_mode_propagates_registry_failure(self) -> None:
        finding = boundaries.Finding(
            severity="failure",
            rule="registry_alignment_missing_ipc_command",
            path="registry_groups.rs",
            detail="missing cmd_test",
        )
        with (
            mock.patch.object(boundaries, "registry_alignment_findings", return_value=[finding]),
            mock.patch.object(boundaries, "registry_alignment_notes", return_value=[]),
            mock.patch.object(boundaries, "load_waivers", return_value=[]),
            redirect_stdout(StringIO()),
            self.assertRaises(SystemExit) as raised,
        ):
            boundaries.main(["--registry-only"])

        self.assertEqual(raised.exception.code, 1)


if __name__ == "__main__":
    unittest.main()
