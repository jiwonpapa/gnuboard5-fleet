from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "compose_gnuboard.py"
SPEC = importlib.util.spec_from_file_location("compose_gnuboard", MODULE_PATH)
assert SPEC and SPEC.loader
compose = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = compose
SPEC.loader.exec_module(compose)


def git(cwd: Path, *args: str) -> str:
    completed = subprocess.run(
        ("git", *args), cwd=cwd, check=True, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return completed.stdout.strip()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class RuntimeFixture:
    def __init__(self, base: Path) -> None:
        self.root = base / "fleet"
        self.root.mkdir()
        git(self.root, "init", "-b", "main")
        git(self.root, "config", "user.name", "Runtime Test")
        git(self.root, "config", "user.email", "runtime@example.invalid")

        upstream_work = base / "upstream-work"
        upstream_work.mkdir()
        git(upstream_work, "init", "-b", "main")
        git(upstream_work, "config", "user.name", "Runtime Test")
        git(upstream_work, "config", "user.email", "runtime@example.invalid")
        files = {
            "version.php": "<?php define('G5_GNUBOARD_VER', '1.2.3');\n",
            "LICENSE.txt": "fixture license\n",
            "adm/admin.php": "<?php // upstream admin\r\n",
            "install/install.php": "<?php // installer\n",
            "common.php": "<?php // upstream common\n",
        }
        for relative, content in files.items():
            path = upstream_work / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        git(upstream_work, "add", ".")
        git(upstream_work, "commit", "-m", "upstream")
        self.upstream_commit = git(upstream_work, "rev-parse", "HEAD")
        self.upstream_tree = git(upstream_work, "rev-parse", "HEAD^{tree}")
        self.upstream_remote = base / "upstream.git"
        git(base, "clone", "--bare", str(upstream_work), str(self.upstream_remote))
        checkout = self.root / ".cache/upstream/gnuboard5/v1.2.3"
        checkout.parent.mkdir(parents=True)
        git(base, "clone", "--no-checkout", str(self.upstream_remote), str(checkout))
        git(checkout, "fetch", "--force", "--no-tags", "origin", f"+{self.upstream_commit}:{compose.UPSTREAM_LOCKED_REF}")
        git(checkout, "checkout", "--detach", self.upstream_commit)

        connector = base / "connector"
        connector.mkdir()
        git(connector, "init", "-b", "main")
        git(connector, "config", "user.name", "Runtime Test")
        git(connector, "config", "user.email", "runtime@example.invalid")
        connector_files = {
            "composer.json": json.dumps({"name": "fixture/connector", "require": {"fixture/pkg": "1.0.0"}}),
            "composer.lock": json.dumps({
                "content-hash": "fixture",
                "packages": [{"name": "fixture/pkg", "version": "1.0.0"}],
                "packages-dev": [],
            }),
            "api/docs/openapi.yaml": "openapi: 3.0.3\n",
            "api/docs/openapi.contract-manifest.json": "{}\n",
            "adm/connector.php": "<?php // connector overlay\n",
        }
        for relative, content in connector_files.items():
            path = connector / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        git(connector, "add", ".")
        git(connector, "commit", "-m", "connector")
        self.connector_commit = git(connector, "rev-parse", "HEAD")
        self.connector_tree = git(connector, "rev-parse", "HEAD^{tree}")
        git(self.root, "fetch", str(connector), self.connector_commit)
        git(self.root, "read-tree", "--prefix=connectors/gnuboard5-php/", "-u", self.connector_commit)
        (self.root / ".gitattributes").write_text("* text=auto eol=lf\n", encoding="utf-8")
        git(self.root, "add", ".gitattributes")
        git(self.root, "commit", "-m", "import connector")

        policy = dict(compose.sync_gnuboard.REQUIRED_POLICY)
        lock = {
            "schema_version": 1,
            "policy": policy,
            "upstreams": [{
                "id": "gnuboard5", "kind": "git", "repository": str(self.upstream_remote),
                "version": "1.2.3", "ref": "refs/tags/v1.2.3",
                "commit": self.upstream_commit, "tree": self.upstream_tree,
                "version_probe": {"path": "version.php", "expected": "1.2.3", "sha256": digest(upstream_work / "version.php")},
                "license": {"path": "LICENSE.txt", "sha256": digest(upstream_work / "LICENSE.txt")},
            }],
        }
        (self.root / "UPSTREAMS.lock.json").write_text(json.dumps(lock), encoding="utf-8")
        provenance = {"sources": [{
            "id": "php-rest-api", "source_commit": self.connector_commit,
            "source_tree": self.connector_tree, "destination_prefix": "connectors/gnuboard5-php",
        }]}
        (self.root / "MIGRATION_PROVENANCE.json").write_text(json.dumps(provenance), encoding="utf-8")
        git(self.root, "add", "UPSTREAMS.lock.json", "MIGRATION_PROVENANCE.json")
        git(self.root, "commit", "-m", "lock runtime inputs")

        self.composer = base / "fake-composer"
        self.composer_args = base / "fake-composer-args.json"
        self.composer.write_text(
            "#!/usr/bin/env python3\n"
            "import json, pathlib, sys\n"
            "if '--version' in sys.argv:\n"
            " print('Composer fixture 1.0'); raise SystemExit(0)\n"
            "root=pathlib.Path.cwd(); lock=json.loads((root/'composer.lock').read_text())\n"
            f"pathlib.Path({str(self.composer_args)!r}).write_text(json.dumps(sys.argv[1:]))\n"
            "target=root/'vendor/composer'; target.mkdir(parents=True)\n"
            "packages=lock['packages']+lock['packages-dev']\n"
            "(target/'installed.json').write_text(json.dumps({'packages':packages}))\n"
            "(root/'vendor/autoload.php').write_text('<?php // fixture autoload\\n')\n",
            encoding="utf-8",
        )
        self.composer.chmod(0o755)


class ComposeRuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.fixture = RuntimeFixture(Path(self.temporary.name))

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_prepare_is_stale_free_and_offline_verify_is_fail_closed(self) -> None:
        payload = compose.prepare(self.fixture.root, str(self.fixture.composer))
        self.assertEqual("prepared", payload["status"])
        self.assertIn("--no-plugins", json.loads(self.fixture.composer_args.read_text()))
        runtime = self.fixture.root / compose.RUNTIME_RELATIVE
        self.assertTrue((runtime / "adm/admin.php").is_file())
        self.assertTrue((runtime / "adm/connector.php").is_file())
        self.assertTrue((runtime / "install/install.php").is_file())
        stale = runtime / "stale.php"
        stale.write_text("stale\n", encoding="utf-8")
        compose.prepare(self.fixture.root, str(self.fixture.composer))
        self.assertFalse(stale.exists())
        (runtime / ".phpunit.result.cache").write_text("{}\n", encoding="utf-8")
        generated = runtime / "output/admin-domain-pipeline/manifest-index.json"
        generated.parent.mkdir(parents=True)
        generated.write_text("{}\n", encoding="utf-8")
        compose.verify(self.fixture.root)

        stale.write_text("stale\n", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "file set mismatch"):
            compose.verify(self.fixture.root)
        stale.unlink()

        (runtime / "vendor/autoload.php").chmod(0o666)
        with self.assertRaisesRegex(RuntimeError, "unsafe runtime permissions"):
            compose.verify(self.fixture.root)

    def test_overlay_contract_mutation_and_path_traversal_are_rejected(self) -> None:
        compose.prepare(self.fixture.root, str(self.fixture.composer))
        runtime = self.fixture.root / compose.RUNTIME_RELATIVE
        (runtime / "api/docs/openapi.yaml").write_text("openapi: mutated\n", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "content/mode mismatch"):
            compose.verify(self.fixture.root)
        for value in ("../escape", "/absolute", "a\\b"):
            with self.subTest(value=value), self.assertRaisesRegex(RuntimeError, "unsafe source path"):
                compose.safe_relative(value)

    def test_git_symlink_entry_is_rejected(self) -> None:
        source = Path(self.temporary.name) / "symlink-source"
        source.mkdir()
        git(source, "init", "-b", "main")
        git(source, "config", "user.name", "Runtime Test")
        git(source, "config", "user.email", "runtime@example.invalid")
        (source / "real.txt").write_text("real\n", encoding="utf-8")
        os.symlink("real.txt", source / "link.txt")
        git(source, "add", ".")
        git(source, "commit", "-m", "symlink")
        with self.assertRaisesRegex(RuntimeError, "symlink Git entry"):
            compose.git_tree_entries(source, "HEAD", source)

    def test_cache_parent_symlink_is_rejected_without_external_write(self) -> None:
        cache = self.fixture.root / ".cache"
        external = Path(self.temporary.name) / "external-cache"
        cache.rename(external)
        os.symlink(external, cache)
        with self.assertRaisesRegex(RuntimeError, "cache path symlink"):
            compose.prepare(self.fixture.root, str(self.fixture.composer))
        self.assertFalse((external / "composed").exists())

    def test_composer_plugin_dependency_is_rejected(self) -> None:
        lock = {"packages": [{"name": "fixture/plugin", "version": "1.0.0", "type": "composer-plugin"}], "packages-dev": []}
        with self.assertRaisesRegex(RuntimeError, "Composer plugins are forbidden"):
            compose.expected_packages(lock)


if __name__ == "__main__":
    unittest.main()
