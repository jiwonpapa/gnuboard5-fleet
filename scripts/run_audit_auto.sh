#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

normalize_path() {
  local path="$1"
  path="${path#"$ROOT_DIR"/}"
  path="${path#./}"
  printf '%s\n' "$path"
}

collect_changed_paths() {
  local local_path
  local diff_base
  local diff_head

  if [[ "$#" -gt 0 ]]; then
    local raw
    for raw in "$@"; do
      normalize_path "$raw"
    done
    return 0
  fi

  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    return 0
  fi

  diff_base="${AUDIT_AUTO_DIFF_BASE:-}"
  diff_head="${AUDIT_AUTO_DIFF_HEAD:-HEAD}"

  if [[ -n "$diff_base" ]]; then
    if git rev-parse --verify --quiet "$diff_base" >/dev/null \
      && git rev-parse --verify --quiet "$diff_head" >/dev/null; then
      git diff --name-only "$diff_base...$diff_head" | while IFS= read -r local_path; do
        [[ -n "$local_path" ]] || continue
        normalize_path "$local_path"
      done
      return 0
    fi

    echo "[audit:auto] warning=diff base '$diff_base' or head '$diff_head' was not resolvable; fallback to worktree status" >&2
  fi

  git status --short | while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    local_path="${line:3}"
    if [[ "$local_path" == *" -> "* ]]; then
      local_path="${local_path##* -> }"
    fi
    normalize_path "$local_path"
  done
}

declare -a changed_paths=()
while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  changed_paths+=("$path")
done < <(collect_changed_paths "$@")

if [[ "${#changed_paths[@]}" -eq 0 ]]; then
  echo "[audit:auto] changed_paths=0"
  echo "[audit:auto] no changed paths detected; default to implementation audit baseline"
else
  echo "[audit:auto] changed_paths=${#changed_paths[@]}"
  printf '[audit:auto] path=%s\n' "${changed_paths[@]}"
fi

run_structure=0
run_porting=0
run_readiness=0
run_blackbox=0
run_integrated=0
declare -a integrated_reasons=()

mark_integrated() {
  local reason="$1"
  run_integrated=1
  integrated_reasons+=("$reason")
}

if [[ "${#changed_paths[@]}" -gt 0 ]]; then
  for path in "${changed_paths[@]}"; do
    case "$path" in
      api/container.php|api/routes/v1.php|api/routes/v1/admin.php|docs/architecture/GATEWAY_USAGE_RULES.json|docs/AUDIT_SYSTEM.md|docs/AUDIT_STRATEGY.md|docs/audits/BLOCKERS.toml|docs/audits/WAIVERS.toml|docs/audits/WARNING_BUDGETS.toml|scripts/check_active_structure_boundaries.py|scripts/check_structure_report_freshness.py|scripts/generate_structure_audit_report.py|scripts/php_structure_findings.py)
        run_structure=1
        ;;
    esac

    case "$path" in
      api/docs/openapi.yaml|api/routes.php|api/routes/*)
        run_blackbox=1
        ;;
    esac

    case "$path" in
      adm/*.php|api/v1/Admin/Schema/*|docs/audits/ADMIN_SCHEMA_PROVIDER_READINESS.toml)
        run_porting=1
        run_readiness=1
        mark_integrated "$path"
        ;;
      api/docs/openapi.yaml)
        mark_integrated "$path"
        ;;
      api/routes.php|api/routes/*|tests/contract/*|api/v1/Auth/*|api/v1/Core/Error/*|api/v1/Support/*|api/v1/*/Dto/*|api/v1/*/Dtos/*|api/v1/*/Response/*|api/v1/*/Responses/*|api/v1/*/Enum/*|api/v1/*/Enums/*|api/v1/*/Definition/*|api/v1/*/Definitions/*)
        mark_integrated "$path"
        ;;
    esac
  done
fi

impl_integrated=0
porting_integrated=0
if [[ "$run_porting" -eq 1 && "$run_integrated" -eq 1 ]]; then
  porting_integrated=1
else
  impl_integrated="$run_integrated"
fi

echo "[audit:auto] run_structure=${run_structure}"
echo "[audit:auto] run_implementation=1"
echo "[audit:auto] run_porting=${run_porting}"
echo "[audit:auto] run_readiness=${run_readiness}"
echo "[audit:auto] run_blackbox=${run_blackbox}"
echo "[audit:auto] implementation_integrated=${impl_integrated}"
echo "[audit:auto] porting_integrated=${porting_integrated}"
if [[ "${#integrated_reasons[@]}" -gt 0 ]]; then
  printf '[audit:auto] integrated_reason=%s\n' "${integrated_reasons[@]}"
fi

if [[ "$run_structure" -eq 1 ]]; then
  echo "== audit:auto -> structure =="
  composer run audit:structure
fi

echo "== audit:auto -> implementation =="
RUN_BLACKBOX="$run_blackbox" RUN_INTEGRATED="$impl_integrated" composer run audit:implementation

if [[ "$run_porting" -eq 1 ]]; then
  echo "== audit:auto -> porting =="
  RUN_INTEGRATED="$porting_integrated" composer run audit:porting
fi

if [[ "$run_readiness" -eq 1 ]]; then
  echo "== audit:auto -> schema provider readiness =="
  composer run audit:schema-provider-readiness
fi
