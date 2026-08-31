from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

from tools.migration_parity.execution import execution_inputs, validate_execution_claims
from tools.migration_parity.parity import audit_parity
from tools.migration_parity.runtime import validate_evidence_file
from tools.migration_parity.tests.helpers import make_fixture


class ExecutionEvidenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        contract = self.root / "connectors/gnuboard5-php/api/docs/openapi.yaml"
        contract.parent.mkdir(parents=True)
        contract.write_text("openapi: 3.0.0\n")
        (self.root / "UPSTREAMS.lock.json").write_text(json.dumps({
            "upstreams": [{"id": "gnuboard5", "commit": "b" * 40}],
        }))
        inputs = execution_inputs(self.root)
        timestamp = datetime.now(UTC).isoformat()
        self.subject = {"category": "core_operations", "item_id": "createBoard"}
        self.source = {
            "schema": "g5-fleet.execution-cases/v1",
            "status": "PASS", "git_revision": "a" * 40,
            "parent_run_id": "parent-1", "run_id": "provider-1",
            "inputs": inputs, "generated_at": timestamp,
            "cases": [{
                "id": "boards-create-readback-cleanup", "status": "PASS",
                "kind": "provider_readback", "subjects": [self.subject],
                "assertions": ["saved title read back from G5", "fixture removed"],
            }],
        }
        self.receipt = {
            "schema": "g5-fleet.migration-execution/v1",
            "status": "PASS", "proof_level": "LOCAL_RUNTIME_PASS",
            "git_revision": "a" * 40, "run_id": "parent-1",
            "generated_at": timestamp, "inputs": inputs,
        }
        self.write_source()

    def write_source(self) -> None:
        content = json.dumps(self.source).encode()
        (self.root / "cases.json").write_bytes(content)
        self.receipt["artifacts"] = [{
            "path": "cases.json", "bytes": len(content),
            "sha256": hashlib.sha256(content).hexdigest(), "run_id": "provider-1",
        }]

    def codes(self, required: set[tuple[str, str]] | None = None) -> set[str]:
        return {finding.code for finding in validate_execution_claims(
            self.root, self.receipt,
            required_items=required or {("core_operations", "createBoard")},
            git_revision="a" * 40, owner_id="fixture",
        )}

    def test_exact_observed_case_passes(self) -> None:
        self.assertEqual(set(), self.codes())

    def test_unrelated_passing_case_cannot_certify_another_operation(self) -> None:
        self.assertIn("evidence.item_unverified", self.codes({("core_operations", "deleteBoard")}))

    def test_regression_cannot_replace_provider_or_browser_execution(self) -> None:
        self.source["cases"][0]["kind"] = "regression"
        self.write_source()
        self.assertIn("evidence.item_unverified", self.codes())
        self.subject["category"] = "react_pages"
        self.write_source()
        self.assertIn("evidence.item_unverified", self.codes({("react_pages", "createBoard")}))

    def test_failed_skipped_empty_or_duplicate_cases_fail_closed(self) -> None:
        for change in ({"status": "FAIL"}, {"status": "SKIP"}, {"assertions": []}):
            with self.subTest(change=change):
                original = dict(self.source["cases"][0])
                self.source["cases"][0].update(change)
                self.write_source()
                self.assertIn("evidence.artifact_invalid", self.codes())
                self.source["cases"][0] = original
        self.source["cases"].append(dict(self.source["cases"][0]))
        self.write_source()
        self.assertIn("evidence.artifact_invalid", self.codes())
        self.assertIn("evidence.item_unverified", self.codes())

    def test_raw_source_timestamp_and_canonical_inputs_are_bound(self) -> None:
        for value in ("2020-01-01T00:00:00+00:00", "2026-08-31T12:00:00", None,
                      (datetime.now(UTC) + timedelta(hours=1)).isoformat()):
            with self.subTest(value=value):
                self.source["generated_at"] = value
                self.write_source()
                self.assertIn("evidence.artifact_invalid", self.codes())
        self.source["generated_at"] = self.receipt["generated_at"]
        self.source["inputs"] = {"openapi_sha256": "f" * 64, "upstream_commit": "b" * 40}
        self.write_source()
        self.assertIn("evidence.artifact_invalid", self.codes())
        self.receipt["inputs"] = self.source["inputs"]
        self.assertIn("evidence.execution_identity", self.codes())

    def test_non_json_or_non_utf8_receipt_fails_without_crashing(self) -> None:
        for content in (b"[1]", b"\xff"):
            (self.root / "receipt.json").write_bytes(content)
            findings = validate_evidence_file(
                self.root, {"path": "receipt.json"}, git_revision="a" * 40,
                max_age_hours=24, owner_id="fixture",
            )
            self.assertEqual(["evidence.invalid_json"], [row.code for row in findings])

    def test_tampered_source_or_wrong_parent_revision_fail(self) -> None:
        (self.root / "cases.json").write_text("{}")
        self.assertIn("evidence.artifact_invalid", self.codes())
        for field, value in (("parent_run_id", "other"), ("git_revision", "b" * 40)):
            with self.subTest(field=field):
                original = self.source[field]
                self.source[field] = value
                self.write_source()
                self.assertIn("evidence.artifact_invalid", self.codes())
                self.source[field] = original

    def test_bare_pass_or_static_receipt_is_not_runtime_proof(self) -> None:
        self.receipt["proof_level"] = "MIGRATION_STATIC_PASS"
        self.assertIn("evidence.execution_level", self.codes())
        del self.receipt["schema"]
        self.assertIn("evidence.execution_schema", self.codes())

    def test_receipt_and_artifact_paths_cannot_escape_or_use_symlinks(self) -> None:
        (self.root / "link.json").symlink_to(self.root / "cases.json")
        for unsafe in ("../cases.json", str(self.root / "cases.json"), "link.json"):
            with self.subTest(unsafe=unsafe):
                self.receipt["artifacts"][0]["path"] = unsafe
                self.assertIn("evidence.artifact_invalid", self.codes())
                findings = validate_evidence_file(
                    self.root, {"path": unsafe}, git_revision="a" * 40,
                    max_age_hours=24, owner_id="fixture",
                )
                self.assertIn("evidence.path_unsafe", {row.code for row in findings})

    def test_item_binding_is_mandatory_in_real_parity_audit(self) -> None:
        manifest, legacy, active = make_fixture(self.root)
        manifest["evidence_registry"]["unrelated"] = {"path": "receipt.json"}
        for mappings in manifest["mappings"].values():
            for entry in mappings:
                entry["evidence_ids"] = ["unrelated"]
        manifest["core_operation_mappings"][0]["evidence_ids"] = ["unrelated"]
        (self.root / "receipt.json").write_text(json.dumps(self.receipt))
        findings, coverage, _, _ = audit_parity(
            self.root, manifest, legacy, active, profile="runtime", git_revision="a" * 40,
        )
        unverified = [row for row in findings if row.code == "evidence.item_unverified"]
        self.assertEqual(6, len(unverified))
        self.assertTrue(all(row["valid"] == 0 for row in coverage.values()))
