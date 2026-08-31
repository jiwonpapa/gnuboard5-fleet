from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path

from tools.certification.regression_capture import bind_regressions, named_check_matches, parse_libtest, parse_vitest


class RegressionCaptureTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.web = "apps/admin-web/src/fixture.test.tsx"
        self.report = {
            "success": True, "numFailedTests": 0, "numTotalTests": 1, "numPassedTests": 1,
            "testResults": [{"name": str(self.root / self.web), "status": "passed", "assertionResults": [
                {"fullName": "fixture preserves site isolation", "status": "passed"},
            ]}],
        }

    def test_real_named_vitest_case_is_retained(self) -> None:
        self.assertEqual([{"runner": "vitest", "file": self.web, "name": "fixture preserves site isolation"}], parse_vitest(self.root, self.report))

    def test_vitest_fail_skip_empty_duplicate_and_total_mismatch_are_rejected(self) -> None:
        for kind in ("fail", "skip", "empty", "duplicate", "total", "outside"):
            report = copy.deepcopy(self.report)
            suite = report["testResults"][0]
            if kind == "fail":
                report["success"] = False
            elif kind == "skip":
                suite["assertionResults"][0]["status"] = "pending"
            elif kind == "empty":
                suite["assertionResults"] = []
            elif kind == "duplicate":
                suite["assertionResults"] *= 2
            elif kind == "total":
                report["numTotalTests"] = 2
            else:
                suite["name"] = str(self.root / "products/admin-desktop/fixture.test.tsx")
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                parse_vitest(self.root, report)

    def test_libtest_ignored_remote_case_is_not_pass(self) -> None:
        output = "test scopes_work ... ok\ntest remote ... ignored, needs host\n\ntest result: ok. 1 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.00s\n"
        passed, ignored = parse_libtest(output, "crates/fleet-core/src/lib.rs")
        self.assertEqual(["scopes_work"], [row["name"] for row in passed])
        self.assertEqual(["remote"], ignored)

    def test_libtest_truncation_failure_filtered_and_duplicate_fail(self) -> None:
        good = "test scopes_work ... ok\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n"
        for output in ("test scopes_work ... ok\n", good.replace("1 passed", "2 passed"), good.replace("0 filtered", "1 filtered"), good.replace("... ok", "... FAILED"), good + good):
            with self.subTest(output=output), self.assertRaises(ValueError):
                parse_libtest(output, "fixture.rs")

    def test_frontend_test_file_requires_all_replacement_suites(self) -> None:
        executed = parse_vitest(self.root, self.report)
        mapping = {"legacy_id": "old.test.tsx", "test_paths": [self.web], "checks": []}
        manifest = {"mappings": {"frontend_tests": [mapping], "react_pages": [mapping]}}
        cases, missing = bind_regressions(self.root, manifest, executed)
        self.assertEqual(1, len(cases))
        self.assertEqual({"frontend_tests": []}, missing)
        self.assertEqual("frontend_tests", cases[0]["subjects"][0]["category"])
        mapping["test_paths"].append("apps/admin-web/src/not-run.test.ts")
        self.assertEqual([], bind_regressions(self.root, manifest, executed)[0])

    def test_other_items_need_one_unambiguous_executed_test_name(self) -> None:
        executed = parse_vitest(self.root, self.report)
        mapping = {"legacy_id": "command", "test_paths": [self.web], "checks": [{"path": self.web, "contains": "preserves site isolation"}]}
        manifest = {"mappings": {"tauri_commands": [mapping]}}
        self.assertEqual(1, len(bind_regressions(self.root, manifest, executed)[0]))
        self.assertEqual([], bind_regressions(self.root, manifest, executed * 2)[0])
        mapping["checks"][0]["contains"] = "describe("
        self.assertEqual([], bind_regressions(self.root, manifest, executed)[0])
        mapping["checks"][0] = {"path": "apps/admin-web/src/impl.ts", "contains": "preserves site isolation"}
        self.assertEqual([], bind_regressions(self.root, manifest, executed)[0])

    def test_rust_child_module_name_and_source_must_match(self) -> None:
        source = "crates/fleet-security/src/auth.rs"
        path = self.root / source
        path.parent.mkdir(parents=True)
        path.write_text("fn verifies_secret_shape() {}")
        case = {"runner": "libtest", "file": "crates/fleet-security/src/lib.rs", "name": "auth::tests::verifies_secret_shape"}
        check = {"path": source, "contains": "fn verifies_secret_shape"}
        self.assertTrue(named_check_matches(self.root, check, case))
        case["name"] = "other::tests::verifies_secret_shape"
        self.assertFalse(named_check_matches(self.root, check, case))
        case["file"] = "crates/fleet-store/src/lib.rs"
        self.assertFalse(named_check_matches(self.root, check, case))


if __name__ == "__main__":
    unittest.main()
