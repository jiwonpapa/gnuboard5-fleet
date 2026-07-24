#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
revision=$(git -C "$root" rev-parse HEAD)
short_revision=$(printf '%s' "$revision" | cut -c1-12)
version_a=${1:-"b09-smoke-a-$short_revision"}
version_b=${2:-"b09-smoke-b-$short_revision"}
image_repository=${3:-"g5-fleet/package-smoke"}
image_a="$image_repository:$version_a"
image_b="$image_repository:$version_b"
caddy_image=${G5_FLEET_CADDY_IMAGE:-caddy:2.10.2-alpine}
platform=${G5_FLEET_PACKAGE_PLATFORM:-linux/amd64}

case "$platform" in
  linux/amd64|linux/arm64) ;;
  *) echo "unsupported package smoke platform: $platform" >&2; exit 1 ;;
esac

for command in docker git curl openssl python3; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "required command missing: $command" >&2
    exit 1
  }
done
test "$(git -C "$root" status --porcelain --untracked-files=no)" = ""
docker compose version >/dev/null

docker buildx build \
  --platform "$platform" \
  --file "$root/Containerfile" \
  --build-arg "G5_FLEET_VERSION=$version_a" \
  --build-arg "G5_FLEET_REVISION=$revision" \
  --provenance=false \
  --load \
  --tag "$image_a" \
  "$root"
docker buildx build \
  --platform "$platform" \
  --file "$root/Containerfile" \
  --build-arg "G5_FLEET_VERSION=$version_b" \
  --build-arg "G5_FLEET_REVISION=$revision" \
  --provenance=false \
  --load \
  --tag "$image_b" \
  "$root"
docker image inspect "$caddy_image" >/dev/null 2>&1 || docker pull "$caddy_image"

temporary=$(mktemp -d "${TMPDIR:-/tmp}/g5-fleet-package-smoke.XXXXXX")
state_dir="$temporary/state"
env_file="$temporary/fleet.env"
passphrase_file="$temporary/recovery-passphrase"
printf '%s\n' "package-smoke-$short_revision-$(openssl rand -hex 24)" > "$passphrase_file"
chmod 0600 "$passphrase_file"
http_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')

cleanup() {
  if [ -f "$env_file" ]; then
    docker compose --env-file "$env_file" \
      -f "$root/deploy/compose/compose.yaml" down --volumes >/dev/null 2>&1 || true
  fi
  case "$temporary" in
    "${TMPDIR:-/tmp}"/g5-fleet-package-smoke.*) rm -rf "$temporary" ;;
  esac
}
trap cleanup EXIT HUP INT TERM

compose_smoke() {
  docker compose --env-file "$env_file" \
    -f "$root/deploy/compose/compose.yaml" "$@"
}

wait_smoke_ready() {
  count=0
  while [ "$count" -lt 30 ]; do
    if curl --fail --silent --show-error \
      "http://127.0.0.1:$http_port/readyz" >/dev/null; then
      return 0
    fi
    count=$((count + 1))
    sleep 1
  done
  compose_smoke ps >&2 || true
  compose_smoke logs --no-color --tail 100 caddy app >&2 || true
  return 1
}

offline_readback() {
  compose_smoke stop caddy app >/dev/null
  value=$(compose_smoke run --rm --no-deps app readback)
  compose_smoke up -d >/dev/null
  wait_smoke_ready
  printf '%s\n' "$value"
}

G5_FLEET_IMAGE="$image_repository" \
G5_FLEET_PULL_POLICY=never \
G5_FLEET_HTTP_PORT="$http_port" \
G5_FLEET_CADDY_IMAGE="$caddy_image" \
  "$root/deploy/scripts/install.sh" "$version_a" "$state_dir" "$env_file"

bootstrap_value="package smoke value 2026"
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data "$(printf '{"login_name":"admin","password":"%s"}' "$bootstrap_value")" \
  "http://127.0.0.1:$http_port/api/v1/bootstrap" >/dev/null
before_readback=$(offline_readback)
case "$before_readback" in
  *'"users":1'*) ;;
  *) echo "clean-install bootstrap readback mismatch: $before_readback" >&2; exit 1 ;;
esac

"$root/deploy/scripts/upgrade.sh" "$version_b" "$env_file"
after_upgrade=$(offline_readback)
[ "$after_upgrade" = "$before_readback" ] || {
  echo "successful upgrade did not preserve critical rows" >&2
  exit 1
}

"$root/deploy/scripts/backup.sh" "$passphrase_file" "$env_file"
snapshot=$(find "$state_dir/backups" -maxdepth 1 -type f -name 'manual-*.sqlite3' | LC_ALL=C sort | tail -1)
[ -n "$snapshot" ] || {
  echo "manual backup snapshot was not created" >&2
  exit 1
}
snapshot_name=$(basename "$snapshot")
master_key_before=$(openssl dgst -sha256 -r "$state_dir/secrets/master-key" | awk '{print $1}')
openssl rand -base64 32 > "$state_dir/secrets/master-key"
"$root/deploy/scripts/restore.sh" "$snapshot_name" "$env_file" "$passphrase_file"
master_key_after=$(openssl dgst -sha256 -r "$state_dir/secrets/master-key" | awk '{print $1}')
[ "$master_key_after" = "$master_key_before" ] || {
  echo "encrypted master key recovery readback mismatch" >&2
  exit 1
}

if "$root/deploy/scripts/upgrade.sh" "missing-$short_revision" "$env_file"; then
  echo "missing-image upgrade unexpectedly succeeded" >&2
  exit 1
fi
[ "$(awk -F= '$1 == "G5_FLEET_VERSION" {print $2}' "$env_file")" = "$version_b" ] || {
  echo "failed upgrade did not restore the previous version" >&2
  exit 1
}
after_rollback=$(offline_readback)
[ "$after_rollback" = "$before_readback" ] || {
  echo "failed-upgrade rollback did not restore critical rows" >&2
  exit 1
}

image_a_id=$(docker image inspect --format '{{.Id}}' "$image_a")
image_b_id=$(docker image inspect --format '{{.Id}}' "$image_b")
python3 "$root/tools/package/write_package_evidence.py" \
  --output "$root/.cache/evidence/package-smoke.json" \
  --revision "$revision" \
  --openapi "$root/connectors/gnuboard5-php/api/docs/openapi.yaml" \
  --image-a "$image_a" \
  --image-a-id "$image_a_id" \
  --image-b "$image_b" \
  --image-b-id "$image_b_id" \
  --readback "$after_rollback" \
  --snapshot "$snapshot" \
  --snapshot-manifest "$snapshot.manifest.json" \
  --recovery-archive "$snapshot.recovery.enc"

echo "PACKAGE_SMOKE_PASS evidence=$root/.cache/evidence/package-smoke.json"
