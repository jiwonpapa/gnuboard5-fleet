#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOTSPOT_ARGS=(--check)

usage() {
  echo "Usage: scripts/run_structure_audit.sh [--base-ref REF]" >&2
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --base-ref)
      [[ "$#" -ge 2 ]] || {
        usage
        exit 2
      }
      HOTSPOT_ARGS+=(--base-ref "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

echo "==> structure audit: build radius budgets"
python3 "${ROOT_DIR}/scripts/check_build_radius_budgets.py"

echo "==> structure audit: architecture metrics"
python3 "${ROOT_DIR}/scripts/collect_architecture_metrics.py"

echo "==> structure audit: domain coverage"
python3 "${ROOT_DIR}/scripts/check_domain_coverage.py"

echo "==> structure audit: form metadata coverage"
python3 "${ROOT_DIR}/scripts/check_form_metadata_coverage.py"

echo "==> structure audit: form metadata blocker handoff"
python3 "${ROOT_DIR}/scripts/generate_form_metadata_blocker_report.py"

echo "==> structure audit: blocker registry"
python3 "${ROOT_DIR}/scripts/check_blocker_registry.py"

echo "==> structure audit: form save smoke coverage"
python3 "${ROOT_DIR}/scripts/check_form_save_smoke_coverage.py"

echo "==> structure audit: active crate boundary rules"
python3 "${ROOT_DIR}/scripts/check_active_crate_boundaries.py"

echo "==> structure audit: waiver registry"
python3 "${ROOT_DIR}/scripts/check_audit_waivers.py"

echo "==> structure audit: warning budget registry"
python3 "${ROOT_DIR}/scripts/check_warning_budgets.py"

echo "==> structure audit: changed source hotspot budget"
python3 "${ROOT_DIR}/scripts/run_hotspot_audit.py" "${HOTSPOT_ARGS[@]}"

echo "PASS: rust structure audit"
