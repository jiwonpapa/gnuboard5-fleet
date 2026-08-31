#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
state_root="$root/.cache/certification/local"
session_file="$state_root/session.env"
compose_file="$root/tools/certification/local-g5.compose.yaml"
certification_target="$root/target/local-certification"
fleet_binary="$certification_target/debug/g5-fleet-admin-server"
project="g5-fleet-local-certification"
command=${1:-}
mode=${2:-}
case "$mode" in
  ''|--foreground) ;;
  *) echo "usage: local_stack.sh up [--foreground]|down|clean" >&2; exit 1 ;;
esac

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
  session_project=$(env_value G5_CERT_PROJECT "$session_file" 2>/dev/null || printf '%s' "$project")
  case "$session_project" in
    g5-fleet-local-certification|g5-fleet-local-certification-*) ;;
    *) echo "unsafe certification Compose project" >&2; return 1 ;;
  esac
  case "$session_project" in
    *[!a-z0-9-]*) echo "invalid certification Compose project" >&2; return 1 ;;
  esac
  docker compose --project-name "$session_project" \
    --env-file "$session_file" -f "$compose_file" "$@"
}

stop_stack() {
  if [ -f "$session_file" ]; then
    fleet_pid=$(env_value G5_CERT_FLEET_PID "$session_file" 2>/dev/null || true)
    case "$fleet_pid" in
      ''|*[!0-9]*) fleet_pid='' ;;
    esac
    if [ -n "$fleet_pid" ] && kill -0 "$fleet_pid" >/dev/null 2>&1; then
      expected_start=$(env_value G5_CERT_FLEET_STARTED_AT "$session_file" 2>/dev/null || true)
      actual_start=$(LC_ALL=C ps -p "$fleet_pid" -o lstart= | sed 's/^[[:space:]]*//')
      actual_command=$(ps -p "$fleet_pid" -o command=)
      if [ -z "$expected_start" ] || [ "$expected_start" != "$actual_start" ] || \
         [ "$actual_command" != "$fleet_binary serve" ]; then
        echo "refusing to stop an unverified/reused certification PID: $fleet_pid" >&2
        return 1
      fi
      kill "$fleet_pid"
      count=0
      while kill -0 "$fleet_pid" >/dev/null 2>&1 && [ "$count" -lt 20 ]; do
        count=$((count + 1))
        sleep 1
      done
      if kill -0 "$fleet_pid" >/dev/null 2>&1; then
        echo "certification process did not stop; state preserved" >&2
        return 1
      fi
    fi
    compose down --volumes >/dev/null
  else
    echo "no certification session; no processes or volumes were changed"
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
    echo "usage: local_stack.sh up [--foreground]|down|clean" >&2
    exit 1
    ;;
esac

stack_ready=0
cleanup_failed_up() {
  if [ "$stack_ready" -eq 0 ]; then
    stop_stack
  fi
}
[ ! -e "$session_file" ] || {
  echo "local certification state already exists; run local_stack.sh clean" >&2
  exit 1
}
test "$(git -C "$root" status --porcelain --untracked-files=no)" = "" || {
  echo "tracked repository files must be clean for certification" >&2
  exit 1
}
python3 "$root/tools/runtime/compose_gnuboard.py" --verify-only >/dev/null
# A rejected `up` must not stop a pre-existing stack from its EXIT trap.
trap cleanup_failed_up EXIT HUP INT TERM

umask 077
mkdir -p "$state_root/fleet-data"
g5_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
fleet_port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
revision=$(git -C "$root" rev-parse HEAD)
project="g5-fleet-local-certification-$(printf '%s' "$revision" | cut -c1-12)-$(openssl rand -hex 4)"
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
G5_CERT_PROJECT=$project
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
install_probe="$state_root/install-probe.html"
until curl --fail --silent --show-error \
  --output "$install_probe" "http://127.0.0.1:$g5_port/install/" && \
  grep -Fq 'form action="./install_config.php"' "$install_probe"; do
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
UPDATE g5_config
SET cf_use_member_icon = 1,
    cf_email_use = 0,
    cf_sms_use = '',
    cf_sms_type = '',
    cf_icode_id = 'baseline-id',
    cf_icode_pw = 'baseline-password',
    cf_icode_server_ip = '121.78.96.124',
    cf_icode_server_port = '7295',
    cf_icode_token_key = '';
