#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"
TARGET_PATH="${2:-/adm/config_form.php}"
OUTPUT_PATH="${3:-/tmp/gnuboard-admin-page.html}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/gnuboard-admin-cookie.txt}"
INSPECT_SECRET="${ADMIN_SCHEMA_INSPECT_SECRET:-}"
HEADER_ARGS=()

if [[ -n "${INSPECT_SECRET}" ]]; then
  HEADER_ARGS=(-H "X-G5-Admin-Inspect-Secret: ${INSPECT_SECRET}")
fi

BOOTSTRAP_URL="${BASE_URL%/}/dev/local_admin_bootstrap.php?format=json&next=${TARGET_PATH}"
TARGET_URL="${BASE_URL%/}${TARGET_PATH}"

echo "[bootstrap] ${BOOTSTRAP_URL}"
curl --fail --silent --show-error "${HEADER_ARGS[@]}" -c "${COOKIE_JAR}" "${BOOTSTRAP_URL}" >/dev/null

echo "[fetch] ${TARGET_URL}"
curl --fail --silent --show-error "${HEADER_ARGS[@]}" -b "${COOKIE_JAR}" "${TARGET_URL}" -o "${OUTPUT_PATH}"

echo "[done] html saved to ${OUTPUT_PATH}"
echo "[done] cookie jar saved to ${COOKIE_JAR}"
