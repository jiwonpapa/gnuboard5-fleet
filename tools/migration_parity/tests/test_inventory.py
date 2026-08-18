from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools.migration_parity.inventory import (
    build_active_inventory,
    build_legacy_inventory,
    category_fingerprint,
)


ROOT = Path(__file__).resolve().parents[3]


class InventoryTest(unittest.TestCase):
    def test_sealed_legacy_inventory_matches_governance_baseline(self) -> None:
        manifest = json.loads(
            (ROOT / "governance/MIGRATION_PARITY.json").read_text(encoding="utf-8")
        )
        inventory = build_legacy_inventory(ROOT)
        self.assertEqual([], inventory.anomalies)
        for category, baseline in manifest["legacy_baseline"].items():
            items = inventory.categories[category]
            self.assertEqual(baseline["count"], len(items), category)
            self.assertEqual(
                baseline["fingerprint"],
                category_fingerprint(items),
                category,
            )

    def test_active_inventory_is_observation_not_conversion_proof(self) -> None:
        inventory = build_active_inventory(ROOT)
        self.assertEqual([], inventory.anomalies)
        self.assertEqual(142, len(inventory.categories["server_routes"]))
        self.assertEqual(189, len(inventory.categories["core_operations"]))
        self.assertEqual(7, len(inventory.categories["active_workspace_members"]))
        self.assertEqual(52, len(inventory.categories["web_tests"]))
        self.assertGreaterEqual(len(inventory.categories["rust_tests"]), 52)
