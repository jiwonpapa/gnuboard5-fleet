#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_ROOT="${AUDIT_RUST_ROOT:-$(cd "$ROOT_DIR/.." && pwd)/rust}"
SKIP_INSTALL=0

usage() {
  cat <<'EOF'
Usage: scripts/run_local_ci.sh [--no-install]

Runs the hosted CI validation surface locally:
  - PHP 8.1 production lock compatibility
  - PHP audit harness and full quality gate
  - PHP-Rust integrated contract audit

Options:
  --no-install  Reuse installed Composer/Python dependencies.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --no-install)
      SKIP_INSTALL=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing local CI command: $1" >&2
    exit 1
  }
}

bootstrap_python_tools() {
  local venv_dir="$ROOT_DIR/.git/local-ci-python"
  local marker="$ROOT_DIR/.git/local-ci-python.requirements"
  local fingerprint
  local -a requirements=("$ROOT_DIR/tools/requirements-audit-dev.txt")

  if [[ -f "$RUST_ROOT/scripts/requirements-audit.txt" ]]; then
    requirements+=("$RUST_ROOT/scripts/requirements-audit.txt")
  fi

  fingerprint="$(git hash-object "${requirements[@]}" | git hash-object --stdin)"
  if [[ ! -x "$venv_dir/bin/python3" ]] && [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "missing local CI Python environment; rerun without --no-install" >&2
    exit 1
  fi
  if [[ ! -x "$venv_dir/bin/python3" ]]; then
    python3 -m venv "$venv_dir"
  fi

  if { [[ ! -f "$marker" ]] || [[ "$(<"$marker")" != "$fingerprint" ]]; } \
    && [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "local CI Python requirements changed; rerun without --no-install" >&2
    exit 1
  fi
  if [[ ! -f "$marker" ]] || [[ "$(<"$marker")" != "$fingerprint" ]]; then
    "$venv_dir/bin/python3" -m pip install --disable-pip-version-check \
      "${requirements[@]/#/-r}"
    printf '%s\n' "$fingerprint" >"$marker"
  fi

  export PATH="$venv_dir/bin:$PATH"
}

require_command git
require_command php
require_command composer
require_command python3

if [[ ! -d "$RUST_ROOT" ]]; then
  echo "missing sibling Rust repository: $RUST_ROOT" >&2
  echo "set AUDIT_RUST_ROOT before running local CI" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> local CI: install PHP dependencies"
  composer install --no-interaction --no-progress --prefer-dist
fi
bootstrap_python_tools

echo "==> local CI: PHP 8.1 runtime lock compatibility"
"$ROOT_DIR/scripts/check_php81_runtime_lock.sh" 8.1.0

echo "==> local CI: audit harness regression and quality"
composer run audit:harness

echo "==> local CI: full PHP quality gate"
composer run quality-gate

echo "==> local CI: PHP-Rust integrated audit"
AUDIT_RUST_ROOT="$RUST_ROOT" composer run audit:integrated

echo "PASS: PHP local CI"
