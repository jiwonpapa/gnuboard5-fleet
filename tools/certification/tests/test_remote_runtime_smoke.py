from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools.certification.remote_runtime_smoke import remote_cases


class RemoteRuntimeSmokeTests(unittest.TestCase):
    def test_cases_claim_only_operations_exercised_by_the_remote_roundtrip(self) -> None:
        cases = remote_cases()
        self.assertEqual(4, len(cases))
        self.assertTrue(all(case["kind"] == "remote_roundtrip" for case in cases))
        subjects = {
            (subject["category"], subject["item_id"])
            for case in cases
            for subject in case["subjects"]
        }
        self.assertIn(
            ("tauri_commands", "crate::commands::site::sftp::cmd_sftp_mkdir"),
            subjects,
        )
        self.assertIn(
            ("rust_tests", "g5-admin-sftp-transfer-queue/src/tests.rs::pause_running_item_releases_worker_and_can_retry"),
            subjects,
        )
        for unsupported in (
            "crate::commands::site::sftp::cmd_sftp_read_file",
            "crate::commands::site::sftp::cmd_sftp_write_file",
            "crate::commands::site::ssh_session::cmd_ssh_shell_resize",
            "crate::commands::site::sftp_transfer::cmd_sftp_transfer_retry",
        ):
            self.assertNotIn(("tauri_commands", unsupported), subjects)

    def test_every_claimed_subject_exists_in_the_migration_manifest(self) -> None:
        root = Path(__file__).resolve().parents[3]
        manifest = json.loads((root / "governance/MIGRATION_PARITY.json").read_bytes())
        known = {
            (category, mapping["legacy_id"])
            for category, mappings in manifest["mappings"].items()
            for mapping in mappings
        }
        claimed = {
            (subject["category"], subject["item_id"])
            for case in remote_cases()
            for subject in case["subjects"]
        }
        self.assertTrue(claimed <= known)


if __name__ == "__main__":
    unittest.main()
