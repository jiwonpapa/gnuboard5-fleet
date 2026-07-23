#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <base-url> <domain> <inspect-secret> [output-file]" >&2
  exit 1
fi

BASE_URL="${1%/}"
DOMAIN="$2"
INSPECT_SECRET="$3"
OUTPUT_FILE="${4:-/tmp/admin-schema-${DOMAIN}.json}"
ENDPOINT="${BASE_URL}/admin-inspect/schema/${DOMAIN}"

curl --fail --silent --show-error \
  -H "Accept: application/json" \
  -H "X-G5-Admin-Inspect-Secret: ${INSPECT_SECRET}" \
  "${ENDPOINT}" \
  -o "${OUTPUT_FILE}"

echo "saved ${OUTPUT_FILE}"
