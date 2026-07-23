#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
LOCK_PATH = ROOT / "UPSTREAMS.lock.json"
LOCKED_REF = "refs/g5-fleet/upstreams/gnuboard5"
REQUIRED_POLICY = {
    "floating_refs_forbidden": True,
    "require_tag_commit_tree": True,
    "require_version_probe": True,
    "require_license_fingerprint": True,
    "update_gate": "make upstream-audit",
}


def run(*args: str, cwd: Path | None = None, timeout_seconds: int = 600) -> str:
    try:
        completed = subprocess.run(
            args,
            cwd=cwd,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            f"command timed out after {timeout_seconds}s ({' '.join(args)})"
        ) from error
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(f"command failed ({' '.join(args)}): {detail}")
    return completed.stdout.strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_safe_directory_chain(root: Path, directory: Path) -> None:
    """Reject symlink and non-directory cache components below root."""
    lexical_root = root.absolute()
    lexical_directory = directory.absolute()
    if lexical_root.is_symlink():
        raise RuntimeError(f"repository root symlink is forbidden: {lexical_root}")
    try:
        relative = lexical_directory.relative_to(lexical_root)
    except ValueError as error:
        raise RuntimeError(f"cache path escaped repository root: {lexical_directory}") from error
    cursor = lexical_root
    for part in relative.parts:
        cursor /= part
        if cursor.is_symlink():
            raise RuntimeError(f"cache path symlink is forbidden: {cursor}")
        if cursor.exists() and not cursor.is_dir():
            raise RuntimeError(f"cache path component is not a directory: {cursor}")


def is_full_sha(value: Any, length: int) -> bool:
    return isinstance(value, str) and re.fullmatch(rf"[0-9a-f]{{{length}}}", value) is not None


