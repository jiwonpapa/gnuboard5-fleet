#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_DB_RELATIVE=".cache/docs/docs.db"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "${ROOT_DIR}/${path}" ]] || fail "missing file: ${path}"
}

require_heading() {
  local path="$1"
  local heading="$2"
  rg -q "^## ${heading}$" "${ROOT_DIR}/${path}" || fail "missing heading '${heading}' in ${path}"
}

require_file "specs/README.md"
require_file "specs/DOCUMENT_SYSTEM.md"
require_file "specs/IMPLEMENTATION_ROADMAP.md"
require_file "specs/TODO.md"
require_file "specs/HISTORY.md"
require_file "specs/foundation/README.md"
require_file "specs/foundation/DOCUMENT_METADATA_SCHEMA.md"
require_file "specs/foundation/DOCUMENT_LIFECYCLE_POLICY.md"
require_file "specs/foundation/FOUNDATION_SDD.md"
require_file "specs/foundation/DEV_BOOTSTRAP_CHECKLIST.md"
require_file "specs/foundation/TASK_ORDER_EXECUTION.md"
require_file "specs/foundation/AUTH_CORE_SDD.md"
require_file "specs/domains/README.md"
require_file "specs/domains/ADMIN_BOARDS_SDD.md"
require_file "specs/domains/ADMIN_MEMBERS_SDD.md"
require_file ".agent/sub-constitutions/document-governance.md"
require_file ".agent/workflows/document-management.md"
require_file "${DOC_DB_RELATIVE}"

python3 "${ROOT_DIR}/scripts/check_document_metadata.py"

for heading in "Inbox" "Next" "In Progress" "Blocked" "Done"; do
  require_heading "specs/TODO.md" "${heading}"
done

for reference in "IMPLEMENTATION_ROADMAP.md" "TODO.md" "HISTORY.md"; do
  rg -q "${reference}" "${ROOT_DIR}/specs/README.md" || fail "missing README reference: ${reference}"
done

for reference in "DOCUMENT_SYSTEM.md" "DOCUMENT_METADATA_SCHEMA.md" "DOCUMENT_LIFECYCLE_POLICY.md"; do
  rg -q "${reference}" "${ROOT_DIR}/specs/README.md" || fail "missing README reference: ${reference}"
done

rg -q "G5_OPENAPI_PATH" "${ROOT_DIR}/specs/README.md" \
  || fail "missing README OpenAPI env reference"
rg -q "G5_PHP_ROOT" "${ROOT_DIR}/specs/README.md" \
  || fail "missing README PHP root env reference"
rg -q "connectors/gnuboard5-php/api/docs/openapi.yaml" "${ROOT_DIR}/specs/README.md" \
  || fail "missing README canonical OpenAPI path"
rg -q "connectors/gnuboard5-php/api/docs/openapi.yaml" "${ROOT_DIR}/.agent/Constitution.md" \
  || fail "missing Constitution canonical OpenAPI path"
rg -q "connectors/gnuboard5-php/api/docs/openapi.yaml" "${ROOT_DIR}/AGENTS.md" \
  || fail "missing AGENTS canonical OpenAPI path"
rg -q "connectors/gnuboard5-php" "${ROOT_DIR}/README.md" \
  || fail "missing root README fleet provider path"
for portable_doc in AGENTS.md .agent/Constitution.md README.md specs/README.md; do
  if rg -q "/Users/neojins/workspace/gnuboard5/(php|rust)" "${ROOT_DIR}/${portable_doc}"; then
    fail "non-portable workspace path in ${portable_doc}"
  fi
done
rg -q "Swagger UI" "${ROOT_DIR}/.agent/Constitution.md" \
  || fail "missing Constitution Swagger UI non-authoritative rule"

roadmap_docs=()
while IFS= read -r line; do
  roadmap_docs+=("${line}")
done < <(find "${ROOT_DIR}/specs" -type f -name '*ROADMAP*.md' ! -path '*/archive/*' | sort)
[[ "${#roadmap_docs[@]}" -eq 1 ]] || fail "expected exactly one active roadmap document"
[[ "${roadmap_docs[0]}" == "${ROOT_DIR}/specs/IMPLEMENTATION_ROADMAP.md" ]] \
  || fail "active roadmap must be specs/IMPLEMENTATION_ROADMAP.md"

todo_docs=()
while IFS= read -r line; do
  todo_docs+=("${line}")
done < <(find "${ROOT_DIR}/specs" -type f -name 'TODO*.md' ! -path '*/archive/*' | sort)
[[ "${#todo_docs[@]}" -eq 1 ]] || fail "expected exactly one active TODO document"
[[ "${todo_docs[0]}" == "${ROOT_DIR}/specs/TODO.md" ]] \
  || fail "active TODO must be specs/TODO.md"

while IFS= read -r -d '' file; do
  base="$(basename "${file}")"
  [[ "${base}" == "README.md" ]] && continue
  [[ "${base}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}[-_].+\.md$ ]] \
    || fail "invalid audit filename: specs/audits/${base}"
done < <(find "${ROOT_DIR}/specs/audits" -maxdepth 1 -type f -name '*.md' -print0)

python3 - "${ROOT_DIR}/${DOC_DB_RELATIVE}" <<'PY'
import sqlite3
import sys
from pathlib import Path

db_path = Path(sys.argv[1])
if not db_path.exists():
    raise SystemExit("missing generated docs cache")

with sqlite3.connect(db_path) as conn:
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'virtual table')"
        )
    }
    if "docs" not in tables or "docs_fts" not in tables:
        raise SystemExit("generated docs cache schema is incomplete")
PY

echo "PASS: document governance verified"
