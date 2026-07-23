#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v hurl >/dev/null 2>&1; then
  echo "hurl command not found. Run ./scripts/setup_api_test_tools.sh first." >&2
  exit 1
fi

BASE_URL="${BASE_URL:-https://gnurestapi.cc}"
HURL_TEST_DIR="${HURL_TEST_DIR:-tests/hurl}"
HURL_PROFILE="${HURL_PROFILE:-smoke}"
HURL_JOBS="${HURL_JOBS:-4}"
HURL_CONNECT_TIMEOUT="${HURL_CONNECT_TIMEOUT:-10}"
HURL_MAX_TIME="${HURL_MAX_TIME:-30}"
HURL_RETRY="${HURL_RETRY:-1}"
HURL_REPORT_DIR="${HURL_REPORT_DIR:-dist/reports/hurl}"
HURL_EXCLUDE_HEALTH="${HURL_EXCLUDE_HEALTH:-0}"

mkdir -p "${HURL_REPORT_DIR}"

HURL_FILES=()
if [[ "${HURL_PROFILE}" == "smoke" ]]; then
  while IFS= read -r file; do
    HURL_FILES+=("${file}")
  done < <(find "${HURL_TEST_DIR}" -maxdepth 1 -type f -name '*.hurl' | sort)
elif [[ "${HURL_PROFILE}" == "full" ]]; then
  while IFS= read -r file; do
    HURL_FILES+=("${file}")
  done < <(find "${HURL_TEST_DIR}" -type f -name '*.hurl' | sort)
else
  echo "Invalid HURL_PROFILE=${HURL_PROFILE} (use smoke|full)" >&2
  exit 1
fi
if [[ ${#HURL_FILES[@]} -eq 0 ]]; then
  echo "No hurl test files found in ${HURL_TEST_DIR}" >&2
  exit 1
fi

if [[ "${HURL_EXCLUDE_HEALTH}" == "1" ]]; then
  FILTERED_HURL_FILES=()
  for file in "${HURL_FILES[@]}"; do
    if [[ "$(basename "${file}")" == "01-health.hurl" ]]; then
      continue
    fi
    FILTERED_HURL_FILES+=("${file}")
  done
  HURL_FILES=("${FILTERED_HURL_FILES[@]}")
fi

if [[ ${#HURL_FILES[@]} -eq 0 ]]; then
  echo "No hurl test files selected after filtering." >&2
  exit 1
fi

CMD=(
  hurl
  --test
  --jobs "${HURL_JOBS}"
  --location
  --retry "${HURL_RETRY}"
  --connect-timeout "${HURL_CONNECT_TIMEOUT}"
  --max-time "${HURL_MAX_TIME}"
  --report-junit "${HURL_REPORT_DIR}/junit.xml"
  --variable "base_url=${BASE_URL%/}"
)

if [[ "${HURL_INSECURE:-0}" == "1" ]]; then
  CMD+=(--insecure)
fi

CMD+=("${HURL_FILES[@]}")

echo "[hurl] running ${#HURL_FILES[@]} files against ${BASE_URL%/} (profile=${HURL_PROFILE})"
"${CMD[@]}"
