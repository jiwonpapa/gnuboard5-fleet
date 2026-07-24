#!/bin/sh
set -eu
umask 077

binary=/usr/local/bin/g5-fleet-admin-server
data_dir=${G5_FLEET_DATA_DIR:-/var/lib/g5-fleet}

if [ "${1:-serve}" = "serve" ] && [ ! -f "$data_dir/installation.json" ]; then
  if [ -L "$data_dir" ] || [ ! -d "$data_dir" ]; then
    echo "G5 Fleet data directory must be an existing regular directory" >&2
    exit 1
  fi
  first_entry=$(find "$data_dir" -mindepth 1 -maxdepth 1 -print -quit)
  if [ -n "$first_entry" ]; then
    echo "refusing first-run initialization because the data directory is not empty" >&2
    exit 1
  fi
  installation_file=${G5_FLEET_INSTALLATION_ID_FILE:-}
  if [ -z "$installation_file" ] || [ ! -f "$installation_file" ] || [ -L "$installation_file" ]; then
    echo "G5_FLEET_INSTALLATION_ID_FILE must reference a regular first-install secret" >&2
    exit 1
  fi
  G5_FLEET_INSTALLATION_ID=$(tr -d '\r\n' < "$installation_file")
  export G5_FLEET_INSTALLATION_ID
  "$binary" init-store
  unset G5_FLEET_INSTALLATION_ID
fi

exec "$binary" "$@"
