#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0

print_fail() {
  local title="$1"
  local result="$2"
  echo "[FAIL] ${title}"
  echo "$result"
  echo
  FAIL=1
}

run_check() {
  local title="$1"
  local pattern="$2"
  shift 2

  local output
  output="$(rg --pcre2 -n "$pattern" "$@" 2>/dev/null || true)"

  if [[ -n "$output" ]]; then
    print_fail "$title" "$output"
  fi
}

echo "[hardcoding-check] scanning docs/.agent/api ..."

# 1) 문서 내 로컬 절대 경로/에디터 링크 금지
# docs/codex, docs/audits, docs/archive는 작업 프롬프트/감사 증적/보관 문서라 로컬 경로 예시를 허용한다.
run_check \
  "문서 내 로컬 절대경로/에디터 스킴" \
  "(file://|vscode://|/Users/|[A-Za-z]:\\\\)" \
  --glob '!docs/review/CODEX_MASTER_PROMPT.md' \
  --glob '!docs/codex/**' \
  --glob '!docs/audits/**' \
  --glob '!docs/archive/**' \
  --glob '!docs/docs.db' \
  --glob '!docs/docs.db-shm' \
  --glob '!docs/docs.db-wal' \
  --glob '!docs/docs.db-journal' \
  docs .agent

# 2) API 코드 내 민감 설정 하드코딩 금지
run_check \
  "API 코드 내 민감 설정 하드코딩" \
  "(?i)(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASS|JWT_SECRET|API_BASE_URL|CORS_ALLOWED_ORIGINS)\\s*=\\s*['\"][^'\"]+['\"]" \
  --glob '*.php' api

# 3) API 코드 내 IP 리터럴 금지
run_check \
  "API 코드 내 IP 리터럴" \
  "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b" \
  --glob '*.php' api

# 4) API 코드 내 외부 URL 리터럴 금지 (localhost/127.0.0.1 예외)
run_check \
  "API 코드 내 외부 URL 리터럴" \
  "https?://(?!localhost|127\\.0\\.0\\.1)" \
  --glob '*.php' api

# 5) .env.example의 핵심 시크릿 기본값은 비워둬야 함
run_check \
  ".env.example 시크릿 기본값" \
  "^(DB_PASS|JWT_SECRET)=.+$" \
  .env.example

# 6) 매직넘버 폴백 체크 — $_ENV['KEY'] ?? '상수' 패턴 금지
run_check \
  "폴백 매직넘버 감지 (EnvConfig를 사용하세요)" \
  '\$_ENV\[.*\]\s*\?\?\s*['\''"][^'\''"]+['\''"]' \
  --glob '*.php' api \
  --glob '!api/v1/Core/Config/EnvConfig.php'

if [[ "$FAIL" -ne 0 ]]; then
  echo "[hardcoding-check] failed"
  exit 1
fi

echo "[hardcoding-check] passed"
