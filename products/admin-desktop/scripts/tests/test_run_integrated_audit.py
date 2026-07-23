from __future__ import annotations

import copy
import importlib.util
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

RUST_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = RUST_ROOT / "scripts/run_integrated_audit.py"
SPEC = importlib.util.spec_from_file_location("run_integrated_audit", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
AUDIT = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = AUDIT
SPEC.loader.exec_module(AUDIT)
PHP_ROOT = AUDIT.resolve_php_root(RUST_ROOT)


class IntegratedOperationGraphTest(unittest.TestCase):
    def test_openapi_scanner_includes_head_options_and_trace_operations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            php_root = Path(directory)
            docs = php_root / "api/docs"
            docs.mkdir(parents=True)
            (docs / "openapi.yaml").write_text(
                """openapi: 3.1.0
paths:
  /admin/probe:
    get: {}
    head: {}
    options: {}
    trace: {}
""",
                encoding="utf-8",
            )

            operations = AUDIT.extract_php_openapi_operations(php_root)

        self.assertEqual(
            {
                ("GET", "/admin/probe"),
                ("HEAD", "/admin/probe"),
                ("OPTIONS", "/admin/probe"),
                ("TRACE", "/admin/probe"),
            },
            {(item["method"], item["path"]) for item in operations},
        )

    @classmethod
    def setUpClass(cls) -> None:
        cls.scope = AUDIT.load_active_consumer_scope_metrics(RUST_ROOT)
        aliases = cls.scope["path_aliases"]
        cls.php_admin_operations = AUDIT.extract_php_openapi_metrics(
            PHP_ROOT, aliases
        )["admin_operations"]

    def test_current_admin_scope_consumes_all_distinct_mail_paths(self) -> None:
        scan = AUDIT.extract_rust_admin_operation_metrics(
            RUST_ROOT, self.scope["path_aliases"]
        )
        comparison = AUDIT.compare_admin_operations(
            self.php_admin_operations, scan["operations"], self.scope
        )

        self.assertEqual(184, scan["operation_count"])
        self.assertEqual(184, comparison["active_php_operation_count"])
        self.assertEqual(184, comparison["rust_active_operation_count"])
        self.assertEqual([], comparison["missing_in_rust"])
        self.assertEqual([], comparison["extra_in_rust"])
        self.assertEqual(26, comparison["provider_only_php_operation_count"])
        self.assertEqual(186, scan["admin_public_function_count"])
        self.assertEqual(186, scan["command_link_count"])
        self.assertEqual([], scan["unreferenced_client_functions"])
        self.assertEqual(0, scan["command_operation_edge_unresolved_count"])
        self.assertEqual(0, scan["command_operation_edge_mismatch_count"])

    def test_deleting_one_client_method_is_a_hard_operation_gap(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            mutated_root = Path(directory)
            shutil.copytree(
                RUST_ROOT / "g5-admin-api-client",
                mutated_root / "g5-admin-api-client",
            )
            shutil.copytree(
                RUST_ROOT / "g5-admin/src-tauri/src/commands",
                mutated_root / "g5-admin/src-tauri/src/commands",
            )
            dashboard = mutated_root / "g5-admin-api-client/src/dashboard.rs"
            source = dashboard.read_text(encoding="utf-8")
            start = source.index("    pub async fn get_admin_dashboard")
            impl_end = source.rindex("\n}")
            dashboard.write_text(
                source[:start] + source[impl_end:], encoding="utf-8"
            )

            scan = AUDIT.extract_rust_admin_operation_metrics(
                mutated_root, self.scope["path_aliases"]
            )
            comparison = AUDIT.compare_admin_operations(
                self.php_admin_operations, scan["operations"], self.scope
            )
            operation_scan = {
                "admin": scan,
                "bootstrap": {"operation_count": 5},
            }
            failures = AUDIT.build_operation_graph_failures(
                comparison, operation_scan, self.scope
            )

        self.assertEqual(183, scan["operation_count"])
        self.assertEqual(1, len(comparison["missing_in_rust"]))
        self.assertIn(
            {"method": "GET", "path": "/admin/dashboard"},
            comparison["missing_in_rust"],
        )
        self.assertTrue(
            any(
                failure.startswith("php_operations_missing_in_rust=")
                and "GET /admin/dashboard" in failure
                for failure in failures
            )
        )

    def test_zero_operation_scanner_result_is_a_hard_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            empty_root = Path(directory)
            (empty_root / "g5-admin-api-client/src").mkdir(parents=True)
            scan = AUDIT.extract_rust_admin_operation_metrics(empty_root)
            comparison = AUDIT.compare_admin_operations(
                self.php_admin_operations, scan["operations"], self.scope
            )
            failures = AUDIT.build_operation_graph_failures(
                comparison,
                {"admin": scan, "bootstrap": {"operation_count": 5}},
                self.scope,
            )

        self.assertEqual(0, scan["operation_count"])
        self.assertIn("rust_api_client_source_scanner_count=0", failures)
        self.assertIn("rust_admin_operation_scanner_count=0", failures)

    def test_bootstrap_method_and_path_must_be_paired_in_same_wire_call(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            mutated_root = Path(directory)
            transport = mutated_root / "g5-admin-transport/src"
            transport.mkdir(parents=True)
            for name in ("auth.rs", "member_profile.rs"):
                shutil.copyfile(
                    RUST_ROOT / "g5-admin-transport/src" / name,
                    transport / name,
                )
            shutil.copytree(
                RUST_ROOT / "g5-admin-health-check/src",
                mutated_root / "g5-admin-health-check/src",
            )
            auth = transport / "auth.rs"
            auth.write_text(
                auth.read_text(encoding="utf-8").replace(
                    'Method::POST,\n                "/auth/login"',
                    'Method::GET,\n                "/auth/login"',
                    1,
                ),
                encoding="utf-8",
            )

            scan = AUDIT.extract_rust_bootstrap_operation_metrics(
                mutated_root, self.scope
            )

        self.assertEqual(3, scan["operation_count"])
        self.assertIn(
            {"method": "POST", "path": "/auth/login"},
            scan["missing_operations"],
        )
        self.assertIn(
            {"method": "GET", "path": "/health"},
            scan["missing_operations"],
        )

    def test_method_name_inference_is_evidence_only_and_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            mutated_root = Path(directory)
            shutil.copytree(
                RUST_ROOT / "g5-admin-api-client",
                mutated_root / "g5-admin-api-client",
            )
            shutil.copytree(
                RUST_ROOT / "g5-admin/src-tauri/src/commands",
                mutated_root / "g5-admin/src-tauri/src/commands",
            )
            dashboard = mutated_root / "g5-admin-api-client/src/dashboard.rs"
            dashboard.write_text(
                dashboard.read_text(encoding="utf-8").replace(
                    "Method::GET,", "", 1
                ),
                encoding="utf-8",
            )

            scan = AUDIT.extract_rust_admin_operation_metrics(
                mutated_root, self.scope["path_aliases"]
            )
            comparison = AUDIT.compare_admin_operations(
                self.php_admin_operations, scan["operations"], self.scope
            )
            failures = AUDIT.build_operation_graph_failures(
                comparison,
                {"admin": scan, "bootstrap": {"operation_count": 5}},
                self.scope,
            )

        self.assertEqual(1, scan["inferred_method_count"])
        self.assertTrue(
            any(
                failure.startswith(
                    "rust_admin_operation_method_inferred_without_wire_evidence="
                )
                for failure in failures
            )
        )

    def test_swapping_two_command_client_calls_is_a_hard_edge_failure(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            mutated_root = Path(directory)
            shutil.copytree(
                RUST_ROOT / "g5-admin-api-client",
                mutated_root / "g5-admin-api-client",
            )
            shutil.copytree(
                RUST_ROOT / "g5-admin/src-tauri/src/commands",
                mutated_root / "g5-admin/src-tauri/src/commands",
            )
            dashboard = mutated_root / "g5-admin/src-tauri/src/commands/dashboard.rs"
            config = mutated_root / "g5-admin/src-tauri/src/commands/config.rs"
            dashboard.write_text(
                dashboard.read_text(encoding="utf-8").replace(
                    ".get_admin_dashboard(", ".get_admin_config(", 1
                ),
                encoding="utf-8",
            )
            config.write_text(
                config.read_text(encoding="utf-8").replace(
                    ".get_admin_config(", ".get_admin_dashboard(", 1
                ),
                encoding="utf-8",
            )

            scan = AUDIT.extract_rust_admin_operation_metrics(
                mutated_root, self.scope["path_aliases"]
            )
            comparison = AUDIT.compare_admin_operations(
                self.php_admin_operations, scan["operations"], self.scope
            )
            failures = AUDIT.build_operation_graph_failures(
                comparison,
                {"admin": scan, "bootstrap": {"operation_count": 5}},
                self.scope,
            )

        self.assertEqual(0, scan["unreferenced_client_function_count"])
        self.assertEqual(2, scan["command_operation_edge_mismatch_count"])
        self.assertTrue(
            any(
                failure == "rust_tauri_command_operation_edge_mismatches=2"
                for failure in failures
            )
        )

    def test_field_mismatch_is_a_failure_not_a_warning(self) -> None:
        metrics = {
            "rust": {
                "consumer_scope": {"available": True},
                "operation_scan": {
                    "admin": {
                        "source_file_count": 1,
                        "operation_count": 1,
                        "ambiguous_method_count": 0,
                        "admin_public_function_count": 1,
                        "command_source_file_count": 1,
                        "command_link_count": 1,
                        "unreferenced_client_function_count": 0,
                    },
                    "bootstrap": {"operation_count": 0},
                },
            },
            "php": {
                "schema": {
                    "raw_label_count": 0,
                    "domain_parity": [],
                }
            },
            "cross": {
                "missing_admin_paths": [],
                "extra_admin_paths": [],
                "missing_schema_domains_in_rust": [],
                "extra_schema_domains_in_rust": [],
                "operation_comparison": {
                    "php_operation_count": 1,
                    "active_php_operation_count": 1,
                    "rust_operation_count": 1,
                    "missing_in_rust": [],
                    "extra_in_rust": [],
                },
                "field_parity": {
                    "typed_mode": True,
                    "compared_count": 1,
                    "compared_field_count": 1,
                    "mismatch_count": 1,
                    "signature_mismatch_count": 0,
                    "unverified_count": 0,
                },
            },
        }

        failures = AUDIT.build_failures(metrics, [])
        warnings = AUDIT.build_warnings(metrics)

        self.assertIn("field_parity_mismatches=1", failures)
        self.assertNotIn("field_parity_mismatches=1", warnings)

    def test_property_type_mutation_is_detected(self) -> None:
        openapi = AUDIT.extract_openapi_schema_signatures(PHP_ROOT)
        rust = AUDIT.extract_rust_ts_schema_signatures(RUST_ROOT)
        mutated = copy.deepcopy(rust)
        mutated["AdminFieldOption"]["fields"]["value"] = {
            "kind": "boolean",
            "nullable": False,
            "required": True,
            "ts_property_required": True,
        }

        report = AUDIT.compare_field_parity(openapi, mutated)
        field_option = next(
            comparison
            for comparison in report["mismatches"]
            if comparison["openapi_schema"] == "AdminFieldOption"
        )

        self.assertTrue(
            any(
                mismatch["openapi_field"] == "value"
                and mismatch["openapi_signature"]["kind"] == "string"
                and mismatch["rust_signature"]["kind"] == "boolean"
                for mismatch in field_option["signature_mismatches"]
            )
        )

    def test_canonical_wire_field_parity_is_complete(self) -> None:
        report = AUDIT.compare_field_parity(
            AUDIT.extract_openapi_schema_signatures(PHP_ROOT),
            AUDIT.extract_rust_ts_schema_signatures(RUST_ROOT),
        )

        self.assertEqual(210, report["compared_count"])
        self.assertGreaterEqual(report["compared_field_count"], 1_680)
        self.assertEqual(0, report["mismatch_count"])
        self.assertEqual(0, report["signature_mismatch_count"])
        self.assertEqual(0, report["unverified_count"])
        self.assertEqual(0, report["missing_rust_schema_count"])

    def test_deleting_generated_wire_schema_is_a_hard_gap(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            mutated_root = Path(directory)
            shutil.copytree(
                RUST_ROOT / "g5-admin/src/openapi-wire-types",
                mutated_root / "g5-admin/src/openapi-wire-types",
            )
            (mutated_root / "g5-admin/src/openapi-wire-types/AdminBoard.ts").unlink()
            report = AUDIT.compare_field_parity(
                AUDIT.extract_openapi_schema_signatures(PHP_ROOT),
                AUDIT.extract_rust_ts_schema_signatures(mutated_root),
            )

        self.assertEqual(1, report["missing_rust_schema_count"])
        self.assertIn(
            {"openapi_schema": "AdminBoard", "rust_type": "AdminBoard"},
            report["missing_rust_schemas"],
        )

    def test_zero_or_unverified_typed_field_scan_is_a_hard_failure(self) -> None:
        field_parity = {
            "typed_mode": True,
            "compared_count": 0,
            "compared_field_count": 0,
            "mismatch_count": 0,
            "signature_mismatch_count": 0,
            "unverified_count": 1,
        }
        metrics = {
            "rust": {
                "consumer_scope": {"available": True},
                "operation_scan": {
                    "admin": {
                        "source_file_count": 1,
                        "operation_count": 1,
                        "ambiguous_method_count": 0,
                        "admin_public_function_count": 1,
                        "command_source_file_count": 1,
                        "command_link_count": 1,
                        "unreferenced_client_function_count": 0,
                    },
                    "bootstrap": {"operation_count": 0},
                },
            },
            "php": {"schema": {"raw_label_count": 0, "domain_parity": []}},
            "cross": {
                "missing_admin_paths": [],
                "extra_admin_paths": [],
                "missing_schema_domains_in_rust": [],
                "extra_schema_domains_in_rust": [],
                "operation_comparison": {
                    "php_operation_count": 1,
                    "active_php_operation_count": 1,
                    "rust_operation_count": 1,
                    "missing_in_rust": [],
                    "extra_in_rust": [],
                },
                "field_parity": field_parity,
            },
        }

        failures = AUDIT.build_failures(metrics, [])

        self.assertIn("field_parity_compared_schema_count=0", failures)
        self.assertIn("field_parity_compared_field_count=0", failures)
        self.assertIn("field_signature_unverified=1", failures)


if __name__ == "__main__":
    unittest.main()
