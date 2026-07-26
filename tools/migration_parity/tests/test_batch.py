from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path

from tools.migration_parity.batch import (
    audit_batch_ownership,
    batch_scope,
    load_batch_manifest,
    scoped_findings,
    validate_batch_manifest_shape,
)
from tools.migration_parity.inventory import (
    build_active_inventory,
    build_legacy_inventory,
)
from tools.migration_parity.manifest import ManifestError, load_manifest
from tools.migration_parity.model import Finding
from tools.migration_parity.tests.helpers import CATEGORIES, make_fixture


ROOT = Path(__file__).resolve().parents[3]


def make_batch_manifest() -> dict:
    empty_legacy = {category: [] for category in CATEGORIES}
    implementation_legacy = {
        category: [
            {
                "pattern": f"{category}:legacy",
                "expected_count": 1,
            }
        ]
        for category in CATEGORIES
    }
    return {
        "schema": "g5-fleet.migration-batches/v1",
        "policy": {"final_batch": "R01"},
        "batches": [
            {
                "id": "R00",
                "sequence": 0,
                "title": "control",
                "state": "active",
                "depends_on": [],
                "control_only": True,
                "core": {
                    "domains": [],
                    "operation_ids": [],
                    "expected_count": 0,
                },
                "legacy": empty_legacy,
                "capability_ids": [],
            },
            {
                "id": "R01",
                "sequence": 1,
                "title": "implementation",
                "state": "planned",
                "depends_on": ["R00"],
                "control_only": False,
                "core": {
                    "domains": ["fixture"],
                    "operation_ids": [],
                    "expected_count": 1,
                },
                "legacy": implementation_legacy,
                "capability_ids": ["fixture_capability"],
            },
        ],
    }


class BatchManifestTest(unittest.TestCase):
    def test_repository_manifest_owns_every_item_once(self) -> None:
        parity_manifest = load_manifest(ROOT / "governance/MIGRATION_PARITY.json")
        legacy = build_legacy_inventory(ROOT)
        active = build_active_inventory(ROOT)
        batches = load_batch_manifest(ROOT / "governance/MIGRATION_BATCHES.json")
        audit = audit_batch_ownership(
            batches,
            parity_manifest,
            legacy,
            active,
            root=ROOT,
        )
        self.assertEqual([], audit.findings)
        self.assertEqual(510, sum(audit.summary()["legacy"].values()))
        self.assertEqual(189, audit.summary()["core_operations"])
        self.assertEqual(13, audit.summary()["required_capabilities"])

    def test_complete_fixture_has_exactly_one_owner(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            parity_manifest, legacy, active = make_fixture(root)
            batches = make_batch_manifest()
            validate_batch_manifest_shape(batches)
            audit = audit_batch_ownership(
                batches,
                parity_manifest,
                legacy,
                active,
            )
            self.assertEqual([], audit.findings)
            self.assertEqual(5, sum(audit.summary()["legacy"].values()))
            self.assertEqual(1, audit.summary()["core_operations"])
            self.assertEqual(1, audit.summary()["required_capabilities"])
            self.assertEqual([], batch_scope("R00", audit)["core_operations"])
            self.assertEqual(
                ["fixtureOperation"],
                batch_scope("R01", audit)["core_operations"],
            )

    def test_unassigned_legacy_item_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            parity_manifest, legacy, active = make_fixture(root)
            batches = make_batch_manifest()
            batches["batches"][1]["legacy"]["react_pages"] = []
            audit = audit_batch_ownership(
                batches,
                parity_manifest,
                legacy,
                active,
            )
            codes = {finding.code for finding in audit.findings}
            self.assertIn("batch.ownership_unassigned", codes)

    def test_ambiguous_rule_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            parity_manifest, legacy, active = make_fixture(root)
            batches = make_batch_manifest()
            duplicate = copy.deepcopy(
                batches["batches"][1]["legacy"]["react_pages"][0]
            )
            batches["batches"][1]["legacy"]["react_pages"].append(duplicate)
            audit = audit_batch_ownership(
                batches,
                parity_manifest,
                legacy,
                active,
            )
            codes = {finding.code for finding in audit.findings}
            self.assertIn("batch.ownership_ambiguous", codes)

    def test_control_batch_reports_global_debt_without_failing_on_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            parity_manifest, legacy, active = make_fixture(root)
            batches = make_batch_manifest()
            audit = audit_batch_ownership(
                batches,
                parity_manifest,
                legacy,
                active,
            )
            global_findings = [
                Finding(
                    "mapping.unmapped",
                    "not migrated",
                    "react_pages",
                    "react_pages:legacy",
                )
            ]
            findings = scoped_findings(
                batches["batches"][0],
                audit,
                global_findings,
            )
            self.assertEqual([], findings)

    def test_control_batch_still_fails_on_global_baseline_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            parity_manifest, legacy, active = make_fixture(root)
            batches = make_batch_manifest()
            audit = audit_batch_ownership(
                batches,
                parity_manifest,
                legacy,
                active,
            )
            global_findings = [
                Finding(
                    "baseline.count_drift",
                    "drift",
                    "react_pages",
                )
            ]
            findings = scoped_findings(
                batches["batches"][0],
                audit,
                global_findings,
            )
            self.assertEqual("baseline.count_drift", findings[0].code)

    def test_catch_all_rule_is_rejected(self) -> None:
        batches = make_batch_manifest()
        batches["batches"][1]["legacy"]["react_pages"][0]["pattern"] = ".*"
        with self.assertRaises(ManifestError):
            validate_batch_manifest_shape(batches)

    def test_batch_pass_requires_completion_evidence(self) -> None:
        batches = make_batch_manifest()
        batches["batches"][0]["state"] = "batch_pass"
        batches["batches"][1]["state"] = "active"
        with self.assertRaisesRegex(ManifestError, "completion"):
            validate_batch_manifest_shape(batches)
