import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "prune_build_artifacts.sh"


class PruneBuildArtifactsTests(unittest.TestCase):
    def make_fixture(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        scripts = root / "scripts"
        scripts.mkdir()
        fixture_script = scripts / SCRIPT.name
        shutil.copy2(SCRIPT, fixture_script)
        (root / "g5-admin" / "src-tauri").mkdir(parents=True)
        return temporary, fixture_script

    def run_auto(self, script: Path, *, warn_mib: int) -> subprocess.CompletedProcess[str]:
        env = {
            **os.environ,
            "G5_BUILD_CACHE_WARN_MIB": str(warn_mib),
        }
        return subprocess.run(
            [str(script), "--auto"],
            check=False,
            capture_output=True,
            text=True,
            env=env,
        )

    def test_auto_preserves_incremental_cache_below_warning_limit(self):
        temporary, script = self.make_fixture()
        self.addCleanup(temporary.cleanup)
        incremental = Path(temporary.name) / "target" / "debug" / "incremental"
        incremental.mkdir(parents=True)
        (incremental / "small.bin").write_bytes(b"small")

        result = self.run_auto(script, warn_mib=16)

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertTrue(incremental.is_dir())
        self.assertIn("build cache preserved", result.stdout)

    def test_auto_preserves_incremental_cache_above_warning_limit(self):
        temporary, script = self.make_fixture()
        self.addCleanup(temporary.cleanup)
        target = Path(temporary.name) / "target" / "debug"
        incremental = target / "incremental"
        deps = target / "deps"
        incremental.mkdir(parents=True)
        deps.mkdir()
        (incremental / "stale.bin").write_bytes(b"x" * 2 * 1024 * 1024)
        (deps / "reusable.rlib").write_bytes(b"keep")

        result = self.run_auto(script, warn_mib=1)

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertTrue((incremental / "stale.bin").is_file())
        self.assertTrue((deps / "reusable.rlib").is_file())
        self.assertIn("WARN: build cache preserved despite size", result.stdout)


if __name__ == "__main__":
    unittest.main()
