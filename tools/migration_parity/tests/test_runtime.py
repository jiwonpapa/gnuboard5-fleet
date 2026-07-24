from __future__ import annotations

import json
import os
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest import mock

from tools.migration_parity.runtime import run_live_probes, validate_evidence_file


class RuntimeEvidenceTest(unittest.TestCase):
    def test_revision_mismatch_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_path = root / "output/evidence.json"
            evidence_path.parent.mkdir(parents=True)
            evidence_path.write_text(
                json.dumps(
                    {
                        "status": "PASS",
                        "git_revision": "b" * 40,
                        "generated_at": datetime.now(UTC).isoformat(),
                    }
                ),
                encoding="utf-8",
            )
            findings = validate_evidence_file(
                root,
                {"path": "output/evidence.json"},
                git_revision="a" * 40,
                max_age_hours=24,
                owner_id="fixture",
            )
            self.assertIn(
                "evidence.revision_mismatch",
                {finding.code for finding in findings},
            )

    def test_stale_evidence_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            evidence_path = root / "output/evidence.json"
            evidence_path.parent.mkdir(parents=True)
            evidence_path.write_text(
                json.dumps(
                    {
                        "status": "PASS",
                        "git_revision": "a" * 40,
                        "generated_at": (
                            datetime.now(UTC) - timedelta(hours=48)
                        ).isoformat(),
                    }
                ),
                encoding="utf-8",
            )
            findings = validate_evidence_file(
                root,
                {"path": "output/evidence.json"},
                git_revision="a" * 40,
                max_age_hours=24,
                owner_id="fixture",
            )
            self.assertIn("evidence.stale", {finding.code for finding in findings})

    def test_staging_requires_live_base_url(self) -> None:
        staging = {
            "base_url_env": "MIGRATION_PARITY_TEST_URL",
            "probes": [{"id": "ready", "path": "/readyz"}],
        }
        with mock.patch.dict(os.environ, {}, clear=True):
            probes, findings = run_live_probes(staging, git_revision="a" * 40)
        self.assertEqual([], probes)
        self.assertEqual("staging.base_url_missing", findings[0].code)
