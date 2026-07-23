"""Shared execution primitives for the PHP→OpenAPI→Rust/Tauri audit harness."""

from .execution import CheckResult, CheckSpec, redact, run_check, tail_lines

__all__ = ["CheckResult", "CheckSpec", "redact", "run_check", "tail_lines"]
