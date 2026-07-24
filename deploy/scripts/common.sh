#!/bin/sh
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
deploy_root=$(CDPATH='' cd -- "$script_dir/.." && pwd -P)
compose_file="$deploy_root/compose/compose.yaml"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "required command missing: $1" >&2
    exit 1
  }
}

validate_version() {
  case "$1" in
    ""|*[!0-9A-Za-z._-]*) echo "invalid version: $1" >&2; exit 1 ;;
  esac
  [ "${#1}" -le 64 ] || {
    echo "version is too long" >&2
    exit 1
  }
}

env_value() {
  key=$1
  file=$2
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; found=1} END {if (!found) exit 1}' "$file"
}

set_env_value() {
  key=$1
  value=$2
  file=$3
  temporary="${file}.tmp.$$"
  umask 077
  awk -F= -v key="$key" -v value="$value" '
    $1 == key {print key "=" value; found=1; next}
    {print}
    END {if (!found) print key "=" value}
  ' "$file" > "$temporary"
  chmod 0600 "$temporary"
  mv "$temporary" "$file"
}

validate_env_file() {
  env_file=$1
  [ -f "$env_file" ] && [ ! -L "$env_file" ] || {
    echo "deployment env file is missing or unsafe: $env_file" >&2
    exit 1
  }
  state_dir=$(env_value G5_FLEET_STATE_DIR "$env_file")
  case "$state_dir" in
    /*) ;;
    *) echo "G5_FLEET_STATE_DIR must be absolute" >&2; exit 1 ;;
  esac
  [ "$state_dir" != "/" ] || {
    echo "G5_FLEET_STATE_DIR cannot be /" >&2
    exit 1
  }
}

validate_secret_file() {
  secret_file=$1
  label=$2
  case "$secret_file" in
    /*) ;;
    *) echo "$label must be an absolute path" >&2; exit 1 ;;
  esac
  [ -f "$secret_file" ] && [ ! -L "$secret_file" ] || {
    echo "$label is missing or unsafe: $secret_file" >&2
    exit 1
  }
  [ -s "$secret_file" ] || {
    echo "$label is empty: $secret_file" >&2
    exit 1
  }
}

sha256_file() {
  openssl dgst -sha256 -r "$1" | awk '{print $1}'
}

prepare_runtime_directory() {
  directory=$1
  mkdir -m 0700 "$directory"
  if [ "$(id -u)" -eq 0 ]; then
    runtime_uid=$(env_value G5_FLEET_RUNTIME_UID "$env_file")
    runtime_gid=$(env_value G5_FLEET_RUNTIME_GID "$env_file")
    chown "$runtime_uid:$runtime_gid" "$directory"
  fi
}

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

wait_for_app() {
  attempts=${1:-60}
  count=0
  while [ "$count" -lt "$attempts" ]; do
    container_id=$(compose ps -q app)
    if [ -n "$container_id" ]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
      [ "$status" = "healthy" ] && return 0
    fi
    count=$((count + 1))
    sleep 1
  done
  compose ps >&2 || true
  return 1
}

start_and_verify() {
  compose up -d
  wait_for_app 60
  http_bind=$(env_value G5_FLEET_HTTP_BIND "$env_file")
  http_port=$(env_value G5_FLEET_HTTP_PORT "$env_file")
  count=0
  while [ "$count" -lt 30 ]; do
    if curl --fail --silent --show-error "http://${http_bind}:${http_port}/readyz" >/dev/null; then
      return 0
    fi
    count=$((count + 1))
    sleep 1
  done
  return 1
}
