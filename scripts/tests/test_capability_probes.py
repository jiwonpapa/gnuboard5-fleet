from __future__ import annotations

import copy
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml

SCRIPTS = Path(__file__).resolve().parents[1]
ROOT = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))

import check_frontend_api_target_edges as frontend_edges  # noqa: E402
import check_multisite_request_context as multisite  # noqa: E402
import check_openapi_request_response_schema as openapi_schema  # noqa: E402
import check_php_runtime_capabilities as php_runtime  # noqa: E402
import check_tauri_ipc_registry_ast as ipc_registry  # noqa: E402
import generate_rust_openapi_wire as wire_generator  # noqa: E402
from audit_harness import paths as provider_paths  # noqa: E402


class ProviderPathResolutionTest(unittest.TestCase):
    def test_explicit_invalid_php_root_cannot_fall_back(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing-provider"
            with mock.patch.dict(
                os.environ,
                {"G5_PHP_ROOT": str(missing)},
                clear=True,
            ):
                with self.assertRaisesRegex(
                    provider_paths.ProviderPathError,
                    "G5_PHP_ROOT does not point to a file",
                ):
                    provider_paths.resolve_php_root(ROOT)

    def test_incomplete_fleet_cannot_fall_back_to_products_php(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            fleet_root = Path(directory)
            rust_root = fleet_root / "products/admin-desktop"
            legacy_marker = fleet_root / "products/php/api/docs/openapi.yaml"
            rust_root.mkdir(parents=True)
            legacy_marker.parent.mkdir(parents=True)
            legacy_marker.write_text("openapi: 3.1.0\n", encoding="utf-8")
            (fleet_root / "PRODUCT_MANIFEST.json").write_text("{}\n", encoding="utf-8")

            with mock.patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(
                    provider_paths.ProviderPathError,
                    "fleet PHP connector does not point to a file",
                ):
                    provider_paths.resolve_php_root(rust_root)

    def test_js_explicit_directory_override_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            env = os.environ.copy()
            for name in (
                "G5_PHP_ROOT",
                "G5_OPENAPI_PATH",
                "G5_OPENAPI_MANIFEST_PATH",
            ):
                env.pop(name, None)
            env["G5_OPENAPI_PATH"] = directory
            result = subprocess.run(
                [
                    "bun",
                    "--eval",
                    'import { resolveOpenApiPath } from "./scripts/provider-paths.mjs"; resolveOpenApiPath(process.cwd());',
                ],
                cwd=ROOT,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )

        self.assertNotEqual(0, result.returncode)
        self.assertIn("does not point to a file", result.stderr)


class OpenApiRequestResponseProbeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        document = yaml.safe_load(
            openapi_schema.PHP_OPENAPI.read_text(encoding="utf-8")
        )
        cls.canonical = wire_generator.build_contract_manifest(document)
        cls.generated = openapi_schema.load_generated_manifest()

    def test_current_full_operation_fingerprint_passes(self) -> None:
        report = openapi_schema.evaluate_manifest(self.canonical, self.generated)
        self.assertEqual("pass", report["status"])
        self.assertEqual(189, report["operation_count"])
        self.assertGreater(report["error_response_count"], 900)

    def test_security_or_response_mutation_fails_closed(self) -> None:
        mutated = copy.deepcopy(self.generated)
        operation = next(
            item for item in mutated["operations"] if item["path"] == "/admin/dashboard"
        )
        operation["security"] = []
        operation["responses"]["500"]["schema"] = {
            "$ref": "#/components/schemas/HealthResponse"
        }

        report = openapi_schema.evaluate_manifest(self.canonical, mutated)

        self.assertEqual("fail", report["status"])
        self.assertTrue(
            any("fingerprint mismatch" in failure for failure in report["failures"])
        )


class TauriIpcRegistryProbeTest(unittest.TestCase):
    def test_comments_are_not_registry_evidence(self) -> None:
        source = """
        // crate::commands::fake::cmd_fake,
        tauri::generate_handler![crate::commands::real::cmd_real]
        """
        self.assertEqual(
            ["crate::commands::real::cmd_real"],
            ipc_registry.extract_generate_handler_paths(source),
        )

    def test_generic_command_requires_real_tauri_attribute(self) -> None:
        valid = "#[tauri::command]\npub async fn cmd_fast<R: Runtime>() {}"
        invalid = "pub async fn cmd_fast<R: Runtime>() {}"
        self.assertTrue(ipc_registry.command_has_tauri_attribute(valid, "cmd_fast"))
        self.assertFalse(ipc_registry.command_has_tauri_attribute(invalid, "cmd_fast"))


class FrontendApiTargetProbeTest(unittest.TestCase):
    def test_wrapper_target_path_swap_fails_closed(self) -> None:
        wrappers = [
            {"wrapper": "loadDashboard", "command": "cmd_admin_dashboard", "source": "x.ts"}
        ]
        operations = {"cmd_admin_dashboard": {("GET", "/admin/dashboard")}}
        passed = frontend_edges.evaluate_edges(
            wrappers, {"cmd_admin_dashboard": "/admin/dashboard"}, operations
        )
        failed = frontend_edges.evaluate_edges(
            wrappers, {"cmd_admin_dashboard": "/admin/members"}, operations
        )
        self.assertEqual("pass", passed["status"])
        self.assertEqual("fail", failed["status"])
        self.assertTrue(any("path mismatch" in item for item in failed["failures"]))


class MultisiteRequestContextProbeTest(unittest.TestCase):
    def test_remote_guard_deletion_fails_static_binding(self) -> None:
        sources = multisite.load_sources()
        self.assertEqual([], multisite.evaluate_sources(sources))
        mutated = dict(sources)
        mutated["commands/session.rs"] = mutated["commands/session.rs"].replace(
            ".acquire_active_request_context()", ".removed_request_context()", 1
        )
        failures = multisite.evaluate_sources(mutated)
        self.assertTrue(any("acquire_active_request_context" in item for item in failures))


class PhpRuntimeCapabilityProbeTest(unittest.TestCase):
    def runtime_report(self) -> dict[str, object]:
        stats = {
            "active_operation_count": 189,
            "protected_operation_count": 26,
            "audited_operation_count": 215,
            "admin_non_shop_operation_count": 184,
            "bootstrap_operation_count": 5,
            "active_handler_binding_count": 189,
            "protected_handler_binding_count": 26,
            "audited_handler_binding_count": 215,
            "active_missing_in_openapi_count": 0,
            "active_extra_in_openapi_count": 0,
            "protected_missing_in_openapi_count": 0,
            "protected_extra_in_openapi_count": 0,
            "active_security_mismatch_count": 0,
            "protected_security_mismatch_count": 0,
            "active_response_contract_mismatch_count": 0,
            "protected_response_contract_mismatch_count": 0,
            "active_unresolved_handler_count": 0,
            "protected_unresolved_handler_count": 0,
            "active_duplicate_operation_count": 0,
            "protected_duplicate_operation_count": 0,
            "blocking_finding_count": 0,
        }
        return {
            "schema": "gnuboard5.php.runtime-route-graph/v3",
            "status": "passed",
            "certified": True,
            "stats": stats,
            "bindings": [{} for _ in range(215)],
        }

    def handler_report(self) -> dict[str, object]:
        operation = {
            "operation": "GET /admin/demo",
            "status": "passed",
            "finding_rules": [],
            "missing_request_fields": [],
            "missing_response_fields": [],
            "undocumented_implementation_fields": [],
            "missing_required_layers": [],
            "request_semantics_unproven": [],
            "response_semantics_unproven": [],
            "dynamic_accesses": [],
        }
        return {
            "status": "passed",
            "certified": True,
            "stats": {
                "active_operation_count": 189,
                "protected_operation_count": 26,
                "audited_operation_count": 215,
                "admin_non_shop_operation_count": 184,
                "bootstrap_operation_count": 5,
                "operation_report_count": 215,
                "passed_operation_count": 215,
                "failed_operation_count": 0,
                "finding_count": 0,
                "layer_reach_operation_counts": {
                    "Controller": 214,
                    "Service": 214,
                    "Repository": 208,
                },
            },
            "operations": [copy.deepcopy(operation) for _ in range(215)],
        }

    def test_runtime_count_mutation_fails_closed(self) -> None:
        report = self.runtime_report()
        self.assertEqual([], php_runtime.evaluate_runtime_report(report))
        report["stats"]["active_operation_count"] = 188  # type: ignore[index]
        self.assertTrue(php_runtime.evaluate_runtime_report(report))

    def test_handler_field_mutation_fails_closed(self) -> None:
        report = self.handler_report()
        self.assertEqual([], php_runtime.evaluate_handler_report(report))
        report["operations"][0]["missing_response_fields"] = ["data.id"]  # type: ignore[index]
        failures = php_runtime.evaluate_handler_report(report)
        self.assertTrue(any("missing_response_fields" in item for item in failures))


if __name__ == "__main__":
    unittest.main()
