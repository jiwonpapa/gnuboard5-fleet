from __future__ import annotations

import copy
import hashlib
import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "sync_gnuboard.py"
SPEC = importlib.util.spec_from_file_location("sync_gnuboard", MODULE_PATH)
assert SPEC and SPEC.loader
sync_gnuboard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync_gnuboard)


def git(*args: str, cwd: Path) -> str:
    completed = subprocess.run(
        ("git", *args), cwd=cwd, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    return completed.stdout.strip()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class UpstreamFixture:
    def __init__(self, root: Path) -> None:
        self.work = root / "work"
        self.remote = root / "remote.git"
        self.checkout = root / "checkout"
        self.work.mkdir()
        git("init", cwd=self.work)
        git("config", "user.name", "Audit Test", cwd=self.work)
        git("config", "user.email", "audit@example.invalid", cwd=self.work)
        (self.work / "version.php").write_text(
            "<?php define('G5_GNUBOARD_VER', '1.2.3');\n", encoding="utf-8"
        )
        (self.work / "LICENSE.txt").write_text("test license\n", encoding="utf-8")
        git("add", "version.php", "LICENSE.txt", cwd=self.work)
        git("commit", "-m", "pinned", cwd=self.work)
        self.pinned_commit = git("rev-parse", "HEAD", cwd=self.work)
        self.pinned_tree = git("rev-parse", "HEAD^{tree}", cwd=self.work)
        git("tag", "v1.2.3", cwd=self.work)
        (self.work / "later.txt").write_text("later\n", encoding="utf-8")
        git("add", "later.txt", cwd=self.work)
        git("commit", "-m", "later", cwd=self.work)
        self.later_commit = git("rev-parse", "HEAD", cwd=self.work)
        git("clone", "--bare", str(self.work), str(self.remote), cwd=root)
        git("clone", "--no-checkout", str(self.remote), str(self.checkout), cwd=root)

    def upstream(self) -> dict[str, object]:
        return {
            "id": "gnuboard5",
            "kind": "git",
            "repository": str(self.remote),
            "version": "1.2.3",
            "ref": "refs/tags/v1.2.3",
            "commit": self.pinned_commit,
            "tree": self.pinned_tree,
            "version_probe": {
                "path": "version.php",
                "expected": "1.2.3",
                "sha256": digest(self.work / "version.php"),
            },
            "license": {
                "path": "LICENSE.txt",
                "sha256": digest(self.work / "LICENSE.txt"),
            },
        }


def lock(upstream: dict[str, object]) -> dict[str, object]:
    return {
        "schema_version": 1,
        "policy": copy.deepcopy(sync_gnuboard.REQUIRED_POLICY),
        "upstreams": [upstream],
    }


class LockValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.fixture = UpstreamFixture(Path(self.temp.name))

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_valid_lock(self) -> None:
        upstream = self.fixture.upstream()
        self.assertEqual(sync_gnuboard.validate_lock(lock(upstream)), upstream)

    def test_policy_mutations_fail_closed(self) -> None:
        for key, expected in sync_gnuboard.REQUIRED_POLICY.items():
            with self.subTest(key=key):
                payload = lock(self.fixture.upstream())
                payload["policy"][key] = not expected if isinstance(expected, bool) else "other"
                with self.assertRaisesRegex(RuntimeError, "policy mismatch"):
                    sync_gnuboard.validate_lock(payload)

    def test_ref_and_version_probe_mutations_fail_closed(self) -> None:
        mutations = (
            ("ref", "refs/heads/main", "ref must match"),
            ("probe", "9.9.9", "expected must equal"),
        )
        for field, value, message in mutations:
            with self.subTest(field=field):
                payload = lock(self.fixture.upstream())
                if field == "ref":
                    payload["upstreams"][0]["ref"] = value
                else:
                    payload["upstreams"][0]["version_probe"]["expected"] = value
                with self.assertRaisesRegex(RuntimeError, message):
                    sync_gnuboard.validate_lock(payload)


class CheckoutVerificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.fixture = UpstreamFixture(Path(self.temp.name))
        self.upstream = self.fixture.upstream()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_fetched_tag_must_resolve_to_locked_commit(self) -> None:
        mutated = copy.deepcopy(self.upstream)
        mutated["commit"] = self.fixture.later_commit
        with self.assertRaisesRegex(RuntimeError, "locked ref commit mismatch"):
            sync_gnuboard.fetch_locked_ref(self.fixture.checkout, mutated)

    def test_fetch_and_offline_verification_bind_ref_origin_commit_and_tree(self) -> None:
        sync_gnuboard.fetch_locked_ref(self.fixture.checkout, self.upstream)
        git("checkout", "--detach", str(self.upstream["commit"]), cwd=self.fixture.checkout)
        result = sync_gnuboard.verify_checkout(self.fixture.checkout, self.upstream)
        self.assertEqual(result["ref_commit"], self.upstream["commit"])
        self.assertEqual(result["commit"], self.upstream["commit"])

    def test_origin_repository_mutation_fails_closed(self) -> None:
        sync_gnuboard.fetch_locked_ref(self.fixture.checkout, self.upstream)
        git("checkout", "--detach", str(self.upstream["commit"]), cwd=self.fixture.checkout)
        other = Path(self.temp.name) / "other.git"
        git("init", "--bare", str(other), cwd=Path(self.temp.name))
        git("remote", "set-url", "origin", str(other), cwd=self.fixture.checkout)
        with self.assertRaisesRegex(RuntimeError, "origin repository mismatch"):
            sync_gnuboard.verify_checkout(self.fixture.checkout, self.upstream)

    def test_cached_ref_mutation_fails_closed(self) -> None:
        sync_gnuboard.fetch_locked_ref(self.fixture.checkout, self.upstream)
        git("checkout", "--detach", str(self.upstream["commit"]), cwd=self.fixture.checkout)
        git("update-ref", sync_gnuboard.LOCKED_REF, self.fixture.later_commit, cwd=self.fixture.checkout)
        with self.assertRaisesRegex(RuntimeError, "cached locked ref mismatch"):
            sync_gnuboard.verify_checkout(self.fixture.checkout, self.upstream)

    def test_cache_parent_symlink_is_rejected_without_external_git_write(self) -> None:
        fleet = Path(self.temp.name) / "fleet"
        fleet.mkdir()
        external = Path(self.temp.name) / "external-cache"
        external.mkdir()
        os.symlink(external, fleet / ".cache")
        with self.assertRaisesRegex(RuntimeError, "cache path symlink"):
            sync_gnuboard.sync_checkout(fleet, self.upstream, verify_only=False)
        self.assertEqual([], list(external.iterdir()))


if __name__ == "__main__":
    unittest.main()
