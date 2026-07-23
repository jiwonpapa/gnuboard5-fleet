#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAGING_HOST="${STAGING_HOST:-neojins@192.168.0.127}"
STAGING_ROOT="${STAGING_ROOT:-/home/neojins/public_html}"
STAGING_HEALTH_URL="${STAGING_HEALTH_URL:-https://gnurestapi.cc/api/v1/health}"
STAGING_DOCS_URL="${STAGING_DOCS_URL:-https://gnurestapi.cc/api/docs/index.html}"
REMOTE_RELEASES_BASE="${REMOTE_RELEASES_BASE:-/home/neojins/releases}"
BUILD_MODE="${BUILD_MODE:-prod}"
SKIP_BUILD="${SKIP_BUILD:-0}"

SKIP_QUALITY=0
DRY_RUN=0
REHEARSAL=0
NO_DELETE=0
SKIP_PERMISSION_FIX=0
BACKUP_ID="${BACKUP_ID:-$(date +%Y%m%d%H%M%S)}"
BACKUP_PATH="${REMOTE_RELEASES_BASE}/staging-backup-${BACKUP_ID}"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/deploy_staging.sh [--skip-quality] [--dry-run] [--rehearsal] [--no-delete] [--skip-permission-fix]

Options:
  --skip-quality   Skip local quality gates (lint, hardcoding, docs, coverage, phpstan, plugin isolation)
  --dry-run        Do not copy files or modify remote server
  --rehearsal      Deploy -> smoke -> automatic rollback rehearsal
  --no-delete      Sync without deleting files on the remote server
  --skip-permission-fix
                  Do not chmod runtime log paths after deploy
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --skip-quality) SKIP_QUALITY=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --rehearsal) REHEARSAL=1 ;;
    --no-delete) NO_DELETE=1 ;;
    --skip-permission-fix) SKIP_PERMISSION_FIX=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

resolve_public_base_url() {
  if [[ -n "${STAGING_PUBLIC_BASE_URL:-}" ]]; then
    echo "${STAGING_PUBLIC_BASE_URL%/}"
    return
  fi

  local derived_from_health="${STAGING_HEALTH_URL%/api/v1/health}"
  if [[ "${derived_from_health}" != "${STAGING_HEALTH_URL}" ]]; then
    echo "${derived_from_health%/}"
    return
  fi

  local derived_from_docs="${STAGING_DOCS_URL%/api/docs/}"
  echo "${derived_from_docs%/}"
}

assert_public_path_blocked() {
  local public_base_url="$1"
  local path="$2"
  local status
  status="$(curl -sS -L -o /dev/null -w '%{http_code}' -m 10 "${public_base_url}${path}")"

  case "${status}" in
    401|403|404)
      log "Sensitive path blocked (${status}): ${path}"
      ;;
    200)
      echo "Sensitive path is publicly reachable: ${public_base_url}${path}" >&2
      return 1
      ;;
    *)
      echo "Unexpected status for sensitive path ${public_base_url}${path}: ${status}" >&2
      return 1
      ;;
  esac
}

remote_security_preflight() {
  local public_base_url
  public_base_url="$(resolve_public_base_url)"

  log "Remote security preflight: ${public_base_url}"

  ssh -o BatchMode=yes "${STAGING_HOST}" "
    set -euo pipefail
    if [ ! -f '${STAGING_ROOT}/.env' ]; then
      echo 'Missing required env file: ${STAGING_ROOT}/.env' >&2
      exit 1
    fi
    if [ ! -r '${STAGING_ROOT}/.env' ]; then
      echo 'Env file is not readable by deploy user: ${STAGING_ROOT}/.env' >&2
      exit 1
    fi
  "

  local setup_status
  setup_status="$(curl -sS -L -o /dev/null -w '%{http_code}' -m 10 "${public_base_url}/setup")"
  if [[ "${setup_status}" != "404" ]]; then
    echo "Setup endpoint must be locked before deploy: ${public_base_url}/setup returned ${setup_status}" >&2
    return 1
  fi
  log "Setup endpoint locked (404): ${public_base_url}/setup"

  assert_public_path_blocked "${public_base_url}" "/.env"
  assert_public_path_blocked "${public_base_url}" "/.env.example"
  assert_public_path_blocked "${public_base_url}" "/composer.json"
  assert_public_path_blocked "${public_base_url}" "/composer.lock"

  local server_header
  server_header="$(
    curl -sS -I -L -m 10 "${public_base_url}/" \
      | awk -F': ' 'tolower($1)=="server"{print tolower($2); exit}' \
      | tr -d '\r'
  )"

  if [[ "${server_header}" == *apache* ]]; then
    ssh -o BatchMode=yes "${STAGING_HOST}" "
      set -euo pipefail
      if [ ! -f '${STAGING_ROOT}/.htaccess' ]; then
        echo 'Apache detected but root .htaccess is missing: ${STAGING_ROOT}/.htaccess' >&2
        exit 1
      fi
      grep -Eiq '\\.env|composer\\.(json|lock)' '${STAGING_ROOT}/.htaccess'
    "
    log "Apache root .htaccess deny rules detected"
  elif [[ "${server_header}" == *nginx* ]]; then
    log "Nginx detected. Keep /etc/nginx server block aligned with resources/deploy/nginx-sensitive-files.conf.example"
  else
    log "Server header could not be classified. HTTP deny checks passed, but server-side rule review is still required."
  fi
}

