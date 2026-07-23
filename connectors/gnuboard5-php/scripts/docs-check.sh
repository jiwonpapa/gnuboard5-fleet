#!/bin/bash
# docs-check.sh — 문서 거버넌스 자동 검증
set -euo pipefail

cd "$(dirname "$0")/.."

ERRORS=0
WARNINGS=0
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MODE="${1:-all}"
case "$MODE" in
  all|--provider-contract-only)
    ;;
  *)
    echo "사용법: $0 [--provider-contract-only]" >&2
    exit 2
    ;;
esac

pass() {
  echo "  ✅ $1"
}

info() {
  echo "  ℹ️  $1"
}

warn() {
  echo "  ⚠️  $1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  echo "  ❌ $1"
  ERRORS=$((ERRORS + 1))
}

print_head() {
  local file="$1"
  local limit="${2:-10}"
  if [ -s "$file" ]; then
    head -n "$limit" "$file" | sed 's/^/    /'
  fi
}

if [ "$MODE" = "all" ]; then
echo "=== 문서 거버넌스 검증 ==="

echo "--- 1. 필수 문서/스크립트 존재 ---"
required_files=(
  ".agent/Constitution.md"
  ".agent/sub-constitutions/document-governance.md"
  ".agent/workflows/document-management.md"
  "docs/README.md"
  "docs/IMPLEMENTATION_ROADMAP.md"
  "docs/TODO.md"
  "docs/HISTORY.md"
  "docs/AUDIT_SYSTEM.md"
  "docs/API_SPEC.md"
  "docs/DOCUMENT_REGISTRY.md"
  "docs/ddls/README.md"
  "docs/codex/README.md"
  "api/docs/openapi.yaml"
  "scripts/doc-processor.py"
  "scripts/doc-index.py"
  "scripts/archive_old_audits.py"
  "scripts/docs-check.sh"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    pass "$file"
  else
    fail "$file MISSING"
  fi
done

echo "--- 2. SSOT 인덱스 링크 ---"
for pattern in 'docs/IMPLEMENTATION_ROADMAP.md' 'docs/TODO.md' 'docs/HISTORY.md' 'docs/AUDIT_SYSTEM.md' 'docs/DOCUMENT_REGISTRY.md'; do
  if grep -Fq "$pattern" docs/README.md; then
    pass "docs/README.md -> $pattern"
  else
    fail "docs/README.md에 $pattern 링크가 없습니다"
  fi
done

echo "--- 3. TODO 상태 섹션 ---"
todo_sections="$TMP_DIR/todo_sections.txt"
for section in '## Inbox' '## Next' '## In Progress' '## Blocked' '## Done'; do
  if grep -Fq "$section" docs/TODO.md; then
    pass "$section 존재"
  else
    printf '%s\n' "$section" >> "$todo_sections"
  fi
done
if [ -s "$todo_sections" ]; then
  fail "docs/TODO.md 상태 섹션이 누락되었습니다"
  print_head "$todo_sections"
fi

echo "--- 4. 문서 분류 레지스트리 최신성 ---"
doc_processor_log="$TMP_DIR/doc_processor.txt"
if python3 scripts/doc-processor.py --check > "$doc_processor_log" 2>&1; then
  pass "docs/DOCUMENT_REGISTRY.md 최신 상태"
else
  fail "docs/DOCUMENT_REGISTRY.md가 최신이 아닙니다"
  print_head "$doc_processor_log"
fi

echo "--- 5. SQLite 검색 인덱스 생성 ---"
doc_index_log="$TMP_DIR/doc_index.txt"
if python3 scripts/doc-index.py > "$doc_index_log" 2>&1 && [ -f "docs/docs.db" ]; then
  pass "docs/docs.db 생성 완료"
else
  fail "docs/docs.db 생성 실패"
  print_head "$doc_index_log"
fi

echo "--- 6. 감사 최신본 동기화 ---"
latest_report="$(find docs/audits -maxdepth 1 -type f -name 'AUDIT_REPORT_[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].md' | sort | tail -1)"
if [ -z "$latest_report" ]; then
  fail "표준 감사본(docs/audits/AUDIT_REPORT_YYYY-MM-DD.md) 없음"
elif cmp -s "docs/audits/AUDIT_LATEST.md" "$latest_report"; then
  pass "AUDIT_LATEST.md 동기화됨 ($latest_report)"
else
  warn "AUDIT_LATEST.md가 최신 표준 감사본($latest_report)과 다릅니다"
fi

echo "--- 7. 감사 파일명 규칙 ---"
bad_audit_suffixes="$(
  find docs/audits -maxdepth 1 -type f -name 'AUDIT_REPORT_*.md' \
    | grep -E 'AUDIT_REPORT_[0-9]{4}-[0-9]{2}-[0-9]{2}_.+\.md$' \
    | sort \
    || true
)"
if [ -n "$bad_audit_suffixes" ]; then
  fail "표준 감사 파일명 뒤 접미사 금지 위반"
  printf '%s\n' "$bad_audit_suffixes" | sed 's/^/    /'
else
  pass "표준 감사 파일명 접미사 없음"
fi

bad_audit_keywords="$(find docs/audits -maxdepth 1 -type f \( -name '*RECHECK*' -o -name '*FINAL*' -o -name '*COMPREHENSIVE*' \) | sort)"
if [ -n "$bad_audit_keywords" ]; then
  fail "금지 키워드 감사 파일 발견"
  printf '%s\n' "$bad_audit_keywords" | sed 's/^/    /'
else
  pass "금지 키워드 감사 파일 없음"
fi

echo "--- 8. 감사 보관 정책 ---"
audit_retention_log="$TMP_DIR/audit_retention.txt"
if python3 scripts/archive_old_audits.py --check --days 7 > "$audit_retention_log" 2>&1; then
  pass "보관 기간 초과 감사 문서 없음"
else
  fail "archive 이동이 필요한 날짜형 감사 문서가 남아 있습니다"
  print_head "$audit_retention_log"
