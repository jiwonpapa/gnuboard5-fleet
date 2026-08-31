from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools.certification.execution_capture import EVENT_PREFIX, ExecutionCapture, provider_command_bindings
from tools.migration_parity.runtime import validate_evidence_file


class ExecutionCaptureTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        for name, value in {
            "governance/MIGRATION_PARITY.json": {"core_operation_mappings": [], "mappings": {"tauri_commands": []}},
            "UPSTREAMS.lock.json": {"upstreams": [{"id": "gnuboard5", "commit": "b" * 40}]},
            "contracts/core-operations.json": {"operations": [
                {"operation_id": "getMember", "method": "GET", "path": "/admin/members/{id}", "risk": "read"},
                {"operation_id": "exportMembers", "method": "GET", "path": "/admin/members/export", "risk": "read"},
                {"operation_id": "sendSms", "method": "POST", "path": "/admin/sms/messages", "risk": "external_effect"},
            ]},
        }.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(value))
        contract = self.root / "connectors/gnuboard5-php/api/docs/openapi.yaml"
        contract.parent.mkdir(parents=True)
        contract.write_text("openapi: 3.0.0\n")
        self.base = "http://127.0.0.1:1234"
        self.capture = ExecutionCapture(self.root, "a" * 40, self.base)

    def observe(self, *, external=False, status=200, body=b"{}", direct=False) -> str:
        request_id = self.capture.request_id()
        self.capture.observe(
            request_id, "http://127.0.0.1:5678" if direct else self.base,
            "POST" if external else "GET",
            "/api/v1/sites/fixture/admin/sms/messages" if external else "/api/v1/sites/fixture/admin/members/alice",
            status, body, 123,
        )
        return request_id

    def event(self, request_id: str, operation_id="getMember", status=200) -> str:
        return EVENT_PREFIX + json.dumps({
            "schema": "g5-fleet.provider-response/v1", "request_id": request_id,
            "operation_id": operation_id, "upstream_status": status,
        })

    def test_actual_provider_case_matches_only_observed_operation(self) -> None:
        request_id = self.observe()
        self.capture.checkpoint("members", "member fields were read back")
        cases = self.capture.cases(self.event(request_id))
        self.assertEqual([{ "category": "core_operations", "item_id": "getMember"}], cases[0]["subjects"])
        self.assertEqual("provider_readback", cases[0]["kind"])

    def test_command_binding_requires_actual_matching_operation(self) -> None:
        self.capture.command_bindings = {"getMember": ["legacy_get_member"], "exportMembers": ["legacy_export"]}
        request_id = self.observe()
        self.capture.checkpoint("member", "member field readback")
        subjects = self.capture.cases(self.event(request_id))[0]["subjects"]
        self.assertIn({"category": "tauri_commands", "item_id": "legacy_get_member"}, subjects)
        self.assertNotIn({"category": "tauri_commands", "item_id": "legacy_export"}, subjects)

    def test_explicit_operation_binding_cannot_reuse_unrelated_method(self) -> None:
        check = {"path": "crates/fleet-connector/src/lib.rs", "contains": "async fn get_member"}
        row = {"legacy_id": "legacy_get", "provider_operation_id": "getMember", "checks": [check]}
        manifest = {"core_operation_mappings": [{"operation_id": "getMember", "checks": [dict(check)]}],
                    "mappings": {"tauri_commands": [row]}}
        self.assertEqual({"getMember": ["legacy_get"]}, provider_command_bindings(manifest))
        row["provider_operation_id"] = "unknown"
        with self.assertRaises(ValueError):
            provider_command_bindings(manifest)
        row["provider_operation_id"] = "getMember"
        check["contains"] = "async fn delete_member"
        with self.assertRaises(ValueError):
            provider_command_bindings(manifest)

    def test_exact_operation_literal_supports_shared_media_method_without_aliasing(self) -> None:
        check = {"path": "crates/fleet-connector/src/lib.rs", "contains": "uploadIcon"}
        row = {"legacy_id": "legacy_icon", "provider_operation_id": "uploadIcon", "checks": [dict(check)]}
        manifest = {"core_operation_mappings": [{"operation_id": "uploadIcon", "checks": [dict(check)]}],
                    "mappings": {"tauri_commands": [row]}}
        self.assertEqual({"uploadIcon": ["legacy_icon"]}, provider_command_bindings(manifest))
        row["checks"][0]["contains"] = "shared_non_operation_symbol"
        manifest["core_operation_mappings"][0]["checks"] = row["checks"]
        with self.assertRaises(ValueError):
            provider_command_bindings(manifest)

    def test_checked_in_provider_bindings_are_all_valid(self) -> None:
        root = Path(__file__).resolve().parents[3]
        manifest = json.loads((root / "governance/MIGRATION_PARITY.json").read_bytes())
        bindings = provider_command_bindings(manifest)
        expected = {row["legacy_id"] for row in manifest["mappings"]["tauri_commands"] if row.get("provider_operation_id")}
        self.assertTrue(expected)
        self.assertEqual(expected, {value for values in bindings.values() for value in values})

    def test_catalog_or_http_success_without_provider_event_is_not_proof(self) -> None:
        self.observe()
        self.capture.checkpoint("members", "response checked")
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases("")

    def test_direct_php_cannot_replace_fleet_consumption(self) -> None:
        request_id = self.observe(direct=True)
        self.capture.checkpoint("members", "response checked")
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases(self.event(request_id))

    def test_missing_readback_checkpoint_is_rejected(self) -> None:
        request_id = self.observe()
        with self.assertRaisesRegex(RuntimeError, "missing their final readback checkpoint"):
            self.capture.cases(self.event(request_id))

    def test_skipped_or_failed_provider_results_are_not_promoted(self) -> None:
        request_id = self.observe(body=b'{"status":"skipped"}')
        self.capture.checkpoint("members", "skip is reported")
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases(self.event(request_id))
        self.capture.observations[0]["semantic_status"] = None
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases(self.event(request_id, status=500))

    def test_external_confirmation_is_only_safe_boundary_proof(self) -> None:
        request_id = self.observe(external=True, status=400, body=b'{"error":{"code":"external_effect_confirmation_required"}}')
        self.capture.checkpoint("blocked-send", "explicit confirmation was rejected")
        cases = self.capture.cases("")
        self.assertEqual("safe_external_boundary", cases[0]["kind"])
        self.assertEqual("sendSms", cases[0]["subjects"][0]["item_id"])
        with self.assertRaisesRegex(RuntimeError, "unexpectedly reached PHP"):
            self.capture.cases(self.event(request_id, "sendSms"))

    def test_external_success_requires_verified_disabled_delivery_checkpoint(self) -> None:
        request_id = self.observe(external=True)
        self.capture.checkpoint("send", "response checked")
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases(self.event(request_id, "sendSms"))

    def test_route_matching_is_method_scoped_and_prefers_static_route(self) -> None:
        prefix = "/api/v1/sites/fixture"
        self.assertEqual("getMember", self.capture.candidate_operation("GET", f"{prefix}/admin/members/alice"))
        self.assertEqual("exportMembers", self.capture.candidate_operation("GET", f"{prefix}/admin/members/export?search=private"))
        self.assertIsNone(self.capture.candidate_operation("POST", f"{prefix}/admin/members/alice"))

    def test_events_cannot_be_replayed_or_attached_to_unobserved_requests(self) -> None:
        request_id = self.observe()
        self.capture.checkpoint("members", "fields checked")
        event = self.event(request_id)
        with self.assertRaisesRegex(RuntimeError, "duplicated"):
            self.capture.cases(f"{event}\n{event}")
        with self.assertRaisesRegex(RuntimeError, "no matching HTTP request"):
            self.capture.cases(self.event(f"{self.capture.run_id}-100"))
        with self.assertRaisesRegex(RuntimeError, "no checkpoint-bound"):
            self.capture.cases(self.event("old-run-1"))

    def test_receipt_is_hash_bound_reports_missing_and_never_contains_response_secrets(self) -> None:
        request_id = self.observe(body=b'{"password":"NEVER_PUBLISH","jwt":"SECRET_TOKEN"}')
        self.capture.checkpoint("members", "fields checked")
        log = self.root / "fleet.log"
        log.write_text(self.event(request_id))
        output = self.root / "receipt.json"
        with mock.patch("tools.certification.execution_capture.clean_revision", return_value="a" * 40):
            receipt = self.capture.finish(log, output)
        self.assertEqual(["getMember"], receipt["coverage"]["observed_core_operations"])
        self.assertEqual(["exportMembers", "sendSms"], receipt["coverage"]["unobserved_core_operations"])
        findings = validate_evidence_file(
            self.root, {"path": "receipt.json"}, git_revision="a" * 40, max_age_hours=24,
            owner_id="provider", required_items={("core_operations", "getMember")},
        )
        self.assertEqual([], findings)
        artifact = self.root / receipt["artifacts"][0]["path"]
        self.assertNotIn("NEVER_PUBLISH", artifact.read_text())
        self.assertNotIn("SECRET_TOKEN", artifact.read_text())
        with mock.patch("tools.certification.execution_capture.clean_revision", return_value="b" * 40):
            with self.assertRaisesRegex(RuntimeError, "changed during execution"):
                self.capture.finish(log, output)

    def test_complete_certification_refuses_partial_coverage(self) -> None:
        request_id = self.observe()
        self.capture.checkpoint("members", "fields checked")
        log = self.root / "fleet.log"
        log.write_text(self.event(request_id))
        output = self.root / "receipt.json"
        with mock.patch("tools.certification.execution_capture.clean_revision", return_value="a" * 40):
            with self.assertRaisesRegex(RuntimeError, "required Core execution cases missing: exportMembers, sendSms"):
                self.capture.finish(log, output, require_complete=True)
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
