from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "check_build_radius_budgets.py"
SPEC = importlib.util.spec_from_file_location("check_build_radius_budgets", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class BuildRadiusPolicyTest(unittest.TestCase):
    def test_workspace_topology_is_measured_not_hardcoded(self) -> None:
        source = SCRIPT_PATH.read_text(encoding="utf-8")

        self.assertNotIn("workspace must keep", source)
        self.assertIn("workspace_member_count", MODULE.BUDGETS)
        self.assertIn("workspace_internal_path_edges", MODULE.BUDGETS)

    def test_active_workspace_contains_no_placeholder_member(self) -> None:
        self.assertNotIn("g5-api", MODULE.list_workspace_members())
        self.assertEqual(0, MODULE.count_placeholder_workspace_members())


if __name__ == "__main__":
    unittest.main()