fi

echo "--- 9. docs/ 인덱스 정합성 ---"
top_dirs=(
  "docs/architecture/"
  "docs/archive/"
  "docs/audits/"
  "docs/codex/"
  "docs/compatibility/"
  "docs/ddls/"
  "docs/planning/"
  "docs/testing/"
)
missing_top_dirs="$TMP_DIR/missing_top_dirs.txt"
for dir in "${top_dirs[@]}"; do
  if ! grep -Fq "$dir" docs/README.md; then
    printf '%s\n' "$dir" >> "$missing_top_dirs"
  fi
done
if [ -s "$missing_top_dirs" ]; then
  fail "docs/README.md가 실제 상위 디렉토리 인덱스를 놓쳤습니다"
  print_head "$missing_top_dirs"
else
  pass "docs/README.md 상위 디렉토리 인덱스 동기화"
fi

echo "--- 10. Codex 인덱스 정합성 ---"
missing_codex_index="$TMP_DIR/missing_codex_index.txt"
missing_codex_prompt="$TMP_DIR/missing_codex_prompt.txt"

while IFS= read -r dir; do
  [ -n "$dir" ] || continue
  base="$(basename "$dir")"
  if [ ! -f "$dir/PROMPT.md" ]; then
    printf '%s\n' "$dir/PROMPT.md" >> "$missing_codex_prompt"
  fi
  if ! grep -Fq "$base" docs/codex/README.md; then
    printf '%s\n' "$dir/" >> "$missing_codex_index"
  fi
done < <(find docs/codex -mindepth 1 -maxdepth 1 -type d | sort)

if [ -s "$missing_codex_prompt" ]; then
  fail "Codex 디렉토리에 PROMPT.md가 없습니다"
  print_head "$missing_codex_prompt"
else
  pass "모든 Codex 디렉토리에 PROMPT.md 존재"
fi

if [ -s "$missing_codex_index" ]; then
  fail "docs/codex/README.md가 실제 Codex 디렉토리를 놓쳤습니다"
  print_head "$missing_codex_index"
else
  pass "docs/codex/README.md 디렉토리 인덱스 동기화"
fi

echo "--- 11. DDL 인덱스 정합성 ---"
missing_ddl_index="$TMP_DIR/missing_ddl_index.txt"
missing_api_spec_ddl="$TMP_DIR/missing_api_spec_ddl.txt"
while IFS= read -r ddl; do
  [ -n "$ddl" ] || continue
  base="$(basename "$ddl")"
  if ! grep -Fq "$base" docs/ddls/README.md; then
    printf '%s\n' "$ddl" >> "$missing_ddl_index"
  fi
  if ! grep -Fq "$base" docs/API_SPEC.md; then
    printf '%s\n' "$ddl" >> "$missing_api_spec_ddl"
  fi
done < <(find docs/ddls -maxdepth 1 -type f -name '*.md' ! -name 'README.md' | sort)

if [ -s "$missing_ddl_index" ]; then
  fail "docs/ddls/README.md가 실제 DDL 파일을 놓쳤습니다"
  print_head "$missing_ddl_index"
else
  pass "docs/ddls/README.md DDL 인덱스 동기화"
fi

if [ -s "$missing_api_spec_ddl" ]; then
  fail "docs/API_SPEC.md의 DDL 레퍼런스가 실제 DDL 파일과 불일치합니다"
  print_head "$missing_api_spec_ddl"
else
  pass "docs/API_SPEC.md DDL 레퍼런스 동기화"
fi

echo "--- 12. API_SPEC 구현 주장 정합성 ---"
if grep -Eq '자동 생성|PHP Attributes|PHP 어노테이션' docs/API_SPEC.md; then
  if rg -n -g '*.php' 'OpenApi\\|@OA\\|OpenApi\\Attributes' api > /dev/null 2>&1; then
    pass "API_SPEC 자동 생성 주장과 코드 근거가 함께 존재"
  else
    fail "API_SPEC.md가 OpenAPI 자동 생성/Attributes를 주장하지만 코드 근거가 없습니다"
  fi
else
  pass "API_SPEC 자동 생성 주장 없음"
fi

echo "--- 13. 비밀번호 해시 문서 정합성 ---"
password_policy_hits="$TMP_DIR/password_policy_hits.txt"
if rg -n \
  -e 'G5_ENCRYPT_FUNC.*(sha256|md5)' \
  -e '기본값 sha256' \
  -e "hash\\(\\\$_ENV\\['G5_ENCRYPT_FUNC'.*'sha256'" \
  .env.example \
  docs/API_SPEC.md \
  docs/planning/04_G5_DECOUPLING_ROADMAP.md \
  docs/codex/MASTER_PROMPT.md \
  api/v1/Setup/Service/EnvironmentChecker.php \
  > "$password_policy_hits" 2>&1; then
  fail "활성 문서/가이드가 G5_ENCRYPT_FUNC에 비호환 해시를 안내합니다"
  print_head "$password_policy_hits"
else
  pass "활성 문서/가이드가 G5 호환 해시 정책과 일치"
fi
fi

echo "--- 14. OpenAPI ↔ Route 정합성 ---"
DOCS_CHECK_TMP_DIR="$TMP_DIR" \
DOCS_CHECK_CONSUMER_SCOPE="${DOCS_CHECK_CONSUMER_SCOPE:-api/docs/openapi.phase1-consumer-scope.json}" \
php <<'PHP'
<?php
declare(strict_types=1);

use Gnuboard5\Audit\Phase1ConsumerScope;

require getcwd() . '/scripts/lib/Phase1ConsumerScope.php';

$tmpDir = (string)getenv('DOCS_CHECK_TMP_DIR');
$consumerScope = Phase1ConsumerScope::fromFile((string)getenv('DOCS_CHECK_CONSUMER_SCOPE'));
$consumerScope->assertContractPath(getcwd(), getcwd() . '/api/docs/openapi.yaml');

