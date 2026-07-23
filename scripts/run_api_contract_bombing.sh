#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TARGET_ORIGIN="${TARGET_ORIGIN:-https://gnurestapi.cc}"

check_health_contract() {
  local health_url="${TARGET_ORIGIN%/}/api/v1/health"
  local response_file
  local status_code

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq command not found. Install jq to run blackbox health contract checks." >&2
    return 1
  fi

  response_file="$(mktemp)"
  trap 'rm -f "${response_file}"' RETURN

  status_code="$(curl -sS --connect-timeout 5 --max-time 15 -w "%{http_code}" -o "${response_file}" "${health_url}" || true)"
  echo "[blackbox] health endpoint status=${status_code}"

  if [[ -z "${status_code}" ]]; then
    echo "[blackbox] health endpoint call failed (no HTTP status code)." >&2
    return 1
  fi

  case "${status_code}" in
    200)
      if ! jq -e '.status == "ok" and .version == "1.0.0" and has("g5_independent")' "${response_file}" >/dev/null; then
        echo "[blackbox] health endpoint 200 response shape mismatch." >&2
        cat "${response_file}" >&2
        return 1
      fi
      ;;
    503)
      export BLACKBOX_HEALTH_UNAVAILABLE=1
      if ! jq -e '.status == 503 and (.type | startswith("/errors/")) and has("detail") and has("error_code") and has("error_category") and has("meta") and .meta.version == "1.0.0"' "${response_file}" >/dev/null; then
        echo "[blackbox] health endpoint 503 response shape mismatch." >&2
        cat "${response_file}" >&2
        return 1
      fi
      echo "[blackbox] health endpoint degraded 503 is allowed for infrastructure availability checks."
      echo "[blackbox] running Hurl suite without health check"
      export HURL_EXCLUDE_HEALTH=1
      ;;
    *)
      echo "[blackbox] health endpoint returned unexpected status code ${status_code}." >&2
      cat "${response_file}" >&2
      return 1
      ;;
  esac
}

export BASE_URL="${BASE_URL:-${TARGET_ORIGIN%/}}"
export API_BASE_URL="${API_BASE_URL:-${TARGET_ORIGIN%/}/api/v1}"

check_health_contract

echo "[blackbox] target origin: ${TARGET_ORIGIN%/}"
echo "[blackbox] running Hurl suite"
./scripts/run_hurl_suite.sh

if [[ "${BLACKBOX_HEALTH_UNAVAILABLE:-0}" == "1" ]]; then
  if [[ "${BLACKBOX_REQUIRE_SCHEMATHESIS:-0}" == "1" ]]; then
    echo "[blackbox] health endpoint is unavailable and schemathesis was required." >&2
    exit 1
  fi

  echo "[blackbox] health endpoint is unavailable; skipping Schemathesis suite"
else
  echo "[blackbox] running Schemathesis suite"
  ./scripts/run_schemathesis.sh
fi

echo "[blackbox] completed"
