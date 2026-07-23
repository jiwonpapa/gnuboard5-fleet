#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/provider-paths.sh"
PHP_ROOT="$(g5_resolve_php_root "$ROOT_DIR")"
G5_ADMIN_DIR="$ROOT_DIR/g5-admin"
SKIP_INSTALL=0
RUN_WINDOWS_TARGET=0
STATE_DIR="$ROOT_DIR/target/local-ci-state"

usage() {
  cat <<'EOF'
Usage: scripts/run_local_ci.sh [--no-install] [--windows-target]

Runs each full local release gate once. Routine pushes use the scoped pre-push
script; Windows cross-target validation is explicit because it is release work.

Options:
  --no-install           Reuse installed Bun/Composer/Python dependencies.
  --windows-target       Include the Windows Rust target type check.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --no-install)
      SKIP_INSTALL=1
      ;;
    --windows-target)
      RUN_WINDOWS_TARGET=1
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
  local venv_dir="$STATE_DIR/python"
  local marker="$STATE_DIR/python.requirements"
  local legacy_venv_dir="$ROOT_DIR/.git/local-ci-python"
  local legacy_marker="$ROOT_DIR/.git/local-ci-python.requirements"
  local fingerprint
  local -a requirements=(
    "$ROOT_DIR/scripts/requirements-audit.txt"
    "$ROOT_DIR/scripts/requirements-audit-dev.txt"
  )

  mkdir -p "$STATE_DIR"
  fingerprint="$(git hash-object "${requirements[@]}" | git hash-object --stdin)"
  if [[ -x "$legacy_venv_dir/bin/python3" ]] \
    && [[ -f "$legacy_marker" ]] \
    && [[ "$(<"$legacy_marker")" == "$fingerprint" ]]; then
    export PATH="$legacy_venv_dir/bin:$PATH"
    echo "==> local CI: reuse compatible Python audit environment"
    return
  fi
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

dependency_fingerprint() {
  git hash-object "$@" | git hash-object --stdin
}

ensure_frontend_dependencies() {
  local marker="$STATE_DIR/frontend.lock"
  local fingerprint
  fingerprint="$(dependency_fingerprint "$G5_ADMIN_DIR/package.json" "$G5_ADMIN_DIR/bun.lock")"
  if [[ -d "$G5_ADMIN_DIR/node_modules" ]] \
    && [[ -f "$marker" ]] \
    && [[ "$(<"$marker")" == "$fingerprint" ]]; then
    echo "==> local CI: reuse frontend dependencies"
    return
  fi
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "frontend dependencies are missing or stale; rerun without --no-install" >&2
    exit 1
  fi
  echo "==> local CI: install changed frontend dependencies"
  (cd "$G5_ADMIN_DIR" && bun install --frozen-lockfile)
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$fingerprint" >"$marker"
}

ensure_php_dependencies() {
  local marker="$STATE_DIR/php.lock"
  local fingerprint
  fingerprint="$(dependency_fingerprint "$PHP_ROOT/composer.json" "$PHP_ROOT/composer.lock")"
  if [[ -d "$PHP_ROOT/vendor" ]] \
    && [[ -f "$marker" ]] \
    && [[ "$(<"$marker")" == "$fingerprint" ]]; then
    echo "==> local CI: reuse PHP provider dependencies"
    return
  fi
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "PHP provider dependencies are missing or stale; rerun without --no-install" >&2
    exit 1
  fi
  echo "==> local CI: install changed PHP provider dependencies"
  composer --working-dir="$PHP_ROOT" install --no-interaction --no-progress --prefer-dist
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$fingerprint" >"$marker"
}

require_command git
require_command bun
require_command cargo
require_command python3
require_command composer

if [[ ! -f "$PHP_ROOT/api/docs/openapi.yaml" ]]; then
  echo "missing sibling PHP OpenAPI contract: $PHP_ROOT/api/docs/openapi.yaml" >&2
  echo "set G5_PHP_ROOT before running local CI" >&2
  exit 1
fi

ensure_frontend_dependencies
ensure_php_dependencies
bootstrap_python_tools

export G5_PHP_ROOT="$PHP_ROOT"
G5_OPENAPI_PATH="$(g5_resolve_required_file G5_OPENAPI_PATH "$PHP_ROOT/api/docs/openapi.yaml")"
G5_OPENAPI_MANIFEST_PATH="$(g5_resolve_required_file G5_OPENAPI_MANIFEST_PATH "$PHP_ROOT/api/docs/openapi.contract-manifest.json")"
export G5_OPENAPI_PATH G5_OPENAPI_MANIFEST_PATH
# Local CI does not need debugger symbols or Cargo incremental state. Keeping
# both disabled prevents repeated audit runs from growing target/ indefinitely.
export CARGO_INCREMENTAL="${CARGO_INCREMENTAL:-0}"
export CARGO_PROFILE_DEV_DEBUG="${CARGO_PROFILE_DEV_DEBUG:-0}"
export CARGO_PROFILE_TEST_DEBUG="${CARGO_PROFILE_TEST_DEBUG:-0}"

echo "==> local CI: audit harness quality"
(cd "$G5_ADMIN_DIR" && bun run audit:harness:quality)

echo "==> local CI: document and structure gates"
bash "$ROOT_DIR/scripts/run_document_audit.sh"
bash "$ROOT_DIR/scripts/run_structure_audit.sh"

echo "==> local CI: local OpenAPI snapshot"
(cd "$G5_ADMIN_DIR" && bun run contract:check)

echo "==> local CI: API pipeline static hard gate"
(cd "$G5_ADMIN_DIR" && bun run audit:api-pipeline:static)

echo "==> local CI: frontend compile, lint, tests, and bundle"
(cd "$G5_ADMIN_DIR" && bun x tsc --noEmit)
(cd "$G5_ADMIN_DIR" && bun run lint)
(cd "$G5_ADMIN_DIR" && bun run test:coverage:critical)
(cd "$G5_ADMIN_DIR" && node ../scripts/run_vite_build_guard.mjs)

echo "==> local CI: Rust format, lint, and workspace tests"
cargo fmt --manifest-path "$ROOT_DIR/Cargo.toml" --all --check
cargo clippy --manifest-path "$ROOT_DIR/Cargo.toml" --workspace --all-targets --all-features -- -D warnings
cargo test --manifest-path "$ROOT_DIR/Cargo.toml" --workspace --all-features --lib --quiet -- --test-threads=1

echo "==> local CI: generated TypeScript bindings"
# The workspace test above runs the export test because --all-features enables
# ts-bindings. Only verify its tracked output here; a second exact test would
# recompile the models test target for no additional coverage.
git -C "$ROOT_DIR" diff --exit-code -- g5-admin/src/types

if [[ "$RUN_WINDOWS_TARGET" -eq 1 ]]; then
  require_command rustup
  echo "==> local CI: Windows target type check"
  G5_LOCAL_CI_SKIP_INSTALL="$SKIP_INSTALL" \
    "$ROOT_DIR/scripts/run_windows_target_check.sh"
fi

echo "PASS: Rust/Tauri local CI"
