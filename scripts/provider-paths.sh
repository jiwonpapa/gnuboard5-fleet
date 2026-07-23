#!/usr/bin/env bash

# Portable, fail-closed provider path resolution for shell audit entrypoints.

g5_require_file() {
  local candidate="$1"
  local source="$2"
  if [[ ! -f "$candidate" ]]; then
    echo "$source does not point to a file: $candidate" >&2
    return 1
  fi
}

g5_resolve_php_root() {
  local rust_root="$1"
  local fleet_root
  local fleet_provider
  local legacy_provider
  local candidate

  fleet_root="$(cd "$rust_root/../.." && pwd -P)"
  fleet_provider="$fleet_root/connectors/gnuboard5-php"
  legacy_provider="$(cd "$rust_root/.." && pwd -P)/php"

  if printenv G5_PHP_ROOT >/dev/null 2>&1; then
    candidate="${G5_PHP_ROOT}"
    if [[ -z "$candidate" ]]; then
      echo "G5_PHP_ROOT is explicitly set but empty" >&2
      return 1
    fi
  elif [[ "$(basename "$(dirname "$rust_root")")" == "products" ]] \
    || [[ -f "$fleet_root/PRODUCT_MANIFEST.json" ]] \
    || [[ -e "$fleet_provider" ]]; then
    candidate="$fleet_provider"
  else
    candidate="$legacy_provider"
  fi

  g5_require_file "$candidate/api/docs/openapi.yaml" "resolved PHP provider" \
    || return 1
  (cd "$candidate" && pwd -P)
}

g5_resolve_required_file() {
  local env_name="$1"
  local default_path="$2"
  local candidate
  local directory

  if candidate="$(printenv "$env_name" 2>/dev/null)"; then
    if [[ -z "$candidate" ]]; then
      echo "$env_name is explicitly set but empty" >&2
      return 1
    fi
  else
    candidate="$default_path"
  fi

  g5_require_file "$candidate" "$env_name" || return 1
  directory="$(cd "$(dirname "$candidate")" && pwd -P)"
  printf '%s/%s\n' "$directory" "$(basename "$candidate")"
}
