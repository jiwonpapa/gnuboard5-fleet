#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ITERATIONS="${API_AUDIT_ITERATIONS:-1}"
INTERVAL_SECONDS="${API_AUDIT_INTERVAL_SECONDS:-600}"
TIMEOUT_SECONDS="${API_AUDIT_TIMEOUT_SECONDS:-10}"
OUTPUT_DIR="docs/audits"
LOG_FILE="${OUTPUT_DIR}/API_AUDIT_WATCH_$(date +%Y-%m-%d).log"

declare -a TARGET_BASE_URLS=()

if [[ -n "${API_AUDIT_TARGETS:-}" ]]; then
    IFS=',' read -r -a TARGET_BASE_URLS <<< "${API_AUDIT_TARGETS}"
else
    if [[ -f .env ]]; then
        API_BASE_URL_FROM_ENV="$(awk -F= '$1=="API_BASE_URL"{sub(/\r$/, "", $2); print $2; exit}' .env || true)"
    else
        API_BASE_URL_FROM_ENV=""
    fi

    LOCAL_BASE="${API_BASE_URL_FROM_ENV:-http://localhost/api/v1}"
    STAGING_BASE="${API_STAGING_BASE_URL:-https://gnurestapi.cc/api/v1}"
    TARGET_BASE_URLS=("$LOCAL_BASE" "$STAGING_BASE")
fi

rm -f /tmp/api_audit_watch_tmp.json

if [[ ! -f "$OUTPUT_DIR/.keep" ]]; then
    mkdir -p "$OUTPUT_DIR"
    touch "$OUTPUT_DIR/.keep"
fi

log() {
    local level="$1"
    shift
    echo "$(date +'%Y-%m-%d %H:%M:%S') [${level}] $*" | tee -a "$LOG_FILE" >&2
}

run_once() {
    local iteration="$1"
    local failures=0

    log INFO "=== API Audit Watch: iteration ${iteration} start ==="

    log INFO "QUALITY: php -l check on api/*.php"
    if ! find api -name "*.php" -print0 | xargs -0 -n1 php -l > /tmp/php_lint_api.log 2>&1; then
        while IFS= read -r line; do
            log ERROR "php -l: ${line}"
        done < /tmp/php_lint_api.log
        failures=$((failures + 1))
    else
        log INFO "PASS: php -l"
    fi

    log INFO "QUALITY: hardcoding scan"
    if ! ./scripts/check_hardcoding.sh >> "$LOG_FILE" 2>&1; then
        log ERROR "FAIL: ./scripts/check_hardcoding.sh"
        failures=$((failures + 1))
    else
        log INFO "PASS: hardcoding scan"
    fi

    log INFO "QUALITY: PHPUnit"
    if ! ./vendor/bin/phpunit -c phpunit.xml --colors=never >> "$LOG_FILE" 2>&1; then
        log ERROR "FAIL: phpunit"
        failures=$((failures + 1))
    else
        log INFO "PASS: PHPUnit"
    fi

    for base_url in "${TARGET_BASE_URLS[@]}"; do
        if [[ -z "$base_url" ]]; then
            continue
        fi

        log INFO "SMOKE: ${base_url}"

        check_health "${base_url}/health" || failures=$((failures + 1))
        check_json_ok "${base_url}/config" || failures=$((failures + 1))
        check_json_ok "${base_url}/menus" || failures=$((failures + 1))
        check_html_like "${base_url}/docs" || failures=$((failures + 1))
        check_openapi "${base_url}/docs/openapi.yaml" || failures=$((failures + 1))
    done

    if ((failures > 0)); then
        log ERROR "=== iteration ${iteration} failed (${failures} failures) ==="
        return 1
    fi

    log INFO "=== iteration ${iteration} pass ==="
    return 0
}

