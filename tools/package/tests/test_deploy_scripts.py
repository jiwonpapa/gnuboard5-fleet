from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
COMMON = ROOT / "deploy/scripts/common.sh"


def preserved(before: str, after: str) -> bool:
    completed = subprocess.run(
        (
            "sh",
            "-c",
            '. "$1"; critical_readback_preserved "$2" "$3"',
            "test-critical-readback",
            str(COMMON),
            before,
            after,
        ),
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return completed.returncode == 0


class DeployScriptTests(unittest.TestCase):
    def test_readback_accepts_zero_count_added_by_new_schema(self) -> None:
        before = '{"users":1,"sites":2,"audit_entries":3}'
        after = (
            '{"users":1,"sites":2,"web_push_subscriptions":0,'
            '"audit_entries":3}'
        )
        self.assertTrue(preserved(before, after))

    def test_readback_rejects_changed_or_missing_existing_count(self) -> None:
        before = '{"users":1,"sites":2,"audit_entries":3}'
        self.assertFalse(
            preserved(before, '{"users":0,"sites":2,"audit_entries":3}')
        )
        self.assertFalse(preserved(before, '{"users":1,"sites":2}'))

    def test_readback_rejects_noncanonical_payload(self) -> None:
        self.assertFalse(preserved('{"users":1}', '{"users":"1"}'))


if __name__ == "__main__":
    unittest.main()
