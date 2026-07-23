#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${G5_AUDIT_PYTHON_VENV:-$ROOT_DIR/target/audit-python}"
MARKER="$VENV_DIR/.requirements.sha256"
REQUIREMENTS=(
  "$ROOT_DIR/scripts/requirements-audit.txt"
  "$ROOT_DIR/scripts/requirements-audit-dev.txt"
)

python_has_tools() {
  "$1" -m ruff --version >/dev/null 2>&1 \
    && "$1" -m mypy --version >/dev/null 2>&1
}

if [[ -n "${G5_AUDIT_PYTHON:-}" ]]; then
  PYTHON="$G5_AUDIT_PYTHON"
elif python_has_tools python3; then
  PYTHON="python3"
else
  FINGERPRINT="$(python3 -c 'import hashlib, pathlib, sys; h=hashlib.sha256(); [h.update(pathlib.Path(path).read_bytes()) for path in sys.argv[1:]]; print(h.hexdigest())' "${REQUIREMENTS[@]}")"
  if [[ ! -x "$VENV_DIR/bin/python3" ]]; then
    python3 -m venv "$VENV_DIR"
  fi
  if [[ ! -f "$MARKER" ]] || [[ "$(<"$MARKER")" != "$FINGERPRINT" ]]; then
    "$VENV_DIR/bin/python3" -m pip install --disable-pip-version-check \
      "${REQUIREMENTS[@]/#/-r}"
    printf '%s\n' "$FINGERPRINT" >"$MARKER"
  fi
  PYTHON="$VENV_DIR/bin/python3"
fi

if ! python_has_tools "$PYTHON"; then
  echo "audit Python is missing pinned ruff/mypy: $PYTHON" >&2
  exit 1
fi

"$PYTHON" -m ruff check --config "$ROOT_DIR/pyproject.toml" \
  "$ROOT_DIR/scripts/audit_harness" \
  "$ROOT_DIR/scripts/check_live_domain_certification_registry.py" \
  "$ROOT_DIR/scripts/check_live_provider_identity.py" \
  "$ROOT_DIR/scripts/run_api_pipeline_audit.py" \
  "$ROOT_DIR/scripts/run_integrated_audit.py" \
  "$ROOT_DIR/scripts/tests"
"$PYTHON" -m mypy --config-file "$ROOT_DIR/pyproject.toml" \
  "$ROOT_DIR/scripts/audit_harness"
