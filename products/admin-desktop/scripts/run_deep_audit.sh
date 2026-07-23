#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> structure audit: implementation baseline"
bash "${ROOT_DIR}/scripts/run_standard_audit.sh"

echo "==> structure audit: full Rust workspace baseline"
bash "${ROOT_DIR}/scripts/run_rust_workspace_audit.sh"

echo "==> structure audit: consumer baseline"
bash "${ROOT_DIR}/scripts/run_contract_audit.sh"

echo "==> structure audit: governance baseline"
bash "${ROOT_DIR}/scripts/run_structure_audit.sh"

echo "PASS: rust structure audit"
