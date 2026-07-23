from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "run_api_pipeline_audit.py"
SPEC = importlib.util.spec_from_file_location("run_api_pipeline_audit", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)

from audit_harness.execution import redact  # noqa: E402

SCOPE_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "check_api_pipeline_scope.py"
SCOPE_SPEC = importlib.util.spec_from_file_location(
    "check_api_pipeline_scope", SCOPE_SCRIPT_PATH
)
assert SCOPE_SPEC is not None and SCOPE_SPEC.loader is not None
SCOPE_MODULE = importlib.util.module_from_spec(SCOPE_SPEC)
sys.modules[SCOPE_SPEC.name] = SCOPE_MODULE
SCOPE_SPEC.loader.exec_module(SCOPE_MODULE)


class ApiPipelineAuditRunnerTest(unittest.TestCase):
    def current_contract(self):
        return copy.deepcopy(
            SCOPE_MODULE.load_contract(
                Path(__file__).resolve().parents[2]
                / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
            )
        )

    def result(self, check_id: str, status: str):
        return MODULE.CheckResult(
            id=check_id,
            title=check_id,
            status=status,
            command="true",
            cwd="/tmp",
            returncode=0 if status == "passed" else None,
            duration_ms=1,
            stdout_tail=[],
            stderr_tail=[],
        )

    def exact_results(self, *, static_only: bool, status: str = "passed"):
        required = (
            MODULE.STATIC_REQUIRED_CHECK_IDS
            if static_only
            else MODULE.FULL_REQUIRED_CHECK_IDS
        )
        return [self.result(check_id, status) for check_id in sorted(required)]

    def valid_live_domain_payload(self):
        registry = json.loads(
            (
                Path(__file__).resolve().parents[2]
                / "specs/integration/LIVE_DOMAIN_CERTIFICATION.json"
            ).read_text(encoding="utf-8")
        )
        rows = []
        all_planned: set[str] = set()
        for domain in registry["domains"]:
            planned = sorted(
                {
                    operation
                    for phase in domain["operations"].values()
                    for operation in phase
                }
            )
            all_planned.update(planned)
            rows.append(
                {
                    "domain": domain["domain"],
                    "status": "passed",
                    "baseline_verified": True,
                    "readback_verified": True,
                    "cleanup_required": domain["mode"] != "read_only_external_guard",
                    "cleanup_verified": True,
                    "optional_unavailable_verified": False,
                    "no_external_delivery": True,
                    "planned_operation_ids": planned,
                    "executed_operation_ids": list(planned),
                    "unavailable_accounted_operation_ids": [],
                }
            )
        payload = {
            "schema": "gnuboard5.rust.live-admin-domain-roundtrip/v1",
            "audit_run_id": "current-run",
            "status": "passed",
            "expected_domain_count": 17,
            "domain_count": 17,
            "proof": {
                "production_api_client": True,
                "canonical_wire_validation": True,
                "current_run": True,
                "mutation_method_preflight": True,
                "all_domains_accounted_for": True,
                "all_operations_accounted_for": True,
                "all_requests_attributed": True,
                "all_mutations_read_back": True,
                "all_cleanup_verified": True,
                "external_delivery_operations_executed": 0,
            },
            "preflight_operation_ids": [
                "adminDeletePoll",
                "adminUpdateContent",
                "adminUpdatePoll",
            ],
            "executed_operation_ids": sorted(all_planned),
            "unavailable_accounted_operation_ids": [],
            "domains": rows,
        }
        return registry, payload

    def test_full_audit_never_passes_with_blocked_checks(self) -> None:
        results = self.exact_results(static_only=False)
        results = [
            self.result(item.id, "blocked" if item.id == "php.live_domain_pipeline" else item.status)
            for item in results
        ]
        summary = MODULE.summarize(results, static_only=False)
        self.assertEqual("blocked", summary["status"])
        self.assertFalse(summary["certified"])

    def test_static_pass_is_explicitly_not_certified(self) -> None:
        summary = MODULE.summarize(
            self.exact_results(static_only=True), static_only=True
        )
        self.assertEqual("static_passed_not_certified", summary["status"])
        self.assertFalse(summary["certified"])

    def test_empty_or_unknown_check_set_can_never_pass(self) -> None:
        empty = MODULE.summarize([], static_only=True)
        unknown = MODULE.summarize(
            [self.result("unknown", "skipped")], static_only=False
        )

        self.assertEqual("failed", empty["status"])
        self.assertEqual("failed", unknown["status"])
        self.assertIn("unknown", unknown["failure_checks"])

    def test_missing_required_check_can_never_certify_full_audit(self) -> None:
        results = self.exact_results(static_only=False)
        removed = results.pop()

        summary = MODULE.summarize(results, static_only=False)

        self.assertEqual("failed", summary["status"])
        self.assertFalse(summary["certified"])
        self.assertIn(
            f"harness.missing_check:{removed.id}", summary["failure_checks"]
        )

    def test_unexpected_passing_check_requires_inventory_review(self) -> None:
        results = self.exact_results(static_only=True)
        results.append(self.result("unreviewed.check", "passed"))

        summary = MODULE.summarize(results, static_only=True)

        self.assertEqual("failed", summary["status"])
        self.assertIn(
            "harness.unexpected_check:unreviewed.check", summary["failure_checks"]
        )

    def test_secret_is_redacted_from_commands_and_output(self) -> None:
        secret = "do-not-leak"
        self.assertEqual(
            "--inspect-secret=$ADMIN_SCHEMA_INSPECT_SECRET",
            redact(f"--inspect-secret={secret}", (secret,)),
        )

    def test_command_start_failure_is_reported_not_raised(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = MODULE.run_check(
                MODULE.CheckSpec(
                    id="missing",
                    title="missing",
                    command=("definitely-not-a-real-command",),
                    cwd=Path(directory),
                ),
                env={},
                secrets=(),
            )
        self.assertEqual("failed", result.status)
        self.assertIn("could not start", result.reason or "")

    def test_repository_state_fingerprints_tracked_and_untracked_changes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            tracked = root / "tracked.txt"
            tracked.write_text("one\n", encoding="utf-8")
            subprocess.run(["git", "add", "tracked.txt"], cwd=root, check=True)
            subprocess.run(
                [
                    "git",
                    "-c",
                    "user.name=Audit Test",
                    "-c",
                    "user.email=audit@example.invalid",
                    "commit",
                    "-q",
                    "-m",
                    "initial",
                ],
                cwd=root,
                check=True,
            )
            clean = MODULE.repository_state(root)
            tracked.write_text("two\n", encoding="utf-8")
            (root / "untracked.txt").write_text("new\n", encoding="utf-8")
            dirty = MODULE.repository_state(root)

        self.assertFalse(clean["dirty"])
        self.assertTrue(dirty["dirty"])
        self.assertNotEqual(
            clean["worktree_fingerprint_sha256"],
            dirty["worktree_fingerprint_sha256"],
        )
        self.assertEqual(1, dirty["untracked_file_count"])

    def test_artifact_inventory_cannot_shrink_with_the_php_manifest(self) -> None:
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "field-consumer").mkdir()
            (root / "php-provider-legacy-inventory.json").write_text(
                '{"schema":"gnuboard5.php.provider-legacy-admin-inventory/v1",'
                '"records":[{"path":"adm/config_form.php"}]}',
                encoding="utf-8",
            )
            (root / "integrated-audit.json").write_text(
                '{"summary":{"status":"failed"}}', encoding="utf-8"
            )
            reduced_domains = sorted(expected_domains - {"theme"})
            (root / "field-consumer/index.json").write_text(
                json.dumps(
                    {
                        "domains": [
                            {"domain": domain, "current_run_report": True}
                            for domain in reduced_domains
                        ]
                    }
                ),
                encoding="utf-8",
            )

            result = MODULE.validate_current_run_artifacts(
                root, static_only=True, expected_domains=expected_domains
            )

        self.assertEqual("failed", result.status)
        self.assertTrue(
            any("domain inventory mismatch" in item for item in result.stderr_tail)
        )

    def test_failed_integrated_artifact_cannot_pass_integrity_validation(self) -> None:
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        audit_run_id = "aggregate-run"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "field-consumer").mkdir()
            (root / "php-provider-legacy-inventory.json").write_text(
                json.dumps(
                    {
                        "schema": "gnuboard5.php.provider-legacy-admin-inventory/v1",
                        "audit_run_id": audit_run_id,
                        "records": [{"path": "adm/config_form.php"}],
                    }
                ),
                encoding="utf-8",
            )
            (root / "integrated-audit.json").write_text(
                json.dumps(
                    {
                        "audit_run_id": audit_run_id,
                        "summary": {"status": "failed"},
                    }
                ),
                encoding="utf-8",
            )
            (root / "field-consumer/index.json").write_text(
                json.dumps(
                    {
                        "audit_run_id": audit_run_id,
                        "domain_count_match": True,
                        "counts": {"pass": 0, "fail": 17, "blocked": 0},
                        "subprocess_nonzero_count": 17,
                        "domains": [
                            {
                                "domain": domain,
                                "status": "fail",
                                "subprocess_exit_code": 1,
                                "current_run_report": True,
                            }
                            for domain in sorted(expected_domains)
                        ],
                    }
                ),
                encoding="utf-8",
            )

            result = MODULE.validate_current_run_artifacts(
                root,
                static_only=True,
                expected_domains=expected_domains,
                expected_audit_run_id=audit_run_id,
                check_results=[
                    self.result("cross.operation_dto_graph", "failed"),
                    self.result("rust.field_consumer_parity", "failed"),
                ],
            )

        self.assertEqual("failed", result.status)
        self.assertIn(
            "integrated audit artifact reports a failed pipeline",
            result.stderr_tail,
        )

    def test_current_run_artifacts_pass_only_with_matching_ids_and_children(self) -> None:
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        audit_run_id = "aggregate-run"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "field-consumer").mkdir()
            (root / "php-provider-legacy-inventory.json").write_text(
                json.dumps(
                    {
                        "schema": "gnuboard5.php.provider-legacy-admin-inventory/v1",
                        "audit_run_id": audit_run_id,
                        "records": [{"path": "adm/config_form.php"}],
                    }
                ),
                encoding="utf-8",
            )
            (root / "integrated-audit.json").write_text(
                json.dumps(
                    {
                        "audit_run_id": audit_run_id,
                        "summary": {"status": "passed"},
                    }
                ),
                encoding="utf-8",
            )
            (root / "field-consumer/index.json").write_text(
                json.dumps(
                    {
                        "audit_run_id": audit_run_id,
                        "domain_count_match": True,
                        "counts": {"pass": 17, "fail": 0, "blocked": 0},
                        "subprocess_nonzero_count": 0,
                        "domains": [
                            {
                                "domain": domain,
                                "status": "pass",
                                "subprocess_exit_code": 0,
                                "current_run_report": True,
                            }
                            for domain in sorted(expected_domains)
                        ],
                    }
                ),
                encoding="utf-8",
            )

            result = MODULE.validate_current_run_artifacts(
                root,
                static_only=True,
                expected_domains=expected_domains,
                expected_audit_run_id=audit_run_id,
                check_results=[
                    self.result("cross.operation_dto_graph", "passed"),
                    self.result("rust.field_consumer_parity", "passed"),
                ],
            )

        self.assertEqual("passed", result.status)

    def test_static_scope_excludes_archived_and_live_checks(self) -> None:
        checks = MODULE.build_checks(
            rust_root=Path("/tmp/rust"),
            php_root=Path("/tmp/php"),
            artifact_root=Path("/tmp/output"),
            static_only=True,
            legacy_base_url="",
            live_base_url="",
            inspect_secret="",
            access_token="",
        )
        ids = {check.id for check in checks}
        self.assertIn("cross.operation_dto_graph", ids)
        self.assertIn("rust.field_consumer_parity", ids)
        self.assertNotIn("php.live_domain_pipeline", ids)
        self.assertNotIn("rust.fixture_render_rehydrate", ids)
        self.assertFalse(any("flutter" in check.id or "web" in check.id for check in checks))

    def test_scope_self_audit_fails_for_partial_required_capability(self) -> None:
        contract = self.current_contract()
        report = SCOPE_MODULE.evaluate_contract(contract, mode="full")
        self.assertEqual("fail", report["status"])
        self.assertIn(
            "frontend_fixture_render_rehydrate: capability status=partial",
            report["failures"],
        )

    def test_static_scope_ignores_full_only_capability_status(self) -> None:
        contract = self.current_contract()
        report = SCOPE_MODULE.evaluate_contract(contract, mode="static")
        self.assertEqual("pass", report["status"])
        self.assertNotIn(
            "frontend_fixture_render_rehydrate: capability status=partial",
            report["failures"],
        )
        self.assertNotIn("frontend_fixture_render_rehydrate", report["incomplete"])

    def test_path_alias_cannot_hide_a_distinct_openapi_operation(self) -> None:
        contract = self.current_contract()
        contract["path_equivalents"] = {
            "/admin/system/mails": "/admin/mails"
        }

        report = SCOPE_MODULE.evaluate_contract(contract, mode="static")

        self.assertEqual("fail", report["status"])
        self.assertTrue(
            any("path_equivalents must be empty" in item for item in report["failures"])
        )

    def test_capability_measured_status_cannot_be_manually_demoted(self) -> None:
        contract = self.current_contract()
        runtime = next(
            item
            for item in contract["capabilities"]
            if item["id"] == "php_runtime_route_table"
        )
        runtime["status"] = "partial"
        runtime["exit_criteria"] = "trust me"
        runtime.pop("evidence", None)

        report = SCOPE_MODULE.evaluate_contract(contract, mode="static")

        self.assertTrue(
            any(
                "v1 measured status must remain 'implemented'" in item
                for item in report["failures"]
            )
        )

    def test_manifest_promotion_cannot_bypass_executable_capability_probes(self) -> None:
        contract = self.current_contract()
        for capability in contract["capabilities"]:
            capability["status"] = "implemented"
            capability["evidence"] = "manual string"
            capability.pop("exit_criteria", None)

        with tempfile.TemporaryDirectory() as directory:
            scope_path = Path(directory) / "scope.json"
            scope_path.write_text(
                json.dumps({"audit_contract": contract}), encoding="utf-8"
            )
            check_results = [
                self.result(check_id, "passed")
                for check_id in MODULE.STATIC_REQUIRED_CHECK_IDS
                if not check_id.startswith("cap.")
                and check_id != "harness.capability_bindings"
            ]
            check_results.extend(
                self.result(check_id, "blocked")
                for check_id in MODULE.STATIC_CAPABILITY_PROBE_IDS
            )

            result = MODULE.evaluate_capability_bindings(
                scope_path, check_results, static_only=True
            )

        self.assertEqual("failed", result.status)
        self.assertTrue(
            any("bound check did not pass" in item for item in result.stderr_tail)
        )

    def test_scope_and_aggregate_capability_bindings_are_identical(self) -> None:
        self.assertEqual(
            SCOPE_MODULE.EXPECTED_CAPABILITY_CHECK_BINDINGS,
            MODULE.CAPABILITY_CHECK_BINDINGS,
        )

    def test_live_access_token_is_env_only_and_missing_input_blocks_probe(self) -> None:
        checks = MODULE.build_checks(
            rust_root=Path("/tmp/rust"),
            php_root=Path("/tmp/php"),
            artifact_root=Path("/tmp/output"),
            static_only=False,
            legacy_base_url="https://example.test",
            live_base_url="https://example.test/api/v1",
            inspect_secret="inspect-secret",
            access_token="",
        )
        probe = next(
            check
            for check in checks
            if check.id == "cap.frontend_live_write_readback"
        )

        self.assertIn("G5_LIVE_ACCESS_TOKEN", probe.blocked_reason or "")
        self.assertNotIn("access-token", " ".join(probe.command))

    def test_live_probe_artifact_rejects_stale_or_false_rollback(self) -> None:
        failures = MODULE.live_probe_artifact_failures(
            {
                "schema": "roundtrip/v1",
                "audit_run_id": "old-run",
                "status": "passed",
                "proof": {"readback_verified": True, "rollback_verified": False},
            },
            expected_schema="roundtrip/v1",
            expected_audit_run_id="current-run",
            required_true_paths=(
                ("proof", "readback_verified"),
                ("proof", "rollback_verified"),
            ),
        )

        self.assertIn("stale or mismatched audit_run_id", failures)
        self.assertIn("proof.rollback_verified is not true", failures)

    def test_live_domain_artifact_rejects_inventory_and_delivery_drift(self) -> None:
        registry, payload = self.valid_live_domain_payload()
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        payload["proof"]["external_delivery_operations_executed"] = 1
        payload["domains"] = payload["domains"][:-1]

        failures = MODULE.live_domain_roundtrip_artifact_failures(
            payload, registry, expected_domains, "current-run"
        )

        self.assertIn("external delivery operation count is not zero", failures)
        self.assertIn("live domain inventory mismatch", failures)

        payload["proof"]["mutation_method_preflight"] = False
        failures = MODULE.live_domain_roundtrip_artifact_failures(
            payload, registry, expected_domains, "current-run"
        )
        self.assertIn("proof.mutation_method_preflight is not true", failures)

    def test_live_domain_artifact_requires_execution_or_unavailable_accounting(self) -> None:
        registry, payload = self.valid_live_domain_payload()
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        missing_operation = "adminCreateSmsContact"
        payload["executed_operation_ids"].remove(missing_operation)

        failures = MODULE.live_domain_roundtrip_artifact_failures(
            payload, registry, expected_domains, "current-run"
        )

        self.assertIn(
            "planned operation IDs are not fully current-run accounted", failures
        )

        contacts = next(
            row for row in payload["domains"] if row["domain"] == "sms-contacts"
        )
        contacts["optional_unavailable_verified"] = True
        contacts["executed_operation_ids"].remove(missing_operation)
        contacts["unavailable_accounted_operation_ids"] = [missing_operation]
        payload["unavailable_accounted_operation_ids"] = [missing_operation]
        failures = MODULE.live_domain_roundtrip_artifact_failures(
            payload, registry, expected_domains, "current-run"
        )

        self.assertEqual([], failures)

    def test_live_domain_artifact_rejects_excluded_irreversible_execution(self) -> None:
        registry, payload = self.valid_live_domain_payload()
        expected_domains = set(SCOPE_MODULE.EXPECTED_SCHEMA_DOMAINS)
        payload["executed_operation_ids"].append("adminDeleteMember")
        members = next(row for row in payload["domains"] if row["domain"] == "members")
        members["executed_operation_ids"].append("adminDeleteMember")

        failures = MODULE.live_domain_roundtrip_artifact_failures(
            payload, registry, expected_domains, "current-run"
        )

        self.assertTrue(
            any("excluded irreversible operations were executed" in item for item in failures)
        )


if __name__ == "__main__":
    unittest.main()
