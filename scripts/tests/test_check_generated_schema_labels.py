from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

from check_generated_schema_labels import audit_generated_schemas  # noqa: E402


class GeneratedSchemaLabelAuditTest(unittest.TestCase):
    def write_schema(self, root: Path, fields: list[dict[str, object]]) -> None:
        (root / "sample.json").write_text(
            json.dumps({"sections": [{"fields": fields}]}),
            encoding="utf-8",
        )

    def test_valid_schema_passes_and_preserves_default_sample(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_schema(
                root,
                [{"name": "enabled", "label": "사용 여부", "default_value": True}],
            )
            audit = audit_generated_schemas(root)

        self.assertTrue(audit.passed)
        self.assertEqual((("sample.json", "enabled", True),), audit.default_values)

    def test_raw_and_fixme_labels_fail(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_schema(
                root,
                [
                    {"name": "raw_name", "label": "raw_name"},
                    {"name": "pending", "label": "FIXME_pending"},
                ],
            )
            audit = audit_generated_schemas(root)

        self.assertFalse(audit.passed)
        self.assertEqual(1, len(audit.raw_labels))
        self.assertEqual(1, len(audit.fixme_labels))

    def test_empty_inventory_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "inventory is empty"):
                audit_generated_schemas(Path(directory))

    def test_malformed_fields_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "sample.json").write_text(
                json.dumps({"sections": [{"fields": "invalid"}]}),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "fields must be a list"):
                audit_generated_schemas(root)


if __name__ == "__main__":
    unittest.main()
