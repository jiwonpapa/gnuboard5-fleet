#!/bin/sh
set -eu

# shellcheck source=deploy/scripts/common.sh
. "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)/common.sh"

new_version=${1:-}
env_file=${2:-"$deploy_root/compose/.env"}
[ -n "$new_version" ] || {
  echo "usage: upgrade.sh NEW_VERSION [ENV_FILE]" >&2
  exit 1
}
validate_version "$new_version"
for command in docker awk curl; do require_command "$command"; done
validate_env_file "$env_file"
old_version=$(env_value G5_FLEET_VERSION "$env_file")
[ "$old_version" != "$new_version" ] || {
  echo "new version equals current version" >&2
  exit 1
}
state_dir=$(env_value G5_FLEET_STATE_DIR "$env_file")
stamp=$(date -u +%Y%m%dT%H%M%SZ)
filename="upgrade-$old_version-to-$new_version-$stamp.sqlite3"

rollback() {
  echo "upgrade failed; restoring version=$old_version and verified backup" >&2
  compose stop caddy app >/dev/null 2>&1 || true
  set_env_value G5_FLEET_VERSION "$old_version" "$env_file"
  if [ -d "$state_dir/data" ]; then
    mv "$state_dir/data" "$state_dir/data.failed-upgrade-$stamp"
  fi
  prepare_runtime_directory "$state_dir/data"
  compose run --rm --no-deps app restore \
    "/var/backups/g5-fleet/$filename" \
    "/var/backups/g5-fleet/$filename.manifest.json" \
    /var/lib/g5-fleet
  start_and_verify
  echo "rollback verified: version=$old_version" >&2
}

compose stop caddy app
before_readback=$(compose run --rm --no-deps app readback)
if ! compose run --rm --no-deps app backup "/var/backups/g5-fleet/$filename"; then
  start_and_verify || true
  exit 1
fi
set_env_value G5_FLEET_VERSION "$new_version" "$env_file"

if [ "$(env_value G5_FLEET_PULL_POLICY "$env_file")" != "never" ]; then
  if ! compose pull app; then
    rollback
    exit 1
  fi
fi
if ! start_and_verify; then
  rollback
  exit 1
fi

after_readback=$(compose exec -T app /usr/local/bin/g5-fleet-admin-server readback)
if [ "$after_readback" != "$before_readback" ]; then
  rollback
  echo "upgrade critical-row readback mismatch" >&2
  exit 1
fi
readback=$(compose exec -T app /usr/local/bin/g5-fleet-admin-server version)
case "$readback" in
  *"\"image_version\":\"$new_version\""*) ;;
  *) rollback; echo "upgraded container version readback mismatch: $readback" >&2; exit 1 ;;
esac
printf '%s\n' "$readback"
echo "upgrade verified: $old_version -> $new_version; backup=$state_dir/backups/$filename"
