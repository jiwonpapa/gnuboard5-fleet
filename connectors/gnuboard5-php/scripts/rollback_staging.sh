#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAGING_HOST="${STAGING_HOST:-neojins@192.168.0.127}"
STAGING_ROOT="${STAGING_ROOT:-/home/neojins/public_html}"
REMOTE_RELEASES_BASE="${REMOTE_RELEASES_BASE:-/home/neojins/releases}"
STAGING_HEALTH_URL="${STAGING_HEALTH_URL:-https://gnurestapi.cc/api/v1/health}"

if [[ $# -lt 1 ]]; then
  if [[ -f .deploy_last_staging_backup ]]; then
    BACKUP_PATH="$(cat .deploy_last_staging_backup)"
  else
    echo "Usage: ./scripts/rollback_staging.sh <backup-id|backup-path>" >&2
    exit 1
  fi
else
  ARG="$1"
  if [[ "$ARG" == */* ]]; then
    BACKUP_PATH="$ARG"
  else
    BACKUP_PATH="${REMOTE_RELEASES_BASE}/staging-backup-${ARG}"
  fi
fi

echo "Rolling back from: ${BACKUP_PATH}"

ssh -o BatchMode=yes "${STAGING_HOST}" "
  set -euo pipefail
  if [ ! -d '${BACKUP_PATH}' ]; then
    echo 'Backup path not found: ${BACKUP_PATH}' >&2
    exit 1
  fi

  if [ -d '${BACKUP_PATH}/api' ]; then
    mkdir -p '${STAGING_ROOT}/api'
    rsync -a --delete '${BACKUP_PATH}/api/' '${STAGING_ROOT}/api/'
  fi

  if [ -d '${BACKUP_PATH}/vendor' ]; then
    mkdir -p '${STAGING_ROOT}/vendor'
    rsync -a --delete '${BACKUP_PATH}/vendor/' '${STAGING_ROOT}/vendor/'
  fi

  if [ -f '${BACKUP_PATH}/composer.json' ]; then
    cp -a '${BACKUP_PATH}/composer.json' '${STAGING_ROOT}/composer.json'
  fi

  if [ -f '${BACKUP_PATH}/composer.lock' ]; then
    cp -a '${BACKUP_PATH}/composer.lock' '${STAGING_ROOT}/composer.lock'
  fi
"

echo "Rollback applied. Smoke: ${STAGING_HEALTH_URL}"
curl -sS -m 10 "${STAGING_HEALTH_URL}"
echo
echo "Rollback completed."

