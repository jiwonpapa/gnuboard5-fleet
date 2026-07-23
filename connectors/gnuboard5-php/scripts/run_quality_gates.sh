#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE_COVERAGE_MIN="${SERVICE_COVERAGE_MIN:-80}"

find api -name "*.php" -print0 | xargs -0 -n1 php -l >/tmp/quality_php_lint.log
composer run schema:check
composer run contract:check
./scripts/check_hardcoding.sh

provider_contract_status=0
composer run audit:openapi-provider || provider_contract_status=1
composer run audit:runtime-routes || provider_contract_status=1
composer run audit:openapi-field-bindings || provider_contract_status=1
./scripts/docs-check.sh || provider_contract_status=1
if [[ "$provider_contract_status" -ne 0 ]]; then
  echo "[quality-gate] PHP OpenAPI provider contract is not closed" >&2
  exit "$provider_contract_status"
fi

run_composer_audit() {
  local attempt
  for attempt in 1 2 3; do
    if composer audit; then
      return 0
    fi

    echo "[quality-gate] composer audit attempt ${attempt} failed" >&2
    if [[ "$attempt" -lt 3 ]]; then
      sleep 2
    fi
  done

  echo "[quality-gate] packagist advisory endpoint unreachable, retry failed; falling back to --ignore-unreachable" >&2
  composer audit --ignore-unreachable
}

run_composer_audit
composer run analyse
composer run test:coverage:ci
php ./scripts/check_service_coverage.php build/coverage/clover.xml "$SERVICE_COVERAGE_MIN"
composer run test:plugin:isolation
