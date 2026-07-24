from __future__ import annotations

import importlib.util
import json
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "build_connector_package.py"
SPEC = importlib.util.spec_from_file_location("build_connector_package", MODULE_PATH)
assert SPEC and SPEC.loader
package = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = package
SPEC.loader.exec_module(package)


class PackageToolTests(unittest.TestCase):
    def test_production_package_inventory_rejects_plugins_and_ignores_dev(self) -> None:
        lock = {
            "packages": [
                {
                    "name": "example/runtime",
                    "version": "1.2.3",
                    "type": "library",
                }
            ],
            "packages-dev": [
                {
                    "name": "example/test",
                    "version": "9.9.9",
                    "type": "library",
                }
            ],
        }
        self.assertEqual(["example/runtime"], [row["name"] for row in package.production_packages(lock)])
        lock["packages"][0]["type"] = "composer-plugin"
        with self.assertRaisesRegex(RuntimeError, "plugins are forbidden"):
            package.production_packages(lock)

    def test_deterministic_archive_has_fixed_metadata_and_no_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "root"
            root.mkdir()
            (root / "api").mkdir()
            (root / "api/index.php").write_text("<?php\n", encoding="utf-8")
            (root / "manifest.json").write_text("{}\n", encoding="utf-8")
            first = Path(directory) / "first.tar.gz"
            second = Path(directory) / "second.tar.gz"
            package.write_deterministic_tar(root, first)
            package.write_deterministic_tar(root, second)
            self.assertEqual(package.sha256(first), package.sha256(second))
            with tarfile.open(first, "r:gz") as archive:
                members = archive.getmembers()
                self.assertEqual(["api/index.php", "manifest.json"], [row.name for row in members])
                self.assertTrue(all(row.uid == 0 and row.gid == 0 and row.mtime == 0 for row in members))

            (root / "unsafe").symlink_to(root / "manifest.json")
            with self.assertRaisesRegex(RuntimeError, "symlink is forbidden"):
                package.write_deterministic_tar(root, Path(directory) / "unsafe.tar.gz")

    def test_sbom_contains_production_components_only(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "sbom.json"
            package.write_sbom(
                output,
                "1.0.0",
                [
                    {
                        "name": "slim/slim",
                        "version": "4.15.2",
                        "license": ["MIT"],
                    }
                ],
            )
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual("CycloneDX", payload["bomFormat"])
            self.assertEqual("slim/slim", payload["components"][0]["name"])


if __name__ == "__main__":
    unittest.main()
