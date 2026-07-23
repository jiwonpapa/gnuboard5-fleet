#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

to_bool() {
  local value="${1:-}"
  value="$(printf '%s' "${value}" | tr '[:upper:]' '[:lower:]')"
  case "${value}" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

append_exclude_regex() {
  local pattern="${1}"
  if [[ -z "${SCHEMATHESIS_EXCLUDE_PATH_REGEX:-}" ]]; then
    SCHEMATHESIS_EXCLUDE_PATH_REGEX="${pattern}"
  else
    SCHEMATHESIS_EXCLUDE_PATH_REGEX="(${SCHEMATHESIS_EXCLUDE_PATH_REGEX})|(${pattern})"
  fi
}

build_curl_tls_args() {
  CURL_TLS_ARGS=()
  if [[ "${SCHEMATHESIS_TLS_VERIFY:-false}" == "false" ]]; then
    CURL_TLS_ARGS+=(-k)
    return
  fi

  if [[ -n "${SCHEMATHESIS_TLS_VERIFY:-}" && "${SCHEMATHESIS_TLS_VERIFY}" != "true" ]]; then
    CURL_TLS_ARGS+=(--cacert "${SCHEMATHESIS_TLS_VERIFY}")
  fi
}

curl_json_get() {
  local url="${1}"
  if [[ -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
    curl -sS --connect-timeout 5 --max-time 15 "${CURL_TLS_ARGS[@]}" \
      -H "Accept: application/json" \
      -H "Authorization: Bearer ${SCHEMATHESIS_BEARER_TOKEN}" \
      "${url}"
    return
  fi

  curl -sS --connect-timeout 5 --max-time 15 "${CURL_TLS_ARGS[@]}" \
    -H "Accept: application/json" \
    "${url}"
}

export_fixture() {
  local var_name="${1}"
  local label="${2}"
  local value="${3:-}"
  if [[ -z "${value}" || "${value}" == "null" ]]; then
    return
  fi

  printf -v "${var_name}" '%s' "${value}"
  export "${var_name}"
  echo "[schemathesis] auto fixture ${label}=${value}"
}

discover_fixture_string() {
  local var_name="${1}"
  local label="${2}"
  local url="${3}"
  local jq_expr="${4}"
  if [[ -n "${!var_name:-}" ]]; then
    return
  fi

  local response value
  response="$(curl_json_get "${url}" || true)"
  value="$(jq -r "${jq_expr}" <<<"${response}" 2>/dev/null || true)"
  export_fixture "${var_name}" "${label}" "${value}"
}

discover_fixture_int() {
  local var_name="${1}"
  local label="${2}"
  local url="${3}"
  local jq_expr="${4}"
  if [[ -n "${!var_name:-}" ]]; then
    return
  fi

  local response value
  response="$(curl_json_get "${url}" || true)"
  value="$(jq -r "${jq_expr}" <<<"${response}" 2>/dev/null || true)"
  if [[ "${value}" =~ ^[1-9][0-9]*$ ]]; then
    export_fixture "${var_name}" "${label}" "${value}"
  fi
}

discover_board_post_fixtures() {
  local wr_id_locked=false
  if [[ -n "${SCHEMATHESIS_FIXTURE_WR_ID:-}" ]]; then
    wr_id_locked=true
  fi

  local board_list_resp board_id posts_resp post_id post_resp bf_no link_no have_board_ids=false
  board_list_resp="$(curl_json_get "${API_BASE_URL%/}/boards?page=1&per_page=20" || true)"

  if [[ -z "${SCHEMATHESIS_FIXTURE_BO_TABLE:-}" ]]; then
    export_fixture \
      "SCHEMATHESIS_FIXTURE_BO_TABLE" \
      "bo_table" \
      "$(jq -r '.data[0].bo_table // empty' <<<"${board_list_resp}" 2>/dev/null || true)"
  fi

  while IFS= read -r board_id; do
    [[ -n "${board_id}" ]] || continue
    have_board_ids=true
    posts_resp="$(curl_json_get "${API_BASE_URL%/}/boards/${board_id}/posts?page=1&per_page=20" || true)"

    if [[ -z "${SCHEMATHESIS_FIXTURE_WR_ID:-}" ]]; then
      export_fixture \
        "SCHEMATHESIS_FIXTURE_WR_ID" \
        "wr_id" \
        "$(jq -r '.data[0].wr_id // empty' <<<"${posts_resp}" 2>/dev/null || true)"
    fi

    while IFS= read -r post_id; do
      [[ "${post_id}" =~ ^[1-9][0-9]*$ ]] || continue

      post_resp="$(curl_json_get "${API_BASE_URL%/}/boards/${board_id}/posts/${post_id}" || true)"

      if [[ -z "${SCHEMATHESIS_FIXTURE_BF_NO:-}" || -z "${SCHEMATHESIS_FIXTURE_FILE_WR_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_FILE_BO_TABLE:-}" ]]; then
        bf_no="$(jq -r '.data.files[0].bf_no // .data.attachments[0].bf_no // empty' <<<"${post_resp}" 2>/dev/null || true)"
        if [[ "${bf_no}" =~ ^[1-9][0-9]*$ ]]; then
          export_fixture "SCHEMATHESIS_FIXTURE_BF_NO" "bf_no" "${bf_no}"
          export_fixture "SCHEMATHESIS_FIXTURE_FILE_BO_TABLE" "file_bo_table" "${board_id}"
          export_fixture "SCHEMATHESIS_FIXTURE_FILE_WR_ID" "file_wr_id" "${post_id}"
          if ! ${wr_id_locked}; then
            export_fixture "SCHEMATHESIS_FIXTURE_WR_ID" "wr_id" "${post_id}"
            export_fixture "SCHEMATHESIS_FIXTURE_BO_TABLE" "bo_table" "${board_id}"
          fi
        fi
      fi

      if [[ -z "${SCHEMATHESIS_FIXTURE_LINK_NO:-}" || -z "${SCHEMATHESIS_FIXTURE_LINK_WR_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_LINK_BO_TABLE:-}" ]]; then
        link_no=""
        if jq -er '(.data.wr_link1 // "") | strings | length > 0' <<<"${post_resp}" >/dev/null 2>&1; then
          link_no="1"
        elif jq -er '(.data.wr_link2 // "") | strings | length > 0' <<<"${post_resp}" >/dev/null 2>&1; then
          link_no="2"
        fi

        if [[ "${link_no}" =~ ^[12]$ ]]; then
          export_fixture "SCHEMATHESIS_FIXTURE_LINK_NO" "link_no" "${link_no}"
          export_fixture "SCHEMATHESIS_FIXTURE_LINK_BO_TABLE" "link_bo_table" "${board_id}"
          export_fixture "SCHEMATHESIS_FIXTURE_LINK_WR_ID" "link_wr_id" "${post_id}"
          if ! ${wr_id_locked}; then
            export_fixture "SCHEMATHESIS_FIXTURE_WR_ID" "wr_id" "${post_id}"
            export_fixture "SCHEMATHESIS_FIXTURE_BO_TABLE" "bo_table" "${board_id}"
          fi
        fi
      fi

      if [[ -n "${SCHEMATHESIS_FIXTURE_BF_NO:-}" && -n "${SCHEMATHESIS_FIXTURE_LINK_NO:-}" ]]; then
        break
      fi
    done < <(jq -r '.data[]?.wr_id // empty' <<<"${posts_resp}" 2>/dev/null || true)

    if [[ -n "${SCHEMATHESIS_FIXTURE_BF_NO:-}" && -n "${SCHEMATHESIS_FIXTURE_LINK_NO:-}" ]]; then
      break
    fi
  done < <(jq -r '.data[]?.bo_table // empty' <<<"${board_list_resp}" 2>/dev/null || true)

  if ! ${have_board_ids} && [[ -n "${SCHEMATHESIS_FIXTURE_BO_TABLE:-}" ]]; then
    board_id="${SCHEMATHESIS_FIXTURE_BO_TABLE}"
    posts_resp="$(curl_json_get "${API_BASE_URL%/}/boards/${board_id}/posts?page=1&per_page=20" || true)"
    if [[ -z "${SCHEMATHESIS_FIXTURE_WR_ID:-}" ]]; then
      export_fixture \
        "SCHEMATHESIS_FIXTURE_WR_ID" \
        "wr_id" \
        "$(jq -r '.data[0].wr_id // empty' <<<"${posts_resp}" 2>/dev/null || true)"
    fi
  fi
}

discover_qa_fixtures() {
  local qa_id_locked=false
  if [[ -n "${SCHEMATHESIS_FIXTURE_QA_ID:-}" ]]; then
    qa_id_locked=true
  fi

  local qa_list_resp qa_id qa_resp qa_file_no
  qa_list_resp="$(curl_json_get "${API_BASE_URL%/}/qa?page=1&per_page=20" || true)"

  if [[ -z "${SCHEMATHESIS_FIXTURE_QA_ID:-}" ]]; then
    export_fixture \
      "SCHEMATHESIS_FIXTURE_QA_ID" \
      "qa_id" \
      "$(jq -r '.data[0].qa_id // empty' <<<"${qa_list_resp}" 2>/dev/null || true)"
  fi

  while IFS= read -r qa_id; do
    [[ "${qa_id}" =~ ^[1-9][0-9]*$ ]] || continue
    qa_resp="$(curl_json_get "${API_BASE_URL%/}/qa/${qa_id}" || true)"
    qa_file_no="$(jq -r '.data.files[0].file_no // .data.files[0].no // empty' <<<"${qa_resp}" 2>/dev/null || true)"

    if [[ "${qa_file_no}" =~ ^[12]$ ]]; then
      if ! ${qa_id_locked}; then
        export_fixture "SCHEMATHESIS_FIXTURE_QA_ID" "qa_id" "${qa_id}"
      fi
      export_fixture "SCHEMATHESIS_FIXTURE_QA_FILE_ID" "qa_file_id" "${qa_id}"
      export_fixture "SCHEMATHESIS_FIXTURE_QA_FILE_NO" "qa_file_no" "${qa_file_no}"
      break
    fi
  done < <(jq -r '.data[]?.qa_id // empty' <<<"${qa_list_resp}" 2>/dev/null || true)
}

discover_fixtures() {
  if ! to_bool "${SCHEMATHESIS_AUTO_FIXTURES:-true}"; then
    return
  fi

  discover_board_post_fixtures

  if [[ -z "${SCHEMATHESIS_FIXTURE_MB_ID:-}" && -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
    local me_resp
    me_resp="$(curl_json_get "${API_BASE_URL%/}/members/me" || true)"
    SCHEMATHESIS_FIXTURE_MB_ID="$(jq -r '.data.mb_id // empty' <<<"${me_resp}" 2>/dev/null || true)"
    if [[ -n "${SCHEMATHESIS_FIXTURE_MB_ID}" ]]; then
      export SCHEMATHESIS_FIXTURE_MB_ID
      echo "[schemathesis] auto fixture mb_id=${SCHEMATHESIS_FIXTURE_MB_ID}"
    fi
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_PAGE_ID:-}" && -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
    local layout_list_resp
    layout_list_resp="$(curl_json_get "${API_BASE_URL%/}/admin/layouts?page=1&per_page=1" || true)"
    SCHEMATHESIS_FIXTURE_PAGE_ID="$(
      jq -r '.data[0].page_id // .data[0].id // .data[0].slug // empty' <<<"${layout_list_resp}" 2>/dev/null || true
    )"
    if [[ -n "${SCHEMATHESIS_FIXTURE_PAGE_ID}" ]]; then
      export SCHEMATHESIS_FIXTURE_PAGE_ID
      echo "[schemathesis] auto fixture page_id=${SCHEMATHESIS_FIXTURE_PAGE_ID}"
    fi
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_WIDGET_ID:-}" && -n "${SCHEMATHESIS_FIXTURE_PAGE_ID:-}" ]]; then
    local layout_resp
    layout_resp="$(curl_json_get "${API_BASE_URL%/}/layouts/${SCHEMATHESIS_FIXTURE_PAGE_ID}" || true)"
    SCHEMATHESIS_FIXTURE_WIDGET_ID="$(
      jq -r '.data.widgets[0].widget_id // .data.widgets[0].id // .data.sections[0].widgets[0].widget_id // .data.sections[0].widgets[0].id // empty' <<<"${layout_resp}" 2>/dev/null || true
    )"
    if [[ -n "${SCHEMATHESIS_FIXTURE_WIDGET_ID}" ]]; then
      export SCHEMATHESIS_FIXTURE_WIDGET_ID
      echo "[schemathesis] auto fixture widget_id=${SCHEMATHESIS_FIXTURE_WIDGET_ID}"
    fi
  fi

  discover_fixture_string \
    "SCHEMATHESIS_FIXTURE_GR_ID" \
    "gr_id" \
    "${API_BASE_URL%/}/admin/board-groups" \
    '.data[0].gr_id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_MA_ID" \
    "ma_id" \
    "${API_BASE_URL%/}/admin/mails?page=1&per_page=1" \
    '.data[0].ma_id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_PO_ID" \
    "po_id" \
    "${API_BASE_URL%/}/admin/polls?page=1&per_page=1" \
    '.data[0].po_id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_FA_ID" \
    "fa_id" \
    "${API_BASE_URL%/}/admin/faqs?page=1&per_page=1" \
    '.data[0].fa_id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_BK_NO" \
    "bk_no" \
    "${API_BASE_URL%/}/admin/sms/contacts?page=1&per_page=1" \
    '.data[0].bk_no // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_WR_NO" \
    "wr_no" \
    "${API_BASE_URL%/}/admin/sms/history/batches?page=1&per_page=1" \
    '.data[0].wr_no // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_FG_NO" \
    "fg_no" \
    "${API_BASE_URL%/}/admin/sms/template-groups?page=1&per_page=1" \
    '.data[0].fg_no // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_FO_NO" \
    "fo_no" \
    "${API_BASE_URL%/}/admin/sms/templates?page=1&per_page=1" \
    '.data[0].fo_no // empty'
  discover_fixture_string \
    "SCHEMATHESIS_FIXTURE_THEME" \
    "theme" \
    "${API_BASE_URL%/}/admin/system/themes" \
    '.data[0].id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_ME_ID" \
    "me_id" \
    "${API_BASE_URL%/}/memos?kind=recv&page=1&per_page=1" \
    '.data[0].me_id // empty'
  discover_fixture_int \
    "SCHEMATHESIS_FIXTURE_REPORT_ID" \
    "report_id" \
    "${API_BASE_URL%/}/admin/reports?page=1&per_page=1" \
    '.data[0].report_id // .data[0].id // empty'
  discover_qa_fixtures
}

autofill_auth_token() {
  if [[ -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
    return
  fi

  if ! to_bool "${SCHEMATHESIS_AUTO_AUTH:-true}"; then
    return
  fi

  local member_id="${SCHEMATHESIS_AUTH_MB_ID:-}"
  local member_password="${SCHEMATHESIS_AUTH_MB_PASSWORD:-}"
  if [[ -z "${member_id}" || -z "${member_password}" ]]; then
    return
  fi

  local payload
  payload="$(jq -cn --arg mb_id "${member_id}" --arg mb_password "${member_password}" '{mb_id: $mb_id, mb_password: $mb_password}')"

  local login_resp
  login_resp="$(
    curl -sS --connect-timeout 5 --max-time 15 "${CURL_TLS_ARGS[@]}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "${payload}" \
      "${API_BASE_URL%/}/auth/login" || true
  )"

  local token
  token="$(jq -r '.data.access_token // empty' <<<"${login_resp}" 2>/dev/null || true)"
  if [[ -n "${token}" ]]; then
    export SCHEMATHESIS_BEARER_TOKEN="${token}"
    echo "[schemathesis] auto auth enabled via /auth/login"
  else
    echo "[schemathesis] auto auth skipped (token acquisition failed)"
  fi
}

auto_exclude_missing_fixtures() {
  if ! to_bool "${SCHEMATHESIS_AUTO_EXCLUDE_MISSING_FIXTURES:-true}"; then
    return
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_BO_TABLE:-}" ]]; then
    append_exclude_regex "^/boards/\\{bo_table\\}($|/)"
    append_exclude_regex "^/files/\\{bo_table\\}/\\{wr_id\\}/\\{bf_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_WR_ID:-}" ]]; then
    append_exclude_regex "^/boards/\\{bo_table\\}/posts/\\{wr_id\\}($|/)"
    append_exclude_regex "^/files/\\{bo_table\\}/\\{wr_id\\}/\\{bf_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_FILE_BO_TABLE:-}" || -z "${SCHEMATHESIS_FIXTURE_FILE_WR_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_BF_NO:-}" ]]; then
    append_exclude_regex "^/boards/\\{bo_table\\}/posts/\\{wr_id\\}/files/\\{bf_no\\}/download$"
    append_exclude_regex "^/files/\\{bo_table\\}/\\{wr_id\\}/\\{bf_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_LINK_BO_TABLE:-}" || -z "${SCHEMATHESIS_FIXTURE_LINK_WR_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_LINK_NO:-}" ]]; then
    append_exclude_regex "^/boards/\\{bo_table\\}/posts/\\{wr_id\\}/link/\\{link_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_MB_ID:-}" ]]; then
    append_exclude_regex "^/members/\\{mb_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_PAGE_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_WIDGET_ID:-}" ]]; then
    append_exclude_regex "^/layouts/\\{page_id\\}/widgets/\\{widget_id\\}/data$"
    append_exclude_regex "^/admin/layouts/\\{page_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_GR_ID:-}" ]]; then
    append_exclude_regex "^/admin/board-groups/\\{gr_id\\}($|/)"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_MA_ID:-}" ]]; then
    append_exclude_regex "^/admin/mails/\\{ma_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_PO_ID:-}" ]]; then
    append_exclude_regex "^/polls/\\{po_id\\}/(vote|result)$"
    append_exclude_regex "^/admin/polls/\\{po_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_FA_ID:-}" ]]; then
    append_exclude_regex "^/admin/faqs/\\{fa_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_BK_NO:-}" ]]; then
    append_exclude_regex "^/admin/sms/contacts/\\{bk_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_WR_NO:-}" ]]; then
    append_exclude_regex "^/admin/sms/history/batches/\\{wr_no\\}($|/)"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_FG_NO:-}" ]]; then
    append_exclude_regex "^/admin/sms/template-groups/\\{fg_no\\}($|/)"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_FO_NO:-}" ]]; then
    append_exclude_regex "^/admin/sms/templates/\\{fo_no\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_THEME:-}" ]]; then
    append_exclude_regex "^/admin/system/themes/\\{theme\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_ME_ID:-}" ]]; then
    append_exclude_regex "^/memos/\\{me_id\\}$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_QA_ID:-}" ]]; then
    append_exclude_regex "^/qa/\\{qa_id\\}($|/)"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_QA_FILE_ID:-}" || -z "${SCHEMATHESIS_FIXTURE_QA_FILE_NO:-}" ]]; then
    append_exclude_regex "^/qa/\\{qa_id\\}/files/\\{no\\}/download$"
  fi

  if [[ -z "${SCHEMATHESIS_FIXTURE_REPORT_ID:-}" ]]; then
    append_exclude_regex "^/admin/reports/\\{report_id\\}$"
  fi
}

