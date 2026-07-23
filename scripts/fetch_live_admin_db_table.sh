#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
  echo "usage: $0 <base-url> <table> <inspect-secret> [sample-limit]" >&2
  exit 1
fi

BASE_URL="${1%/}"
TABLE="$2"
INSPECT_SECRET="$3"
SAMPLE_LIMIT="${4:-1}"
ENDPOINT="${BASE_URL}/admin-inspect/db/${TABLE}?sample_limit=${SAMPLE_LIMIT}"

curl --fail --silent --show-error \
  -H "Accept: application/json" \
  -H "X-G5-Admin-Inspect-Secret: ${INSPECT_SECRET}" \
  "${ENDPOINT}"
