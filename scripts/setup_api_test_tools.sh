#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

install_hurl() {
  if command -v hurl >/dev/null 2>&1; then
    log "hurl already installed: $(hurl --version | head -n 1)"
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "hurl is not installed and Homebrew was not found." >&2
    echo "Install hurl manually or install Homebrew first." >&2
    exit 1
  fi

  log "Installing hurl via Homebrew"
  brew install hurl
}

install_schemathesis() {
  local venv_dir="${ROOT_DIR}/.venv-tools"
  local req_file="${ROOT_DIR}/tools/requirements-api-tests.txt"

  log "Preparing Python venv: ${venv_dir}"
  python3 -m venv "${venv_dir}"
  "${venv_dir}/bin/python" -m pip install --upgrade pip
  "${venv_dir}/bin/pip" install -r "${req_file}"

  log "schemathesis installed: $("${venv_dir}/bin/st" --version)"
}

install_hurl
install_schemathesis

log "API blackbox tools are ready."
log "Hurl: $(command -v hurl)"
log "Schemathesis: ${ROOT_DIR}/.venv-tools/bin/st"
