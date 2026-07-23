#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/provider-paths.sh"
PHP_ROOT="$(g5_resolve_php_root "${ROOT_DIR}")"
G5_ADMIN_DIR="${ROOT_DIR}/g5-admin"

export G5_PHP_ROOT="${PHP_ROOT}"
G5_OPENAPI_PATH="$(g5_resolve_required_file G5_OPENAPI_PATH "${PHP_ROOT}/api/docs/openapi.yaml")"
G5_OPENAPI_MANIFEST_PATH="$(g5_resolve_required_file G5_OPENAPI_MANIFEST_PATH "${PHP_ROOT}/api/docs/openapi.contract-manifest.json")"
export G5_OPENAPI_PATH G5_OPENAPI_MANIFEST_PATH

[[ -f "${G5_OPENAPI_PATH}" ]] || {
  echo "missing PHP OpenAPI source: ${G5_OPENAPI_PATH}" >&2
  exit 1
}
[[ -f "${G5_OPENAPI_MANIFEST_PATH}" ]] || {
  echo "missing PHP OpenAPI manifest: ${G5_OPENAPI_MANIFEST_PATH}" >&2
  exit 1
}

echo "==> consumer audit: local contract snapshot check"
(cd "${G5_ADMIN_DIR}" && bun run contract:check)

echo "==> consumer audit: integrated PHP-Rust check"
python3 "${ROOT_DIR}/scripts/run_integrated_audit.py" \
  --rust-root "${ROOT_DIR}" \
  --php-root "${PHP_ROOT}"

echo "PASS: rust consumer audit"