check_http() {
    local endpoint="$1"
    local code=""
    local curl_status_file
    local body_file
    local curl_exit_code=0
    body_file="$(mktemp)"
    curl_status_file="$(mktemp)"

    curl -sS --max-time "$TIMEOUT_SECONDS" \
        -o "$body_file" \
        -w '%{http_code}' \
        -H 'Accept: application/json, text/plain, */*' \
        --compressed \
        "$endpoint" > "$curl_status_file"
    curl_exit_code=$?
    code="$(cat "$curl_status_file")"
    rm -f "$curl_status_file"

    if [[ "$code" == "" ]]; then
        code="000"
    fi

    if [[ "$curl_exit_code" -ne 0 ]]; then
        log ERROR "curl exec error: ${endpoint} -> exit_code=${curl_exit_code} http_status=${code}"
        rm -f "$body_file"
        return 1
    fi

    if [[ ! "$code" =~ ^[0-9]{3}$ ]]; then
        log ERROR "curl invalid status: ${endpoint} -> http_status=${code}"
        rm -f "$body_file"
        return 1
    fi

    if (( code < 200 || code >= 600 )); then
        log ERROR "curl fail: ${endpoint} -> http_status=${code}"
        rm -f "$body_file"
        return 1
    fi

    echo "$body_file"
}

check_health() {
    local endpoint="$1"
    local body_file
    if ! body_file="$(check_http "$endpoint")"; then
        return 1
    fi

    if ! jq -e '.status == "ok" and .version and .timestamp' < "$body_file" >/dev/null 2>&1; then
        if ! php -r '
            $raw = file_get_contents($argv[1]);
            if ($raw === false) { exit(1); }
            $json = json_decode($raw, true);
            if (json_last_error() !== JSON_ERROR_NONE) { exit(1); }
            if (!isset($json["status"], $json["version"], $json["timestamp"])) { exit(1); }
            if ($json["status"] !== "ok") { exit(1); }
            exit(0);
        ' "$body_file"; then
            log ERROR "FAIL health json payload: ${endpoint}"
            rm -f "$body_file"
            return 1
        fi
    fi

    log INFO "PASS health: ${endpoint}"
    rm -f "$body_file"
    return 0
}

check_json_ok() {
    local endpoint="$1"
    local body_file
    if ! body_file="$(check_http "$endpoint")"; then
        return 1
    fi

    if ! php -r '
        $raw = file_get_contents($argv[1]);
        if ($raw === false) { exit(1); }
        $json = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) { exit(1); }
        exit(0);
    ' "$body_file"; then
        log ERROR "FAIL json parse: ${endpoint}"
        rm -f "$body_file"
        return 1
    fi
    log INFO "PASS json: ${endpoint}"
    rm -f "$body_file"
    return 0
}

check_html_like() {
    local endpoint="$1"
    local body_file
    if ! body_file="$(check_http "$endpoint")"; then
        return 1
    fi
    if ! grep -Eq '<html|Swagger|API|docs' "$body_file" >/dev/null 2>&1; then
        log ERROR "FAIL docs html: ${endpoint}"
        rm -f "$body_file"
        return 1
    fi
    log INFO "PASS html: ${endpoint}"
    rm -f "$body_file"
    return 0
}

check_openapi() {
    local endpoint="$1"
    local body_file
    if ! body_file="$(check_http "$endpoint")"; then
        return 1
    fi
    if ! grep -Eq 'openapi:' "$body_file" >/dev/null 2>&1; then
        log ERROR "FAIL openapi.yaml: ${endpoint}"
        rm -f "$body_file"
        return 1
    fi
    log INFO "PASS openapi.yaml: ${endpoint}"
    rm -f "$body_file"
    return 0
}

iteration=0
while true; do
    iteration=$((iteration + 1))
    if ! run_once "$iteration"; then
        EXIT_CODE=1
    fi

    if [[ "$ITERATIONS" -ne 0 && "$iteration" -ge "$ITERATIONS" ]]; then
        break
    fi

    log INFO "sleep ${INTERVAL_SECONDS}s and repeat"
    sleep "$INTERVAL_SECONDS"
done

if [[ -n "${EXIT_CODE:-}" && "$EXIT_CODE" -ne 0 ]]; then
    log ERROR "Audit watch finished with failures."
    exit 1
fi

log INFO "Audit watch completed successfully."
