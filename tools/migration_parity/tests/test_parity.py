from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.migration_parity.parity import audit_parity
from tools.migration_parity.tests.helpers import make_fixture


class ParityTest(unittest.TestCase):
    def test_complete_static_fixture_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            findings, coverage, capabilities, evidence = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertEqual([], findings)
            self.assertTrue(all(item["valid"] == 1 for item in coverage.values()))
            self.assertEqual(1, capabilities["valid"])
            self.assertEqual(set(), evidence)

    def test_unmapped_item_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            manifest["mappings"]["react_pages"] = []
            findings, coverage, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn("mapping.unmapped", {finding.code for finding in findings})
            self.assertEqual(1, coverage["react_pages"]["unmapped"])

    def test_unmapped_core_operation_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            manifest["core_operation_mappings"] = []
            findings, coverage, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn("operation.unmapped", {finding.code for finding in findings})
            self.assertEqual(1, coverage["core_operations"]["unmapped"])

    def test_deferred_is_tracked_but_not_pass(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            manifest["mappings"]["react_pages"] = [
                {
                    "legacy_id": "react_pages:legacy",
                    "disposition": "deferred",
                    "tracking": {
                        "owner": "fleet-core",
                        "issue": "GH-1",
                        "review_after": "2026-08-01",
                    },
                }
            ]
            findings, coverage, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="static",
                git_revision="a" * 40,
            )
            self.assertIn("mapping.deferred", {finding.code for finding in findings})
            self.assertEqual(1, coverage["react_pages"]["deferred"])

    def test_runtime_requires_revision_bound_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest, legacy, active = make_fixture(root)
            findings, _, _, _ = audit_parity(
                root,
                manifest,
                legacy,
                active,
                profile="runtime",
                git_revision="a" * 40,
            )
            self.assertIn("evidence.ids_missing", {finding.code for finding in findings})
