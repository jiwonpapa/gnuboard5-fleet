from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools.certification.verify_provider_tree import tree_manifest, verify_container


class ProviderTreeTests(unittest.TestCase):
    def test_same_size_same_mtime_edit_changes_fingerprint(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "module.php"
            path.write_text("root=5")
            os.utime(path, (0, 0))
            original = tree_manifest(root)
            path.write_text("root=6")
            os.utime(path, (0, 0))
            self.assertNotEqual(original, tree_manifest(root))

    def test_matching_runtime_bytes_are_required(self) -> None:
        entries = {"module.php": {"sha256": "a" * 64, "bytes": 6}}
        container = "g5-fleet-local-certification-fixture-g5-1"
        with mock.patch("tools.certification.verify_provider_tree.subprocess.run") as run:
            run.return_value = subprocess.CompletedProcess([], 0, '{"checked":1,"mismatches":[]}', '')
            verify_container(container, entries)
            run.return_value = subprocess.CompletedProcess([], 1, '{"checked":1,"mismatches":["module.php"]}', '')
            with self.assertRaisesRegex(RuntimeError, "running provider bytes differ"):
                verify_container(container, entries)
            run.return_value = subprocess.CompletedProcess([], 0, '{"checked":0,"mismatches":[]}', '')
            with self.assertRaisesRegex(RuntimeError, "running provider bytes differ"):
                verify_container(container, entries)

    def test_unrelated_container_and_symlinks_are_rejected(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "owned certification"):
            verify_container("production", {})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "link").symlink_to("missing.php")
            with self.assertRaisesRegex(RuntimeError, "symlinks"):
                tree_manifest(root)


if __name__ == "__main__":
    unittest.main()
