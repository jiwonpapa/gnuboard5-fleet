#!/usr/bin/env bash
set -euo pipefail

if command -v sccache >/dev/null 2>&1 && command -v rustc >/dev/null 2>&1; then
  SCCACHE_BIN="$(command -v sccache)"
  RUSTC_BIN="$(command -v rustc)"

  if ! "${SCCACHE_BIN}" "${RUSTC_BIN}" -vV >/dev/null 2>&1; then
    echo "warn: sccache is installed but unusable in this environment; running without RUSTC_WRAPPER" >&2
    exec "$@"
  fi

  export RUSTC_WRAPPER
  RUSTC_WRAPPER="${SCCACHE_BIN}"
fi

exec "$@"