auto_exclude_auth_required_no_token() {
  if ! to_bool "${SCHEMATHESIS_AUTO_EXCLUDE_AUTH_REQUIRED_WHEN_NO_TOKEN:-true}"; then
    return
  fi

  if [[ -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
    return
  fi

  append_exclude_regex "^/members/me($|/)"
  append_exclude_regex "^/blocks($|/)"
  if ! to_bool "${SCHEMATHESIS_INCLUDE_ADMIN:-false}"; then
    append_exclude_regex "^/admin/"
  else
    echo "[schemathesis] admin paths requested but bearer token is missing; excluding /admin/ from this run"
    append_exclude_regex "^/admin/"
  fi
}

find_schemathesis_cmd() {
  if [[ -x "${ROOT_DIR}/.venv-tools/bin/st" ]]; then
    echo "${ROOT_DIR}/.venv-tools/bin/st"
    return
  fi

  if command -v st >/dev/null 2>&1; then
    command -v st
    return
  fi

  if command -v schemathesis >/dev/null 2>&1; then
    command -v schemathesis
    return
  fi

  echo ""
}

SCHEMATHESIS_CMD="$(find_schemathesis_cmd)"
if [[ -z "${SCHEMATHESIS_CMD}" ]]; then
  echo "Schemathesis CLI was not found. Run ./scripts/setup_api_test_tools.sh first." >&2
  exit 1
fi

SCHEMA_LOCATION="${SCHEMA_LOCATION:-api/docs/openapi.yaml}"
TARGET_ORIGIN="${TARGET_ORIGIN:-https://gnurestapi.cc}"
API_BASE_URL="${API_BASE_URL:-${TARGET_ORIGIN%/}/api/v1}"

SCHEMATHESIS_PROFILE="${SCHEMATHESIS_PROFILE:-read-only}"
SCHEMATHESIS_PHASES="${SCHEMATHESIS_PHASES:-examples,fuzzing}"
SCHEMATHESIS_MODE="${SCHEMATHESIS_MODE:-positive}"
SCHEMATHESIS_CHECKS="${SCHEMATHESIS_CHECKS:-not_a_server_error,status_code_conformance,content_type_conformance,response_headers_conformance,response_schema_conformance}"
SCHEMATHESIS_WORKERS="${SCHEMATHESIS_WORKERS:-auto}"
SCHEMATHESIS_MAX_EXAMPLES="${SCHEMATHESIS_MAX_EXAMPLES:-20}"
SCHEMATHESIS_MAX_RESPONSE_TIME="${SCHEMATHESIS_MAX_RESPONSE_TIME:-5.0}"
SCHEMATHESIS_REPORT_DIR="${SCHEMATHESIS_REPORT_DIR:-dist/reports/schemathesis}"
SCHEMATHESIS_TLS_VERIFY="${SCHEMATHESIS_TLS_VERIFY:-false}"
SCHEMATHESIS_GENERATION_WITH_SECURITY_PARAMETERS="${SCHEMATHESIS_GENERATION_WITH_SECURITY_PARAMETERS:-false}"
SCHEMATHESIS_GENERATION_ALLOW_X00="${SCHEMATHESIS_GENERATION_ALLOW_X00:-false}"

if ! command -v jq >/dev/null 2>&1; then
  echo "[schemathesis] jq not found - auto auth / auto fixture discovery disabled"
  SCHEMATHESIS_AUTO_AUTH=false
  SCHEMATHESIS_AUTO_FIXTURES=false
fi

build_curl_tls_args
autofill_auth_token
auto_exclude_auth_required_no_token
discover_fixtures
auto_exclude_missing_fixtures

if [[ -z "${SCHEMATHESIS_HOOKS:-}" && -f "${ROOT_DIR}/schemathesis_hooks.py" ]]; then
  export SCHEMATHESIS_HOOKS="schemathesis_hooks"
fi

mkdir -p "${SCHEMATHESIS_REPORT_DIR}"

CMD=(
  "${SCHEMATHESIS_CMD}" run "${SCHEMA_LOCATION}"
  --url "${API_BASE_URL}"
  --workers "${SCHEMATHESIS_WORKERS}"
  --phases "${SCHEMATHESIS_PHASES}"
  --mode "${SCHEMATHESIS_MODE}"
  --checks "${SCHEMATHESIS_CHECKS}"
  --max-examples "${SCHEMATHESIS_MAX_EXAMPLES}"
  --max-response-time "${SCHEMATHESIS_MAX_RESPONSE_TIME}"
  --generation-with-security-parameters "${SCHEMATHESIS_GENERATION_WITH_SECURITY_PARAMETERS}"
  --generation-allow-x00 "${SCHEMATHESIS_GENERATION_ALLOW_X00}"
  --tls-verify "${SCHEMATHESIS_TLS_VERIFY}"
  --continue-on-failure
  --output-sanitize true
  --report "junit,ndjson"
  --report-dir "${SCHEMATHESIS_REPORT_DIR}"
)

if [[ -n "${SCHEMATHESIS_MAX_FAILURES:-}" ]]; then
  CMD+=(--max-failures "${SCHEMATHESIS_MAX_FAILURES}")
fi

if [[ -n "${SCHEMATHESIS_RATE_LIMIT:-}" ]]; then
  CMD+=(--rate-limit "${SCHEMATHESIS_RATE_LIMIT}")
fi

if [[ -n "${SCHEMATHESIS_BEARER_TOKEN:-}" ]]; then
  CMD+=(--header "Authorization: Bearer ${SCHEMATHESIS_BEARER_TOKEN}")
fi

if [[ "${SCHEMATHESIS_PROFILE}" == "read-only" ]]; then
  CMD+=(--exclude-method POST --exclude-method PUT --exclude-method PATCH --exclude-method DELETE)
elif [[ "${SCHEMATHESIS_PROFILE}" != "full" ]]; then
  echo "Invalid SCHEMATHESIS_PROFILE=${SCHEMATHESIS_PROFILE} (use read-only|full)" >&2
  exit 1
fi

if [[ -n "${SCHEMATHESIS_INCLUDE_PATH_REGEX:-}" ]]; then
  CMD+=(--include-path-regex "${SCHEMATHESIS_INCLUDE_PATH_REGEX}")
fi

if [[ -n "${SCHEMATHESIS_EXCLUDE_PATH_REGEX:-}" ]]; then
  CMD+=(--exclude-path-regex "${SCHEMATHESIS_EXCLUDE_PATH_REGEX}")
fi

echo "[schemathesis] cmd: ${SCHEMATHESIS_CMD}"
echo "[schemathesis] schema: ${SCHEMA_LOCATION}"
echo "[schemathesis] base: ${API_BASE_URL}"
echo "[schemathesis] profile: ${SCHEMATHESIS_PROFILE}"
echo "[schemathesis] mode: ${SCHEMATHESIS_MODE}"
if [[ -n "${SCHEMATHESIS_EXCLUDE_PATH_REGEX:-}" ]]; then
  echo "[schemathesis] exclude-path-regex: ${SCHEMATHESIS_EXCLUDE_PATH_REGEX}"
fi
"${CMD[@]}"
