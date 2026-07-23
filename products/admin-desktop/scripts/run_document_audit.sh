#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> document audit: metadata rules"
python3 "${ROOT_DIR}/scripts/check_document_metadata.py"

echo "==> document audit: hygiene rules"
python3 "${ROOT_DIR}/scripts/check_document_hygiene.py"

echo "==> document audit: docs index rebuild"
python3 "${ROOT_DIR}/scripts/doc-index.py"

echo "==> document audit: governance rules"
bash "${ROOT_DIR}/scripts/check-doc-governance.sh"

echo "PASS: rust document audit"