run_quality_gates() {
  log "Running quality gates"
  ./scripts/run_quality_gates.sh
}

run_make_build() {
  if [[ "${SKIP_BUILD}" -eq 1 ]]; then
    log "Skipping make build"
    return
  fi

  if [[ "${SKIP_QUALITY}" -eq 1 ]]; then
    log "Generating runtime metadata only: make runtime-metadata MODE=${BUILD_MODE}"
    make runtime-metadata MODE="${BUILD_MODE}"
    return
  fi

  log "Running make build MODE=${BUILD_MODE}"
  make build MODE="${BUILD_MODE}"
}

remote_backup() {
  log "Creating remote backup: ${BACKUP_PATH}"
  ssh -o BatchMode=yes "${STAGING_HOST}" "
    set -euo pipefail
    mkdir -p '${BACKUP_PATH}'
    for item in api vendor dev composer.json composer.lock build/runtime; do
      if [ -e '${STAGING_ROOT}'/\${item} ]; then
        target_dir=\$(dirname '${BACKUP_PATH}'/\${item})
        mkdir -p \"\${target_dir}\"
        cp -a '${STAGING_ROOT}'/\${item} '${BACKUP_PATH}'/\${item}
      fi
    done
  "
}

remote_restore() {
  local restore_path="$1"
  local rsync_delete_arg="--delete"
  if [[ "${NO_DELETE}" -eq 1 ]]; then
    rsync_delete_arg=""
  fi
  log "Restoring from backup: ${restore_path}"
  ssh -o BatchMode=yes "${STAGING_HOST}" "
    set -euo pipefail
    if [ ! -d '${restore_path}' ]; then
      echo 'Backup path not found: ${restore_path}' >&2
      exit 1
    fi

    if [ -d '${restore_path}/api' ]; then
      mkdir -p '${STAGING_ROOT}/api'
      rsync -a ${rsync_delete_arg} '${restore_path}/api/' '${STAGING_ROOT}/api/'
    fi
    if [ -d '${restore_path}/vendor' ]; then
      mkdir -p '${STAGING_ROOT}/vendor'
      rsync -a ${rsync_delete_arg} '${restore_path}/vendor/' '${STAGING_ROOT}/vendor/'
    fi
    if [ -d '${restore_path}/dev' ]; then
      mkdir -p '${STAGING_ROOT}/dev'
      rsync -a ${rsync_delete_arg} '${restore_path}/dev/' '${STAGING_ROOT}/dev/'
    fi
    if [ -f '${restore_path}/composer.json' ]; then
      cp -a '${restore_path}/composer.json' '${STAGING_ROOT}/composer.json'
    fi
    if [ -f '${restore_path}/composer.lock' ]; then
      cp -a '${restore_path}/composer.lock' '${STAGING_ROOT}/composer.lock'
    fi
    if [ -d '${restore_path}/build/runtime' ]; then
      mkdir -p '${STAGING_ROOT}/build/runtime'
      rsync -a ${rsync_delete_arg} '${restore_path}/build/runtime/' '${STAGING_ROOT}/build/runtime/'
    fi
  "
}

