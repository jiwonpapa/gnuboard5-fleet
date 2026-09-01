from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.certification.browser_runtime import (
    PNG_SIGNATURE,
    raw_browser_artifacts,
    validate_browser_cases,
)


class BrowserRuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        manifest = self.root / "governance/MIGRATION_PARITY.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text(json.dumps({
            "mappings": {"react_pages": [{"legacy_id": "sites/Page.tsx"}]},
        }))
        self.inputs = {"openapi_sha256": "a" * 64, "upstream_commit": "b" * 40}
        self.revision = "c" * 40

    def artifact(self, name: str, content: bytes) -> dict[str, object]:
        path = self.root / "output" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return {
            "path": path.relative_to(self.root).as_posix(),
            "sha256": hashlib.sha256(content).hexdigest(),
            "bytes": len(content),
        }

    def source(self, dom: bytes = b"Connector ok") -> dict[str, object]:
        return {
            "schema": "g5-fleet.execution-cases/v1",
            "status": "PASS",
            "git_revision": self.revision,
            "inputs": self.inputs,
            "driver": "codex-in-app-browser",
            "parent_run_id": "browser-parent",
            "run_id": "browser-cases",
            "generated_at": "2026-09-01T00:00:00+00:00",
            "cases": [{
                "id": "browser:site",
                "status": "PASS",
                "kind": "browser_workflow",
                "subjects": [{"category": "react_pages", "item_id": "sites/Page.tsx"}],
                "assertions": ["Connector ok"],
                "negative_assertions": ["fixture-present"],
                "actions": ["login and read back"],
                "artifacts": [
                    self.artifact("site.txt", dom),
                    self.artifact("site.png", PNG_SIGNATURE + b"fixture"),
                ],
            }],
        }

    def test_accepts_hash_bound_dom_png_and_exact_page_subject(self) -> None:
        source = self.source()
        self.assertEqual(
            {"cases": 1, "react_pages": 1},
            validate_browser_cases(
                self.root,
                source,
                revision=self.revision,
                inputs=self.inputs,
                secrets={"super-secret"},
            ),
        )
        self.assertEqual(source["cases"][0]["artifacts"], raw_browser_artifacts(source))

    def test_rejects_timezone_free_timestamp(self) -> None:
        source = self.source()
        source["generated_at"] = "2026-09-01T00:00:00"
        with self.assertRaisesRegex(ValueError, "timezone"):
            validate_browser_cases(
                self.root,
                source,
                revision=self.revision,
                inputs=self.inputs,
                secrets=set(),
            )

    def test_rejects_unknown_page_and_secret_bearing_dom(self) -> None:
        source = self.source(b"Connector ok super-secret")
        with self.assertRaisesRegex(ValueError, "certification secret"):
            validate_browser_cases(
                self.root,
                source,
                revision=self.revision,
                inputs=self.inputs,
                secrets={"super-secret"},
            )
        source = self.source()
        source["cases"][0]["subjects"][0]["item_id"] = "sites/Unknown.tsx"
        with self.assertRaisesRegex(ValueError, "unknown React page"):
            validate_browser_cases(
                self.root,
                source,
                revision=self.revision,
                inputs=self.inputs,
                secrets=set(),
            )

    def test_rejects_missing_assertion_and_negative_readback(self) -> None:
        with self.assertRaisesRegex(ValueError, "claimed assertion"):
            validate_browser_cases(
                self.root,
                self.source(b"not observed"),
                revision=self.revision,
                inputs=self.inputs,
                secrets=set(),
            )
        with self.assertRaisesRegex(ValueError, "forbidden negative"):
            validate_browser_cases(
                self.root,
                self.source(b"Connector ok fixture-present"),
                revision=self.revision,
                inputs=self.inputs,
                secrets=set(),
            )


if __name__ == "__main__":
    unittest.main()
