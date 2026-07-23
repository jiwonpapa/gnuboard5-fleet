from __future__ import annotations

import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

MODULE_PATH = Path(__file__).resolve().parents[1] / "g5audit.py"
SPEC = importlib.util.spec_from_file_location("g5audit", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class G5AuditTest(unittest.TestCase):
    @staticmethod
    def _git(root: Path, *args: str) -> str:
        import subprocess

        completed = subprocess.run(
            ("git", *args),
            cwd=root,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return completed.stdout.strip()

    def _init_secret_scan_repository(self, root: Path) -> None:
        self._git(root, "init", "-b", "main")
        self._git(root, "config", "user.name", "Audit Test")
        self._git(root, "config", "user.email", "audit@example.invalid")
        policy = root / "governance/SECRET_HISTORY_POLICY.json"
        schema = root / "governance/schemas/secret-history-policy.schema.json"
        schema.parent.mkdir(parents=True)
        shutil.copy2(MODULE.ROOT / "governance/SECRET_HISTORY_POLICY.json", policy)
        shutil.copy2(
            MODULE.ROOT / "governance/schemas/secret-history-policy.schema.json",
            schema,
        )
        (root / "safe.txt").write_text("public fixture\n", encoding="utf-8")
        self._git(root, "add", ".")
        self._git(root, "commit", "-m", "safe baseline")

    def test_required_checks_inherit_in_order_and_reject_cycles(self) -> None:
        manifest = {
            "profiles": {
                "base": {"proof_level": "BASE_PASS", "required_checks": ["one"]},
                "child": {
                    "proof_level": "CHILD_PASS",
                    "inherits": "base",
                    "required_checks": ["one", "two"],
                },
            }
        }
        proof, checks = MODULE.required_checks(manifest, "child")
        self.assertEqual("CHILD_PASS", proof)
        self.assertEqual(["one", "two"], checks)

        manifest["profiles"]["base"]["inherits"] = "child"
        with self.assertRaisesRegex(ValueError, "inheritance cycle"):
            MODULE.required_checks(manifest, "child")

    def test_missing_tracked_paths_is_fail_closed(self) -> None:
        required = ("a.php", "b.sh")
        self.assertEqual(["b.sh"], MODULE.missing_tracked_paths({"a.php"}, required))
        self.assertEqual([], MODULE.missing_tracked_paths(set(required), required))

    def test_each_tauri_bundle_icon_is_required_by_source_closure(self) -> None:
        complete = set(MODULE.REQUIRED_TRACKED_PATHS)
        for icon in MODULE.REQUIRED_TAURI_ICONS:
            with self.subTest(icon=icon):
                self.assertEqual([icon], MODULE.missing_tracked_paths(complete - {icon}))

    def test_upstream_lock_requires_full_commit_tree_and_file_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = {
                "upstreams": [
                    {
                        "version": "5.6.32",
                        "ref": "refs/tags/v5.6.32",
                        "commit": "a" * 40,
                        "tree": "b" * 40,
                        "version_probe": {"sha256": "c" * 64},
                        "license": {"sha256": "d" * 64},
                    }
                ]
            }
            (root / "UPSTREAMS.lock.json").write_text(json.dumps(payload), encoding="utf-8")
            MODULE.check_upstream_lock(root)

            payload["upstreams"][0]["commit"] = "v5.6.32"
            (root / "UPSTREAMS.lock.json").write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "full SHAs"):
                MODULE.check_upstream_lock(root)

    def test_secret_history_allows_only_scoped_hashed_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            fixture = root / "tests/fixture.env"
            fixture.parent.mkdir()
            fixture_value = "top-" + "secret"
            fixture.write_text("PASSWORD=" + fixture_value + "\n", encoding="utf-8")
            self._git(root, "add", ".")
            self._git(root, "commit", "-m", "allowed fixture")
            self.assertIn("secret·PII PASS", MODULE.check_secret_history_hygiene(root))

            outside = root / "config/runtime.env"
            outside.parent.mkdir()
            outside.write_text("PASSWORD=" + fixture_value + "\n", encoding="utf-8")
            self._git(root, "add", ".")
            self._git(root, "commit", "-m", "move fixture outside allowed scope")
            with self.assertRaisesRegex(ValueError, "credential_assignment"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_rejects_deleted_forbidden_output_path(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            evidence = root / "output/live.json"
            evidence.parent.mkdir()
            evidence.write_text('{"status":"temporary"}\n', encoding="utf-8")
            self._git(root, "add", ".")
            self._git(root, "commit", "-m", "add forbidden evidence")
            self._git(root, "rm", "output/live.json")
            self._git(root, "commit", "-m", "delete forbidden evidence")
            self.assertFalse(evidence.exists())
            with self.assertRaisesRegex(ValueError, "forbidden_history_paths"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_rejects_deleted_token_blob(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            credential = root / "config/runtime.env"
            credential.parent.mkdir()
            token = "gh" + "p_" + ("A" * 40)
            credential.write_text("API_TOKEN=" + token + "\n", encoding="utf-8")
            self._git(root, "add", ".")
            self._git(root, "commit", "-m", "accidentally add token")
            self._git(root, "rm", "config/runtime.env")
            self._git(root, "commit", "-m", "delete token file")
            with self.assertRaisesRegex(ValueError, "github_token"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_rejects_merge_only_deleted_secret(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            self._git(root, "checkout", "-b", "feature")
            (root / "feature.txt").write_text("feature\n", encoding="utf-8")
            self._git(root, "add", "feature.txt")
            self._git(root, "commit", "-m", "feature parent")
            self._git(root, "checkout", "main")
            self._git(root, "merge", "-s", "ours", "--no-commit", "feature")
            merge_only = root / "merge-only.env"
            merge_only.write_text("PASSWORD=merge-only-sensitive\n", encoding="utf-8")
            self._git(root, "add", "merge-only.env")
            self._git(root, "commit", "-m", "merge-only secret")
            self._git(root, "rm", "merge-only.env")
            self._git(root, "commit", "-m", "delete merge-only secret")
            with self.assertRaisesRegex(ValueError, "credential_assignment"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_rejects_current_structured_pii(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            data = root / "data.json"
            data.write_text("{}\n", encoding="utf-8")
            self._git(root, "add", "data.json")
            self._git(root, "commit", "-m", "add structured data fixture")
            email = "real-user@" + "live-domain.tld"
            data.write_text(
                json.dumps({"mb_email": email}) + "\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "pii_email"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_rejects_malformed_ip_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            data = root / "data.json"
            data.write_text("{}\n", encoding="utf-8")
            self._git(root, "add", "data.json")
            self._git(root, "commit", "-m", "add structured data fixture")
            data.write_text(
                json.dumps({"mb_ip": "999.999.999.999"}) + "\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "pii_ip"):
                MODULE.check_secret_history_hygiene(root)

    def test_secret_history_ignores_source_type_declarations_and_lock_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            (root / "model.rs").write_text("struct Auth { token: String }\n", encoding="utf-8")
            (root / "composer.lock").write_text(
                json.dumps({"email": "maintainer@public-package.example"}) + "\n",
                encoding="utf-8",
            )
            self._git(root, "add", ".")
            self._git(root, "commit", "-m", "add public source metadata")
            self.assertIn("secret·PII PASS", MODULE.check_secret_history_hygiene(root))

    def test_secret_history_allows_https_token_endpoint_but_not_literal_secret(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._init_secret_scan_repository(root)
            endpoint = root / "provider-endpoints.json"
            endpoint.write_text(
                json.dumps({"token": "https://identity.example.com/oauth/token"}) + "\n",
                encoding="utf-8",
            )
            self._git(root, "add", "provider-endpoints.json")
            self._git(root, "commit", "-m", "add public token endpoint")
            self.assertIn("secret·PII PASS", MODULE.check_secret_history_hygiene(root))

            endpoint.write_text(
                json.dumps({"token": "literal-sensitive-value"}) + "\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "json_secret"):
                MODULE.check_secret_history_hygiene(root)

    def test_consumer_dependency_check_reuses_prepared_python_command(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            verifier = root / "tools/runtime/prepare_consumers.py"
            verifier.parent.mkdir(parents=True)
            verifier.write_text("# verifier fixture\n", encoding="utf-8")
            manifest = root / MODULE.CONSUMER_DEPENDENCY_MANIFEST
            manifest.parent.mkdir(parents=True)
            manifest.write_text(
                json.dumps({"tools": {"python": {"command": "python3"}}}),
                encoding="utf-8",
            )
            with mock.patch.object(MODULE, "run_checked") as run_checked:
                MODULE.check_consumer_dependencies(root)
            arguments = run_checked.call_args.args
            self.assertEqual(sys.executable, arguments[0])
            self.assertEqual("python3", arguments[arguments.index("--python") + 1])

    def test_product_manifest_rejects_contract_reduction(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = {
                "product_id": "g5-fleet",
                "deployment_model": "self_hosted_server",
                "editions": {
                    "fleet_core": {
                        "pricing": "free",
                        "source_license": "Apache-2.0",
                        "required": True,
                    },
                    "commerce": {
                        "pricing": "paid",
                        "source_license": "commercial",
                        "sdk_license": "Apache-2.0",
                        "third_party_license_policy": "independent_per_plugin",
                        "required": False,
                    },
                },
                "contract_baseline": {
                    "openapi_operations": 311,
                    "openapi_operation_keys_sha256": "a" * 64,
                    "active_operations": 189,
                    "admin_non_shop_operations": 184,
                    "bootstrap_operations": 5,
                    "protected_board_operations": 26,
                    "shop_provider_operations": 26,
                },
            }
            (root / "PRODUCT_MANIFEST.json").write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "contract baseline mismatch"):
                MODULE.check_product_manifest(root)

    def test_product_manifest_and_repository_reject_license_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = json.loads(
                (MODULE.ROOT / "PRODUCT_MANIFEST.json").read_text(encoding="utf-8")
            )
            payload["editions"]["fleet_core"]["source_license"] = "AGPL-3.0-or-later"
            (root / "PRODUCT_MANIFEST.json").write_text(
                json.dumps(payload), encoding="utf-8"
            )
            with self.assertRaisesRegex(ValueError, "must be Apache-2.0"):
                MODULE.check_product_manifest(root)

        self.assertIn(
            "Apache-2.0",
            MODULE.check_license_policy(MODULE.ROOT),
        )

    def test_exact_operation_set_rejects_same_count_replacement_and_duplicates(self) -> None:
        original = [
            {"method": "GET", "path": "/admin/alpha", "operation_id": "getAlpha"},
            {"method": "POST", "path": "/admin/beta", "operation_id": "postBeta"},
        ]
        expected_hash = MODULE.operation_set_sha256(
            {"GET /admin/alpha", "POST /admin/beta"}
        )
        MODULE.validate_operation_rows(
            original,
            expected_total=2,
            expected_keys_sha256=expected_hash,
        )

        replacement = [dict(row) for row in original]
        replacement[1]["path"] = "/admin/gamma"
        with self.assertRaisesRegex(ValueError, "exact operation set mismatch"):
            MODULE.validate_operation_rows(
                replacement,
                expected_total=2,
                expected_keys_sha256=expected_hash,
            )

        duplicate = [dict(original[0]), dict(original[0])]
        duplicate[1]["operation_id"] = "getAlphaAgain"
        with self.assertRaisesRegex(ValueError, "duplicate OpenAPI method/path"):
            MODULE.validate_operation_rows(
                duplicate,
                expected_total=2,
                expected_keys_sha256=expected_hash,
            )

    def test_rust_scope_requires_exact_domains_and_child_audit_success(self) -> None:
        payload = {
            "audit_contract": {
                "id": "API_PIPELINE_AUDIT_V1",
                "provider_contract": "connectors/gnuboard5-php/api/docs/openapi.yaml",
                "included_path_prefixes": ["/admin/"],
                "included_operations": [
                    {"method": method, "path": path}
                    for method, path in sorted(MODULE.EXPECTED_BOOTSTRAP_OPERATIONS)
                ],
                "path_equivalents": {},
                "expected_operation_counts": {
                    "openapi_total": 312,
                    "admin_total": 210,
                    "shop_provider_only": 26,
                    "admin_non_shop_exact": 184,
                    "bootstrap": 5,
                    "active_total_exact": 189,
                },
                "expected_schema_domains": sorted(MODULE.EXPECTED_RUST_SCHEMA_DOMAINS),
            }
        }
        MODULE.validate_rust_scope_contract(payload)
        payload["audit_contract"]["expected_schema_domains"][-1] = "invented-domain"
        with self.assertRaisesRegex(ValueError, "exact 17-domain"):
            MODULE.validate_rust_scope_contract(payload)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            rust_root = root / "products/admin-desktop"
            scope = rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
            scope.parent.mkdir(parents=True)
            payload["audit_contract"]["expected_schema_domains"][-1] = "theme"
            scope.write_text(json.dumps(payload), encoding="utf-8")
            runner = rust_root / "scripts/run_api_pipeline_audit.py"
            runner.parent.mkdir(parents=True)
            runner.write_text("# child audit fixture\n", encoding="utf-8")
            with mock.patch.object(
                MODULE,
                "run_checked",
                side_effect=RuntimeError("mutated Rust source was rejected"),
            ):
                with self.assertRaisesRegex(RuntimeError, "mutated Rust source"):
                    MODULE.check_rust_scope(root)

    def test_import_history_binds_source_tree_and_rejects_dirty_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._git(root, "init", "-b", "main")
            self._git(root, "config", "user.name", "Audit Test")
            self._git(root, "config", "user.email", "audit@example.invalid")
            (root / "base.txt").write_text("base\n", encoding="utf-8")
            self._git(root, "add", "base.txt")
            self._git(root, "commit", "-m", "base")

            self._git(root, "checkout", "--orphan", "source")
            self._git(root, "rm", "-rf", ".")
            (root / "provider.php").write_text("<?php // provider\n", encoding="utf-8")
            self._git(root, "add", "provider.php")
            self._git(root, "commit", "-m", "source")
            source_commit = self._git(root, "rev-parse", "HEAD")
            source_tree = self._git(root, "rev-parse", "HEAD^{tree}")

            self._git(root, "checkout", "main")
            self._git(root, "merge", "-s", "ours", "--no-commit", "--allow-unrelated-histories", source_commit)
            self._git(root, "read-tree", "--prefix=connectors/gnuboard5-php/", "-u", source_commit)
            self._git(root, "commit", "-m", "import source")
            import_commit = self._git(root, "rev-parse", "HEAD")
            provenance = {
                "sources": [
                    {
                        "id": "php-rest-api",
                        "source_commit": source_commit,
                        "source_tree": source_tree,
                        "original_source_commit": "f" * 40,
                        "original_source_tree": "e" * 40,
                        "excluded_generated_artifacts": [
                            {
                                "path": "specs/docs.db",
                                "sha256": "85da29ecdd343efe70369fad91c7202c412a21d44bbaba5178e97474397bd385",
                                "reason": "Generated documentation index excluded from the snapshot.",
                            }
                        ],
                        "destination_prefix": "connectors/gnuboard5-php",
                    }
                ],
                "import_commits": {"php-rest-api": import_commit},
            }
            (root / "MIGRATION_PROVENANCE.json").write_text(
                json.dumps(provenance), encoding="utf-8"
            )
            self._git(root, "add", "MIGRATION_PROVENANCE.json")
            self._git(root, "commit", "-m", "record provenance")
            MODULE.check_history(root)

            provenance["sources"][0]["original_source_commit"] = source_commit
            (root / "MIGRATION_PROVENANCE.json").write_text(
                json.dumps(provenance), encoding="utf-8"
            )
            self._git(root, "add", "MIGRATION_PROVENANCE.json")
            self._git(root, "commit", "-m", "make private original reachable")
            with self.assertRaisesRegex(ValueError, "private original source commit is reachable"):
                MODULE.check_history(root)
            provenance["sources"][0]["original_source_commit"] = "f" * 40
            (root / "MIGRATION_PROVENANCE.json").write_text(
                json.dumps(provenance), encoding="utf-8"
            )
            self._git(root, "add", "MIGRATION_PROVENANCE.json")
            self._git(root, "commit", "-m", "restore private original boundary")

            imported_file = root / "connectors/gnuboard5-php/provider.php"
            imported_file.write_text("<?php // dirty mutation\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "worktree is dirty"):
                MODULE.check_history(root)
            self._git(root, "add", str(imported_file.relative_to(root)))
            self._git(root, "commit", "-m", "mutate imported subtree")
            mutated_import = self._git(root, "rev-parse", "HEAD")
            provenance["import_commits"]["php-rest-api"] = mutated_import
            (root / "MIGRATION_PROVENANCE.json").write_text(
                json.dumps(provenance), encoding="utf-8"
            )
            self._git(root, "add", "MIGRATION_PROVENANCE.json")
            self._git(root, "commit", "-m", "point at mutated import")
            with self.assertRaisesRegex(ValueError, "sole second import parent"):
                MODULE.check_history(root)

    def test_provenance_rejects_duplicate_sources_and_prefix_swaps(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = {
                "status": "imported",
                "policy": {
                    "direction": "one_way",
                    "history_strategy": "sanitized_snapshot",
                    "require_clean_sources": True,
                    "legacy_evidence_certifies_destination": False,
                    "private_source_history_reachable": False,
                    "sensitive_outputs_imported": False,
                },
                "sources": [
                    {
                        "id": "php-rest-api",
                        "clean": True,
                        "source_commit": "a" * 40,
                        "source_tree": "b" * 40,
                        "original_source_commit": "1" * 40,
                        "original_source_tree": "2" * 40,
                        "original_repository_visibility": "private_at_migration",
                        "excluded_output_files": 231,
                        "excluded_generated_artifacts": [
                            {
                                "path": "api.zip",
                                "sha256": "77ff9641dfb3e15a5f0142a460edf3525c9c8ed4b274dbf258c7c9d08e02ddf4",
                                "reason": "Stale duplicate deployment archive excluded from the snapshot.",
                            }
                        ],
                        "destination_prefix": "connectors/gnuboard5-php",
                    },
                    {
                        "id": "rust-admin",
                        "clean": True,
                        "source_commit": "c" * 40,
                        "source_tree": "d" * 40,
                        "original_source_commit": "3" * 40,
                        "original_source_tree": "4" * 40,
                        "original_repository_visibility": "private_at_migration",
                        "excluded_output_files": 77,
                        "excluded_generated_artifacts": [
                            {
                                "path": "specs/docs.db",
                                "sha256": "85da29ecdd343efe70369fad91c7202c412a21d44bbaba5178e97474397bd385",
                                "reason": "Generated documentation index excluded from the snapshot.",
                            }
                        ],
                        "destination_prefix": "products/admin-desktop",
                    },
                ],
                "import_commits": {"php-rest-api": "e" * 40, "rust-admin": "f" * 40},
            }
            path = root / "MIGRATION_PROVENANCE.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            MODULE.check_provenance(root)

            payload["sources"][1]["id"] = "php-rest-api"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "unique"):
                MODULE.check_provenance(root)

            payload["sources"][1]["id"] = "rust-admin"
            payload["sources"][0]["destination_prefix"] = "products/admin-desktop"
            payload["sources"][1]["destination_prefix"] = "connectors/gnuboard5-php"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "destination mapping mismatch"):
                MODULE.check_provenance(root)

    def test_nested_schema_mutation_and_hard_fail_policy_are_rejected(self) -> None:
        product = json.loads((MODULE.ROOT / "PRODUCT_MANIFEST.json").read_text(encoding="utf-8"))
        schema = json.loads(
            (MODULE.ROOT / "governance/schemas/product-manifest.schema.json").read_text(
                encoding="utf-8"
            )
        )
        MODULE.validate_json_schema(product, schema, "PRODUCT_MANIFEST.json")
        product["notification_baseline"]["enabled_by_default"] = True
        with self.assertRaisesRegex(ValueError, "const mismatch"):
            MODULE.validate_json_schema(product, schema, "PRODUCT_MANIFEST.json")

        audit_manifest = json.loads(
            (MODULE.ROOT / "AUDIT_MANIFEST.json").read_text(encoding="utf-8")
        )
        MODULE.hard_fail_states(audit_manifest)
        MODULE.validate_audit_manifest_contract(audit_manifest)
        audit_manifest["profiles"]["migration_static"]["required_checks"].remove(
            "rust.consumer_scope"
        )
        with self.assertRaisesRegex(ValueError, "profile contract mismatch"):
            MODULE.validate_audit_manifest_contract(audit_manifest)
        audit_manifest = json.loads(
            (MODULE.ROOT / "AUDIT_MANIFEST.json").read_text(encoding="utf-8")
        )
        audit_manifest["hard_fail_states"].remove("missing")
        with self.assertRaisesRegex(ValueError, "hard_fail_states mismatch"):
            MODULE.hard_fail_states(audit_manifest)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            shutil.copytree(MODULE.ROOT / "governance/schemas", root / "governance/schemas")
            for filename in (
                "AUDIT_MANIFEST.json",
                "PRODUCT_MANIFEST.json",
                "UPSTREAMS.lock.json",
                "governance/SECRET_HISTORY_POLICY.json",
            ):
                (root / filename).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(MODULE.ROOT / filename, root / filename)
            provenance = {
                "$schema": "./governance/schemas/migration-provenance.schema.json",
                "schema_version": 1,
                "migration_id": "test-migration",
                "status": "imported",
                "destination": {"branch": "main", "remote": "origin"},
                "policy": {
                    "direction": "one_way",
                    "history_strategy": "sanitized_snapshot",
                    "require_clean_sources": True,
                    "legacy_evidence_certifies_destination": False,
                    "private_source_history_reachable": False,
                    "sensitive_outputs_imported": False,
                },
                "sources": [
                    {
                        "id": "php-rest-api",
                        "role": "provider",
                        "origin": "https://example.invalid/php.git",
                        "source_branch": "main",
                        "source_commit": "a" * 40,
                        "source_tree": "b" * 40,
                        "original_source_commit": "1" * 40,
                        "original_source_tree": "2" * 40,
                        "original_repository_visibility": "private_at_migration",
                        "excluded_output_files": 231,
                        "excluded_generated_artifacts": [
                            {
                                "path": "api.zip",
                                "sha256": "77ff9641dfb3e15a5f0142a460edf3525c9c8ed4b274dbf258c7c9d08e02ddf4",
                                "reason": "Stale duplicate deployment archive excluded from the snapshot.",
                            }
                        ],
                        "clean": True,
                        "destination_prefix": "connectors/gnuboard5-php",
                    },
                    {
                        "id": "rust-admin",
                        "role": "consumer",
                        "origin": "https://example.invalid/rust.git",
                        "source_branch": "main",
                        "source_commit": "c" * 40,
                        "source_tree": "d" * 40,
                        "original_source_commit": "3" * 40,
                        "original_source_tree": "4" * 40,
                        "original_repository_visibility": "private_at_migration",
                        "excluded_output_files": 77,
                        "excluded_generated_artifacts": [],
                        "clean": True,
                        "destination_prefix": "products/admin-desktop",
                    },
                ],
                "upstream_lock": "UPSTREAMS.lock.json",
                "import_commits": {"php-rest-api": "e" * 40, "rust-admin": "f" * 40},
            }
            (root / "MIGRATION_PROVENANCE.json").write_text(
                json.dumps(provenance), encoding="utf-8"
            )
            MODULE.check_schema_validation(root)
            policy_path = root / "governance/SECRET_HISTORY_POLICY.json"
            policy = json.loads(policy_path.read_text(encoding="utf-8"))
            policy["forbidden_history_prefixes"].pop()
            policy_path.write_text(json.dumps(policy), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "const mismatch"):
                MODULE.check_schema_validation(root)
            shutil.copy2(MODULE.ROOT / "governance/SECRET_HISTORY_POLICY.json", policy_path)
            product_path = root / "PRODUCT_MANIFEST.json"
            mutated_product = json.loads(product_path.read_text(encoding="utf-8"))
            mutated_product["contract_baseline"]["active_operations"] = "189"
            product_path.write_text(json.dumps(mutated_product), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "const mismatch"):
                MODULE.check_schema_validation(root)

    def test_server_profile_missing_evaluator_is_a_hard_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            shutil.copy2(MODULE.ROOT / "AUDIT_MANIFEST.json", root / "AUDIT_MANIFEST.json")
            shutil.copy2(MODULE.ROOT / "UPSTREAMS.lock.json", root / "UPSTREAMS.lock.json")
            payload, exit_code = MODULE.execute("server_static", root)
            self.assertEqual(1, exit_code)
            self.assertEqual("failed", payload["status"])
            statuses = {row["id"]: row["status"] for row in payload["checks"]}
            self.assertEqual("missing", statuses["server.route_registry"])
            self.assertIsNone(payload["proof_level"])


if __name__ == "__main__":
    unittest.main()