CREATE TABLE IF NOT EXISTS g5_sdui_layout (
  sl_id int(11) NOT NULL AUTO_INCREMENT,
  sl_page_id varchar(50) NOT NULL,
  sl_title varchar(255) NOT NULL,
  sl_schema longtext NOT NULL,
  sl_active tinyint(4) NOT NULL DEFAULT 1,
  sl_datetime datetime NOT NULL,
  sl_updated datetime NOT NULL,
  PRIMARY KEY (sl_id),
  UNIQUE KEY uk_page_id (sl_page_id),
  KEY idx_active_updated (sl_active, sl_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TEMPORARY TABLE fleet_cert_member LIKE g5_member;
INSERT INTO fleet_cert_member SELECT * FROM g5_member WHERE mb_id = 'admin';
UPDATE fleet_cert_member
SET mb_no = 0,
    mb_id = 'fleetcert',
    mb_name = 'Fleet Certification',
    mb_nick = 'fleet_cert',
    mb_email = 'fleet-cert@example.invalid',
    mb_level = 2,
    mb_mailling = 1,
    mb_sms = 1,
    mb_hp = '01012345678',
    mb_point = 0,
    mb_datetime = NOW(),
    mb_today_login = NOW(),
    mb_nick_date = CURRENT_DATE();
INSERT INTO g5_member SELECT * FROM fleet_cert_member;
DROP TEMPORARY TABLE fleet_cert_member;
CREATE TABLE IF NOT EXISTS g5_sms5_config (
  cf_phone varchar(255) NOT NULL DEFAULT '',
  cf_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_form_group (
  fg_no int(11) NOT NULL AUTO_INCREMENT,
  fg_name varchar(255) NOT NULL DEFAULT '',
  fg_count int(11) NOT NULL DEFAULT '0',
  fg_member tinyint(4) NOT NULL,
  PRIMARY KEY (fg_no), KEY fg_name (fg_name)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_form (
  fo_no int(11) NOT NULL AUTO_INCREMENT,
  fg_no tinyint(4) NOT NULL DEFAULT '0',
  fg_member char(1) NOT NULL DEFAULT '0',
  fo_name varchar(255) NOT NULL DEFAULT '',
  fo_content text NOT NULL,
  fo_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (fo_no), KEY fg_no (fg_no, fo_no)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_book_group (
  bg_no int(11) NOT NULL AUTO_INCREMENT,
  bg_name varchar(255) NOT NULL DEFAULT '',
  bg_count int(11) NOT NULL DEFAULT '0',
  bg_member int(11) NOT NULL DEFAULT '0',
  bg_nomember int(11) NOT NULL DEFAULT '0',
  bg_receipt int(11) NOT NULL DEFAULT '0',
  bg_reject int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (bg_no), KEY bg_name (bg_name)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_book (
  bk_no int(11) NOT NULL AUTO_INCREMENT,
  bg_no int(11) NOT NULL DEFAULT '0',
  mb_no int(11) NOT NULL DEFAULT '0',
  mb_id varchar(20) NOT NULL DEFAULT '',
  bk_name varchar(255) NOT NULL DEFAULT '',
  bk_hp varchar(255) NOT NULL DEFAULT '',
  bk_receipt tinyint(4) NOT NULL DEFAULT '0',
  bk_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  bk_memo text NOT NULL,
  PRIMARY KEY (bk_no), KEY bk_name (bk_name), KEY bk_hp (bk_hp),
  KEY mb_no (mb_no), KEY bg_no (bg_no, bk_no), KEY mb_id (mb_id)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_write (
  wr_no int(11) NOT NULL DEFAULT '1',
  wr_renum int(11) NOT NULL DEFAULT '0',
  wr_reply varchar(255) NOT NULL DEFAULT '',
  wr_message text NOT NULL,
  wr_booking datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  wr_total int(11) NOT NULL DEFAULT '0',
  wr_re_total int(11) NOT NULL DEFAULT '0',
  wr_success int(11) NOT NULL DEFAULT '0',
  wr_failure int(11) NOT NULL DEFAULT '0',
  wr_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  wr_memo text NOT NULL,
  KEY wr_no (wr_no, wr_renum)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_sms5_history (
  hs_no int(11) NOT NULL AUTO_INCREMENT,
  wr_no int(11) NOT NULL DEFAULT '0',
  wr_renum int(11) NOT NULL DEFAULT '0',
  bg_no int(11) NOT NULL DEFAULT '0',
  mb_no int(11) NOT NULL DEFAULT '0',
  mb_id varchar(20) NOT NULL DEFAULT '',
  bk_no int(11) NOT NULL DEFAULT '0',
  hs_name varchar(30) NOT NULL DEFAULT '',
  hs_hp varchar(255) NOT NULL DEFAULT '',
  hs_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  hs_flag tinyint(4) NOT NULL DEFAULT '0',
  hs_code varchar(255) NOT NULL DEFAULT '',
  hs_memo varchar(255) NOT NULL DEFAULT '',
  hs_log varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (hs_no), KEY wr_no (wr_no), KEY mb_no (mb_no), KEY bk_no (bk_no),
  KEY hs_hp (hs_hp), KEY hs_code (hs_code), KEY bg_no (bg_no), KEY mb_id (mb_id)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS g5_push_log (
  pl_id int(11) NOT NULL AUTO_INCREMENT,
  mb_id varchar(20) NOT NULL,
  pl_title varchar(255) NOT NULL,
  pl_body text NOT NULL,
  pl_type varchar(50) NOT NULL DEFAULT 'manual',
  pl_status varchar(30) NOT NULL DEFAULT 'sent',
  pl_datetime datetime NOT NULL,
  PRIMARY KEY (pl_id),
  KEY idx_member_datetime (mb_id, pl_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO g5_sms5_config (cf_phone, cf_datetime)
VALUES ('02-1234-5678', NOW());
INSERT INTO g5_sms5_write
  (wr_no, wr_renum, wr_reply, wr_message, wr_booking, wr_total, wr_re_total, wr_success, wr_failure, wr_datetime, wr_memo)
VALUES
  (9401, 0, '02-1234-5678', 'R32 기준 발송', '0000-00-00 00:00:00', 2, 1, 1, 1, '2026-08-24 09:00:00', ''),
  (9401, 1, '02-1234-5678', 'R32 기준 재시도', '0000-00-00 00:00:00', 1, 0, 1, 0, '2026-08-24 09:05:00', '');
INSERT INTO g5_sms5_history
  (wr_no, wr_renum, bg_no, mb_no, mb_id, bk_no, hs_name, hs_hp, hs_datetime, hs_flag, hs_code, hs_memo, hs_log)
VALUES
  (9401, 0, 1, 0, '', 0, 'R32 성공', '01012345678', '2026-08-24 09:00:01', 0, '0000', '성공', ''),
  (9401, 0, 1, 0, '', 0, 'R32 실패', '01087654321', '2026-08-24 09:00:02', 1, '9999', '실패', 'provider disabled');
INSERT INTO g5_sms5_book_group
  (bg_no, bg_name, bg_count, bg_member, bg_nomember, bg_receipt, bg_reject)
VALUES (1, '미분류', 0, 0, 0, 0, 0);
INSERT INTO g5_popular (pp_word, pp_date, pp_ip) VALUES
  ('fleet-r23', '2026-08-18', '198.51.100.21'),
  ('fleet-r23', '2026-08-18', '198.51.100.22'),
  ('gnuboard-r23', '2026-08-19', '198.51.100.23');
CREATE TABLE IF NOT EXISTS g5_report (
  rp_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mb_id VARCHAR(20) NOT NULL,
  rp_target_type VARCHAR(20) NOT NULL,
  rp_target_id VARCHAR(100) NOT NULL,
  rp_reason VARCHAR(30) NOT NULL,
  rp_detail TEXT NOT NULL,
  rp_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  rp_admin_memo TEXT NULL,
  rp_datetime DATETIME NOT NULL,
  rp_processed_at DATETIME NULL,
  PRIMARY KEY (rp_id),
  UNIQUE KEY uniq_member_target (mb_id, rp_target_type, rp_target_id),
  KEY idx_status_datetime (rp_status, rp_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO g5_report
  (mb_id, rp_target_type, rp_target_id, rp_reason, rp_detail, rp_status, rp_admin_memo, rp_datetime, rp_processed_at)
VALUES
  ('fleetcert', 'post', 'notice:10', 'spam', 'Fleet certification report', 'pending', NULL, '2026-08-18 09:00:00', NULL),
  ('fleetcert', 'comment', 'notice:11:3', 'abuse', 'Fleet certification comment report', 'hold', '추가 확인', '2026-08-19 10:00:00', NULL);
INSERT INTO g5_qa_content
  (qa_id, qa_num, qa_parent, mb_id, qa_name, qa_email, qa_category, qa_subject, qa_content, qa_ip, qa_datetime)
VALUES
  (9001, -9001, 0, 'fleetcert', 'Fleet Certification', 'fleet-cert@example.invalid', '회원', 'R26 보존 문의', 'R26 QA configuration baseline', '198.51.100.41', '2026-08-18 11:00:00'),
  (9002, -9002, 0, 'fleetcert', 'Fleet Certification', 'fleet-cert@example.invalid', '회원', 'R26 삭제 문의', 'R26 QA bulk delete target', '198.51.100.42', '2026-08-19 11:00:00');
INSERT INTO g5_visit
  (vi_ip, vi_date, vi_time, vi_referer, vi_agent, vi_browser, vi_os, vi_device)
VALUES
  ('198.51.100.31', '2026-08-18', '09:10:00', 'https://www.google.com/search?q=fleet', 'Fleet Certification Desktop', 'Chrome', 'macOS', 'desktop'),
  ('198.51.100.32', '2026-08-19', '10:20:00', '', 'Fleet Certification Mobile', 'Safari', 'iOS', 'mobile');
INSERT INTO g5_visit_sum (vs_date, vs_count) VALUES
  ('2026-08-18', 1),
  ('2026-08-19', 1)
ON DUPLICATE KEY UPDATE vs_count = VALUES(vs_count);
INSERT INTO g5_board_new (bo_table, wr_id, wr_parent, bn_datetime, mb_id) VALUES
  ('notice', 9101, 9101, '2026-08-18 09:00:00', 'fleetcert'),
  ('notice', 9102, 9101, '2026-08-18 09:30:00', 'fleetcert'),
  ('notice', 9103, 9103, '2026-08-19 10:00:00', 'fleetcert'),
  ('free', 9201, 9201, '2026-08-19 11:00:00', 'fleetcert');
INSERT INTO g5_mail
  (ma_id, ma_subject, ma_content, ma_time, ma_ip, ma_last_option)
VALUES
  (9301, 'R28 기준 템플릿', 'R28 기준 본문', '2026-08-20 09:00:00', '127.0.0.1', '');
COMMIT;
SQL

(cd "$root/apps/admin-web" && bun run build >/dev/null)
(cd "$root" && CARGO_TARGET_DIR="$certification_target" cargo build -p g5-fleet-admin-server \
  --features local-certification --locked --offline >/dev/null)
fleet_binary_sha=$(shasum -a 256 "$fleet_binary" | awk '{print $1}')
printf '%s\n' "G5_CERT_FLEET_BINARY_SHA256=$fleet_binary_sha" >> "$session_file"
G5_FLEET_DATA_DIR="$state_root/fleet-data" \
G5_FLEET_INSTALLATION_ID="local-certification-$revision" \
  "$fleet_binary" init-store >/dev/null
export G5_FLEET_DATA_DIR="$state_root/fleet-data"
export G5_FLEET_MASTER_KEY_BASE64="$master_value"
export G5_FLEET_BIND="127.0.0.1:$fleet_port"
export G5_FLEET_WEB_DIR="$root/apps/admin-web/dist"
export G5_FLEET_CERTIFICATION_MODE=local
export G5_FLEET_BUILD_REVISION="$revision"
# Never inherit real notification credentials into a routine local fixture.
unset G5_FLEET_TELEGRAM_BOT_TOKEN G5_FLEET_TELEGRAM_BOT_TOKEN_FILE
unset G5_FLEET_VAPID_PRIVATE_KEY_BASE64 G5_FLEET_VAPID_PRIVATE_KEY_FILE G5_FLEET_VAPID_SUBJECT
nohup "$fleet_binary" serve \
  > "$state_root/fleet.log" 2>&1 </dev/null &
fleet_pid=$!
unset G5_FLEET_DATA_DIR G5_FLEET_MASTER_KEY_BASE64 G5_FLEET_BIND
unset G5_FLEET_WEB_DIR G5_FLEET_CERTIFICATION_MODE G5_FLEET_BUILD_REVISION
printf '%s\n' "G5_CERT_FLEET_PID=$fleet_pid" >> "$session_file"
fleet_started_at=$(LC_ALL=C ps -p "$fleet_pid" -o lstart= | sed 's/^[[:space:]]*//')
printf '%s\n' "G5_CERT_FLEET_STARTED_AT=$fleet_started_at" >> "$session_file"

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
if [ "$mode" = "--foreground" ]; then
  # Agent terminals reap background process groups when their command exits.
  # Keep the owner command alive during HTTP and in-app browser verification.
  trap 'stop_stack' HUP INT TERM
  wait "$fleet_pid"
fi
