#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PHP_ROOT="${AUDIT_PHP_ROOT:-$ROOT_DIR}"
RUST_ROOT="${AUDIT_RUST_ROOT:-$(cd "$ROOT_DIR/.." && pwd)/rust}"
FLUTTER_ROOT="${AUDIT_FLUTTER_ROOT:-}"
OUTPUT_JSON="${AUDIT_OUTPUT_JSON:-}"
OUTPUT_MD="${AUDIT_OUTPUT_MD:-}"

if [[ ! -d "$RUST_ROOT" ]]; then
  echo "missing rust root: $RUST_ROOT" >&2
  echo "set AUDIT_RUST_ROOT to the Rust repository root before running audit:integrated" >&2
  exit 1
fi

if [[ ! -f "$RUST_ROOT/scripts/run_integrated_audit.py" ]]; then
  echo "missing integrated audit runner: $RUST_ROOT/scripts/run_integrated_audit.py" >&2
  exit 1
fi

declare -a cmd=(
  python3
  "$RUST_ROOT/scripts/run_integrated_audit.py"
  --rust-root "$RUST_ROOT"
  --php-root "$PHP_ROOT"
)

if [[ -n "$FLUTTER_ROOT" ]]; then
  cmd+=(--flutter-root "$FLUTTER_ROOT")
fi

if [[ -n "$OUTPUT_JSON" ]]; then
  cmd+=(--output-json "$OUTPUT_JSON")
fi

if [[ -n "$OUTPUT_MD" ]]; then
  cmd+=(--output-md "$OUTPUT_MD")
fi

"${cmd[@]}"
