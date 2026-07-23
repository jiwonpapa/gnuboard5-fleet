#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

prepare_coverage_dirs() {
  local expect_path=""
  for arg in "$@"; do
    case "$expect_path" in
      file)
        mkdir -p "$(dirname "$arg")"
        expect_path=""
        continue
        ;;
      dir)
        mkdir -p "$arg"
        expect_path=""
        continue
        ;;
    esac

    case "$arg" in
      --coverage-clover=*|--coverage-cobertura=*|--coverage-crap4j=*|--coverage-php=*)
        mkdir -p "$(dirname "${arg#*=}")"
        ;;
      --coverage-html=*|--coverage-xml=*)
        mkdir -p "${arg#*=}"
        ;;
      --coverage-clover|--coverage-cobertura|--coverage-crap4j|--coverage-php)
        expect_path="file"
        ;;
      --coverage-html|--coverage-xml)
        expect_path="dir"
        ;;
    esac
  done
}

if php --ri pcov >/dev/null 2>&1; then
  COVERAGE_DRIVER="pcov"
elif php --ri xdebug >/dev/null 2>&1; then
  COVERAGE_DRIVER="xdebug"
else
  echo "No supported PHPUnit coverage driver available." >&2
  echo "Install pcov or xdebug locally, or run coverage in CI where pcov is provisioned." >&2
  exit 1
fi

prepare_coverage_dirs "$@"

case "$COVERAGE_DRIVER" in
  pcov)
    COVERAGE_ROOT="$(cd "$ROOT_DIR/api/v1" && pwd)"
    exec php -d pcov.enabled=1 -d pcov.directory="$COVERAGE_ROOT" ./vendor/bin/phpunit "$@"
    ;;
  xdebug)
    exec php -d xdebug.mode=coverage ./vendor/bin/phpunit "$@"
    ;;
esac
