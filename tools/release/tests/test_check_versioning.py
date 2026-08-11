from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "check_versioning.py"
SPEC = importlib.util.spec_from_file_location("check_versioning", MODULE_PATH)
assert SPEC and SPEC.loader
versioning = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = versioning
SPEC.loader.exec_module(versioning)


class VersioningTests(unittest.TestCase):
    def test_semver_accepts_release_prerelease_and_build_metadata(self) -> None:
        self.assertEqual(1, versioning.parse_semver("1.2.3").major)
        self.assertEqual("rc.1", versioning.parse_semver("1.2.3-rc.1+sha.abc").prerelease)
        for invalid in ("v1.2.3", "1.2", "01.2.3", "1.2.3-01", "1.2.3+"):
            with self.subTest(invalid=invalid):
                with self.assertRaises(versioning.VersioningError):
                    versioning.parse_semver(invalid)

    def test_repository_versions_and_unreleased_changelog_are_consistent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = self.fixture(Path(directory))
            result = versioning.check_repository(root)
            self.assertEqual("0.1.0", result["canonical_version"])
            self.assertEqual([], result["released_changelog_versions"])

    def test_release_requires_matching_version_and_finalized_changelog_section(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = self.fixture(Path(directory))
            with self.assertRaisesRegex(versioning.VersioningError, "not finalized"):
                versioning.check_repository(root, "0.1.0")
            (root / "CHANGELOG.md").write_text(
                self.changelog()
                + "\n## [0.1.0] - 2026-08-11\n\n### Added\n\n- First release.\n"
                + "\n[0.1.0]: https://example.test/releases/tag/v0.1.0\n",
                encoding="utf-8",
            )
            self.assertEqual(
                "0.1.0",
                versioning.check_repository(root, "0.1.0")["release_version"],
            )
            with self.assertRaisesRegex(versioning.VersioningError, "does not match"):
                versioning.check_repository(root, "0.2.0")
            with self.assertRaisesRegex(versioning.VersioningError, "build metadata"):
                versioning.check_repository(root, "0.1.0+sha.abc")

    def test_version_drift_and_unknown_changelog_type_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = self.fixture(Path(directory))
            package = json.loads((root / "apps/admin-web/package.json").read_text())
            package["version"] = "0.2.0"
            (root / "apps/admin-web/package.json").write_text(json.dumps(package))
            with self.assertRaisesRegex(versioning.VersioningError, "version drift"):
                versioning.check_repository(root)

        with tempfile.TemporaryDirectory() as directory:
            root = self.fixture(Path(directory))
            (root / "CHANGELOG.md").write_text(
                self.changelog().replace("### Added", "### Improvements"),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(versioning.VersioningError, "unsupported"):
                versioning.check_repository(root)

    @staticmethod
    def changelog() -> str:
        return """# Changelog

Keep a Changelog https://keepachangelog.com/ko/1.1.0/
Semantic Versioning https://semver.org/lang/ko/

## [Unreleased]

### Added

- Version policy.

[Unreleased]: https://example.test/commits/main
"""

    @classmethod
    def fixture(cls, root: Path) -> Path:
        members = ["apps/admin-server", "crates/fleet-core"]
        (root / "apps/admin-server").mkdir(parents=True)
        (root / "apps/admin-web").mkdir(parents=True)
        (root / "crates/fleet-core").mkdir(parents=True)
        (root / "deploy/compose").mkdir(parents=True)
        (root / "Cargo.toml").write_text(
            '[workspace]\nmembers = ["apps/admin-server", "crates/fleet-core"]\n'
            '[workspace.package]\nversion = "0.1.0"\n',
            encoding="utf-8",
        )
        for member, name in zip(members, ("g5-fleet-admin-server", "g5-fleet-core")):
            (root / member / "Cargo.toml").write_text(
                f'[package]\nname = "{name}"\nversion.workspace = true\n',
                encoding="utf-8",
            )
        (root / "Cargo.lock").write_text(
            'version = 4\n\n[[package]]\nname = "g5-fleet-admin-server"\nversion = "0.1.0"\n'
            '\n[[package]]\nname = "g5-fleet-core"\nversion = "0.1.0"\n',
            encoding="utf-8",
        )
        (root / "apps/admin-web/package.json").write_text(
            json.dumps({"version": "0.1.0"}), encoding="utf-8"
        )
        (root / "deploy/compose/.env.example").write_text(
            "G5_FLEET_VERSION=0.1.0\n", encoding="utf-8"
        )
        (root / "CHANGELOG.md").write_text(cls.changelog(), encoding="utf-8")
        return root


if __name__ == "__main__":
    unittest.main()