function skipIgnorable(array $tokens, int $index): int
{
    $count = count($tokens);
    while ($index < $count) {
        $token = $tokens[$index];
        if (is_array($token) && in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
            $index++;
            continue;
        }
        break;
    }
    return $index;
}

function previousSignificant(array $tokens, int $index): int
{
    while ($index >= 0) {
        $token = $tokens[$index];
        if (is_array($token) && in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
            $index--;
            continue;
        }

        return $index;
    }

    return -1;
}

function decodeStringToken(mixed $token): ?string
{
    if (!is_array($token) || $token[0] !== T_CONSTANT_ENCAPSED_STRING) {
        return null;
    }
    return stripcslashes(substr($token[1], 1, -1));
}

function findMatchingBrace(array $tokens, int $start): int
{
    $depth = 0;
    $count = count($tokens);
    for ($i = $start; $i < $count; $i++) {
        $token = $tokens[$i];
        if ($token === '{') {
            $depth++;
            continue;
        }
        if ($token === '}') {
            $depth--;
            if ($depth === 0) {
                return $i;
            }
        }
    }
    throw new RuntimeException('Unmatched brace in route parser.');
}

function normalizeJoin(string $base, string $path): string
{
    $base = rtrim($base, '/');
    if ($path === '' || $path === '/') {
        return $base === '' ? '/' : $base;
    }
    $path = '/' . ltrim($path, '/');
    $joined = ($base === '' ? '' : $base) . $path;
    $joined = preg_replace('#/+#', '/', $joined);
    return $joined === '' ? '/' : $joined;
}

