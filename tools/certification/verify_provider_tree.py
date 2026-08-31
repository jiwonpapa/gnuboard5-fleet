"""Prove that the running certification PHP container has the composed bytes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from tools.certification.execution_capture import clean_revision, write_json  # noqa: E402


def tree_manifest(root: Path) -> dict[str, dict[str, object]]:
    entries = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise RuntimeError("provider source tree must not contain symlinks")
        if path.is_file():
            content = path.read_bytes()
            entries[path.relative_to(root).as_posix()] = {
                "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content),
            }
    if not entries:
        raise RuntimeError("provider source tree is empty")
    return entries


VERIFY_PHP = r'''
$expected = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$mismatches = [];
foreach ($expected as $path => $entry) {
    $file = '/var/www/html/' . $path;
    if (is_link($file) || !is_file($file) || filesize($file) !== $entry['bytes']
        || hash_file('sha256', $file) !== $entry['sha256']) {
        $mismatches[] = $path;
    }
}
echo json_encode(['checked' => count($expected), 'mismatches' => $mismatches]);
exit(count($mismatches) ? 1 : 0);
'''


def verify_container(container: str, entries: dict[str, dict[str, object]]) -> None:
    if not re.fullmatch(r"g5-fleet-local-certification-[a-z0-9-]+-g5-1", container):
        raise RuntimeError("not an owned certification provider container")
    result = subprocess.run(
        ["docker", "exec", "-i", container, "php", "-r", VERIFY_PHP],
        input=json.dumps(entries), text=True, capture_output=True, timeout=90,
    )
    try:
        response = json.loads(result.stdout)
    except ValueError as error:
        raise RuntimeError("provider tree check did not return a valid result") from error
    if result.returncode != 0 or response != {"checked": len(entries), "mismatches": []}:
        mismatches = response.get("mismatches", []) if isinstance(response, dict) else []
        raise RuntimeError(f"running provider bytes differ from composed source: {mismatches[:20]}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--container", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    revision = clean_revision(ROOT)
    entries = tree_manifest(ROOT / ".cache/composed/gnuboard5-php")
    verify_container(args.container, entries)
    if clean_revision(ROOT) != revision:
        raise RuntimeError("checkout changed during provider tree verification")
    tree_hash = hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    write_json(args.output, {
        "schema": "g5-fleet.provider-tree/v1", "status": "PASS", "git_revision": revision,
        "generated_at": datetime.now(UTC).isoformat(), "files": len(entries), "tree_sha256": tree_hash,
        "container": args.container,
    }, immutable=True)
    print(f"PROVIDER_TREE_PASS files={len(entries)} sha256={tree_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
