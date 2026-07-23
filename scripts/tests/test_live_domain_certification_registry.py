from __future__ import annotations

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
SCRIPT = ROOT / "scripts/check_live_domain_certification_registry.py"
SPEC = importlib.util.spec_from_file_location("check_live_domain_certification_registry", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class LiveDomainCertificationRegistryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = json.loads(
            (ROOT / "specs/integration/LIVE_DOMAIN_CERTIFICATION.json").read_text(
                encoding="utf-8"
            )
        )
        self.scope = json.loads(
            (ROOT / "specs/integration/ACTIVE_CONSUMER_SCOPE.json").read_text(
                encoding="utf-8"
            )
        )
        self.manifest = json.loads(
            MODULE.DEFAULT_OPENAPI_MANIFEST.read_text(encoding="utf-8")
        )

    def evaluate(self, registry=None):
        return MODULE.evaluate(registry or self.registry, self.scope, self.manifest)

    def domain(self, name: str, registry=None):
        source = registry or self.registry
        return next(item for item in source["domains"] if item["domain"] == name)

    def test_current_registry_is_exact_and_safe(self) -> None:
        report = self.evaluate()
        self.assertEqual("passed", report["status"], report["failures"])
        self.assertEqual(17, report["domain_count"])
        self.assertGreater(report["operation_count"], 0)

    def test_domain_inventory_cannot_shrink(self) -> None:
        registry = copy.deepcopy(self.registry)
        registry["domains"] = registry["domains"][:-1]
        report = self.evaluate(registry)
        self.assertTrue(any("domain inventory mismatch" in item for item in report["failures"]))

    def test_mutating_strategy_requires_cleanup(self) -> None:
        registry = copy.deepcopy(self.registry)
        self.domain("contents", registry)["operations"]["cleanup"] = []
        report = self.evaluate(registry)
        self.assertIn("contents: mutating mode requires cleanup operations", report["failures"])

    def test_external_delivery_cannot_be_moved_into_execution_plan(self) -> None:
        registry = copy.deepcopy(self.registry)
        self.domain("sms-messages", registry)["operations"]["mutate"] = [
            "adminCreateSmsMessage"
        ]
        report = self.evaluate(registry)
        self.assertTrue(
            any("external delivery operations cannot execute" in item for item in report["failures"])
        )

    def test_any_excluded_irreversible_operation_cannot_enter_execution_plan(self) -> None:
        registry = copy.deepcopy(self.registry)
        self.domain("members", registry)["operations"]["mutate"].append(
            "adminDeleteMember"
        )

        report = self.evaluate(registry)

        self.assertIn(
            "excluded irreversible operations cannot execute: adminDeleteMember",
            report["failures"],
        )

    def test_unknown_openapi_operation_fails_closed(self) -> None:
        registry = copy.deepcopy(self.registry)
        self.domain("menus", registry)["operations"]["readback"] = ["notAnOperation"]
        report = self.evaluate(registry)
        self.assertIn("menus: unknown OpenAPI operation=notAnOperation", report["failures"])

    def test_dependency_cycle_fails_closed(self) -> None:
        registry = copy.deepcopy(self.registry)
        self.domain("groups", registry)["depends_on"] = ["boards"]
        report = self.evaluate(registry)
        self.assertTrue(any("dependency cycle" in item for item in report["failures"]))


if __name__ == "__main__":
    unittest.main()
