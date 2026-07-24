from __future__ import annotations

import importlib.util
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


if __name__ == "__main__":
    unittest.main()
