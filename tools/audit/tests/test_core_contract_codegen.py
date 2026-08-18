from __future__ import annotations

import unittest

from tools.codegen.generate_core_contract import schema_required_fields


class CoreContractCodegenTest(unittest.TestCase):
    def test_alternative_branches_only_require_their_intersection(self) -> None:
        document = {"components": {"schemas": {}}}
        schema = {
            "type": "object",
            "required": ["subject"],
            "anyOf": [
                {"required": ["options"]},
                {"required": ["choice1", "choice2"]},
            ],
        }

        self.assertEqual({"subject"}, schema_required_fields(document, schema))

    def test_all_of_accumulates_requirements(self) -> None:
        document = {"components": {"schemas": {}}}
        schema = {
            "required": ["base"],
            "allOf": [
                {"required": ["first"]},
                {"required": ["second"]},
            ],
        }

        self.assertEqual(
            {"base", "first", "second"},
            schema_required_fields(document, schema),
        )
