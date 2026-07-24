#!/bin/sh
set -eu

# shellcheck source=deploy/scripts/common.sh
. "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)/common.sh"

recovery_passphrase=${1:-}
env_file=${2:-"$deploy_root/compose/.env"}
[ -n "$recovery_passphrase" ] || {
  echo "usage: backup.sh RECOVERY_PASSPHRASE_FILE [ENV_FILE]" >&2
  exit 1
}
for command in docker awk curl openssl tar; do require_command "$command"; done
validate_env_file "$env_file"
validate_secret_file "$recovery_passphrase" "recovery passphrase file"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
filename="manual-$stamp.sqlite3"
state_dir=$(env_value G5_FLEET_STATE_DIR "$env_file")
recovery_work="$state_dir/backups/.recovery-$stamp"
recovery_archive="$state_dir/backups/$filename.recovery.enc"
mkdir -m 0700 "$recovery_work"
cleanup_recovery() {
  rm -f "$recovery_work/master-key" "$recovery_work/installation-id" \
    "$recovery_work/recovery.manifest" "$recovery_work/recovery.tar"
  rmdir "$recovery_work" 2>/dev/null || true
}
trap cleanup_recovery EXIT HUP INT TERM

compose stop caddy app
if ! compose run --rm --no-deps app backup "/var/backups/g5-fleet/$filename"; then
  start_and_verify || true
  exit 1
fi
cp "$state_dir/secrets/master-key" "$recovery_work/master-key"
cp "$state_dir/secrets/installation-id" "$recovery_work/installation-id"
chmod 0600 "$recovery_work/master-key" "$recovery_work/installation-id"
cat > "$recovery_work/recovery.manifest" <<EOF
schema=g5-fleet.recovery/v1
snapshot=$filename
master_key_sha256=$(sha256_file "$recovery_work/master-key")
installation_id_sha256=$(sha256_file "$recovery_work/installation-id")
EOF
chmod 0600 "$recovery_work/recovery.manifest"
tar -C "$recovery_work" -cf "$recovery_work/recovery.tar" \
  master-key installation-id recovery.manifest
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
  -salt -pass "file:$recovery_passphrase" \
  -in "$recovery_work/recovery.tar" -out "$recovery_archive"
chmod 0600 "$recovery_archive"
rm -f "$recovery_work/recovery.tar"
start_and_verify
echo "verified backup: $state_dir/backups/$filename"
echo "encrypted master-key recovery: $recovery_archive"