function extractStringListAssignments(array $tokens): array
{
    $assignments = [];
    $count = count($tokens);
    for ($i = 0; $i < $count; $i++) {
        $variable = $tokens[$i] ?? null;
        if (!is_array($variable) || $variable[0] !== T_VARIABLE) {
            continue;
        }

        $equals = skipIgnorable($tokens, $i + 1);
        if (($tokens[$equals] ?? null) !== '=') {
            continue;
        }

        $open = skipIgnorable($tokens, $equals + 1);
        if (($tokens[$open] ?? null) !== '[') {
            continue;
        }

        $values = [];
        $valid = true;
        $close = null;
        for ($cursor = $open + 1; $cursor < $count; $cursor++) {
            $current = $tokens[$cursor];
            if ($current === ']') {
                $close = $cursor;
                break;
            }
            if ($current === ',' || (is_array($current) && in_array($current[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true))) {
                continue;
            }
            $value = decodeStringToken($current);
            if ($value === null) {
                $valid = false;
                break;
            }
            $values[] = $value;
        }

        if (!$valid || $close === null || $values === []) {
            continue;
        }

        $assignments[ltrim($variable[1], '$')] = $values;
        $i = $close;
    }

    for ($i = 0; $i < $count; $i++) {
        $token = $tokens[$i] ?? null;
        if (!is_array($token) || $token[0] !== T_FOREACH) {
            continue;
        }

        $open = skipIgnorable($tokens, $i + 1);
        if (($tokens[$open] ?? null) !== '(') {
            continue;
        }
        $sourceIndex = skipIgnorable($tokens, $open + 1);
        $source = $tokens[$sourceIndex] ?? null;
        if (!is_array($source) || $source[0] !== T_VARIABLE) {
            continue;
        }
        $sourceValues = $assignments[ltrim($source[1], '$')] ?? null;
        if (!is_array($sourceValues)) {
            continue;
        }

        $asIndex = skipIgnorable($tokens, $sourceIndex + 1);
        $as = $tokens[$asIndex] ?? null;
        if (!is_array($as) || $as[0] !== T_AS) {
            continue;
        }
        $valueIndex = skipIgnorable($tokens, $asIndex + 1);
        $value = $tokens[$valueIndex] ?? null;
        if (!is_array($value) || $value[0] !== T_VARIABLE) {
            continue;
        }

        $assignments[ltrim($value[1], '$')] = $sourceValues;
    }

    return $assignments;
}

function extractRouteCollectorVariables(array $tokens): array
{
    $variables = [
        'app' => true,
        'group' => true,
    ];
    $routeCollectorTypes = [
        'App' => true,
        'RouteCollectorInterface' => true,
        'RouteCollectorProxy' => true,
    ];

    foreach ($tokens as $index => $token) {
        if (!is_array($token) || $token[0] !== T_VARIABLE) {
            continue;
        }

        $typeIndex = previousSignificant($tokens, $index - 1);
        if ($typeIndex < 0) {
            continue;
        }
        $typeToken = $tokens[$typeIndex];
        if (!is_array($typeToken)) {
            continue;
        }

        $typeName = trim((string)$typeToken[1], '\\');
        $typeName = str_contains($typeName, '\\')
            ? (string)substr($typeName, (int)strrpos($typeName, '\\') + 1)
            : $typeName;
        if (isset($routeCollectorTypes[$typeName])) {
            $variables[ltrim($token[1], '$')] = true;
        }
    }

    return $variables;
}

function expandRequireTargets(
    array $tokens,
    int $requireIndex,
    int $end,
    string $file,
    array $assignments
): array {
    $targets = [''];
    $sawPart = false;
    $depth = 0;

    for ($i = $requireIndex + 1; $i <= $end; $i++) {
        $token = $tokens[$i];
        if (is_array($token) && in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
            continue;
        }

        if ($token === ';' && $depth === 0) {
            break;
        }
        if ($token === '(') {
            $depth++;
            continue;
        }
        if ($token === ')') {
            if ($depth === 0) {
                break;
            }
            $depth--;
            continue;
        }
        if ($token === '.') {
            continue;
        }

        $parts = null;
        if (is_array($token) && $token[0] === T_DIR) {
            $parts = [dirname($file)];
        } else {
            $string = decodeStringToken($token);
            if ($string !== null) {
                $parts = [$string];
            } elseif (is_array($token) && $token[0] === T_VARIABLE) {
                $parts = $assignments[ltrim($token[1], '$')] ?? null;
            }
        }

        if ($parts === null || $parts === []) {
            return [];
        }

        $expanded = [];
        foreach ($targets as $target) {
            foreach ($parts as $part) {
                $expanded[] = $target . $part;
            }
        }
        $targets = $expanded;
        $sawPart = true;
    }

    if (!$sawPart) {
        return [];
    }

    return array_values(array_unique(array_map(
        static fn (string $target): string => str_replace('\\', '/', $target),
        $targets
    )));
}

function tokenLine(mixed $token): int
{
    return is_array($token) ? (int)$token[2] : 0;
}

function parseReachableRouteRange(
    array $tokens,
    int $start,
    int $end,
    string $prefix,
    string $file,
    array $assignments,
    array $routeCollectorVariables,
    array &$state
): void {
    $routeMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
    for ($i = $start; $i <= $end; $i++) {
        $token = $tokens[$i];

        if (is_array($token) && in_array($token[0], [T_REQUIRE, T_REQUIRE_ONCE, T_INCLUDE, T_INCLUDE_ONCE], true)) {
            $targets = expandRequireTargets($tokens, $i, $end, $file, $assignments);
            if ($targets === []) {
                $state['unresolved'][] = $file . ':' . tokenLine($token) . ' unsupported require expression';
                continue;
            }

            foreach ($targets as $target) {
                if (!is_file($target)) {
                    $state['unresolved'][] = $file . ':' . tokenLine($token) . ' missing ' . $target;
                    continue;
                }
                parseReachableRouteFile($target, $prefix, $state);
            }
            continue;
        }

        if (!is_array($token) || $token[0] !== T_OBJECT_OPERATOR) {
            continue;
        }

        $receiverIndex = previousSignificant($tokens, $i - 1);
        $receiver = $receiverIndex >= 0 ? ($tokens[$receiverIndex] ?? null) : null;
        if (!is_array($receiver) || $receiver[0] !== T_VARIABLE) {
            continue;
        }
        if (!isset($routeCollectorVariables[ltrim($receiver[1], '$')])) {
            continue;
        }

        $methodIndex = skipIgnorable($tokens, $i + 1);
        $methodToken = $tokens[$methodIndex] ?? null;
        if (!is_array($methodToken) || $methodToken[0] !== T_STRING) {
            continue;
        }
        $methodName = strtolower($methodToken[1]);
        if ($methodName !== 'group' && !in_array($methodName, $routeMethods, true)) {
            continue;
        }
        $openParen = skipIgnorable($tokens, $methodIndex + 1);
        if (($tokens[$openParen] ?? null) !== '(') {
            continue;
        }
        $pathIndex = skipIgnorable($tokens, $openParen + 1);
        $path = decodeStringToken($tokens[$pathIndex] ?? null);
        if ($path === null) {
            $state['unresolved'][] = $file . ':' . tokenLine($methodToken)
                . ' unsupported ' . $methodName . ' route path expression';
            continue;
        }

        if ($methodName === 'group') {
            $cursor = $pathIndex + 1;
            $bodyStart = null;
            while ($cursor <= $end) {
                $cursor = skipIgnorable($tokens, $cursor);
                $current = $tokens[$cursor] ?? null;
                if (is_array($current) && $current[0] === T_FUNCTION) {
                    while ($cursor <= $end && ($tokens[$cursor] ?? null) !== '{') {
                        $cursor++;
                    }
                    if (($tokens[$cursor] ?? null) === '{') {
                        $bodyStart = $cursor;
                    }
                    break;
                }
                $cursor++;
            }
            if ($bodyStart !== null) {
                $bodyEnd = findMatchingBrace($tokens, $bodyStart);
                parseReachableRouteRange(
                    $tokens,
                    $bodyStart + 1,
                    $bodyEnd - 1,
                    normalizeJoin($prefix, $path),
                    $file,
                    $assignments,
                    $routeCollectorVariables,
                    $state
                );
                $i = $bodyEnd;
            }
            continue;
        }

        $state['routes'][] = strtoupper($methodName) . ' ' . normalizeJoin($prefix, $path);
        $cursor = $pathIndex + 1;
        while ($cursor <= $end) {
            $cursor = skipIgnorable($tokens, $cursor);
            $current = $tokens[$cursor] ?? null;
            if (is_array($current) && $current[0] === T_FUNCTION) {
                while ($cursor <= $end && ($tokens[$cursor] ?? null) !== '{') {
                    $cursor++;
                }
                if (($tokens[$cursor] ?? null) === '{') {
                    $i = findMatchingBrace($tokens, $cursor);
                }
                break;
            }
            if ($current === ';') {
                $i = $cursor;
                break;
            }
            $cursor++;
        }
    }
}

function parseReachableRouteFile(string $file, string $prefix, array &$state): void
{
    $file = str_replace('\\', '/', $file);
    $visitKey = $file . "\0" . $prefix;
    if (isset($state['visited'][$visitKey])) {
        return;
    }
    $state['visited'][$visitKey] = true;
    $state['files'][] = $file;

    $tokens = token_get_all((string)file_get_contents($file));
    parseReachableRouteRange(
        $tokens,
        0,
        count($tokens) - 1,
        $prefix,
        $file,
        extractStringListAssignments($tokens),
        extractRouteCollectorVariables($tokens),
        $state
    );
}

function extractOpenapi(string $file): array
{
    $items = [];
    $inPaths = false;
    $currentPath = null;
    foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
        if (!$inPaths) {
            if (trim($line) === 'paths:') {
                $inPaths = true;
            }
            continue;
        }
        if (preg_match('/^components:/', $line)) {
            break;
        }
        if (preg_match('/^  (\\/[^:]+):\\s*$/', $line, $matches)) {
            $currentPath = $matches[1];
            continue;
        }
        if ($currentPath !== null && preg_match('/^    (get|post|put|patch|delete|options|head|trace):\\s*$/i', $line, $matches)) {
            $items[] = strtoupper($matches[1]) . ' ' . $currentPath;
        }
    }
    $items = array_values(array_unique($items));
    sort($items);
    return $items;
}

