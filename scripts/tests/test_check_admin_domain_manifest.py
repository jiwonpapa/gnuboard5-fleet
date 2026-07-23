from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "check_admin_domain_manifest.py"
SPEC = importlib.util.spec_from_file_location("check_admin_domain_manifest", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class NormalizeDbObservationTest(unittest.TestCase):
    def test_falls_back_to_legacy_table_field(self) -> None:
        result = MODULE.normalize_db_observation({"table": "g5_config"})
        self.assertEqual({"mode": "table", "tables": ["g5_config"]}, result)

    def test_supports_explicit_multi_table_observation(self) -> None:
        result = MODULE.normalize_db_observation(
            {
                "db_observation": {
                    "mode": "multi",
                    "tables": ["g5_mail", "g5_member"],
                }
            }
        )
        self.assertEqual(
            {"mode": "multi", "tables": ["g5_mail", "g5_member"]},
            result,
        )


class ProviderAnchorTest(unittest.TestCase):
    def test_metadata_backing_counts_as_provider_anchor(self) -> None:
        result = MODULE.classify_provider_anchor(
            {
                "supported_fields": ["mb_id"],
                "field_overrides": {"mb_id": {"required": True}},
            }
        )
        self.assertEqual("pass", result["status"])
        self.assertTrue(result["metadata_backing"])


if __name__ == "__main__":
    unittest.main()
