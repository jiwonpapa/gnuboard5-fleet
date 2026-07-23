from __future__ import annotations

import importlib.util
import hashlib
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/check_openapi_provider_contract.py"
SPEC = importlib.util.spec_from_file_location(
    "check_openapi_provider_contract", MODULE_PATH
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class OpenApiProviderContractAuditTest(unittest.TestCase):
    def test_required_alternatives_close_the_request_contract(self) -> None:
        document = self._document()
        request_schema = document["components"]["schemas"]["ItemRequest"]
        del request_schema["required"]
        request_schema["anyOf"] = [
            {"required": ["name"]},
            {"required": ["legacy_name"]},
        ]
        request_schema["properties"]["legacy_name"] = {"type": "string"}

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        rules = {item["rule"] for item in report["findings"]}

        self.assertNotIn("request_required_ambiguous", rules)
        self.assertNotIn("active_schema_required_ambiguous", rules)
        self.assertEqual("passed", report["status"])

    def test_required_alternative_with_open_variant_remains_ambiguous(self) -> None:
        document = self._document()
        request_schema = document["components"]["schemas"]["ItemRequest"]
        del request_schema["required"]
        request_schema["anyOf"] = [
            {"required": ["name"]},
            {"properties": {"legacy_name": {"type": "string"}}},
        ]

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        rules = {item["rule"] for item in report["findings"]}

        self.assertIn("request_required_ambiguous", rules)
        self.assertIn("active_schema_required_ambiguous", rules)
        self.assertEqual("failed", report["status"])

    def test_freeform_active_contract_is_a_failure(self) -> None:
        document = self._document()
        operation = document["paths"]["/admin/items"]["post"]
        operation["requestBody"]["content"]["application/json"]["schema"] = {
            "type": "object"
        }
        operation["responses"]["201"]["content"]["application/json"]["schema"] = {
            "$ref": "#/components/schemas/MessageResponse"
        }

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        rules = {item["rule"] for item in report["findings"]}

        self.assertIn("request_schema_not_named", rules)
        self.assertIn("request_object_open", rules)
        self.assertIn("request_required_ambiguous", rules)
        self.assertIn("generic_success_schema", rules)
        self.assertEqual("failed", report["status"])

    def test_binary_success_schema_does_not_require_json_component_dto(self) -> None:
        document = self._document()
        document["paths"]["/admin/items"]["post"]["responses"]["201"]["content"] = {
            "application/octet-stream": {
                "schema": {"type": "string", "format": "binary"}
            }
        }

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        rules = {item["rule"] for item in report["findings"]}

        self.assertNotIn("success_schema_not_named", rules)
        self.assertEqual("passed", report["status"])

    def test_created_response_without_location_header_is_a_failure(self) -> None:
        document = self._document()
        del document["paths"]["/admin/items"]["post"]["responses"]["201"]["headers"]

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        rules = {item["rule"] for item in report["findings"]}

        self.assertIn("created_location_header_missing", rules)
        self.assertEqual("failed", report["status"])

    def test_non_secret_domain_flag_can_be_exempted_from_sensitive_name_heuristic(self) -> None:
        document = self._document()
        document["components"]["schemas"]["ItemRequest"]["properties"].update(
            {
                "bo_use_secret": {"type": "integer"},
                "api_secret": {"type": "string"},
            }
        )
        policy = self._policy()
        policy["sensitive_property_name_patterns"] = [r"(^|_)(secret)$"]
        policy["sensitive_property_name_exceptions"] = ["bo_use_secret"]

        report = MODULE.build_audit(document, policy, plugin_manifests={})
        locations = {
            item["location"]
            for item in report["findings"]
            if item["rule"] == "sensitive_property_unprotected"
        }

        self.assertNotIn(
            "#/components/schemas/ItemRequest/properties/bo_use_secret",
            locations,
        )
        self.assertIn(
            "#/components/schemas/ItemRequest/properties/api_secret",
            locations,
        )

    def test_deferred_created_location_gap_is_preserved_as_evidence(self) -> None:
        document = self._document()
        document["paths"]["/memos"] = {
            "post": {
                "operationId": "sendMemo",
                "security": [{"bearerAuth": []}],
                "responses": {
                    "201": {
                        "description": "created",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Envelope"}
                            }
                        },
                    },
                    "429": {"description": "rate"},
                    "500": {"description": "server"},
                },
            }
        }

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        memo_findings = [
            item
            for item in report["deferred_findings"]
            if item.get("path") == "/memos"
        ]

        self.assertEqual(1, len(memo_findings))
        self.assertEqual("created_location_header_missing", memo_findings[0]["rule"])
        self.assertEqual("deferred", memo_findings[0]["severity"])

    def test_security_parameter_and_plugin_license_drift_are_failures(self) -> None:
        document = self._document()
        document["paths"]["/admin/items"]["post"]["security"] = []
        document["paths"]["/admin/items"]["post"]["parameters"] = [
            {"name": False, "in": "query", "schema": {"type": "string"}}
        ]
        document["paths"]["/p/premium/messages"] = {
            "post": {
                "operationId": "premiumMessage",
                "security": [],
                "responses": {
                    "200": {
                        "description": "ok",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Envelope"}
                            }
                        },
                    },
                    "402": {"description": "license"},
                    "429": {"description": "rate"},
                    "500": {"description": "server"},
                },
            }
        }

        report = MODULE.build_audit(
            document,
            self._policy(),
            plugin_manifests={"premium": {"protected_paths": ["/send"]}},
        )
        rules = {item["rule"] for item in report["findings"]}
        deferred_rules = {item["rule"] for item in report["deferred_findings"]}

        self.assertIn("admin_security_missing", rules)
        self.assertIn("parameter_name_not_string", rules)
        self.assertIn("plugin_license_path_unprotected", deferred_rules)

    def test_protected_board_contract_drift_blocks_provider_even_if_consumer_is_deferred(self) -> None:
        document = self._document()
        document["paths"]["/boards/{bo_table}/posts"] = {
            "get": {
                "operationId": "listPosts",
                "responses": {},
            }
        }
        scope = self._scope(
            admin_count=1,
            bootstrap_count=0,
            total_contract_count=2,
            general_board_count=1,
        )

        report = MODULE.build_audit(
            document,
            self._policy(),
            plugin_manifests={},
            scope=scope,
        )

        self.assertEqual("failed", report["status"])
        board_blocking = [
            item for item in report["findings"] if item.get("path", "").startswith("/boards/")
        ]
        board_deferred = [
            item
            for item in report["deferred_findings"]
            if item.get("path", "").startswith("/boards/")
        ]
        self.assertGreater(len(board_blocking), 0)
        self.assertEqual([], board_deferred)
        self.assertTrue(
            all(item["scope_classification"] == "protected_general_board" for item in board_blocking)
        )

    def test_public_auth_mutation_policy_is_explicitly_allowed(self) -> None:
        document = self._document()
        document["paths"]["/auth/login"] = {
            "post": {
                "operationId": "login",
                "security": [],
                "responses": {
                    "200": {
                        "description": "ok",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Envelope"}
                            }
                        },
                    },
                    "429": {"description": "rate"},
                    "500": {"description": "server"},
                },
            }
        }

        report = MODULE.build_audit(document, self._policy(), plugin_manifests={})
        auth_findings = [
            item
            for item in report["findings"]
            if item.get("path") == "/auth/login"
            and item["rule"] == "public_mutation_not_allowed"
        ]

        self.assertEqual([], auth_findings)

    def test_active_scope_exact_count_drift_fails_closed(self) -> None:
        report = MODULE.build_audit(
            self._document(),
            self._policy(),
            plugin_manifests={},
            scope=self._scope(admin_count=2, bootstrap_count=0),
        )
        rules = {item["rule"] for item in report["findings"]}

        self.assertEqual("failed", report["status"])
        self.assertIn("active_operation_count_mismatch", rules)
        self.assertIn("active_admin_operation_count_mismatch", rules)

    @staticmethod
    def _policy() -> dict:
        return {
            "schema": "gnuboard5.php.openapi-provider-audit-policy/v1",
            "active_scope": {
                "include_path_prefixes": ["/admin/"],
                "exclude_path_prefixes": ["/admin/shop/"],
            },
            "internal_path_prefixes": ["/admin-inspect/"],
            "required_internal_security_scheme": "adminInspectSecret",
            "generic_success_schema_names": ["MessageResponse"],
            "public_mutation_policy": {
                "allowed_path_prefixes": ["/auth/"],
                "allowed_operation_ids": ["preview"],
                "plugin_license_response_status": "402",
            },
            "request_contract": {
                "require_named_component_schema": True,
                "require_closed_object_schema": True,
                "require_explicit_required_list": True,
            },
            "response_contract": {
                "require_named_component_schema": True,
                "required_envelope_fields": ["data", "meta"],
                "require_server_error_or_default": True,
                "require_rate_limit_response": True,
                "require_location_header_for_201": True,
            },
            "error_contract": {
                "allowed_media_types": ["application/problem+json", "application/json"],
                "forbidden_media_types": ["text/html"],
            },
            "sensitive_property_name_patterns": ["_pw$"],
        }

    @staticmethod
    def _scope(
        admin_count: int,
        bootstrap_count: int,
        total_contract_count: int = 1,
        general_board_count: int = 0,
    ) -> dict:
        expected_operation_keys = ["POST /admin/items"]
        if general_board_count:
            expected_operation_keys.append("GET /boards/{bo_table}/posts")
        return {
            "schema": "gnuboard5.php.openapi-consumer-scope/v1",
            "scope_id": "test-admin",
            "contract_inventory": {
                "expected_total_operations": total_contract_count,
                "expected_operation_keys_sha256": hashlib.sha256(
                    "\n".join(sorted(expected_operation_keys)).encode("utf-8")
                ).hexdigest(),
                "expected_classification_counts": {
                    "active": total_contract_count - general_board_count,
                    "deferred_general_board": general_board_count,
                },
            },
            "active_scope": {
                "include_path_prefixes": ["/admin/"],
                "exclude_path_prefixes": ["/admin/shop/"],
                "include_operations": [],
                "expected_admin_non_shop_operations": admin_count,
                "expected_bootstrap_operations": bootstrap_count,
                "expected_total_operations": admin_count + bootstrap_count,
            },
            "deferred_scope": {
                "hard_fail": False,
                "classifications": [
                    {
                        "id": "general_board",
                        "include_path_prefixes": ["/boards/"],
                        "expected_operations": (
                            ["GET /boards/{bo_table}/posts"] if general_board_count else []
                        ),
                    }
                ],
                "fallback_classification": "non_admin",
            },
            "_path": "fixture-scope.json",
            "_sha256": "0" * 64,
        }

    @staticmethod
    def _document() -> dict:
        return {
            "openapi": "3.0.3",
            "info": {"title": "test", "version": "1"},
            "paths": {
                "/admin/items": {
                    "post": {
                        "operationId": "adminCreateItem",
                        "security": [{"bearerAuth": []}],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/ItemRequest"}
                                }
                            },
                        },
                        "responses": {
                            "201": {
                                "description": "created",
                                "headers": {
                                    "Location": {"schema": {"type": "string"}}
                                },
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Envelope"}
                                    }
                                },
                            },
                            "401": {"description": "unauthorized"},
                            "403": {"description": "forbidden"},
                            "429": {"description": "rate"},
                            "500": {"description": "server"},
                        },
                    }
                }
            },
            "components": {
                "securitySchemes": {
                    "bearerAuth": {"type": "http", "scheme": "bearer"}
                },
                "schemas": {
                    "ItemRequest": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["name"],
                        "properties": {"name": {"type": "string"}},
                    },
                    "Envelope": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["data", "meta"],
                        "properties": {
                            "data": {"$ref": "#/components/schemas/Item"},
                            "meta": {"type": "object"},
                        },
                    },
                    "Item": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["id", "name"],
                        "properties": {
                            "id": {"type": "integer"},
                            "name": {"type": "string"},
                        },
                    },
                    "MessageResponse": {
                        "type": "object",
                        "properties": {
                            "data": {"type": "object", "additionalProperties": True}
                        },
                    },
                },
            },
        }


if __name__ == "__main__":
    unittest.main()
