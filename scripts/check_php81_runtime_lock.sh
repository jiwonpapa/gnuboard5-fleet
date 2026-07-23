#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_PHP_VERSION="${1:-8.1.0}"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/g5-php-runtime-compat.XXXXXX")"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

cd "$ROOT_DIR"

# PHP source is intentionally passed literally.
# shellcheck disable=SC2016
php -r '
$lock = json_decode((string) file_get_contents("composer.lock"), true, 512, JSON_THROW_ON_ERROR);
foreach (($lock["packages"] ?? []) as $package) {
    if (isset($package["name"]) && is_string($package["name"])) {
        echo $package["name"], PHP_EOL;
    }
}
' >"$TMP_ROOT/production-packages.txt"

prohibits_output="$(composer prohibits php "$TARGET_PHP_VERSION" --locked --no-interaction 2>&1 || true)"
: >"$TMP_ROOT/production-prohibits.txt"

while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  package_name="${line%% *}"
  if grep -Fxq "$package_name" "$TMP_ROOT/production-packages.txt"; then
    printf '%s\n' "$line" >>"$TMP_ROOT/production-prohibits.txt"
  fi
done <<<"$prohibits_output"

if [[ -s "$TMP_ROOT/production-prohibits.txt" ]]; then
  echo "FAIL: production dependency lock does not support PHP ${TARGET_PHP_VERSION}" >&2
  cat "$TMP_ROOT/production-prohibits.txt" >&2
  exit 1
fi

echo "PASS: production dependency lock supports PHP ${TARGET_PHP_VERSION}"
