#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 <live-base-url> <inspect-secret> [output-json]" >&2
  exit 1
fi

live_base_url="$1"
inspect_secret="$2"
output_json="${3:-}"

url="${live_base_url%/}/admin-inspect/config"

if [[ -n "${output_json}" ]]; then
  curl --fail --silent --show-error \
    -H "X-G5-Admin-Inspect-Secret: ${inspect_secret}" \
    "$url" \
    >"${output_json}"
else
  curl --fail --silent --show-error \
    -H "X-G5-Admin-Inspect-Secret: ${inspect_secret}" \
    "$url"
fi