function extractApiSpecRoutes(string $file): array
{
    $items = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $trimmed = ltrim($line);
        if (preg_match('/^\* \*\*\[(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE)\]\s+`([^`]+)`/i', $trimmed, $matches)) {
            $items[] = strtoupper($matches[1]) . ' ' . $matches[2];
        }
    }

    $items = array_values(array_unique($items));
    sort($items);

    return $items;
}

$state = [
    'routes' => [],
    'files' => [],
    'unresolved' => [],
    'visited' => [],
];
parseReachableRouteFile(getcwd() . '/api/routes/v1.php', '', $state);
foreach (glob(getcwd() . '/api/plugins/*/*/Plugin.php') ?: [] as $file) {
    if (!is_file(dirname($file) . '/manifest.json')) {
        continue;
    }
    parseReachableRouteFile($file, '', $state);
}

$routes = array_values(array_unique($state['routes']));
sort($routes);
$reachableFiles = array_values(array_unique($state['files']));
sort($reachableFiles);
$unresolvedLoads = array_values(array_unique($state['unresolved']));
sort($unresolvedLoads);
$routeV1 = [];
$outsideV1 = [];
foreach ($routes as $route) {
    [$method, $path] = explode(' ', $route, 2);
    if ($path === '/v1') {
        $routeV1[] = $method . ' /';
        continue;
    }
    if (str_starts_with($path, '/v1/')) {
        $routeV1[] = $method . ' ' . substr($path, 3);
        continue;
    }
    $outsideV1[] = $route;
}
$routeV1 = array_values(array_unique($routeV1));
sort($routeV1);
$outsideV1 = array_values(array_unique($outsideV1));
sort($outsideV1);
$openapi = extractOpenapi(getcwd() . '/api/docs/openapi.yaml');
$apiSpecRoutes = extractApiSpecRoutes(getcwd() . '/docs/API_SPEC.md');
$missingInOpenapi = array_values(array_diff($routeV1, $openapi));
$extraInOpenapi = array_values(array_diff($openapi, $routeV1));
$activeMissingInOpenapi = array_values(array_filter(
    $missingInOpenapi,
    static fn (string $operation): bool => $consumerScope->isActiveOperationKey($operation)
));
$protectedMissingInOpenapi = array_values(array_filter(
    $missingInOpenapi,
    static fn (string $operation): bool => $consumerScope->isProtectedOperationKey($operation)
));
$nonActiveMissingInOpenapi = array_values(array_diff(
    $missingInOpenapi,
    $activeMissingInOpenapi,
    $protectedMissingInOpenapi
));
$excludedMissingInOpenapi = array_values(array_filter(
    $nonActiveMissingInOpenapi,
    static fn (string $operation): bool => $consumerScope->classifyOperationKey($operation) === 'excluded_admin_shop'
));
$deferredMissingInOpenapi = array_values(array_diff($nonActiveMissingInOpenapi, $excludedMissingInOpenapi));
$activeExtraInOpenapi = array_values(array_filter(
    $extraInOpenapi,
    static fn (string $operation): bool => $consumerScope->isActiveOperationKey($operation)
));
$protectedExtraInOpenapi = array_values(array_filter(
    $extraInOpenapi,
    static fn (string $operation): bool => $consumerScope->isProtectedOperationKey($operation)
));
$nonActiveExtraInOpenapi = array_values(array_diff(
    $extraInOpenapi,
    $activeExtraInOpenapi,
    $protectedExtraInOpenapi
));
$excludedExtraInOpenapi = array_values(array_filter(
    $nonActiveExtraInOpenapi,
    static fn (string $operation): bool => $consumerScope->classifyOperationKey($operation) === 'excluded_admin_shop'
));
$deferredExtraInOpenapi = array_values(array_diff($nonActiveExtraInOpenapi, $excludedExtraInOpenapi));
$undocumentedOutsideV1 = array_values(array_diff($outsideV1, $apiSpecRoutes));
$documentedOutsideV1 = array_values(array_intersect($outsideV1, $apiSpecRoutes));

