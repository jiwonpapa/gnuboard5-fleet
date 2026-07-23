#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from ownership_watch import ROOT, core_ports_concrete_budget


ACTIVE_CRATE_ROOT = ROOT / "g5-admin" / "src-tauri" / "src"
APP_STATE_ROOT = ACTIVE_CRATE_ROOT / "app_state"


@dataclass(frozen=True)
class ServiceReadiness:
    name: str
    path: str
    blocker_count: int
    blockers: tuple[str, ...]
    recommended_stage: str


SERVICE_RULES: tuple[tuple[str, str, tuple[tuple[str, re.Pattern[str]], ...], str], ...] = (
    (
        "SessionService",
        "g5-admin/src-tauri/src/app_state/session_service.rs",
        (
            ("AppState wrapper coupling", re.compile(r"state:\s*&'a\s+AppState")),
        ),
        "first-extract",
    ),
    (
        "SiteCatalogService",
        "g5-admin/src-tauri/src/app_state/site_catalog_service.rs",
        (
            ("AppState wrapper coupling", re.compile(r"state:\s*&'a\s+AppState")),
            ("site manager runtime state", re.compile(r"\.site_manager\b")),
            ("site init runtime flag", re.compile(r"\bsites_initialized\b")),
            ("AppState unlock gate", re.compile(r"\bensure_master_unlocked\(")),
            ("security wrapper dependency", re.compile(r"\bverify_sensitive_action\(")),
            ("AppState site apply helper", re.compile(r"\bapply_active_site\(")),
        ),
        "second-extract",
    ),
    (
        "SecuritySettingsService",
        "g5-admin/src-tauri/src/app_state/security_settings_service.rs",
        (
            ("AppState wrapper coupling", re.compile(r"state:\s*&'a\s+AppState")),
            ("AppState unlock gate", re.compile(r"\bensure_master_unlocked\(")),
            ("TOTP verification wrapper", re.compile(r"\bverify_totp_code\(")),
            ("site manager runtime state", re.compile(r"\.site_manager\b")),
            ("pending TOTP runtime flag", re.compile(r"\bpending_totp_unlock\b")),
            (
                "app_state constants/time helpers",
                re.compile(
                    r"\b(?:DEFAULT_IDLE_TIMEOUT_MINUTES|TOTP_ISSUER|TOTP_ACCOUNT_NAME|current_epoch_seconds)\b"
                ),
            ),
        ),
        "third-extract",
    ),
    (
        "MasterLockService",
        "g5-admin/src-tauri/src/app_state/master_lock_service.rs",
        (
            ("AppState wrapper coupling", re.compile(r"state:\s*&'a\s+AppState")),
            ("master unlock runtime flag", re.compile(r"\bmaster_unlocked\b")),
            ("pending TOTP runtime flag", re.compile(r"\bpending_totp_unlock\b")),
            ("site manager runtime state", re.compile(r"\.site_manager\b")),
            (
                "site bootstrap/apply helpers",
                re.compile(r"\b(?:ensure_sites_loaded|apply_active_site)\("),
            ),
            (
                "app_state time/message helpers",
                re.compile(
                    r"\b(?:current_epoch_seconds|format_unlock_retry_after_message)\b"
                ),
            ),
            ("cross-service wrapper dependency", re.compile(r"\bload_totp_enabled\(")),
        ),
        "last-extract",
    ),
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def collect_service_readiness() -> list[ServiceReadiness]:
    rows: list[ServiceReadiness] = []
    for name, relative_path, rules, recommended_stage in SERVICE_RULES:
        path = ROOT / relative_path
        text = read_text(path) if path.exists() else ""
        blockers = tuple(label for label, pattern in rules if pattern.search(text))
        rows.append(
            ServiceReadiness(
                name=name,
                path=relative_path,
                blocker_count=len(blockers),
                blockers=blockers,
                recommended_stage=recommended_stage,
            )
        )
    return rows


def first_core_boundary() -> str:
    return (
        "g5-admin-core first boundary = trait-only ports + SessionService only; "
        "concrete adapter impls stay in src-tauri until core/infra split"
    )


def core_split_blockers() -> list[str]:
    blockers = []
    for detail in core_ports_concrete_budget():
        blockers.append(f"core/ports.rs :: {detail}")
    return blockers
