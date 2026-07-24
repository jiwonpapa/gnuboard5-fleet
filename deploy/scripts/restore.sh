#!/bin/sh
set -eu

# shellcheck source=deploy/scripts/common.sh
. "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)/common.sh"

filename=${1:-}
env_file=${2:-"$deploy_root/compose/.env"}
recovery_passphrase=${3:-}
[ -n "$filename" ] || {
  echo "usage: restore.sh SNAPSHOT_FILENAME [ENV_FILE]" >&2
  exit 1
}
case "$filename" in
  */*|.*|"") echo "snapshot must be a plain filename" >&2; exit 1 ;;
esac
for command in docker awk curl openssl tar; do require_command "$command"; done
validate_env_file "$env_file"
state_dir=$(env_value G5_FLEET_STATE_DIR "$env_file")
snapshot="$state_dir/backups/$filename"
manifest="$snapshot.manifest.json"
[ -f "$snapshot" ] && [ -f "$manifest" ] || {
  echo "snapshot or manifest is missing" >&2
  exit 1
}

stamp=$(date -u +%Y%m%dT%H%M%SZ)
previous="$state_dir/data.pre-restore-$stamp"
failed="$state_dir/data.restore-failed-$stamp"
previous_secrets="$state_dir/secrets.pre-restore-$stamp"
recovery_work="$state_dir/backups/.restore-recovery-$stamp"
restore_recovery=0
cleanup_recovery() {
  if [ -d "$recovery_work" ]; then
    rm -f "$recovery_work/master-key" "$recovery_work/installation-id" \
      "$recovery_work/recovery.manifest" "$recovery_work/recovery.tar"
    rmdir "$recovery_work" 2>/dev/null || true
  fi
}
trap cleanup_recovery EXIT HUP INT TERM

if [ -n "$recovery_passphrase" ]; then
  validate_secret_file "$recovery_passphrase" "recovery passphrase file"
  recovery_archive="$snapshot.recovery.enc"
  validate_secret_file "$recovery_archive" "encrypted recovery archive"
  mkdir -m 0700 "$recovery_work"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
    -pass "file:$recovery_passphrase" \
    -in "$recovery_archive" -out "$recovery_work/recovery.tar"
  archive_entries=$(tar -tf "$recovery_work/recovery.tar" | LC_ALL=C sort)
  expected_entries=$(printf '%s\n' installation-id master-key recovery.manifest | LC_ALL=C sort)
  [ "$archive_entries" = "$expected_entries" ] || {
    echo "recovery archive contains an unexpected file set" >&2
    exit 1
  }
  tar -C "$recovery_work" -xf "$recovery_work/recovery.tar"
  for recovery_file in master-key installation-id recovery.manifest; do
    [ -f "$recovery_work/$recovery_file" ] && [ ! -L "$recovery_work/$recovery_file" ] || {
      echo "recovery file is missing or unsafe: $recovery_file" >&2
      exit 1
    }
  done
  [ "$(env_value schema "$recovery_work/recovery.manifest")" = "g5-fleet.recovery/v1" ] || {
    echo "recovery manifest schema mismatch" >&2
    exit 1
  }
  [ "$(env_value snapshot "$recovery_work/recovery.manifest")" = "$filename" ] || {
    echo "recovery snapshot binding mismatch" >&2
    exit 1
  }
  [ "$(env_value master_key_sha256 "$recovery_work/recovery.manifest")" = \
    "$(sha256_file "$recovery_work/master-key")" ] || {
    echo "recovered master key checksum mismatch" >&2
    exit 1
  }
  [ "$(env_value installation_id_sha256 "$recovery_work/recovery.manifest")" = \
    "$(sha256_file "$recovery_work/installation-id")" ] || {
    echo "recovered installation identity checksum mismatch" >&2
    exit 1
  }
  restore_recovery=1
fi

compose stop caddy app
mv "$state_dir/data" "$previous"
prepare_runtime_directory "$state_dir/data"
if ! compose run --rm --no-deps app restore \
  "/var/backups/g5-fleet/$filename" \
  "/var/backups/g5-fleet/$filename.manifest.json" \
  /var/lib/g5-fleet; then
  mv "$state_dir/data" "$failed"
  mv "$previous" "$state_dir/data"
  start_and_verify || true
  echo "restore rejected; original data reinstated, failed target retained at $failed" >&2
  exit 1
fi
if [ "$restore_recovery" -eq 1 ]; then
  mv "$state_dir/secrets" "$previous_secrets"
  prepare_runtime_directory "$state_dir/secrets"
  cp "$recovery_work/master-key" "$state_dir/secrets/master-key"
  cp "$recovery_work/installation-id" "$state_dir/secrets/installation-id"
  chmod 0600 "$state_dir/secrets/master-key" "$state_dir/secrets/installation-id"
  if [ "$(id -u)" -eq 0 ]; then
    runtime_uid=$(env_value G5_FLEET_RUNTIME_UID "$env_file")
    runtime_gid=$(env_value G5_FLEET_RUNTIME_GID "$env_file")
    chown "$runtime_uid:$runtime_gid" \
      "$state_dir/secrets/master-key" "$state_dir/secrets/installation-id"
  fi
fi
if ! start_and_verify; then
  compose stop caddy app
  mv "$state_dir/data" "$failed"
  mv "$previous" "$state_dir/data"
  if [ "$restore_recovery" -eq 1 ]; then
    rm -f "$state_dir/secrets/master-key" "$state_dir/secrets/installation-id"
    rmdir "$state_dir/secrets"
    mv "$previous_secrets" "$state_dir/secrets"
  fi
  start_and_verify
  echo "restored data failed runtime verification; original data reinstated" >&2
  exit 1
fi
echo "restore verified; previous data retained at $previous"
if [ "$restore_recovery" -eq 1 ]; then
  echo "master key recovery verified; previous secrets retained at $previous_secrets"
fi
