from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.migration_parity.parity import audit_parity
from tools.migration_parity.tests.helpers import make_fixture


class MutationTest(unittest.TestCase):
    def test_deleted_target_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            (root / "apps/admin-server/src/lib.rs").unlink()
            findings, _, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn(
                "mapping.target_path_missing",
                {finding.code for finding in findings},
            )

    def test_deleted_test_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            (root / "apps/admin-server/tests/parity.rs").unlink()
            findings, _, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn(
                "mapping.test_path_missing",
                {finding.code for finding in findings},
            )

    def test_removed_symbol_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            (root / "apps/admin-server/src/lib.rs").write_text(
                "pub fn unrelated() {}\n",
                encoding="utf-8",
            )
            findings, _, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn("mapping.check_missing", {finding.code for finding in findings})

    def test_legacy_fingerprint_mutation_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            legacy.categories["tauri_commands"][0] = (
                legacy.categories["tauri_commands"][0].__class__(
                    item_id="tauri_commands:legacy",
                    path="products/admin-desktop/tauri_commands.txt",
                    sha256="b" * 64,
                )
            )
            findings, _, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn(
                "baseline.fingerprint_drift",
                {finding.code for finding in findings},
            )
