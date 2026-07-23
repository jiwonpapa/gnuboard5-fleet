from __future__ import annotations

import copy
import importlib.util
import sys
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/generate_openapi_contract_manifest.py"
SPEC = importlib.util.spec_from_file_location(
    "generate_openapi_contract_manifest", MODULE_PATH
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"failed to load module spec: {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class OpenApiContractManifestTest(unittest.TestCase):
    def test_unique_key_loader_resolves_yaml_merge_properties(self) -> None:
        document = yaml.load(
            """
base: &base
  name: {type: string}
properties:
  <<: *base
  count: {type: integer}
""",
            Loader=MODULE.UniqueKeyLoader,
        )

        self.assertEqual({'name', 'count'}, set(document['properties']))

    def test_all_openapi_operation_methods_are_manifested(self) -> None:
        operations = {
            method: {"operationId": f"probe_{method}", "responses": {"204": {}}}
            for method in ("get", "put", "post", "delete", "options", "head", "patch", "trace")
        }
        document = {
            "openapi": "3.1.0",
            "info": {"title": "test", "version": "1"},
            "paths": {"/admin/probe": operations},
            "components": {"schemas": {}},
        }

        manifest = MODULE.build_manifest(document)

        self.assertEqual(8, manifest["stats"]["operation_count"])
        self.assertEqual(
            {"GET", "PUT", "POST", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"},
            {item["method"] for item in manifest["operations"]},
        )

    def test_semantic_contract_mutations_change_manifest_fingerprint(self) -> None:
        document = self._semantic_document()
        baseline = MODULE.build_manifest(document)

        mutations = {
            "security": lambda value: value["paths"]["/admin/items/{item_id}"]["get"].update(
                {"security": []}
            ),
            "path_parameter": lambda value: value["paths"]["/admin/items/{item_id}"][
                "parameters"
            ][0]["schema"].update({"pattern": "^[A-Z]+$"}),
            "query_parameter": lambda value: value["paths"]["/admin/items/{item_id}"]["get"].update(
                {"parameters": []}
            ),
            "request_media_type": lambda value: value["paths"]["/admin/items/{item_id}"]["get"][
                "requestBody"
            ]["content"].update(
                {"application/problem+json": value["paths"]["/admin/items/{item_id}"]["get"]["requestBody"]["content"].pop("application/json")}
            ),
            "response_media_type": lambda value: value["paths"]["/admin/items/{item_id}"]["get"][
                "responses"
            ]["200"]["content"].update(
                {"application/problem+json": value["paths"]["/admin/items/{item_id}"]["get"]["responses"]["200"]["content"].pop("application/json")}
            ),
            "shared_response": lambda value: value["components"]["responses"]["BadRequest"].update(
                {"description": "changed"}
            ),
            "nested_schema": lambda value: value["components"]["schemas"]["Item"]["properties"][
                "name"
            ].update({"maxLength": 12}),
        }

        for label, mutate in mutations.items():
            with self.subTest(label=label):
                candidate = copy.deepcopy(document)
                mutate(candidate)
                mutated = MODULE.build_manifest(candidate)
                self.assertNotEqual(
                    baseline["fingerprint"],
                    mutated["fingerprint"],
                    label,
                )

    def test_operation_manifest_records_effective_contract_surface(self) -> None:
        operation = MODULE.build_manifest(self._semantic_document())["operations"][0]

        self.assertEqual(["bearerAuth"], operation["security_scheme_names"])
        self.assertEqual(
            [("item_id", "path"), ("page", "query")],
            [(item["name"], item["in"]) for item in operation["parameters"]],
        )
        self.assertEqual(["application/json"], operation["request_media_types"])
        self.assertEqual(
            ["application/json"],
            operation["responses"][0]["media_types"],
        )
        self.assertIsNotNone(operation["semantic_fingerprint"])

    @staticmethod
    def _semantic_document() -> dict:
        return {
            "openapi": "3.0.3",
            "info": {"title": "test", "version": "1"},
            "security": [{"bearerAuth": []}],
            "paths": {
                "/admin/items/{item_id}": {
                    "parameters": [
                        {
                            "name": "item_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "get": {
                        "operationId": "adminItem",
                        "parameters": [
                            {
                                "name": "page",
                                "in": "query",
                                "schema": {"type": "integer", "default": 1},
                            }
                        ],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Item"}
                                }
                            },
                        },
                        "responses": {
                            "200": {
                                "description": "ok",
                                "headers": {
                                    "ETag": {"schema": {"type": "string"}}
                                },
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Envelope"}
                                    }
                                },
                            },
                            "400": {"$ref": "#/components/responses/BadRequest"},
                        },
                    },
                }
            },
            "components": {
                "securitySchemes": {
                    "bearerAuth": {"type": "http", "scheme": "bearer"}
                },
                "responses": {
                    "BadRequest": {
                        "description": "bad request",
                        "content": {
                            "application/problem+json": {
                                "schema": {"type": "object"}
                            }
                        },
                    }
                },
                "schemas": {
                    "Item": {
                        "type": "object",
                        "required": ["name"],
                        "properties": {"name": {"type": "string"}},
                    },
                    "Envelope": {
                        "type": "object",
                        "required": ["data"],
                        "properties": {
                            "data": {"$ref": "#/components/schemas/Item"}
                        },
                    },
                },
            },
        }


if __name__ == "__main__":
    unittest.main()
