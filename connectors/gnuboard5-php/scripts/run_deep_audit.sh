#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== structure audit: baseline gates =="
composer run schema:check
composer run contract:check
composer run audit:schema-contract
./scripts/docs-check.sh

echo
echo "== structure audit: active structure findings =="
python3 ./scripts/check_active_structure_boundaries.py

echo
echo "== structure audit: generated report =="
python3 ./scripts/generate_structure_audit_report.py

echo
echo "== structure audit: generated report freshness =="
python3 ./scripts/check_structure_report_freshness.py

echo
echo "== structure audit: admin schema provider readiness =="
python3 ./scripts/check_admin_schema_provider_readiness.py

echo
echo "== structure audit: admin schema provider report =="
python3 ./scripts/generate_admin_schema_provider_report.py

echo
echo "== structure audit: blocker registry =="
composer run audit:blockers

echo
echo "== structure audit: waiver registry =="
composer run audit:waivers

echo
echo "== structure audit: warning budget registry =="
composer run audit:warning-budgets

echo
echo "== structure audit: contract tests =="
./vendor/bin/phpunit tests/contract
