#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
G5_ADMIN_DIR="$ROOT_DIR/g5-admin"
source "$ROOT_DIR/scripts/provider-paths.sh"
PHP_ROOT="$(g5_resolve_php_root "$ROOT_DIR")"
export G5_PHP_ROOT="$PHP_ROOT"
BASE_REF="${G5_PRE_PUSH_BASE_REF:-}"

if [[ -z "$BASE_REF" ]]; then
  BASE_REF="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
fi
if [[ -z "$BASE_REF" ]] && git -C "$ROOT_DIR" rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE_REF="origin/main"
fi
if [[ -z "$BASE_REF" ]]; then
  BASE_REF="HEAD~1"
fi

git -C "$ROOT_DIR" rev-parse --verify "$BASE_REF" >/dev/null
CHANGED_PATHS="$(git -C "$ROOT_DIR" diff --name-only --diff-filter=ACMR "$BASE_REF...HEAD")"

if [[ -z "$CHANGED_PATHS" ]]; then
  echo "PASS: no commits differ from $BASE_REF"
  exit 0
fi

matches() {
  printf '%s\n' "$CHANGED_PATHS" | grep -Eq "$1"
}

echo "==> pre-push: diff hygiene ($BASE_REF...HEAD)"
git -C "$ROOT_DIR" diff --check "$BASE_REF...HEAD"

if matches '^(g5-admin/src/|g5-admin/(package.json|bun.lock|tsconfig.*|vite.config.*|vitest.*|eslint.*))'; then
  [[ -d "$G5_ADMIN_DIR/node_modules" ]] || {
    echo "missing g5-admin/node_modules; run bun install first" >&2
    exit 1
  }
  echo "==> pre-push: frontend type and lint"
  (cd "$G5_ADMIN_DIR" && bun x tsc --noEmit && bun run lint)

  if matches '^g5-admin/(package.json|bun.lock|vite.config.*|vitest.*)'; then
    echo "==> pre-push: frontend full test suite"
    (cd "$G5_ADMIN_DIR" && bun run test)
  else
    frontend_files=()
    while IFS= read -r path; do
      case "$path" in
        g5-admin/src/*.ts|g5-admin/src/*.tsx)
          frontend_files+=("${path#g5-admin/}")
          ;;
      esac
    done <<<"$CHANGED_PATHS"
    if [[ "${#frontend_files[@]}" -gt 0 ]]; then
      echo "==> pre-push: frontend related tests"
      (cd "$G5_ADMIN_DIR" && bun x vitest related "${frontend_files[@]}" --run --passWithNoTests)
    fi
  fi
fi

if matches '(^Cargo\.(toml|lock)$|^g5-[^/]+/(Cargo.toml|src/)|^g5-admin/src-tauri/)'; then
  echo "==> pre-push: Rust formatting"
  cargo fmt --manifest-path "$ROOT_DIR/Cargo.toml" --all --check

  if matches '(^Cargo\.(toml|lock)$|/Cargo.toml$)'; then
    echo "==> pre-push: changed Rust dependency graph"
    cargo test --manifest-path "$ROOT_DIR/Cargo.toml" --workspace --lib --quiet -- --test-threads=1
  else
    crates=()
    while IFS= read -r path; do
      crate="${path%%/*}"
      [[ "$crate" == g5-admin ]] && crate="g5-admin-desktop"
      if [[ "$crate" == g5-* ]] && [[ " ${crates[*]-} " != *" $crate "* ]]; then
        crates+=("$crate")
      fi
    done <<<"$CHANGED_PATHS"
    for crate in "${crates[@]-}"; do
      [[ -n "$crate" ]] || continue
      echo "==> pre-push: Rust unit $crate"
      cargo test --manifest-path "$ROOT_DIR/Cargo.toml" -p "$crate" --lib --quiet -- --test-threads=1
    done
  fi
fi

if matches '(^specs/|^README.md$|^\.agent/|^AGENTS.md$)'; then
  echo "==> pre-push: document audit"
  bash "$ROOT_DIR/scripts/run_document_audit.sh"
fi

if matches '(^Cargo\.(toml|lock)$|^g5-[^/]+/(Cargo.toml|src/)|^g5-admin/src-tauri/|^scripts/(check_.*|collect_architecture_metrics.py|run_hotspot_audit.py|run_structure_audit.sh)|^specs/audits/)'; then
  echo "==> pre-push: structure and hotspot gates"
  bash "$ROOT_DIR/scripts/run_structure_audit.sh" --base-ref "$BASE_REF"
fi

if matches '(^g5-admin/src/api/|^g5-admin/src-tauri/src/commands/|^g5-admin-(api-client|transport|models)/|^specs/integration/|^scripts/(check_openapi_contract.mjs|run_integrated_audit.py))'; then
  [[ -f "$PHP_ROOT/api/docs/openapi.yaml" ]] || {
    echo "missing sibling PHP OpenAPI contract: $PHP_ROOT/api/docs/openapi.yaml" >&2
    exit 1
  }
  echo "==> pre-push: provider-consumer contract"
  (cd "$G5_ADMIN_DIR" && G5_PHP_ROOT="$PHP_ROOT" bun run audit:contract)
fi

if matches '(^scripts/|^\.github/workflows/|^\.githooks/)'; then
  echo "==> pre-push: Python audit regressions"
  (cd "$ROOT_DIR" && python3 -m unittest discover -s scripts/tests -p 'test_*.py')
fi

echo "PASS: scoped pre-push checks"
