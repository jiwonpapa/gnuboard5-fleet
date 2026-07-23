#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUST_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_NAME="그누5어드민"
EXECUTABLE_NAME="g5-admin-desktop"
SOURCE_BUNDLE="${RUST_ROOT}/target/release/bundle/macos/${APP_NAME}.app"
FAST_BINARY="${RUST_ROOT}/target/desktop-fast/${EXECUTABLE_NAME}"
SOURCE_RUNTIME_CONFIG="${RUST_ROOT}/g5-admin/src-tauri/app-config.json"
TARGET_CACHE_DIR="${RUST_ROOT}/target/.deploy-cache"
RELEASE_CACHE_APP="${TARGET_CACHE_DIR}/release/${APP_NAME}.app"
STAGED_APP="${TARGET_CACHE_DIR}/desktop-fast/${APP_NAME}.app"
INSTALL_APP="/Applications/${APP_NAME}.app"
TARGET_ARCHIVE_DIR="${RUST_ROOT}/target/.deploy-archive"
INSTALL_ARCHIVE_DIR="${HOME}/Library/Application Support/g5-admin/deploy-archive"

ensure_noindex_dir() {
  local dir="$1"
  mkdir -p "${dir}"
  touch "${dir}/.metadata_never_index"
}

archive_matching_apps() {
  local search_dir="$1"
  local pattern="$2"
  local archive_dir="$3"

  while IFS= read -r app_path; do
    [[ -z "${app_path}" ]] && continue
    archive_app "${app_path}" "${archive_dir}"
  done < <(find "${search_dir}" -maxdepth 1 -type d -name "${pattern}" 2>/dev/null | sort)
}

archive_app() {
  local source_path="$1"
  local archive_dir="$2"
  local archive_path
  archive_path="${archive_dir}/$(basename "${source_path}").stale-$(date +%Y%m%d-%H%M%S)"

  [[ ! -e "${source_path}" ]] && return 0
  mkdir -p "${archive_dir}"
  mv "${source_path}" "${archive_path}"
}

sync_runtime_config_resource() {
  local app_path="$1"
  local resource_path="${app_path}/Contents/Resources/app-config.json"

  [[ ! -d "${app_path}" ]] && return 0
  [[ ! -f "${SOURCE_RUNTIME_CONFIG}" ]] && return 0

  cp "${SOURCE_RUNTIME_CONFIG}" "${resource_path}"
}

resign_bundle_ad_hoc() {
  local app_path="$1"

  if codesign --verify --deep --strict "${app_path}" >/dev/null 2>&1; then
    return 0
  fi

  echo "fast 배포로 변경된 번들을 ad-hoc 재서명합니다: ${app_path}"
  codesign --force --deep --sign - "${app_path}"
}

prepare_release_bundle_cache() {
  ensure_noindex_dir "${TARGET_CACHE_DIR}"
  ensure_noindex_dir "$(dirname "${RELEASE_CACHE_APP}")"

  if [[ -d "${SOURCE_BUNDLE}" ]]; then
    [[ -d "${RELEASE_CACHE_APP}" ]] && archive_app "${RELEASE_CACHE_APP}" "${TARGET_ARCHIVE_DIR}"
    mkdir -p "$(dirname "${RELEASE_CACHE_APP}")"
    ditto "${SOURCE_BUNDLE}" "${RELEASE_CACHE_APP}"
    archive_app "${SOURCE_BUNDLE}" "${TARGET_ARCHIVE_DIR}"
  fi

  if [[ ! -d "${RELEASE_CACHE_APP}" ]]; then
    echo "빠른 배포용 기준 앱 번들이 없습니다: ${SOURCE_BUNDLE}" >&2
    echo "먼저 한 번은 'bun run tauri build --bundles app' 또는 'bun run deploy:mac'를 실행해 주세요." >&2
    exit 1
  fi

  sync_runtime_config_resource "${RELEASE_CACHE_APP}"
}

if [[ ! -f "${FAST_BINARY}" ]]; then
  echo "빠른 배포용 바이너리가 없습니다: ${FAST_BINARY}" >&2
  echo "먼저 'bun run build:desktop:fast'를 실행해 주세요." >&2
  exit 1
fi

ensure_noindex_dir "${RUST_ROOT}/target"
ensure_noindex_dir "${TARGET_CACHE_DIR}"
ensure_noindex_dir "${TARGET_ARCHIVE_DIR}"
ensure_noindex_dir "${INSTALL_ARCHIVE_DIR}"
archive_matching_apps "${RUST_ROOT}/target/desktop-fast" "${APP_NAME}.app" "${TARGET_ARCHIVE_DIR}"
archive_matching_apps "${RUST_ROOT}/target/desktop-fast" '*.stale-*' "${TARGET_ARCHIVE_DIR}"
archive_matching_apps "/Applications" 'g5-admin.app*' "${INSTALL_ARCHIVE_DIR}"
archive_matching_apps "/Applications" '러스트 어드민.app*' "${INSTALL_ARCHIVE_DIR}"
prepare_release_bundle_cache

if [[ -d "${STAGED_APP}" ]]; then
  archive_app "${STAGED_APP}" "${TARGET_ARCHIVE_DIR}"
fi

mkdir -p "$(dirname "${STAGED_APP}")"
ditto "${RELEASE_CACHE_APP}" "${STAGED_APP}"
cp "${FAST_BINARY}" "${STAGED_APP}/Contents/MacOS/${EXECUTABLE_NAME}"
sync_runtime_config_resource "${STAGED_APP}"
resign_bundle_ad_hoc "${STAGED_APP}"

osascript -e 'tell application id "com.neojins.g5-admin" to quit' >/dev/null 2>&1 || true

while IFS= read -r pid; do
  [[ -z "${pid}" ]] && continue
  kill "${pid}" || true
done < <(pgrep -f "${EXECUTABLE_NAME}" || true)

sleep 1

archive_matching_apps "/Applications" "${APP_NAME}.app.stale-*" "${INSTALL_ARCHIVE_DIR}"

if [[ -d "${INSTALL_APP}" ]]; then
  archive_app "${INSTALL_APP}" "${INSTALL_ARCHIVE_DIR}"
fi

ditto "${STAGED_APP}" "${INSTALL_APP}"
sync_runtime_config_resource "${INSTALL_APP}"
resign_bundle_ad_hoc "${INSTALL_APP}"
open -na "${INSTALL_APP}"
"${RUST_ROOT}/scripts/prune_build_artifacts.sh" --archives-only

echo "빠른 배포 완료: ${INSTALL_APP}"