def safe_probe_path(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    path = Path(value)
    return not path.is_absolute() and ".." not in path.parts


def canonical_repository(value: Any) -> tuple[str, ...]:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError("repository URL must be a non-empty string")
    repository = value.strip()

    scp_match = re.fullmatch(r"(?:[^@/]+@)?([^:/]+):(.+)", repository)
    if scp_match and "://" not in repository:
        host, raw_path = scp_match.groups()
        path = raw_path.strip("/")
        if path.endswith(".git"):
            path = path[:-4]
        if not path:
            raise RuntimeError("repository URL has no repository path")
        return ("ssh", host.lower(), "22", path)

    parsed = urlsplit(repository)
    if parsed.scheme:
        scheme = parsed.scheme.lower()
        if parsed.query or parsed.fragment:
            raise RuntimeError("repository URL must not contain query or fragment")
        if scheme == "file":
            if parsed.netloc not in ("", "localhost"):
                raise RuntimeError("file repository URL must be local")
            return ("file", str(Path(unquote(parsed.path)).resolve()))
        if scheme not in {"https", "ssh"} or parsed.hostname is None:
            raise RuntimeError(f"unsupported repository URL scheme: {scheme}")
        default_port = 443 if scheme == "https" else 22
        try:
            port = parsed.port or default_port
        except ValueError as error:
            raise RuntimeError(f"invalid repository URL port: {error}") from error
        path = unquote(parsed.path).strip("/")
        if path.endswith(".git"):
            path = path[:-4]
        if not path:
            raise RuntimeError("repository URL has no repository path")
        return (scheme, parsed.hostname.lower(), str(port), path)

    path = Path(repository).expanduser()
    if not path.is_absolute():
        raise RuntimeError("local repository path must be absolute")
    return ("file", str(path.resolve()))


def validate_lock(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("schema_version") != 1:
        raise RuntimeError("unsupported upstream lock schema_version")
    policy = payload.get("policy")
    if not isinstance(policy, dict):
        raise RuntimeError("UPSTREAMS.lock.json has no policy")
    for key, expected in REQUIRED_POLICY.items():
        if policy.get(key) != expected:
            raise RuntimeError(f"upstream lock policy mismatch: {key} must be {expected!r}")

    rows = payload.get("upstreams")
    if not isinstance(rows, list):
        raise RuntimeError("UPSTREAMS.lock.json has no upstream inventory")
    matches = [row for row in rows if isinstance(row, dict) and row.get("id") == "gnuboard5"]
    if len(matches) != 1:
        raise RuntimeError("UPSTREAMS.lock.json must contain exactly one gnuboard5 row")
    upstream = matches[0]
    if upstream.get("kind") != "git":
        raise RuntimeError("gnuboard5 upstream kind must be git")
    canonical_repository(upstream.get("repository"))

    version = upstream.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z._+-]*", version):
        raise RuntimeError("gnuboard5 upstream version is invalid")
    expected_ref = f"refs/tags/v{version}"
    if upstream.get("ref") != expected_ref:
        raise RuntimeError(f"upstream ref must match version tag: {expected_ref}")
    if not is_full_sha(upstream.get("commit"), 40):
        raise RuntimeError("upstream commit must be a full lowercase SHA-1")
    if not is_full_sha(upstream.get("tree"), 40):
        raise RuntimeError("upstream tree must be a full lowercase SHA-1")

    version_probe = upstream.get("version_probe")
    if not isinstance(version_probe, dict):
        raise RuntimeError("version_probe is required")
    if version_probe.get("expected") != version:
        raise RuntimeError("version_probe.expected must equal upstream version")
    if not safe_probe_path(version_probe.get("path")):
        raise RuntimeError("version_probe.path must be a safe relative path")
    if not is_full_sha(version_probe.get("sha256"), 64):
        raise RuntimeError("version_probe.sha256 must be a full lowercase SHA-256")

    license_probe = upstream.get("license")
    if not isinstance(license_probe, dict):
        raise RuntimeError("license fingerprint is required")
    if not safe_probe_path(license_probe.get("path")):
        raise RuntimeError("license.path must be a safe relative path")
    if not is_full_sha(license_probe.get("sha256"), 64):
        raise RuntimeError("license.sha256 must be a full lowercase SHA-256")
    return upstream


def load_upstream() -> dict[str, Any]:
    payload = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError("UPSTREAMS.lock.json root must be an object")
    return validate_lock(payload)


def verify_origin(checkout: Path, upstream: dict[str, Any]) -> None:
    urls = [line for line in run("git", "remote", "get-url", "--all", "origin", cwd=checkout).splitlines() if line]
    if len(urls) != 1:
        raise RuntimeError("upstream checkout must have exactly one origin fetch URL")
    expected = canonical_repository(upstream["repository"])
    actual = canonical_repository(urls[0])
    if actual != expected:
        raise RuntimeError(f"origin repository mismatch: expected={upstream['repository']} actual={urls[0]}")


def fetch_locked_ref(checkout: Path, upstream: dict[str, Any]) -> str:
    refspec = f"+{upstream['ref']}:{LOCKED_REF}"
    run("git", "fetch", "--force", "--no-tags", "origin", refspec, cwd=checkout)
    ref_commit = run("git", "rev-parse", "--verify", f"{LOCKED_REF}^{{commit}}", cwd=checkout)
    if ref_commit != upstream["commit"]:
        raise RuntimeError(
            f"locked ref commit mismatch: ref={upstream['ref']} "
            f"expected={upstream['commit']} actual={ref_commit}"
        )
    return ref_commit


def verify_checkout(checkout: Path, upstream: dict[str, Any]) -> dict[str, Any]:
    if not (checkout / ".git").exists():
        raise RuntimeError(f"upstream checkout is missing: {checkout}")
    verify_origin(checkout, upstream)
    if run("git", "status", "--porcelain", cwd=checkout):
        raise RuntimeError("upstream checkout is dirty")

    ref_commit = run("git", "rev-parse", "--verify", f"{LOCKED_REF}^{{commit}}", cwd=checkout)
    if ref_commit != upstream["commit"]:
        raise RuntimeError(
            f"cached locked ref mismatch: expected={upstream['commit']} actual={ref_commit}"
        )

    commit = run("git", "rev-parse", "HEAD", cwd=checkout)
    tree = run("git", "rev-parse", "HEAD^{tree}", cwd=checkout)
    if commit != upstream["commit"]:
        raise RuntimeError(f"commit mismatch: expected={upstream['commit']} actual={commit}")
    if tree != upstream["tree"]:
        raise RuntimeError(f"tree mismatch: expected={upstream['tree']} actual={tree}")

    version_probe = upstream["version_probe"]
    version_path = checkout / version_probe["path"]
    if sha256(version_path) != version_probe["sha256"]:
        raise RuntimeError("version.php fingerprint mismatch")
    version_text = version_path.read_text(encoding="utf-8", errors="replace")
    expected_version = str(version_probe["expected"])
    if not re.search(rf"G5_GNUBOARD_VER[^\n]*{re.escape(expected_version)}", version_text):
        raise RuntimeError(f"version probe did not find {expected_version}")

    license_probe = upstream["license"]
    license_path = checkout / license_probe["path"]
    if sha256(license_path) != license_probe["sha256"]:
        raise RuntimeError("LICENSE.txt fingerprint mismatch")

    return {
        "schema": "g5-fleet.upstream-verification/v1",
        "status": "passed",
        "upstream": "gnuboard5",
        "version": upstream["version"],
        "ref": upstream["ref"],
        "ref_commit": ref_commit,
        "commit": commit,
        "tree": tree,
        "version_sha256": sha256(version_path),
        "license_sha256": sha256(license_path),
    }


def sync_checkout(root: Path, upstream: dict[str, Any], *, verify_only: bool) -> dict[str, Any]:
    checkout = root / ".cache/upstream/gnuboard5" / f"v{upstream['version']}"
    ensure_safe_directory_chain(root, checkout)
    if not checkout.exists():
        if verify_only:
            raise RuntimeError(f"verified checkout is not prepared: {checkout}")
        checkout.parent.mkdir(parents=True, exist_ok=True)
        run(
            "git",
            "clone",
            "--filter=blob:none",
            "--no-checkout",
            str(upstream["repository"]),
            str(checkout),
        )
    if not verify_only:
        fetch_locked_ref(checkout, upstream)
        run("git", "checkout", "--detach", str(upstream["commit"]), cwd=checkout)
    return verify_checkout(checkout, upstream)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch and verify the pinned GnuBoard5 upstream")
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--output-json")
    args = parser.parse_args()

    try:
        upstream = load_upstream()
        result = sync_checkout(ROOT, upstream, verify_only=args.verify_only)
        output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output_json:
            destination = Path(args.output_json)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(output, encoding="utf-8")
        print(output, end="")
        return 0
    except (OSError, KeyError, TypeError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"upstream verification failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
