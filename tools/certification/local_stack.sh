#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
state_root="$root/.cache/certification/local"
session_file="$state_root/session.env"
compose_file="$root/tools/certification/local-g5.compose.yaml"
project="g5-fleet-local-certification"
command=${1:-}

for dependency in docker git curl openssl python3 cargo bun; do
  command -v "$dependency" >/dev/null 2>&1 || {
    echo "required command missing: $dependency" >&2
    exit 1
  }
done

env_value() {
  key=$1
  file=$2
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; found=1} END {if (!found) exit 1}' "$file"
}

compose() {
  docker compose --project-name "$project" \
    --env-file "$session_file" -f "$compose_file" "$@"
}

stop_stack() {
  if [ -f "$session_file" ]; then
    fleet_pid=$(env_value G5_CERT_FLEET_PID "$session_file" 2>/dev/null || true)
    if [ -n "$fleet_pid" ]; then
      kill "$fleet_pid" >/dev/null 2>&1 || true
      count=0
      while kill -0 "$fleet_pid" >/dev/null 2>&1 && [ "$count" -lt 20 ]; do
        count=$((count + 1))
        sleep 1
      done
    fi
    compose down --volumes >/dev/null 2>&1 || true
  else
    docker compose --project-name "$project" -f "$compose_file" down --volumes \
      >/dev/null 2>&1 || true
  fi
}

case "$command" in
  down)
    stop_stack
    echo "local certification stack stopped"
    exit 0
    ;;
  clean)
    stop_stack
    case "$state_root" in
      "$root/.cache/certification/local") rm -rf "$state_root" ;;
      *) echo "unsafe certification state path" >&2; exit 1 ;;
    esac
    echo "local certification state removed"
    exit 0
    ;;
  up) ;;
  *)
    echo "usage: local_stack.sh up|down|clean" >&2
    exit 1
    ;;
esac

stack_ready=0
cleanup_failed_up() {
  if [ "$stack_ready" -eq 0 ]; then
    stop_stack
  fi
}
trap cleanup_failed_up EXIT HUP INT TERM

[ ! -e "$session_file" ] || {
  echo "local certification state already exists; run local_stack.sh clean" >&2
  exit 1
}
test "$(git -C "$root" status --porcelain --untracked-files=no)" = "" || {
  echo "tracked repository files must be clean for certification" >&2
  exit 1
}
python3 "$root/tools/runtime/compose_gnuboard.py" --verify-only >/dev/null

umask 077
mkdir -p "$state_root/fleet-data"
g5_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
fleet_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
revision=$(git -C "$root" rev-parse HEAD)
g5_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["upstreams"][0]["commit"])' "$root/UPSTREAMS.lock.json")
g5_image="g5-fleet/local-g5:${g5_commit%????????????????????????????}"
db_value=$(openssl rand -hex 24)
db_root_value=$(openssl rand -hex 24)
jwt_value=$(openssl rand -hex 48)
g5_admin_value=$(openssl rand -hex 18)
fleet_admin_value=$(openssl rand -hex 18)
fleet_peer_value=$(openssl rand -hex 18)
master_value=$(openssl rand -base64 32 | tr -d '\r\n')

cat > "$session_file" <<EOF
G5_CERT_DB_IMAGE=mariadb:11.4.7
G5_CERT_G5_IMAGE=$g5_image
G5_CERT_DB_NAME=g5cert
G5_CERT_DB_USER=g5cert
G5_CERT_DB_VALUE=$db_value
G5_CERT_DB_ROOT_VALUE=$db_root_value
G5_CERT_JWT_VALUE=$jwt_value
G5_CERT_G5_PORT=$g5_port
G5_CERT_FLEET_PORT=$fleet_port
G5_CERT_G5_URL=http://127.0.0.1:$g5_port
G5_CERT_FLEET_URL=http://127.0.0.1:$fleet_port
G5_CERT_G5_ADMIN_ID=admin
G5_CERT_G5_ADMIN_VALUE=$g5_admin_value
G5_CERT_FLEET_ADMIN_ID=fleet-admin
G5_CERT_FLEET_ADMIN_VALUE=$fleet_admin_value
G5_CERT_FLEET_PEER_ID=fleet-peer
G5_CERT_FLEET_PEER_VALUE=$fleet_peer_value
G5_CERT_MASTER_VALUE=$master_value
G5_CERT_REVISION=$revision
EOF
chmod 0600 "$session_file"

