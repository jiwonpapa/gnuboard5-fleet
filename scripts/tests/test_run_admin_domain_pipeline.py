from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "run_admin_domain_pipeline.py"
SPEC = importlib.util.spec_from_file_location("run_admin_domain_pipeline", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CompareSchemaContractTest(unittest.TestCase):
    def test_runtime_option_fields_ignore_option_count_diff(self) -> None:
        local_schema = {
            "sections": [
                {
                    "key": "anc_cf_basic",
                    "fields": [
                        {
                            "name": "cf_admin",
                            "label": "최고관리자",
                            "input_type": "select",
                            "data_type": "string",
                            "required": True,
                            "readonly_on_update": False,
                            "options": [],
                        }
                    ],
                }
            ]
        }
        live_schema = {
            "sections": [
                {
                    "key": "anc_cf_basic",
                    "fields": [
                        {
                            "name": "cf_admin",
                            "label": "최고관리자",
                            "input_type": "select",
                            "data_type": "string",
                            "required": True,
                            "readonly_on_update": False,
                            "options": [
                                {"value": "", "label": "선택안함"},
                                {"value": "neojins", "label": "neojins"},
                            ],
                        }
                    ],
                }
            ]
        }

        report = MODULE.compare_schema_contract(
            local_schema,
            live_schema,
            runtime_option_fields={"cf_admin"},
        )

        self.assertEqual("pass", report["status"])
        self.assertEqual([], report["field_mismatches"])
        self.assertEqual(
            [
                {
                    "field": "cf_admin",
                    "reason": "runtime_option_field",
                    "local_option_count": 0,
                    "live_option_count": 2,
                }
            ],
            report["ignored_runtime_option_mismatches"],
        )

    def test_non_runtime_fields_still_fail_on_option_count_diff(self) -> None:
        local_schema = {
            "sections": [
                {
                    "key": "anc_cf_join",
                    "fields": [
                        {
                            "name": "cf_register_level",
                            "label": "회원가입시 권한",
                            "input_type": "select",
                            "data_type": "integer",
                            "required": False,
                            "readonly_on_update": False,
                            "options": [{"value": "1", "label": "1"}],
                        }
                    ],
                }
            ]
        }
        live_schema = {
            "sections": [
                {
                    "key": "anc_cf_join",
                    "fields": [
                        {
                            "name": "cf_register_level",
                            "label": "회원가입시 권한",
                            "input_type": "select",
                            "data_type": "integer",
                            "required": False,
                            "readonly_on_update": False,
                            "options": [
                                {"value": "1", "label": "1"},
                                {"value": "2", "label": "2"},
                            ],
                        }
                    ],
                }
            ]
        }

        report = MODULE.compare_schema_contract(local_schema, live_schema)

        self.assertEqual("fail", report["status"])
        self.assertEqual([], report["ignored_runtime_option_mismatches"])
        self.assertEqual("cf_register_level", report["field_mismatches"][0]["field"])


class NormalizeLegacyFormsTest(unittest.TestCase):
    def test_normalize_legacy_forms_prefers_target_and_resolves_placeholder(self) -> None:
        original = os.environ.get("ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID")
        os.environ["ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID"] = "stageadmin"
        try:
            result = MODULE.normalize_legacy_forms(
                {
                    "legacy_forms": [
                        {
                            "path": "adm/member_form.php",
                            "target": "adm/member_form.php?w=u&mb_id={bootstrap_admin_id}",
                        }
                    ]
                }
            )
        finally:
            if original is None:
                os.environ.pop("ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID", None)
            else:
                os.environ["ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID"] = original

        self.assertEqual(["adm/member_form.php?w=u&mb_id=stageadmin"], result)


class PipelineExitCodeTest(unittest.TestCase):
    def test_blocked_or_failed_stage_never_exits_zero(self) -> None:
        passing = {
            stage: {"status": "pass"}
            for stage in (
                "playwright_smoke",
                "schema_check",
                "source_observation",
                "legacy_vs_contract",
                "contract_vs_live",
            )
        }
        passing["blocked_items"] = []
        self.assertEqual(0, MODULE.summary_exit_code(passing))

        blocked = dict(passing)
        blocked["blocked_items"] = [{"area": "live"}]
        self.assertEqual(1, MODULE.summary_exit_code(blocked))

        failed = dict(passing)
        failed["schema_check"] = {"status": "fail"}
        self.assertEqual(1, MODULE.summary_exit_code(failed))

    def test_playwright_manifest_without_real_artifacts_cannot_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "audit_run_id": "run-1",
                        "domain": "config",
                        "status": "pass",
                        "page_count": 1,
                        "pages": [
                            {
                                "target": "/adm/config_form.php",
                                "status": "pass",
                                "final_url": "https://example.test/adm/config_form.php",
                                "evidence_failures": [],
                                "artifacts": {
                                    "snapshot": None,
                                    "console": None,
                                    "network": None,
                                },
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            failures = MODULE.validate_playwright_manifest(
                manifest,
                domain="config",
                audit_run_id="run-1",
                expected_targets=["/adm/config_form.php"],
            )

        self.assertTrue(any("artifact missing/empty" in item for item in failures))


if __name__ == "__main__":
    unittest.main()
