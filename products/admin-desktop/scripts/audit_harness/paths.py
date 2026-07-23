"""Portable, fail-closed provider path resolution for audit entrypoints."""

from __future__ import annotations

import os
from pathlib import Path

FLEET_PROVIDER_RELATIVE = Path("connectors/gnuboard5-php")
LEGACY_PROVIDER_RELATIVE = Path("php")
OPENAPI_RELATIVE = Path("api/docs/openapi.yaml")
OPENAPI_MANIFEST_RELATIVE = Path("api/docs/openapi.contract-manifest.json")


class ProviderPathError(RuntimeError):
    """Raised when an explicit or inferred provider path is unusable."""


def _environment_path(name: str) -> Path | None:
    if name not in os.environ:
        return None
    raw = os.environ[name].strip()
    if not raw:
        raise ProviderPathError(f"{name} is explicitly set but empty")
    return Path(raw).expanduser().resolve()


def _require_file(path: Path, *, source: str) -> Path:
    if not path.is_file():
        raise ProviderPathError(f"{source} does not point to a file: {path}")
    return path


def _fleet_root(rust_root: Path) -> Path:
    resolved = rust_root.resolve()
    if len(resolved.parents) < 2:
        raise ProviderPathError(f"Rust root cannot be mapped to a fleet root: {resolved}")
    return resolved.parents[1]


def is_fleet_layout(rust_root: Path) -> bool:
    """Return whether ``rust_root`` is imported below ``products/``."""

    resolved = rust_root.resolve()
    fleet_root = _fleet_root(resolved)
    fleet_provider = fleet_root / FLEET_PROVIDER_RELATIVE
    return (
        resolved.parent.name == "products"
        or (fleet_root / "PRODUCT_MANIFEST.json").is_file()
        or fleet_provider.exists()
    )


def resolve_workspace_root(rust_root: Path) -> Path:
    """Resolve the output/governance root for fleet and legacy layouts."""

    resolved = rust_root.resolve()
    return _fleet_root(resolved) if is_fleet_layout(resolved) else resolved.parent


def resolve_php_root(rust_root: Path) -> Path:
    """Resolve PHP using env > fleet connector > legacy sibling.

    An explicitly configured path is authoritative. If it is wrong, resolution
    fails instead of silently reading a different provider checkout.
    """

    explicit = _environment_path("G5_PHP_ROOT")
    if explicit is not None:
        _require_file(explicit / OPENAPI_RELATIVE, source="G5_PHP_ROOT")
        return explicit

    resolved = rust_root.resolve()
    fleet_candidate = _fleet_root(resolved) / FLEET_PROVIDER_RELATIVE
    if is_fleet_layout(resolved):
        _require_file(
            fleet_candidate / OPENAPI_RELATIVE,
            source="fleet PHP connector",
        )
        return fleet_candidate.resolve()

    legacy_candidate = resolved.parent / LEGACY_PROVIDER_RELATIVE
    _require_file(
        legacy_candidate / OPENAPI_RELATIVE,
        source="legacy sibling PHP provider",
    )
    return legacy_candidate.resolve()


def resolve_openapi_path(rust_root: Path, *, php_root: Path | None = None) -> Path:
    explicit = _environment_path("G5_OPENAPI_PATH")
    if explicit is not None:
        return _require_file(explicit, source="G5_OPENAPI_PATH")
    return _require_file(
        (php_root or resolve_php_root(rust_root)) / OPENAPI_RELATIVE,
        source="resolved PHP OpenAPI contract",
    )


def resolve_openapi_manifest_path(
    rust_root: Path,
    *,
    php_root: Path | None = None,
) -> Path:
    explicit = _environment_path("G5_OPENAPI_MANIFEST_PATH")
    if explicit is not None:
        return _require_file(explicit, source="G5_OPENAPI_MANIFEST_PATH")
    return _require_file(
        (php_root or resolve_php_root(rust_root)) / OPENAPI_MANIFEST_RELATIVE,
        source="resolved PHP OpenAPI manifest",
    )
