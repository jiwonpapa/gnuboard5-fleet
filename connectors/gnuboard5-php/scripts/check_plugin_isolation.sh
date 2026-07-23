#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="${PLUGIN_DIR:-${ROOT_DIR}/api/plugins}"

if [[ ! -d "${PLUGIN_DIR}" ]]; then
  echo "[plugin-isolation] plugin directory not found: ${PLUGIN_DIR}"
  exit 0
fi

echo "[plugin-isolation] scanning ${PLUGIN_DIR}"

NAMESPACE_PATTERN='namespace[[:space:]]+Api\\(Core|Integration|Auth|Board)\\'
LEGACY_PATTERN='get_member|sql_query|sql_fetch|add_event|common\.php|G5_TIME|G5_DATA|\$_SESSION|\$_GLOBALS|\$GLOBALS'

if rg -n --glob '*.php' "${NAMESPACE_PATTERN}" "${PLUGIN_DIR}"; then
  echo "[plugin-isolation] forbidden core namespace declaration detected" >&2
  exit 1
fi

if rg -n --glob '*.php' "${LEGACY_PATTERN}" "${PLUGIN_DIR}"; then
  echo "[plugin-isolation] forbidden G5 legacy dependency detected" >&2
  exit 1
fi

echo "[plugin-isolation] passed"