file_put_contents($tmpDir . '/route_missing.txt', $activeMissingInOpenapi === [] ? '' : implode(PHP_EOL, $activeMissingInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_missing_protected.txt', $protectedMissingInOpenapi === [] ? '' : implode(PHP_EOL, $protectedMissingInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_missing_deferred.txt', $deferredMissingInOpenapi === [] ? '' : implode(PHP_EOL, $deferredMissingInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_missing_excluded.txt', $excludedMissingInOpenapi === [] ? '' : implode(PHP_EOL, $excludedMissingInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_extra.txt', $activeExtraInOpenapi === [] ? '' : implode(PHP_EOL, $activeExtraInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_extra_protected.txt', $protectedExtraInOpenapi === [] ? '' : implode(PHP_EOL, $protectedExtraInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_extra_deferred.txt', $deferredExtraInOpenapi === [] ? '' : implode(PHP_EOL, $deferredExtraInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_extra_excluded.txt', $excludedExtraInOpenapi === [] ? '' : implode(PHP_EOL, $excludedExtraInOpenapi) . PHP_EOL);
file_put_contents($tmpDir . '/route_outside_v1.txt', $undocumentedOutsideV1 === [] ? '' : implode(PHP_EOL, $undocumentedOutsideV1) . PHP_EOL);
file_put_contents($tmpDir . '/route_outside_v1_documented.txt', $documentedOutsideV1 === [] ? '' : implode(PHP_EOL, $documentedOutsideV1) . PHP_EOL);
file_put_contents($tmpDir . '/route_unresolved_loads.txt', $unresolvedLoads === [] ? '' : implode(PHP_EOL, $unresolvedLoads) . PHP_EOL);
file_put_contents($tmpDir . '/route_reachable_files.txt', $reachableFiles === [] ? '' : implode(PHP_EOL, $reachableFiles) . PHP_EOL);
file_put_contents(
    $tmpDir . '/route_counts.txt',
    implode(PHP_EOL, [
        'route_total=' . count($routes),
        'route_v1=' . count($routeV1),
        'reachable_route_files=' . count($reachableFiles),
        'openapi_total=' . count($openapi),
        'missing=' . count($missingInOpenapi),
        'active_missing=' . count($activeMissingInOpenapi),
        'protected_missing=' . count($protectedMissingInOpenapi),
        'deferred_missing=' . count($deferredMissingInOpenapi),
        'excluded_missing=' . count($excludedMissingInOpenapi),
        'extra=' . count($extraInOpenapi),
        'active_extra=' . count($activeExtraInOpenapi),
        'protected_extra=' . count($protectedExtraInOpenapi),
        'deferred_extra=' . count($deferredExtraInOpenapi),
        'excluded_extra=' . count($excludedExtraInOpenapi),
        'unresolved_route_graph_items=' . count($unresolvedLoads),
        'outside_v1=' . count($outsideV1),
    ]) . PHP_EOL
);
PHP

cat "$TMP_DIR/route_counts.txt" | sed 's/^/    /'

if [ -s "$TMP_DIR/route_unresolved_loads.txt" ]; then
  fail "라우트 선언 또는 모듈 로딩 그래프를 완전히 해석하지 못했습니다"
  print_head "$TMP_DIR/route_unresolved_loads.txt"
else
  pass "api/routes/v1.php 도달 가능 모듈 그래프 해석 완료"
fi

if [ -s "$TMP_DIR/route_missing.txt" ]; then
  fail "Phase 1 관리자 선언 /v1 route가 OpenAPI에 누락되었습니다"
  print_head "$TMP_DIR/route_missing.txt"
else
  pass "Phase 1 관리자 선언 /v1 route가 OpenAPI에 모두 존재"
fi

if [ -s "$TMP_DIR/route_missing_protected.txt" ]; then
  fail "보호된 일반 게시판 선언 route가 OpenAPI에 누락되었습니다"
  print_head "$TMP_DIR/route_missing_protected.txt"
fi

if [ -s "$TMP_DIR/route_missing_deferred.txt" ]; then
  info "비활성/deferred 선언 route의 OpenAPI 누락은 증적으로 보존합니다"
  print_head "$TMP_DIR/route_missing_deferred.txt"
fi

if [ -s "$TMP_DIR/route_missing_excluded.txt" ]; then
  info "제외된 /admin/shop 선언 route의 OpenAPI 누락은 별도 증적으로 보존합니다"
  print_head "$TMP_DIR/route_missing_excluded.txt"
fi

if [ -s "$TMP_DIR/route_extra.txt" ]; then
  fail "Phase 1 관리자 OpenAPI에만 있고 선언 /v1 route graph에는 없는 경로가 있습니다"
  print_head "$TMP_DIR/route_extra.txt"
else
  pass "Phase 1 관리자 OpenAPI 단독 경로 없음"
fi

if [ -s "$TMP_DIR/route_extra_protected.txt" ]; then
  fail "보호된 일반 게시판 OpenAPI에만 있고 선언 /v1 route graph에는 없는 경로가 있습니다"
  print_head "$TMP_DIR/route_extra_protected.txt"
fi

if [ -s "$TMP_DIR/route_extra_deferred.txt" ]; then
  info "비활성/deferred OpenAPI 단독 경로는 증적으로 보존합니다"
  print_head "$TMP_DIR/route_extra_deferred.txt"
fi

if [ -s "$TMP_DIR/route_extra_excluded.txt" ]; then
  info "제외된 /admin/shop OpenAPI 단독 경로는 별도 증적으로 보존합니다"
  print_head "$TMP_DIR/route_extra_excluded.txt"
fi

if [ -s "$TMP_DIR/route_outside_v1.txt" ]; then
  fail "/v1 밖 공개 진입점이 문서화되지 않았습니다"
  print_head "$TMP_DIR/route_outside_v1.txt"
elif [ -s "$TMP_DIR/route_outside_v1_documented.txt" ]; then
  pass "문서화된 /v1 밖 공개 진입점만 존재"
else
  pass "/v1 밖 공개 진입점 없음"
fi

echo "--- 15. PHP 레거시 관리자 감사 소유 범위 ---"
legacy_admin_all="$TMP_DIR/legacy_admin_all.txt"
legacy_admin_core="$TMP_DIR/legacy_admin_core.txt"
legacy_admin_shop="$TMP_DIR/legacy_admin_shop.txt"
legacy_admin_classified="$TMP_DIR/legacy_admin_classified.txt"
legacy_admin_classification_json="${DOCS_CHECK_PROVIDER_CLASSIFICATION_OUTPUT:-$TMP_DIR/provider-legacy-admin-classification.json}"

find adm -type f -name '*.php' | sort > "$legacy_admin_all"
find adm -type f -name '*.php' ! -path 'adm/shop_admin/*' | sort > "$legacy_admin_core"
find adm/shop_admin -type f -name '*.php' 2>/dev/null | sort > "$legacy_admin_shop" || true
{
  sed 's#^#admin_legacy_inventory\t#' "$legacy_admin_core"
  sed 's#^#shop_admin_legacy_inventory\t#' "$legacy_admin_shop"
} > "$legacy_admin_classified"

legacy_admin_total_count="$(wc -l < "$legacy_admin_all" | tr -d ' ')"
legacy_admin_core_count="$(wc -l < "$legacy_admin_core" | tr -d ' ')"
legacy_admin_shop_count="$(wc -l < "$legacy_admin_shop" | tr -d ' ')"
legacy_admin_classified_count="$(wc -l < "$legacy_admin_classified" | tr -d ' ')"
legacy_admin_classified_paths="$TMP_DIR/legacy_admin_classified_paths.txt"
cut -f2- "$legacy_admin_classified" | sort > "$legacy_admin_classified_paths"
legacy_admin_duplicate_paths="$TMP_DIR/legacy_admin_duplicate_paths.txt"
cut -f2- "$legacy_admin_classified" | sort | uniq -d > "$legacy_admin_duplicate_paths"
legacy_admin_duplicate_count="$(wc -l < "$legacy_admin_duplicate_paths" | tr -d ' ')"

mkdir -p "$(dirname "$legacy_admin_classification_json")"
if LEGACY_ADMIN_CLASSIFIED="$legacy_admin_classified" \
  LEGACY_ADMIN_CLASSIFICATION_JSON="$legacy_admin_classification_json" \
  php <<'PHP'
<?php
declare(strict_types=1);

$input = (string)getenv('LEGACY_ADMIN_CLASSIFIED');
$output = (string)getenv('LEGACY_ADMIN_CLASSIFICATION_JSON');
$records = [];
foreach (file($input, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
    [$inventory, $path] = array_pad(explode("\t", $line, 2), 2, '');
    $records[] = [
        'path' => $path,
        'inventory' => $inventory,
    ];
}

$document = [
    'schema' => 'gnuboard5.php.provider-legacy-admin-inventory/v1',
    'audit_run_id' => getenv('API_PIPELINE_AUDIT_RUN_ID') ?: null,
    'scope' => [
        'included_root' => 'adm/',
        'included_exception' => 'adm/shop_admin/',
        'excluded_roots' => ['shop/'],
    ],
    'records' => $records,
];

$encoded = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
file_put_contents($output, $encoded . PHP_EOL);
PHP
then
  :
else
  fail "PHP 공급자 레거시 관리자 machine-readable 분류물 생성 실패"
fi

legacy_admin_classification_validation="$TMP_DIR/legacy_admin_classification_validation.txt"
if LEGACY_ADMIN_CLASSIFICATION_JSON="$legacy_admin_classification_json" \
  LEGACY_ADMIN_ALL="$legacy_admin_all" \
  php > "$legacy_admin_classification_validation" <<'PHP'
<?php
declare(strict_types=1);

$classificationPath = (string)getenv('LEGACY_ADMIN_CLASSIFICATION_JSON');
$allPath = (string)getenv('LEGACY_ADMIN_ALL');
$document = json_decode((string)file_get_contents($classificationPath), true, 512, JSON_THROW_ON_ERROR);
$records = is_array($document['records'] ?? null) ? $document['records'] : [];
$expectedPaths = file($allPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

if (($document['schema'] ?? null) !== 'gnuboard5.php.provider-legacy-admin-inventory/v1') {
    fwrite(STDERR, "invalid classification schema\n");
    exit(1);
}
if (($document['scope']['excluded_roots'] ?? null) !== ['shop/']) {
    fwrite(STDERR, "public shop exclusion is not explicit\n");
    exit(1);
}
if ($records === []) {
    fwrite(STDERR, "legacy admin scanner returned zero records\n");
    exit(1);
}

$actual = [];
$duplicates = [];
foreach ($records as $record) {
    $path = is_string($record['path'] ?? null) ? $record['path'] : '';
    $inventory = is_string($record['inventory'] ?? null) ? $record['inventory'] : '';
    if ($path === '' || !str_starts_with($path, 'adm/') || str_starts_with($path, 'shop/')) {
        fwrite(STDERR, "out-of-scope classification path: {$path}\n");
        exit(1);
    }
    if (isset($actual[$path])) {
        $duplicates[] = $path;
        continue;
    }
    $actual[$path] = $inventory;
}

if ($duplicates !== []) {
    fwrite(STDERR, "duplicate classification paths\n");
    exit(1);
}
if (count($actual) !== count($expectedPaths)) {
    fwrite(STDERR, "classification total differs from recursive PHP total\n");
    exit(1);
}

foreach ($expectedPaths as $path) {
    $expectedInventory = str_starts_with($path, 'adm/shop_admin/')
        ? 'shop_admin_legacy_inventory'
        : 'admin_legacy_inventory';
    if (($actual[$path] ?? null) !== $expectedInventory) {
        fwrite(STDERR, "wrong or missing inventory for {$path}\n");
        exit(1);
    }
}

echo "classification_records=" . count($actual) . PHP_EOL;
echo "classification_unassigned=0" . PHP_EOL;
echo "classification_duplicates=0" . PHP_EOL;
PHP
then
  pass "파일별 machine-readable 관리자 소유 분류 검증 완료"
else
  fail "파일별 machine-readable 관리자 소유 분류가 재귀 스캔과 불일치합니다"
  print_head "$legacy_admin_classification_validation"
fi

legacy_admin_classification_sha256="$(php -r 'echo hash_file("sha256", $argv[1]);' "$legacy_admin_classification_json")"

printf '    legacy_admin_total=%s\n' "$legacy_admin_total_count"
printf '    legacy_admin_core=%s\n' "$legacy_admin_core_count"
printf '    legacy_admin_shop_admin=%s\n' "$legacy_admin_shop_count"
printf '    classification_schema=gnuboard5.php.provider-legacy-admin-inventory/v1\n'
printf '    classification_records=%s\n' "$legacy_admin_classified_count"
printf '    admin_legacy_inventory=%s\n' "$legacy_admin_core_count"
printf '    shop_admin_legacy_inventory=%s\n' "$legacy_admin_shop_count"
printf '    classification_duplicates=%s\n' "$legacy_admin_duplicate_count"
printf '    classification_sha256=%s\n' "$legacy_admin_classification_sha256"
printf '    public_shop_excluded=true\n'
if [ -n "${DOCS_CHECK_PROVIDER_CLASSIFICATION_OUTPUT:-}" ]; then
  printf '    classification_output=%s\n' "$legacy_admin_classification_json"
fi

if [ "$legacy_admin_total_count" -eq 0 ]; then
  fail "adm/ 재귀 PHP scanner가 0건을 반환했습니다"
else
  pass "adm/ 재귀 PHP scanner가 비어 있지 않음"
fi

if [ "$legacy_admin_total_count" -eq "$legacy_admin_classified_count" ] \
  && [ "$legacy_admin_duplicate_count" -eq 0 ] \
  && cmp -s "$legacy_admin_all" "$legacy_admin_classified_paths"; then
  pass "adm/ PHP 파일을 재귀적으로 전부 소유 범위에 분류"
else
  fail "adm/ 재귀 PHP 총계와 소유 분류 합계가 다르거나 중복·미분류 파일이 있습니다"
  print_head "$legacy_admin_duplicate_paths"
fi

if [ -d "adm/shop_admin" ] && [ "$legacy_admin_shop_count" -eq 0 ]; then
  fail "adm/shop_admin/이 존재하지만 감사 소유 범위에서 비었습니다"
else
  pass "adm/shop_admin/ 전부 shop_admin_legacy_inventory에 포함"
fi

if rg -n '^shop/' "$legacy_admin_classified_paths" > "$TMP_DIR/public_shop_in_scope.txt" 2>&1; then
  fail "공개 shop/ 경로가 PHP 공급자 감사 범위에 섞였습니다"
  print_head "$TMP_DIR/public_shop_in_scope.txt"
else
  pass "공개 shop/ 소비자 경로는 감사 범위에서 제외"
fi

if [ "$MODE" = "--provider-contract-only" ]; then
  echo ""
  if [ "$ERRORS" -eq 0 ]; then
    echo "✅ PHP 공급자 계약 검증 통과 (0 errors, $WARNINGS warnings)"
  else
    echo "❌ PHP 공급자 계약 검증 실패 ($ERRORS errors, $WARNINGS warnings)"
  fi
  exit "$ERRORS"
fi

echo "--- 16. docs/ 루트 미분류 파일 ---"
root_unclassified="$TMP_DIR/root_unclassified.txt"
find docs -maxdepth 1 -type f \
  ! -name "README.md" \
  ! -name "IMPLEMENTATION_ROADMAP.md" \
  ! -name "TODO.md" \
  ! -name "HISTORY.md" \
  ! -name "AUDIT_SYSTEM.md" \
  ! -name "API_SPEC.md" \
  ! -name "AUDIT_STRATEGY.md" \
  ! -name "DOCUMENT_REGISTRY.md" \
  ! -name "docs.db" \
  ! -name "docs.db-shm" \
  ! -name "docs.db-wal" \
  ! -name "docs.db-journal" \
  ! -name ".DS_Store" \
  | sort > "$root_unclassified"

if [ -s "$root_unclassified" ]; then
  warn "docs/ 루트에 분류 검토가 필요한 파일이 있습니다"
  print_head "$root_unclassified"
else
  pass "docs/ 루트 미분류 파일 없음"
fi

echo "--- 17. 깨진 참조 (docs/review/) ---"
broken_review_refs="$TMP_DIR/broken_review_refs.txt"
rg -n --text 'docs/review/' docs/ .agent/ \
  -g '!docs/audits/**' \
  -g '!docs/archive/**' \
  -g '!docs/HISTORY.md' \
  -g '!docs/docs.db' \
  -g '!docs/docs.db-shm' \
  -g '!docs/docs.db-wal' \
  -g '!docs/docs.db-journal' \
  > "$broken_review_refs" || true
if [ -s "$broken_review_refs" ]; then
  fail "삭제된 docs/review/ 참조가 남아 있습니다"
  print_head "$broken_review_refs"
else
  pass "깨진 docs/review/ 참조 없음"
fi

echo "--- 18. 지원 문서의 stale 경로/계약 표현 ---"
stale_setup_path="$TMP_DIR/stale_setup_path.txt"
stale_contract_model="$TMP_DIR/stale_contract_model.txt"

rg -n --text '/api/setup' docs/ .agent/ \
  -g '!docs/audits/**' \
  -g '!docs/archive/**' \
  -g '!docs/HISTORY.md' \
  -g '!docs/DOCUMENT_REGISTRY.md' \
  -g '!docs/docs.db' \
  -g '!docs/docs.db-shm' \
  -g '!docs/docs.db-wal' \
  -g '!docs/docs.db-journal' \
  > "$stale_setup_path" || true

rg -n --text 'API 문서 자동화|PHP 8 Attribute 기반 OpenAPI 자동 생성|PHP Attributes\\(`zircote/swagger-php`\\)|swagger-php \(유지\).*자동 생성' docs/ .agent/ \
  -g '!docs/audits/**' \
  -g '!docs/archive/**' \
  -g '!docs/HISTORY.md' \
  -g '!docs/DOCUMENT_REGISTRY.md' \
  -g '!docs/docs.db' \
  -g '!docs/docs.db-shm' \
  -g '!docs/docs.db-wal' \
  -g '!docs/docs.db-journal' \
  > "$stale_contract_model" || true

if [ -s "$stale_setup_path" ]; then
  fail "지원 문서에 구형 /api/setup 경로가 남아 있습니다"
  print_head "$stale_setup_path"
else
  pass "지원 문서의 /api/setup 구형 경로 없음"
fi

if [ -s "$stale_contract_model" ]; then
  fail "지원 문서에 구형 OpenAPI 자동생성 전제가 남아 있습니다"
  print_head "$stale_contract_model"
else
  pass "지원 문서의 OpenAPI 자동생성 전제 없음"
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  if [ "$WARNINGS" -eq 0 ]; then
    echo "✅ 문서 거버넌스 검증 통과 (0 errors, 0 warnings)"
  else
    echo "✅ 문서 거버넌스 검증 통과 (0 errors, $WARNINGS warnings)"
  fi
else
  echo "❌ 문서 거버넌스 검증 실패 ($ERRORS errors, $WARNINGS warnings)"
fi

exit "$ERRORS"
