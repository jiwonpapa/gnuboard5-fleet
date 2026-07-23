#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
G5_ADMIN_DIR="${RUST_ROOT}/g5-admin"
TARGET_DIR="${RUST_ROOT}/target"
INSTALL_ARCHIVE_DIR="${HOME}/Library/Application Support/g5-admin/deploy-archive"
KEEP_ARCHIVES="${G5_DEPLOY_ARCHIVE_KEEP:-2}"
WARN_MAX_MIB="${G5_BUILD_CACHE_WARN_MIB:-32768}"
MODE="incremental"

usage() {
  cat <<'EOF'
Usage: scripts/prune_build_artifacts.sh [--auto|--full|--archives-only]

Removes reproducible local build artifacts while preserving dependencies,
source files, lockfiles, audit evidence, and the currently installed app.

Options:
  --auto           Preserve all compilation caches. Report their size and prune
                   old deployment rollback archives only.
  --full           Run cargo clean for the workspace, then prune web caches and
                   old deployment archives.
  --archives-only  Keep only the newest deployment rollback archives.
  -h, --help       Show this help.

Environment:
  G5_DEPLOY_ARCHIVE_KEEP  Number of rollback archives to retain (default: 2).
  G5_BUILD_CACHE_WARN_MIB  Warning threshold without deletion (default: 32768).
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --auto)
      MODE="auto"
      ;;
    --full)
      MODE="full"
      ;;
    --archives-only)
      MODE="archives-only"
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

if [[ ! "${KEEP_ARCHIVES}" =~ ^[0-9]+$ ]]; then
  echo "G5_DEPLOY_ARCHIVE_KEEP must be a non-negative integer" >&2
  exit 2
fi

if [[ ! "${WARN_MAX_MIB}" =~ ^[0-9]+$ ]]; then
  echo "G5_BUILD_CACHE_WARN_MIB must be a non-negative integer MiB value" >&2
  exit 2
fi

remove_derived_path() {
  local path="$1"

  [[ ! -e "${path}" ]] && return 0
  case "${path}" in
    "${TARGET_DIR}"/*|\
    "${G5_ADMIN_DIR}/dist"|\
    "${G5_ADMIN_DIR}/coverage"|\
    "${G5_ADMIN_DIR}/coverage-critical"|\
    "${G5_ADMIN_DIR}/node_modules/.vite"|\
    "${RUST_ROOT}/.playwright-cli"|\
    "${RUST_ROOT}/scripts/__pycache__")
      rm -rf -- "${path}"
      ;;
    *)
      echo "refusing to remove unexpected path: ${path}" >&2
      exit 1
      ;;
  esac
}

path_mtime() {
  local path="$1"

  if stat -f '%m' "${path}" >/dev/null 2>&1; then
    stat -f '%m' "${path}"
  else
    stat -c '%Y' "${path}"
  fi
}

prune_archive_dir() {
  local archive_dir="$1"
  local kept=0
  local removed=0
  local entry
  local timestamp
  local listing

  [[ ! -d "${archive_dir}" ]] && return 0
  listing="$(mktemp)"
  while IFS= read -r entry; do
    [[ -z "${entry}" ]] && continue
    timestamp="$(path_mtime "${entry}")"
    printf '%s\t%s\n' "${timestamp}" "${entry}" >>"${listing}"
  done < <(find "${archive_dir}" -mindepth 1 -maxdepth 1 -type d -name '*.stale-*' -print)

  while IFS=$'\t' read -r _ entry; do
    [[ -z "${entry}" ]] && continue
    if (( kept < KEEP_ARCHIVES )); then
      kept=$((kept + 1))
      continue
    fi
    rm -rf -- "${entry}"
    removed=$((removed + 1))
  done < <(sort -rn "${listing}")
  rm -f "${listing}"

  echo "archive retention: ${archive_dir} (kept=${kept}, removed=${removed})"
}

prune_archives() {
  prune_archive_dir "${TARGET_DIR}/.deploy-archive"
  prune_archive_dir "${INSTALL_ARCHIVE_DIR}"
}

target_size_mib() {
  local size_kib

  [[ ! -d "${TARGET_DIR}" ]] && {
    echo 0
    return 0
  }
  size_kib="$(du -sk "${TARGET_DIR}" | awk '{print $1}')"
  echo $(( (size_kib + 1023) / 1024 ))
}

prune_incremental_artifacts() {
  echo "pruning incremental Rust artifacts"
  remove_derived_path "${TARGET_DIR}/debug/incremental"
  remove_derived_path "${TARGET_DIR}/desktop-fast/incremental"
  while IFS= read -r incremental_dir; do
    [[ -z "${incremental_dir}" ]] && continue
    remove_derived_path "${incremental_dir}"
  done < <(find "${TARGET_DIR}" -mindepth 3 -maxdepth 3 -type d -name incremental -print 2>/dev/null)
}

prune_common_caches() {
  echo "pruning frontend and generated test caches"
  remove_derived_path "${G5_ADMIN_DIR}/dist"
  remove_derived_path "${G5_ADMIN_DIR}/coverage"
  remove_derived_path "${G5_ADMIN_DIR}/coverage-critical"
  remove_derived_path "${G5_ADMIN_DIR}/node_modules/.vite"
  remove_derived_path "${RUST_ROOT}/.playwright-cli"
  remove_derived_path "${RUST_ROOT}/scripts/__pycache__"
  prune_archives
}

if [[ "${MODE}" == "archives-only" ]]; then
  prune_archives
  exit 0
fi

if [[ "${MODE}" == "auto" ]]; then
  before_mib="$(target_size_mib)"
  prune_archives
  if (( before_mib > WARN_MAX_MIB )); then
    echo "WARN: build cache preserved despite size (${before_mib} MiB > ${WARN_MAX_MIB} MiB)"
  else
    echo "PASS: build cache preserved (${before_mib} MiB)"
  fi
  exit 0
fi

if [[ "${MODE}" == "full" ]]; then
  echo "cleaning full Rust workspace target: ${TARGET_DIR}"
  cargo clean --manifest-path "${G5_ADMIN_DIR}/src-tauri/Cargo.toml"
else
  prune_incremental_artifacts
fi

prune_common_caches

echo "PASS: build artifacts pruned (${MODE})"
