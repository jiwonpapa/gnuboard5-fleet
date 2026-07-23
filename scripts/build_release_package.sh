#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUTPUT_DIR="${OUTPUT_DIR:-dist}"
PACKAGE_VERSION="${PACKAGE_VERSION:-$(date +%Y%m%d%H%M%S)}"
PACKAGE_NAME="gnubard5restapi-php-${PACKAGE_VERSION}.tar.gz"
PACKAGE_PATH="${OUTPUT_DIR}/${PACKAGE_NAME}"
BUILD_MODE="${BUILD_MODE:-prod}"
SKIP_BUILD="${SKIP_BUILD:-0}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  log "Run make build MODE=${BUILD_MODE} before packaging"
  make build MODE="${BUILD_MODE}"
else
  log "Skipping make build before packaging"
fi

mkdir -p "${OUTPUT_DIR}"
rm -f "${PACKAGE_PATH}"

log "Create release package with vendor included"
tar -czf "${PACKAGE_PATH}" \
  api \
  build/runtime \
  vendor \
  docs \
  scripts \
  composer.json \
  composer.lock \
  .env.example \
  .gitignore \
  README.md \
  LICENSE.txt \
  SECURITY.md

log "Package created: ${PACKAGE_PATH}"