remote_deploy() {
  log "Deploying api/ and vendor/ to ${STAGING_HOST}:${STAGING_ROOT}"
  local rsync_args=(-az)
  if [[ "${NO_DELETE}" -ne 1 ]]; then
    rsync_args+=(--delete)
  fi
  ssh -o BatchMode=yes "${STAGING_HOST}" "mkdir -p '${STAGING_ROOT}/build/runtime'"
  rsync "${rsync_args[@]}" ./api/ "${STAGING_HOST}:${STAGING_ROOT}/api/"
  rsync "${rsync_args[@]}" ./vendor/ "${STAGING_HOST}:${STAGING_ROOT}/vendor/"
  rsync "${rsync_args[@]}" ./dev/ "${STAGING_HOST}:${STAGING_ROOT}/dev/"
  rsync "${rsync_args[@]}" ./build/runtime/ "${STAGING_HOST}:${STAGING_ROOT}/build/runtime/"
  rsync -az ./composer.json "${STAGING_HOST}:${STAGING_ROOT}/composer.json"
  rsync -az ./composer.lock "${STAGING_HOST}:${STAGING_ROOT}/composer.lock"

  if [[ "${SKIP_PERMISSION_FIX}" -eq 1 ]]; then
    log "Skipping runtime log permission fix"
    return
  fi

  # api/logs는 런타임(웹서버 사용자) 쓰기 권한이 필요하므로 배포 직후 강제 보정
  ssh -o BatchMode=yes "${STAGING_HOST}" "
    set -euo pipefail
    mkdir -p '${STAGING_ROOT}/api/logs'
    touch '${STAGING_ROOT}/api/logs/error.log'
    chmod 777 '${STAGING_ROOT}/api/logs'
    chmod 666 '${STAGING_ROOT}/api/logs/error.log'
  "
}

smoke_check() {
  log "Smoke check: ${STAGING_HEALTH_URL}"
  local health_json
  health_json="$(curl -sS -m 10 "${STAGING_HEALTH_URL}")"
  php -r '
    $payload = json_decode($argv[1], true);
    if (!is_array($payload)) { fwrite(STDERR, "invalid json\n"); exit(1); }
    if (($payload["status"] ?? "") !== "ok") { fwrite(STDERR, "status not ok\n"); exit(1); }
    if (!isset($payload["g5_independent"])) { fwrite(STDERR, "missing g5_independent\n"); exit(1); }
  ' "${health_json}"

  log "Smoke check: ${STAGING_DOCS_URL}"
  local docs_body
  local docs_status
  local docs_body_path
  docs_body_path="$(mktemp)"
  docs_status="$(curl -sS -L -o "${docs_body_path}" -w '%{http_code}' -m 10 "${STAGING_DOCS_URL}")"
  if [[ ! "${docs_status}" =~ ^2[0-9][0-9]$ ]]; then
    echo "Docs smoke failed: ${STAGING_DOCS_URL} returned ${docs_status}" >&2
    rm -f "${docs_body_path}"
    return 1
  fi
  docs_body="$(cat "${docs_body_path}")"
  rm -f "${docs_body_path}"
  grep -Eqi 'swagger|openapi' <<<"${docs_body}"
}

run_make_build

if [[ "${SKIP_BUILD}" -eq 1 && "${SKIP_QUALITY}" -eq 0 ]]; then
  run_quality_gates
elif [[ "${SKIP_QUALITY}" -eq 1 ]]; then
  log "Skipping quality gates"
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "Dry-run mode enabled. No remote changes applied."
  log "Planned backup path: ${BACKUP_PATH}"
  exit 0
fi

remote_security_preflight
remote_backup
echo "${BACKUP_PATH}" > .deploy_last_staging_backup
log "Backup recorded in .deploy_last_staging_backup"

if ! remote_deploy; then
  log "Deploy failed. Running rollback."
  remote_restore "${BACKUP_PATH}"
  exit 1
fi

if ! smoke_check; then
  log "Smoke check failed. Running rollback."
  remote_restore "${BACKUP_PATH}"
  exit 1
fi

if [[ "${REHEARSAL}" -eq 1 ]]; then
  log "Rehearsal mode: automatic rollback start"
  remote_restore "${BACKUP_PATH}"
  smoke_check
  log "Rehearsal completed (deploy + rollback + smoke)"
  exit 0
fi

log "Deployment completed successfully. Backup ID: ${BACKUP_ID}"