docker buildx build \
  --file "$root/tools/certification/G5Containerfile" \
  --provenance=false \
  --load \
  --tag "$g5_image" \
  "$root/.cache/composed/gnuboard5-php"
compose up -d

count=0
until curl --fail --silent --show-error \
  "http://127.0.0.1:$g5_port/install/" >/dev/null; do
  count=$((count + 1))
  [ "$count" -lt 90 ] || {
    compose logs g5 db >&2
    exit 1
  }
  sleep 1
done

install_result="$state_root/g5-install.html"
curl --fail --silent --show-error \
  --data-urlencode "mysql_host=db" \
  --data-urlencode "mysql_user=g5cert" \
  --data-urlencode "mysql_pass=$db_value" \
  --data-urlencode "mysql_db=g5cert" \
  --data-urlencode "table_prefix=g5_" \
  --data-urlencode "g5_shop_prefix=g5_shop_" \
  --data-urlencode "g5_install=1" \
  --data-urlencode "g5_shop_install=1" \
  --data-urlencode "admin_id=admin" \
  --data-urlencode "admin_pass=$g5_admin_value" \
  --data-urlencode "admin_name=Local Certification" \
  --data-urlencode "admin_email=certification@example.invalid" \
  "http://127.0.0.1:$g5_port/install/install_db.php" > "$install_result"
grep -q "설치가 완료" "$install_result" || {
  tail -80 "$install_result" >&2
  exit 1
}
rm -f "$install_result"

compose exec -T db mariadb \
  --user=root --password="$db_root_value" g5cert <<'SQL'
START TRANSACTION;
UPDATE g5_config SET cf_use_member_icon = 1;
CREATE TEMPORARY TABLE fleet_cert_member LIKE g5_member;
INSERT INTO fleet_cert_member SELECT * FROM g5_member WHERE mb_id = 'admin';
UPDATE fleet_cert_member
SET mb_no = 0,
    mb_id = 'fleetcert',
    mb_name = 'Fleet Certification',
    mb_nick = 'fleet_cert',
    mb_email = 'fleet-cert@example.invalid',
    mb_level = 2,
    mb_point = 0,
    mb_datetime = NOW(),
    mb_today_login = NOW(),
    mb_nick_date = CURRENT_DATE();
INSERT INTO g5_member SELECT * FROM fleet_cert_member;
DROP TEMPORARY TABLE fleet_cert_member;
COMMIT;
SQL

(cd "$root/apps/admin-web" && bun run build >/dev/null)
(cd "$root" && cargo build -p g5-fleet-admin-server \
  --features local-certification --locked --offline >/dev/null)
G5_FLEET_DATA_DIR="$state_root/fleet-data" \
G5_FLEET_INSTALLATION_ID="local-certification-$revision" \
  "$root/target/debug/g5-fleet-admin-server" init-store >/dev/null
export G5_FLEET_DATA_DIR="$state_root/fleet-data"
export G5_FLEET_MASTER_KEY_BASE64="$master_value"
export G5_FLEET_BIND="127.0.0.1:$fleet_port"
export G5_FLEET_WEB_DIR="$root/apps/admin-web/dist"
export G5_FLEET_CERTIFICATION_MODE=local
nohup "$root/target/debug/g5-fleet-admin-server" serve \
  > "$state_root/fleet.log" 2>&1 </dev/null &
fleet_pid=$!
unset G5_FLEET_DATA_DIR G5_FLEET_MASTER_KEY_BASE64 G5_FLEET_BIND
unset G5_FLEET_WEB_DIR G5_FLEET_CERTIFICATION_MODE
printf '%s\n' "G5_CERT_FLEET_PID=$fleet_pid" >> "$session_file"

count=0
until curl --fail --silent --show-error \
  "http://127.0.0.1:$fleet_port/readyz" >/dev/null; do
  count=$((count + 1))
  [ "$count" -lt 60 ] || {
    tail -100 "$state_root/fleet.log" >&2
    exit 1
  }
  sleep 1
done

stack_ready=1
trap - EXIT HUP INT TERM
echo "LOCAL_CERTIFICATION_STACK_READY session=$session_file"
