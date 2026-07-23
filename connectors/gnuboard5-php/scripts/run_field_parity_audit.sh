#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_INTEGRATED="${RUN_INTEGRATED:-0}"

echo "== porting parity audit: schema, contract, and docs checks =="
composer run schema:check
composer run contract:check
composer run audit:schema-contract
composer run audit:domain-manifest
composer run audit:domain-pipeline:index
./scripts/docs-check.sh

echo
echo "== porting parity audit: schema tests =="
./vendor/bin/phpunit tests/Admin/Schema/AdminSchemaServiceTest.php tests/contract/AdminSchemaContractTest.php

if [[ -n "${LEGACY_ADMIN_BASE_URL:-}" ]]; then
  echo
  echo "== porting parity audit: config_form legacy vs schema parity =="
  php ./scripts/check_legacy_schema_parity.php --domain=config --base-url="${LEGACY_ADMIN_BASE_URL}"
else
  echo
  echo "skip: config_form legacy/schema parity (set LEGACY_ADMIN_BASE_URL=http://127.0.0.1:8000)"
fi

echo
echo "== porting parity audit: raw label / FIXME / default_value sample =="
python3 ./scripts/check_generated_schema_labels.py

if [[ "$RUN_INTEGRATED" == "1" ]]; then
  echo
  echo "== integrated php + rust audit =="
  composer run audit:integrated
else
  echo
  echo "skip: integrated audit (set RUN_INTEGRATED=1 to enable)"
fi
