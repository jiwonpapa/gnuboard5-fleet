#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/g5-admin/src-tauri/Cargo.toml"
TARGET="x86_64-pc-windows-msvc"
CARGO_XWIN_VERSION="${CARGO_XWIN_VERSION:-0.23.0}"
SKIP_INSTALL="${G5_LOCAL_CI_SKIP_INSTALL:-0}"

if [[ "$(uname -s)" != Darwin ]]; then
  exec cargo check --manifest-path "$MANIFEST_PATH" --target "$TARGET"
fi

if ! cargo xwin --version >/dev/null 2>&1; then
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "missing cargo-xwin; rerun local CI without --no-install" >&2
    exit 1
  fi
  cargo install cargo-xwin --version "$CARGO_XWIN_VERSION" --locked
fi

if ! rustup target list --installed | grep -qx "$TARGET"; then
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "missing Rust target $TARGET; rerun local CI without --no-install" >&2
    exit 1
  fi
  rustup target add "$TARGET"
fi

OPENSSL_ROOT="${G5_WINDOWS_OPENSSL_ROOT:-}"
if [[ -z "$OPENSSL_ROOT" ]] && command -v brew >/dev/null 2>&1; then
  OPENSSL_ROOT="$(brew --prefix openssl@3 2>/dev/null || true)"
fi
if [[ -z "$OPENSSL_ROOT" ]]; then
  for candidate in /opt/homebrew/opt/openssl@3 /usr/local/opt/openssl@3; do
    if [[ -d "$candidate/include" ]] && [[ -d "$candidate/lib" ]]; then
      OPENSSL_ROOT="$candidate"
      break
    fi
  done
fi

if [[ ! -d "$OPENSSL_ROOT/include" ]] || [[ ! -d "$OPENSSL_ROOT/lib" ]]; then
  echo "missing local OpenSSL 3 headers/libraries for SQLCipher cross-check" >&2
  echo "install openssl@3 or set G5_WINDOWS_OPENSSL_ROOT" >&2
  exit 1
fi

OPENSSL_INCLUDE_DIR="$OPENSSL_ROOT/include" \
OPENSSL_LIB_DIR="$OPENSSL_ROOT/lib" \
  cargo xwin check --manifest-path "$MANIFEST_PATH" --target "$TARGET"

echo "PASS: Windows MSVC target type check via cargo-xwin"
