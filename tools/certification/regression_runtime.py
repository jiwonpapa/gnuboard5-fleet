"""Run active Web/Rust tests and produce revision-bound replacement evidence."""

from __future__ import annotations

import json
import os
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path

from tools.certification.execution_capture import clean_revision, write_json
from tools.certification.regression_capture import artifact, bind_regressions, parse_libtest, parse_vitest
from tools.migration_parity.execution import CASE_SCHEMA, EXECUTION_SCHEMA, execution_inputs

ROOT = Path(__file__).resolve().parents[2]


def run(command: list[str], cwd: Path, output: Path) -> str:
    with output.open("x", encoding="utf-8") as handle:
        completed = subprocess.run(
            command, cwd=cwd, env={**os.environ, "CARGO_NET_OFFLINE": "true", "NO_COLOR": "1"},
            stdout=handle, stderr=subprocess.STDOUT, text=True, check=False,
        )
    if completed.returncode:
        raise RuntimeError(f"regression command failed: {command[0]} (see {output.relative_to(ROOT)})")
    return output.read_text(encoding="utf-8")


def main() -> int:
    revision, inputs = clean_revision(ROOT), execution_inputs(ROOT)
    run_id = f"r36-regression-{uuid.uuid4().hex}"
    directory = ROOT / "output/certification/r36" / run_id
    directory.mkdir(parents=True, exist_ok=False)
    print(f"REGRESSION_STARTED {run_id}", flush=True)

    web_json = directory / "vitest.json"
    run(["bun", "run", "test", "--reporter=json", f"--outputFile={web_json}"], ROOT / "apps/admin-web", directory / "vitest.log")
    executed = parse_vitest(ROOT, json.loads(web_json.read_bytes()))
    print(f"REGRESSION_WEB_PASS {len(executed)} cases", flush=True)
    build = run(["cargo", "test", "--workspace", "--locked", "--offline", "--no-run", "--message-format=json"], ROOT, directory / "cargo-build.jsonl")
    binaries = {}
    for line in build.splitlines():
        if not line.startswith("{"):
            continue
        row = json.loads(line)
        if row.get("reason") == "compiler-artifact" and row.get("profile", {}).get("test") and row.get("executable"):
            path = Path(row["executable"])
            if not path.resolve().is_relative_to(ROOT / "target") or path.is_symlink():
                raise RuntimeError("Cargo test executable is outside the active target directory")
            binaries[path] = Path(row["target"]["src_path"]).relative_to(ROOT).as_posix()
    if not binaries:
        raise RuntimeError("Cargo emitted no executable test artifacts")
    ignored = []
    for index, (binary, source) in enumerate(sorted(binaries.items())):
        content = run([str(binary), "--test-threads=1"], ROOT, directory / f"libtest-{index:02d}.log")
        passed, skipped = parse_libtest(content, source)
        executed.extend(passed)
        ignored.extend({"file": source, "name": name} for name in skipped)
        print(f"REGRESSION_RUST_PASS {source} {len(passed)} passed / {len(skipped)} ignored", flush=True)
    if clean_revision(ROOT) != revision or execution_inputs(ROOT) != inputs:
        raise RuntimeError("checkout/provider inputs changed during regression execution")
    manifest = json.loads((ROOT / "governance/MIGRATION_PARITY.json").read_bytes())
    cases, missing = bind_regressions(ROOT, manifest, executed)
    if not cases:
        raise RuntimeError("no exact replacement regression bindings were observed")
    raw_artifacts = [artifact(ROOT, path) for path in sorted(directory.iterdir())]
    timestamp = datetime.now(UTC).isoformat()
    source = {
        "schema": CASE_SCHEMA, "status": "PASS", "git_revision": revision, "inputs": inputs,
        "parent_run_id": run_id, "run_id": run_id + "-cases", "generated_at": timestamp,
        "producer": "tools/certification/regression_runtime.py", "raw_artifacts": raw_artifacts,
        "cases": cases,
    }
    case_path = directory / "regression-cases.json"
    write_json(case_path, source, immutable=True)
    coverage = {
        "observed": {category: len(rows) - len(missing.get(category, rows)) for category, rows in manifest["mappings"].items()},
        "unobserved": missing, "executed_tests": len(executed), "ignored_tests": ignored,
        "browser_workflows": 0, "provider_readbacks": 0,
    }
    receipt = {
        "schema": EXECUTION_SCHEMA, "status": "PASS", "proof_level": "LOCAL_RUNTIME_PASS",
        "git_revision": revision, "inputs": inputs, "generated_at": timestamp, "run_id": run_id,
        "artifacts": [{**artifact(ROOT, case_path), "run_id": source["run_id"]}], "coverage": coverage,
    }
    write_json(ROOT / ".cache/evidence/r36-regression-execution.json", receipt)
    print(json.dumps({"status": "PASS", "git_revision": revision, "coverage": coverage["observed"], "run_id": run_id}, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
