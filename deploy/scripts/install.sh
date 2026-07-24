#!/bin/sh
set -eu

# shellcheck source=deploy/scripts/common.sh
. "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)/common.sh"

version=${1:-}
state_dir=${2:-"$deploy_root/state"}
env_file=${3:-"$deploy_root/compose/.env"}
image=${G5_FLEET_IMAGE:-ghcr.io/jiwonpapa/gnuboard5-fleet}

[ -n "$version" ] || {
  echo "usage: install.sh VERSION [STATE_DIRECTORY] [ENV_FILE]" >&2
  exit 1
}
validate_version "$version"
case "$state_dir" in
  /*) ;;
  *) state_dir=$(CDPATH='' cd -- "$(dirname -- "$state_dir")" && pwd -P)/$(basename -- "$state_dir") ;;
esac
[ "$state_dir" != "/" ] || {
  echo "state directory cannot be /" >&2
  exit 1
}

for command in docker curl openssl awk; do require_command "$command"; done
docker compose version >/dev/null

if [ -e "$state_dir/data/installation.json" ] || [ -e "$env_file" ]; then
  echo "existing installation detected; use upgrade.sh" >&2
  exit 1
fi

umask 077
mkdir -p "$state_dir/data" "$state_dir/backups" "$state_dir/secrets"
chmod 0700 "$state_dir" "$state_dir/data" "$state_dir/backups" "$state_dir/secrets"
openssl rand -base64 32 > "$state_dir/secrets/master-key"
installation_id="fleet-$(openssl rand -hex 16)"
printf '%s\n' "$installation_id" > "$state_dir/secrets/installation-id"
chmod 0600 "$state_dir/secrets/master-key" "$state_dir/secrets/installation-id"

runtime_uid=$(id -u)
runtime_gid=$(id -g)
if [ "$runtime_uid" -eq 0 ]; then
  runtime_uid=10001
  runtime_gid=10001
  chown -R "$runtime_uid:$runtime_gid" \
    "$state_dir/data" "$state_dir/backups" "$state_dir/secrets"
fi
cat > "$env_file" <<EOF
G5_FLEET_IMAGE=$image
G5_FLEET_VERSION=$version
G5_FLEET_PULL_POLICY=${G5_FLEET_PULL_POLICY:-missing}
G5_FLEET_STATE_DIR=$state_dir
G5_FLEET_RUNTIME_UID=$runtime_uid
G5_FLEET_RUNTIME_GID=$runtime_gid
G5_FLEET_HTTP_BIND=${G5_FLEET_HTTP_BIND:-127.0.0.1}
G5_FLEET_HTTP_PORT=${G5_FLEET_HTTP_PORT:-8088}
G5_FLEET_CADDY_IMAGE=${G5_FLEET_CADDY_IMAGE:-caddy:2.10.2-alpine}
EOF
chmod 0600 "$env_file"
validate_env_file "$env_file"

if [ "$(env_value G5_FLEET_PULL_POLICY "$env_file")" != "never" ]; then
  compose pull
fi
start_and_verify
readback=$(compose exec -T app /usr/local/bin/g5-fleet-admin-server version)
case "$readback" in
  *"\"image_version\":\"$version\""*) ;;
  *) echo "installed container version readback mismatch: $readback" >&2; exit 1 ;;
esac
printf '%s\n' "$readback"
echo "G5 Fleet install verified: version=$version state=$state_dir"
