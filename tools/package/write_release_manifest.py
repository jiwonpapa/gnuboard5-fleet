#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tarfile
from pathlib import Path, PurePosixPath


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_connector(
    archive: Path,
    sbom: Path,
    version: str,
    revision: str,
) -> dict[str, object]:
    with tarfile.open(archive, "r:gz") as package:
        members = package.getmembers()
        names = [member.name for member in members]
        for member in members:
            relative = PurePosixPath(member.name)
            if (
                relative.is_absolute()
                or any(part in {"", ".", ".."} for part in relative.parts)
                or not member.isfile()
            ):
                raise SystemExit(f"connector archive member is unsafe: {member.name}")
        if len(names) != len(set(names)):
            raise SystemExit("connector archive contains duplicate members")
        try:
            package_manifest = json.load(package.extractfile("PACKAGE-MANIFEST.json"))
            embedded_sbom = package.extractfile("SBOM.cdx.json")
        except (KeyError, TypeError) as error:
            raise SystemExit("connector archive metadata is missing") from error
        if embedded_sbom is None or hashlib.sha256(embedded_sbom.read()).hexdigest() != sha256(sbom):
            raise SystemExit("connector embedded/external SBOM mismatch")
    if (
        package_manifest.get("schema") != "g5-fleet.php-connector-package/v1"
        or package_manifest.get("version") != version
        or package_manifest.get("revision") != revision
    ):
        raise SystemExit("connector package version/revision readback mismatch")
    external_sbom = json.loads(sbom.read_text(encoding="utf-8"))
    if (
        external_sbom.get("bomFormat") != "CycloneDX"
        or external_sbom.get("metadata", {}).get("component", {}).get("version") != version
    ):
        raise SystemExit("connector CycloneDX identity mismatch")
    return package_manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--sbom", type=Path, required=True)
    parser.add_argument("--connector-archive", type=Path, required=True)
    parser.add_argument("--connector-sbom", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9A-Za-z._-]{1,64}", args.version):
        raise SystemExit("invalid release version")
    if not re.fullmatch(r"[0-9a-f]{40}", args.revision):
        raise SystemExit("revision must be a full Git SHA")
    for path in (
        args.archive,
        args.sbom,
        args.connector_archive,
        args.connector_sbom,
    ):
        if path.is_symlink() or not path.is_file():
            raise SystemExit(f"release artifact missing or unsafe: {path}")
    image_id = subprocess.run(
        ("docker", "image", "inspect", "--format", "{{.Id}}", args.image),
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout.strip()
    version_readback = json.loads(
        subprocess.run(
            ("docker", "run", "--rm", "--entrypoint", "/usr/local/bin/g5-fleet-admin-server", args.image, "version"),
            check=True,
            text=True,
            stdout=subprocess.PIPE,
        ).stdout
    )
    if (
        version_readback.get("image_version") != args.version
        or version_readback.get("build_revision") != args.revision
    ):
        raise SystemExit("container version/revision readback mismatch")
    connector_readback = verify_connector(
        args.connector_archive,
        args.connector_sbom,
        args.version,
        args.revision,
    )
    payload = {
        "schema": "g5-fleet.package-release/v1",
        "image": args.image,
        "image_id": image_id,
        "version": args.version,
        "revision": args.revision,
        "version_readback": version_readback,
        "connector_readback": {
            "schema": connector_readback["schema"],
            "version": connector_readback["version"],
            "revision": connector_readback["revision"],
            "canonical_openapi_sha256": connector_readback[
                "canonical_openapi_sha256"
            ],
            "production_dependencies": connector_readback[
                "production_dependencies"
            ],
        },
        "artifacts": {
            "image_archive": {
                "path": args.archive.name,
                "sha256": sha256(args.archive),
                "bytes": args.archive.stat().st_size,
            },
            "sbom": {
                "path": args.sbom.name,
                "format": "spdx",
                "sha256": sha256(args.sbom),
                "bytes": args.sbom.stat().st_size,
            },
            "php_connector": {
                "path": args.connector_archive.name,
                "sha256": sha256(args.connector_archive),
                "bytes": args.connector_archive.stat().st_size,
            },
            "php_connector_sbom": {
                "path": args.connector_sbom.name,
                "format": "cyclonedx-json",
                "sha256": sha256(args.connector_sbom),
                "bytes": args.connector_sbom.stat().st_size,
            },
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
