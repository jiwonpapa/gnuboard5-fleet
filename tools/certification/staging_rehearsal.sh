#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
provider_id=${1:-}
version=${2:-}
env_file=${3:-}
release_manifest=${4:-}
output_dir=${5:-}
compose_file="$root/deploy/compose/compose.yaml"

usage() {
  echo "usage: staging_rehearsal.sh PROVIDER_ID VERSION ENV_FILE RELEASE_MANIFEST OUTPUT_DIRECTORY" >&2
  exit 1
}

[ -n "$provider_id" ] && [ -n "$version" ] && [ -n "$env_file" ] \
  && [ -n "$release_manifest" ] && [ -n "$output_dir" ] || usage
case "$provider_id" in
  *[!A-Za-z0-9._:-]*|"") echo "invalid provider ID" >&2; exit 1 ;;
esac
case "$version" in
  *[!0-9A-Za-z._-]*|"") echo "invalid version" >&2; exit 1 ;;
esac
[ "${#provider_id}" -ge 3 ] && [ "${#provider_id}" -le 200 ] || usage
[ "${#version}" -le 64 ] || usage
for path in "$env_file" "$release_manifest" "$output_dir"; do
  case "$path" in
    /*) ;;
    *) echo "staging paths must be absolute: $path" >&2; exit 1 ;;
  esac
done
[ "$output_dir" != "/" ] || {
  echo "output directory cannot be /" >&2
  exit 1
}
if [ -L "$output_dir" ] \
  || { [ -e "$output_dir" ] && [ ! -d "$output_dir" ]; }; then
  echo "output directory is unsafe" >&2
  exit 1
fi
[ -f "$env_file" ] && [ ! -L "$env_file" ] || {
  echo "deployment env file is missing or unsafe" >&2
  exit 1
}
[ -f "$release_manifest" ] && [ ! -L "$release_manifest" ] || {
  echo "release manifest is missing or unsafe" >&2
  exit 1
}
for command in docker curl awk python3 find cut sort tail; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "required command missing: $command" >&2
    exit 1
  }
done
docker compose version >/dev/null

env_value() {
  key=$1
  awk -F= -v key="$key" \
    '$1 == key {sub(/^[^=]*=/, ""); print; found=1} END {if (!found) exit 1}' \
    "$env_file"
}

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

start_and_verify() {
  compose up -d
  bind=$(env_value G5_FLEET_HTTP_BIND)
  port=$(env_value G5_FLEET_HTTP_PORT)
  count=0
  while [ "$count" -lt 60 ]; do
    if curl --fail --silent --show-error "http://${bind}:${port}/readyz" >/dev/null; then
      return 0
    fi
    count=$((count + 1))
    sleep 1
  done
  compose ps >&2 || true
  return 1
}

state_dir=$(env_value G5_FLEET_STATE_DIR)
case "$state_dir" in
  /*) ;;
  *) echo "G5_FLEET_STATE_DIR must be absolute" >&2; exit 1 ;;
esac
[ "$state_dir" != "/" ] || {
  echo "G5_FLEET_STATE_DIR cannot be /" >&2
  exit 1
}

umask 077
mkdir -p "$output_dir"
chmod 0700 "$output_dir"
deployment_receipt="$output_dir/deployment-receipt.json"
rollback_receipt="$output_dir/rollback-receipt.json"

version_readback=$(compose exec -T app /usr/local/bin/g5-fleet-admin-server version)
container_id=$(compose ps -q app)
[ -n "$container_id" ] || {
  echo "staging app container is not running" >&2
  exit 1
}
runtime_image_id=$(docker inspect --format '{{.Image}}' "$container_id")
runtime_platform=$(docker image inspect \
  --format '{{.Os}}/{{.Architecture}}' "$runtime_image_id")
release_image_id=$(python3 -c \
  'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["image_id"])' \
  "$release_manifest")
release_platform=$(python3 -c \
  'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["platform"])' \
  "$release_manifest")
[ "$runtime_image_id" = "$release_image_id" ] \
  && [ "$runtime_platform" = "$release_platform" ] || {
  echo "staging runtime image/platform does not match release manifest" >&2
  exit 1
}
runtime_version=$(python3 -c \
  'import json,sys; print(json.loads(sys.argv[1])["image_version"])' \
  "$version_readback")
[ "$runtime_version" = "$version" ] || {
  echo "staging runtime version does not match requested release" >&2
  exit 1
}
python3 "$root/tools/certification/staging_receipt.py" deployment \
  --provider-id "$provider_id" \
  --release "$release_manifest" \
  --version-readback-json "$version_readback" \
  --runtime-image-id "$runtime_image_id" \
  --runtime-platform "$runtime_platform" \
  --output "$deployment_receipt"

revision=$(python3 -c \
  'import json,sys; print(json.loads(sys.argv[1])["build_revision"])' \
  "$version_readback")
failed_version="missing-staging-$(printf '%s' "$revision" | cut -c1-12)"
if "$root/deploy/scripts/upgrade.sh" "$failed_version" "$env_file"; then
  echo "staging failed-upgrade rehearsal unexpectedly succeeded" >&2
  exit 1
fi

snapshot=$(find "$state_dir/backups" -maxdepth 1 -type f \
  -name "upgrade-$version-to-$failed_version-*.sqlite3" \
  | LC_ALL=C sort | tail -1)
[ -n "$snapshot" ] && [ -f "$snapshot.manifest.json" ] || {
  echo "staging rollback snapshot or manifest is missing" >&2
  exit 1
}

restart_required=1
restart_on_exit() {
  if [ "$restart_required" -eq 1 ]; then
    start_and_verify >/dev/null 2>&1 || true
  fi
}
trap restart_on_exit EXIT HUP INT TERM
compose stop caddy app
restored_readback=$(compose run --rm --no-deps app readback)
start_and_verify
restart_required=0
trap - EXIT HUP INT TERM

python3 "$root/tools/certification/staging_receipt.py" rollback \
  --provider-id "$provider_id" \
  --release "$release_manifest" \
  --snapshot "$snapshot" \
  --manifest "$snapshot.manifest.json" \
  --restored-readback-json "$restored_readback" \
  --failed-version "$failed_version" \
  --output "$rollback_receipt"

echo "STAGING_REHEARSAL_PASS deployment=$deployment_receipt rollback=$rollback_receipt"
