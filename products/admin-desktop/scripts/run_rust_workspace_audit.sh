#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_SCCACHE="${ROOT_DIR}/scripts/with_optional_sccache.sh"

echo "==> rust workspace audit: cargo check"
bash "${WITH_SCCACHE}" cargo check --manifest-path "${ROOT_DIR}/Cargo.toml" --workspace --quiet

echo "==> rust workspace audit: cargo unit tests"
bash "${WITH_SCCACHE}" cargo test --manifest-path "${ROOT_DIR}/Cargo.toml" --workspace --lib --quiet -- --test-threads=1

echo "PASS: rust workspace audit"
