from __future__ import annotations

import importlib.util
import hashlib
import os
import sys
import tempfile
import unittest
from pathlib import Path


def load(name: str):
    path = Path(__file__).resolve().parents[1] / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


local_runtime = load("local_runtime_smoke")
staging = load("staging_smoke")
receipt = load("staging_receipt")


class CertificationToolTests(unittest.TestCase):
    def test_local_session_parser_is_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            session = root / "session.env"
            session.write_text("VALID_KEY=value\nSECOND=two\n", encoding="utf-8")
            self.assertEqual("value", local_runtime.load_env(session)["VALID_KEY"])
            session.write_text("not valid\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "invalid line"):
                local_runtime.load_env(session)
            target = root / "target.env"
            target.write_text("VALID_KEY=value\n", encoding="utf-8")
            session.unlink()
            os.symlink(target, session)
            with self.assertRaisesRegex(RuntimeError, "missing or unsafe"):
                local_runtime.load_env(session)

    def test_local_http_client_rejects_non_loopback(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "must be loopback"):
            local_runtime.request("http://example.com", "GET", "/readyz")
        with self.assertRaisesRegex(RuntimeError, "must be loopback"):
            local_runtime.request("https://127.0.0.1:8443", "GET", "/readyz")

    def test_staging_client_requires_credential_free_https(self) -> None:
        for value in (
            "http://staging.example.com",
            "https://user@example.com",
            "https://staging.example.com?query=1",
        ):
            with self.subTest(value=value), self.assertRaisesRegex(
                RuntimeError, "credential-free HTTPS origin"
            ):
                staging.https_json(value, "/readyz")

    def test_staging_deployment_receipt_binds_runtime_to_release(self) -> None:
        release = {
            "schema": "g5-fleet.package-release/v1",
            "status": "passed",
            "version": "b10-test",
            "revision": "a" * 40,
            "image_id": f"sha256:{'b' * 64}",
        }
        readback = {
            "schema": "g5-fleet.version/v1",
            "image_version": "b10-test",
            "build_revision": "a" * 40,
        }
        payload = receipt.deployment_receipt("provider:test", release, readback)
        self.assertEqual("passed", payload["status"])
        self.assertEqual(release["image_id"], payload["image_id"])
        readback["build_revision"] = "c" * 40
        with self.assertRaisesRegex(RuntimeError, "version/revision readback mismatch"):
            receipt.deployment_receipt("provider:test", release, readback)

    def test_staging_rollback_receipt_requires_snapshot_and_exact_readback(self) -> None:
        release = {
            "schema": "g5-fleet.package-release/v1",
            "status": "passed",
            "version": "b10-test",
            "revision": "a" * 40,
            "image_id": f"sha256:{'b' * 64}",
        }
        readback = {"users": 1, "sites": 2, "outbox": 0, "jobs": 0, "audit_entries": 4}
        with tempfile.TemporaryDirectory() as directory:
            snapshot = Path(directory) / "backup.sqlite3"
            snapshot.write_bytes(b"verified sqlite snapshot")
            manifest = {
                "schema": "g5-fleet.backup/v1",
                "method": "sqlite-vacuum-into",
                "snapshot_sha256": hashlib.sha256(snapshot.read_bytes()).hexdigest(),
                "server_version": release["version"],
                "git_sha": release["revision"],
                "readback": readback,
            }
            payload = receipt.rollback_receipt(
                "provider:test",
                release,
                snapshot,
                manifest,
                readback,
                "missing-staging-aaaaaaaaaaaa",
            )
            self.assertTrue(payload["backup_restore_readback"])
            self.assertTrue(payload["rollback_from_failed_upgrade"])
            with self.assertRaisesRegex(RuntimeError, "snapshot/readback mismatch"):
                receipt.rollback_receipt(
                    "provider:test",
                    release,
                    snapshot,
                    manifest,
                    {**readback, "users": 0},
                    "missing-staging-aaaaaaaaaaaa",
                )


if __name__ == "__main__":
    unittest.main()
