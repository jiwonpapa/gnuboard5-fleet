from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "check_admin_schema_contract.py"
SPEC = importlib.util.spec_from_file_location("check_admin_schema_contract", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class AdminSchemaContractCheckTest(unittest.TestCase):
    def test_detects_nested_php_placeholder(self) -> None:
        self.assertTrue(
            MODULE.has_placeholder(
                {
                    "options": [
                        {"value": "1", "label": "__PHP_BLOCK_0__"},
                    ]
                }
            )
        )
        self.assertFalse(MODULE.has_placeholder({"options": [{"value": "1", "label": "1"}]}))

    def test_iter_fields_reports_domain_and_section(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            generated_dir = Path(directory)
            (generated_dir / "config.json").write_text(
                json.dumps(
                    {
                        "domain": "config",
                        "sections": [
                            {
                                "key": "basic",
                                "fields": [
                                    {
                                        "name": "cf_title",
                                        "label": "홈페이지 제목",
                                        "input_type": "text",
                                        "data_type": "string",
                                        "options": [],
                                    }
                                ],
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            fields = MODULE.iter_fields(generated_dir)

        self.assertEqual(1, len(fields))
        self.assertEqual("config:basic:cf_title", MODULE.field_ref(fields[0]))


if __name__ == "__main__":
    unittest.main()
