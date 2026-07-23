#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
G5_ADMIN_DIR="${ROOT_DIR}/g5-admin"
WITH_SCCACHE="${ROOT_DIR}/scripts/with_optional_sccache.sh"

echo "==> implementation audit: document baseline"
bash "${ROOT_DIR}/scripts/run_document_audit.sh"

echo "==> implementation audit: build radius budgets"
python3 "${ROOT_DIR}/scripts/check_build_radius_budgets.py"

echo "==> implementation audit: TypeScript compile"
(cd "${G5_ADMIN_DIR}" && bun x tsc --noEmit)

echo "==> implementation audit: frontend lint"
(cd "${G5_ADMIN_DIR}" && bun run lint)

echo "==> implementation audit: critical frontend tests"
(cd "${G5_ADMIN_DIR}" && bun run test:coverage:critical)

echo "==> implementation audit: production web bundle guard"
(cd "${G5_ADMIN_DIR}" && node ../scripts/run_vite_build_guard.mjs)

echo "==> implementation audit: Rust desktop check"
bash "${WITH_SCCACHE}" cargo check --manifest-path "${G5_ADMIN_DIR}/src-tauri/Cargo.toml" --quiet

echo "==> implementation audit: Rust desktop unit tests"
bash "${WITH_SCCACHE}" cargo test --manifest-path "${G5_ADMIN_DIR}/src-tauri/Cargo.toml" --lib --quiet -- --test-threads=1

echo "==> implementation audit: ts-rs export sync"
bash "${WITH_SCCACHE}" cargo test --manifest-path "${ROOT_DIR}/g5-admin-models/Cargo.toml" --features ts-bindings models::tests::export_ts_bindings -- --exact --nocapture
git -C "${ROOT_DIR}" diff --exit-code -- g5-admin/src/types

echo "PASS: rust implementation audit"
