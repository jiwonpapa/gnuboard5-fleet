#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import tomllib
from dataclasses import dataclass
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SEMVER_PATTERN = re.compile(
    r"^(0|[1-9][0-9]*)\."
    r"(0|[1-9][0-9]*)\."
    r"(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)
CHANGELOG_HEADING = re.compile(
    r"^## \[([^]]+)](?: - (\d{4}-\d{2}-\d{2})(?: \[YANKED])?)?$"
)
CHANGE_TYPES = {"Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"}


class VersioningError(RuntimeError):
    pass


@dataclass(frozen=True)
class SemVer:
    major: int
    minor: int
    patch: int
    prerelease: str | None
    build: str | None


def parse_semver(value: str) -> SemVer:
    match = SEMVER_PATTERN.fullmatch(value)
    if not match:
        raise VersioningError(f"invalid Semantic Version: {value!r}")
    prerelease = match.group(4)
    if prerelease:
        for identifier in prerelease.split("."):
            if identifier.isdigit() and len(identifier) > 1 and identifier.startswith("0"):
                raise VersioningError(
                    f"numeric prerelease identifier has a leading zero: {identifier!r}"
                )
    return SemVer(
        major=int(match.group(1)),
        minor=int(match.group(2)),
        patch=int(match.group(3)),
        prerelease=prerelease,
        build=match.group(5),
    )


def load_toml(path: Path) -> dict[str, object]:
    with path.open("rb") as handle:
        return tomllib.load(handle)


def env_value(path: Path, name: str) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key == name:
            return value
    raise VersioningError(f"{path}: {name} is missing")


def check_changelog(path: Path, release_version: str | None) -> list[str]:
    if not path.is_file():
        raise VersioningError("CHANGELOG.md is missing")
    text = path.read_text(encoding="utf-8")
    required_tokens = (
        "Keep a Changelog",
        "https://keepachangelog.com/ko/1.1.0/",
        "Semantic Versioning",
        "https://semver.org/lang/ko/",
    )
    missing = [token for token in required_tokens if token not in text]
    if missing:
        raise VersioningError(f"CHANGELOG.md policy declaration is incomplete: {missing}")

    headings: list[tuple[str, str | None]] = []
    for line in text.splitlines():
        if line.startswith("### "):
            change_type = line.removeprefix("### ").strip()
            if change_type not in CHANGE_TYPES:
                raise VersioningError(f"unsupported changelog change type: {change_type!r}")
        if not line.startswith("## "):
            continue
        match = CHANGELOG_HEADING.fullmatch(line)
        if not match:
            raise VersioningError(f"invalid changelog release heading: {line!r}")
        headings.append((match.group(1), match.group(2)))

    if not headings or headings[0] != ("Unreleased", None):
        raise VersioningError("CHANGELOG.md must start with an undated [Unreleased] section")
    versions = [version for version, _ in headings[1:]]
    if len(versions) != len(set(versions)):
        raise VersioningError("CHANGELOG.md contains duplicate release versions")
    for version, released_at in headings[1:]:
        parse_semver(version)
        if not released_at:
            raise VersioningError(f"released changelog section has no ISO date: {version}")
        try:
            date.fromisoformat(released_at)
        except ValueError as error:
            raise VersioningError(
                f"released changelog section has an invalid ISO date: {version}"
            ) from error
        if f"[{version}]:" not in text:
            raise VersioningError(f"CHANGELOG.md comparison link is missing: {version}")
    if "[Unreleased]:" not in text:
        raise VersioningError("CHANGELOG.md [Unreleased] link is missing")

    if release_version is not None:
        released = dict(headings[1:])
        if release_version not in released:
            raise VersioningError(
                f"release {release_version} is not finalized in CHANGELOG.md"
            )
    return versions


def check_repository(root: Path, release_version: str | None = None) -> dict[str, object]:
    workspace = load_toml(root / "Cargo.toml")
    try:
        canonical = str(workspace["workspace"]["package"]["version"])
    except (KeyError, TypeError) as error:
        raise VersioningError("Cargo workspace package version is missing") from error
    parse_semver(canonical)
    if canonical.startswith("v"):
        raise VersioningError("canonical version must not use a v prefix")

    members = workspace["workspace"]["members"]
    if not isinstance(members, list):
        raise VersioningError("Cargo workspace members are invalid")
    for member in members:
        manifest = load_toml(root / str(member) / "Cargo.toml")
        inherited = manifest.get("package", {}).get("version")
        if inherited != {"workspace": True}:
            raise VersioningError(f"{member}/Cargo.toml must inherit workspace version")

    cargo_lock = load_toml(root / "Cargo.lock")
    active_names = {
        str(load_toml(root / str(member) / "Cargo.toml")["package"]["name"])
        for member in members
    }
    locked = {
        str(package["name"]): str(package["version"])
        for package in cargo_lock.get("package", [])
        if isinstance(package, dict) and package.get("name") in active_names
    }
    if set(locked) != active_names or any(value != canonical for value in locked.values()):
        raise VersioningError("active Cargo.lock package versions do not match workspace version")

    web = json.loads((root / "apps/admin-web/package.json").read_text(encoding="utf-8"))
    surfaces = {
        "Cargo.toml workspace.package.version": canonical,
        "apps/admin-web/package.json": web.get("version"),
        "deploy/compose/.env.example": env_value(
            root / "deploy/compose/.env.example", "G5_FLEET_VERSION"
        ),
    }
    drift = {name: value for name, value in surfaces.items() if value != canonical}
    if drift:
        raise VersioningError(f"product version drift: expected {canonical}, got {drift}")

    if release_version is not None:
        parsed_release = parse_semver(release_version)
        if parsed_release.build is not None:
            raise VersioningError(
                "official release version must not contain build metadata; use the release manifest revision"
            )
        if release_version != canonical:
            raise VersioningError(
                f"release version {release_version} does not match canonical {canonical}"
            )
    released_versions = check_changelog(root / "CHANGELOG.md", release_version)
    return {
        "status": "passed",
        "canonical_version": canonical,
        "release_version": release_version,
        "released_changelog_versions": released_versions,
        "version_surfaces": sorted(surfaces),
        "workspace_members": len(members),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--release-version")
    args = parser.parse_args()
    try:
        result = check_repository(args.root.resolve(), args.release_version)
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError, VersioningError) as error:
        raise SystemExit(f"versioning check failed: {error}") from error
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
