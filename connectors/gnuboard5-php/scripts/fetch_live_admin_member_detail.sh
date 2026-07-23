#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 || $# -gt 4 ]]; then
  echo "usage: $0 <live-base-url> <member-id> <inspect-secret> [output-json]" >&2
  exit 1
fi

live_base_url="$1"
member_id="$2"
inspect_secret="$3"
output_json="${4:-}"

url="${live_base_url%/}/admin-inspect/members/${member_id}"

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
