#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextvars
import fnmatch
import hashlib
import ipaddress
import json
import os
import re
import stat
import subprocess
import sys
import tomllib
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SHA1_LENGTH = 40
SHA256_LENGTH = 64
EXPECTED_HARD_FAIL_STATES = {
    "missing",
    "failed",
    "blocked_required",
    "skipped_required",
    "stale",
    "scanner_zero",
    "artifact_mismatch",
}
EXPECTED_SOURCE_DESTINATIONS = {
    "php-rest-api": "connectors/gnuboard5-php",
    "rust-admin": "products/admin-desktop",
}
EXPECTED_SOURCE_ROLES = {
    "php-rest-api": "openapi_provider",
    "rust-admin": "legacy_consumer_reference",
}
EXPECTED_EXCLUDED_OUTPUT_FILES = {
    "php-rest-api": 231,
    "rust-admin": 77,
}
EXPECTED_EXCLUDED_GENERATED_ARTIFACTS = {
    "php-rest-api": {
        "api.zip": "77ff9641dfb3e15a5f0142a460edf3525c9c8ed4b274dbf258c7c9d08e02ddf4"
    },
    "rust-admin": {
        "specs/docs.db": "85da29ecdd343efe70369fad91c7202c412a21d44bbaba5178e97474397bd385"
    },
}
EXPECTED_CLASSIFICATION_COUNTS = {
    "active": 189,
    "deferred_general_board": 26,
    "deferred_internal_tool": 3,
    "deferred_non_admin": 68,
    "excluded_admin_shop": 26,
}
EXPECTED_RUST_SCHEMA_DOMAINS = {
    "boards",
    "config",
    "contents",
    "faq-masters",
    "faqs",
    "groups",
    "mails",
    "members",
    "menus",
    "points",
    "polls",
    "popups",
    "sms-contacts",
    "sms-messages",
    "sms-templates",
    "system",
    "theme",
}
EXPECTED_BOOTSTRAP_OPERATIONS = {
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/refresh"),
    ("GET", "/health"),
    ("GET", "/members/me"),
}
FORBIDDEN_HISTORY_PREFIXES = (
    "output/",
    "connectors/gnuboard5-php/output/",
    "products/admin-desktop/output/",
)
SECRET_SCAN_OVERLAP_BYTES = 8192
SECRET_SCAN_CHUNK_BYTES = 1024 * 1024
AUDIT_DEPENDENCY_MANIFEST = Path(".cache/runtime/python-audit.manifest.json")
GENERIC_SECRET_CONFIG_SUFFIXES = {
    ".bash",
    ".cfg",
    ".conf",
    ".env",
    ".fish",
    ".ini",
    ".properties",
    ".ps1",
    ".service",
    ".sh",
    ".toml",
    ".yaml",
    ".yml",
    ".zsh",
}
JSON_DATA_SUFFIXES = {".json", ".jsonc", ".jsonl", ".ndjson"}
DEPENDENCY_METADATA_NAMES = {
    "bun.lock",
    "composer.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
}


@dataclass(frozen=True)
class SecretPattern:
    id: str
    regex: re.Pattern[bytes]


SECRET_PATTERNS = (
    SecretPattern(
        "private_key",
        re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"),
    ),
    SecretPattern("aws_access_key", re.compile(rb"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    SecretPattern(
        "github_token",
        re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{50,255})\b"),
    ),
    SecretPattern("slack_token", re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,255}\b")),
    SecretPattern("google_api_key", re.compile(rb"\bAIza[0-9A-Za-z_-]{35}\b")),
    SecretPattern("openai_api_key", re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,255}\b")),
    SecretPattern("stripe_live_key", re.compile(rb"\b(?:sk|rk)_live_[A-Za-z0-9]{16,255}\b")),
    SecretPattern("telegram_bot_token", re.compile(rb"\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b")),
    SecretPattern(
        "credential_assignment",
        re.compile(
            rb"(?im)^[\t ]*(?:export[\t ]+)?(?:[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|CLIENT_SECRET|PRIVATE_KEY|ACCESS_KEY|REFRESH_TOKEN)|CF_ICODE_PW)[\t ]*=[\t ]*[\"']?(?P<value>(?![$<{])[^\s\"';#]{6,4096})"
        ),
    ),
    SecretPattern(
        "json_secret",
        re.compile(
            rb"(?i)\"(?:[^\"\r\n]{0,64}(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?key|refresh[_-]?token)|pwd|cf_icode_pw)\"[\t ]*:[\t ]*\"(?P<value>(?![$<{])(?:\\.|[^\"\\]){6,4096})\""
        ),
    ),
    SecretPattern(
        "yaml_secret",
        re.compile(
            rb"(?im)^[\t ]*(?:[A-Za-z0-9_.-]*(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?key|refresh[_-]?token)|pwd|cf_icode_pw)[\t ]*:[\t ]*[\"']?(?P<value>(?![$<{])[^\s\"';#]{6,4096})"
        ),
    ),
    SecretPattern(
        "php_secret_define",
        re.compile(
            rb"(?i)define[\t ]*\([\t ]*[\"'][A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|CLIENT_SECRET|PRIVATE_KEY|ACCESS_KEY|REFRESH_TOKEN)[\"'][\t ]*,[\t ]*[\"'](?P<value>(?![$<{])[^\"']{6,4096})[\"']"
        ),
    ),
    SecretPattern(
        "html_sensitive_input",
        re.compile(
            rb"(?is)<input\b(?=[^>]{0,4096}\b(?:type[\t ]*=[\t ]*[\"']password[\"']|(?:name|id)[\t ]*=[\t ]*[\"'](?:cf_icode_pw|cf_admin_email|mb_password|mb_email|mb_tel|mb_hp|mb_ip|mb_login_ip)[\"']))(?=[^>]{0,4096}\bvalue[\t ]*=[\t ]*[\"'](?P<value>[^\"']{3,1024})[\"'])[^>]{0,4096}>"
        ),
    ),
    SecretPattern(
        "pii_email",
        re.compile(
            rb"(?i)\"(?:mb_email|member_email|email|email_address)\"[\t ]*:[\t ]*\"(?P<value>[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,63})\""
        ),
    ),
    SecretPattern(
        "pii_phone",
        re.compile(
            rb"(?i)\"(?:mb_tel|mb_hp|member_phone|phone)\"[\t ]*:[\t ]*\"(?P<value>\+?[0-9][0-9 ()-]{6,20}[0-9])\""
        ),
    ),
    SecretPattern(
        "pii_ip",
        re.compile(
            rb"(?i)\"(?:mb_ip|mb_login_ip|member_ip|login_ip)\"[\t ]*:[\t ]*\"(?P<value>[0-9A-F:.]{3,64})\""
        ),
    ),
    SecretPattern("korean_resident_id", re.compile(rb"\b(?P<value>[0-9]{6}[- ]?[1-8][0-9]{6})\b")),
)
EXPECTED_PROFILE_CONTRACTS: dict[str, dict[str, object]] = {
    "scaffold": {
        "proof_level": "SCAFFOLD_PASS",
        "inherits": None,
        "required_checks": [
            "repository.destination_state",
            "governance.schemas",
            "governance.constitution",
            "governance.product_manifest",
            "governance.license_policy",
            "migration.provenance",
            "upstream.lock",
        ],
    },
    "migration_static": {
        "proof_level": "MIGRATION_SOURCE_CLOSURE_PASS",
        "inherits": "scaffold",
        "required_checks": [
            "migration.history",
            "migration.secret_history_hygiene",
            "migration.source_closure",
            "migration.legacy_reference_boundary",
            "runtime.composed_provider",
            "runtime.audit_dependencies",
            "php.contract_inventory",
            "commerce.provider_retention",
            "product.notification_boundary",
        ],
    },
    "server_scaffold": {
        "proof_level": "SERVER_SCAFFOLD_PASS",
        "inherits": "migration_static",
        "required_checks": [
            "active.workspace_boundary",
            "server.scaffold_contract",
            "web.transport_boundary",
            "storage.sqlite_durability",
            "security.auth_site_boundary",
            "server.vertical_flow",
            "remote.ssh_sftp_boundary",
            "server.route_registry",
            "web.transport_registry",
            "web.field_consumption",
            "security.site_context",
            "security.csrf",
            "security.ssrf",
        ],
    },
    "server_static": {
        "proof_level": "SERVER_STATIC_PASS",
        "inherits": "server_scaffold",
        "required_checks": [
            "server.route_registry",
            "web.transport_registry",
            "web.field_consumption",
            "security.site_context",
            "security.csrf",
            "security.ssrf",
            "notification.telegram_contract",
            "notification.web_push_contract",
            "web.pwa_cache_safety",
            "commerce.core_isolation",
            "package.operational_contract",
            "certification.harness_boundary",
        ],
    },
    "local": {
        "proof_level": "LOCAL_RUNTIME_PASS",
        "inherits": "server_static",
        "required_checks": [
            "compose.gnuboard_5_6_32",
            "runtime.provider_identity",
            "runtime.server_browser_e2e",
            "runtime.mutation_readback_cleanup",
            "notification.telegram_fake_delivery",
            "notification.web_push_fake_delivery",
        ],
    },
    "package": {
        "proof_level": "PACKAGE_PASS",
        "inherits": "local",
        "required_checks": [
            "package.server_image",
            "package.php_connector",
            "package.checksums",
            "package.sbom",
            "upgrade.backup_restore",
            "upgrade.rollback",
        ],
    },
    "staging": {
        "proof_level": "STAGING_PASS",
        "inherits": "package",
        "required_checks": [
            "staging.provider_identity",
            "staging.deploy_smoke",
            "staging.rollback_rehearsal",
        ],
    },
}
CURRENT_RUN_ID: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "g5_fleet_audit_run_id", default=None
)


@dataclass(frozen=True)
class CheckResult:
    id: str
    status: str
    detail: str


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return payload


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git(*args: str, root: Path = ROOT) -> str:
    completed = subprocess.run(
        ("git", *args),
        cwd=root,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return completed.stdout.strip()


def run_checked(
    *args: str,
    root: Path,
    timeout_seconds: int = 1800,
) -> str:
    try:
        completed = subprocess.run(
            args,
            cwd=root,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            f"command timed out after {timeout_seconds}s ({' '.join(args)})"
        ) from error
    if completed.returncode != 0:
        combined = "\n".join(
            part for part in (completed.stdout.strip(), completed.stderr.strip()) if part
        )
        tail = "\n".join(combined.splitlines()[-80:])
        raise RuntimeError(f"command failed ({' '.join(args)}): {tail}")
    return completed.stdout.strip()


def is_hex(value: object, length: int) -> bool:
    if not isinstance(value, str) or len(value) != length:
        return False
    return all(character in "0123456789abcdef" for character in value)


def _json_type_matches(value: object, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    raise ValueError(f"unsupported JSON schema type: {expected}")


def validate_json_schema(value: object, schema: dict[str, Any], location: str = "$") -> None:
    """Validate the strict JSON-Schema subset used by repository governance files."""
    expected_type = schema.get("type")
    if isinstance(expected_type, str) and not _json_type_matches(value, expected_type):
        raise ValueError(f"{location}: expected {expected_type}")

    if "const" in schema and value != schema["const"]:
        raise ValueError(f"{location}: const mismatch")
    enum = schema.get("enum")
    if isinstance(enum, list) and value not in enum:
        raise ValueError(f"{location}: value is not in enum")

    if isinstance(value, dict):
        required = schema.get("required", [])
        if not isinstance(required, list) or not all(isinstance(item, str) for item in required):
            raise ValueError(f"{location}: schema required must be a string array")
        missing = [item for item in required if item not in value]
        if missing:
            raise ValueError(f"{location}: missing required keys: {', '.join(missing)}")
        properties = schema.get("properties", {})
        if not isinstance(properties, dict):
            raise ValueError(f"{location}: schema properties must be an object")
        if schema.get("additionalProperties") is False:
            extras = sorted(set(value) - set(properties))
            if extras:
                raise ValueError(f"{location}: unexpected keys: {', '.join(extras)}")
        for key, child_schema in properties.items():
            if key in value:
                if not isinstance(child_schema, dict):
                    raise ValueError(f"{location}.{key}: schema must be an object")
                validate_json_schema(value[key], child_schema, f"{location}.{key}")

    if isinstance(value, list):
        minimum = schema.get("minItems")
        maximum = schema.get("maxItems")
        if isinstance(minimum, int) and len(value) < minimum:
            raise ValueError(f"{location}: needs at least {minimum} items")
        if isinstance(maximum, int) and len(value) > maximum:
            raise ValueError(f"{location}: allows at most {maximum} items")
        if schema.get("uniqueItems") is True:
            canonical = [json.dumps(item, sort_keys=True, separators=(",", ":")) for item in value]
            if len(canonical) != len(set(canonical)):
                raise ValueError(f"{location}: duplicate items")
        item_schema = schema.get("items")
        if item_schema is not None:
            if not isinstance(item_schema, dict):
                raise ValueError(f"{location}: item schema must be an object")
            for index, item in enumerate(value):
                validate_json_schema(item, item_schema, f"{location}[{index}]")

    if isinstance(value, str):
        minimum_length = schema.get("minLength")
        if isinstance(minimum_length, int) and len(value) < minimum_length:
            raise ValueError(f"{location}: string is shorter than {minimum_length}")
        pattern = schema.get("pattern")
        if isinstance(pattern, str) and re.fullmatch(pattern, value) is None:
            raise ValueError(f"{location}: string does not match {pattern}")


def check_schema_validation(root: Path) -> str:
    filenames = (
        "AUDIT_MANIFEST.json",
        "PRODUCT_MANIFEST.json",
        "UPSTREAMS.lock.json",
        "MIGRATION_PROVENANCE.json",
        "governance/SECRET_HISTORY_POLICY.json",
    )
    schema_root = (root / "governance/schemas").resolve()
    for filename in filenames:
        document_path = root / filename
        payload = load_json(document_path)
        schema_reference = payload.get("$schema")
        if not isinstance(schema_reference, str) or not schema_reference:
            raise ValueError(f"{filename}: $schema is required")
        schema_path = (document_path.parent / schema_reference).resolve()
        if not schema_path.is_relative_to(schema_root):
            raise ValueError(f"{filename}: schema path escapes governance/schemas")
        schema = load_json(schema_path)
        validate_json_schema(payload, schema, filename)
    return f"거버넌스 JSON {len(filenames)}개 실제 schema 검증"


def git_bytes(*args: str, root: Path, input_data: bytes | None = None) -> bytes:
    completed = subprocess.run(
        ("git", *args),
        cwd=root,
        check=False,
        input=input_data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return completed.stdout


def load_secret_history_policy(root: Path) -> dict[str, Any]:
    policy_path = root / "governance/SECRET_HISTORY_POLICY.json"
    schema_path = root / "governance/schemas/secret-history-policy.schema.json"
    policy = load_json(policy_path)
    validate_json_schema(policy, load_json(schema_path), "governance/SECRET_HISTORY_POLICY.json")
    if tuple(policy.get("forbidden_history_prefixes", ())) != FORBIDDEN_HISTORY_PREFIXES:
        raise ValueError("secret history forbidden prefixes cannot be weakened")

    allowlist = policy.get("allowlist")
    if not isinstance(allowlist, dict):
        raise ValueError("secret history allowlist is missing")
    known_pattern_ids = {pattern.id for pattern in SECRET_PATTERNS}
    seen_ids: set[str] = set()
    for row in allowlist.get("exact_match_hashes", []):
        if not isinstance(row, dict):
            raise ValueError("secret history exact-match allowlist row is invalid")
        row_id = row.get("id")
        if not isinstance(row_id, str) or row_id in seen_ids:
            raise ValueError("secret history allowlist ids must be unique")
        seen_ids.add(row_id)
        pattern_ids = row.get("pattern_ids")
        if not isinstance(pattern_ids, list) or not set(pattern_ids).issubset(known_pattern_ids):
            raise ValueError(f"secret history allowlist has unknown pattern id: {row_id}")
    for network in allowlist.get("documentation_ip_networks", []):
        try:
            ipaddress.ip_network(network)
        except ValueError as error:
            raise ValueError(f"invalid documentation IP network: {network}") from error
    return policy


def _decode_git_path(raw: bytes) -> str:
    return raw.decode("utf-8", "backslashreplace")


def _history_blob_inventory(root: Path) -> tuple[list[str], dict[str, set[str]]]:
    raw = git_bytes(
        "log",
        "--all",
        "--format=",
        "--raw",
        "-z",
        "-m",
        "--no-renames",
        "--no-abbrev",
        "--root",
        root=root,
    )
    tokens = raw.split(b"\0")
    history_paths: set[str] = set()
    blob_paths: dict[str, set[str]] = {}
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if not token:
            index += 1
            continue
        header = token.lstrip(b"\n")
        if not header.startswith(b":") or index + 1 >= len(tokens):
            raise ValueError("secret history scanner could not parse Git raw history")
        path = _decode_git_path(tokens[index + 1])
        history_paths.add(path)
        fields = header[1:].split()
        if len(fields) != 5:
            raise ValueError("secret history scanner found malformed Git raw metadata")
        old_mode, new_mode, old_oid, new_oid, _status = fields
        for mode, oid_raw in ((old_mode, old_oid), (new_mode, new_oid)):
            oid = oid_raw.decode("ascii", "strict")
            if mode != b"160000" and oid and set(oid) != {"0"}:
                blob_paths.setdefault(oid, set()).add(path)
        index += 2
    return sorted(history_paths), blob_paths


def _is_allowed_secret_match(
    pattern_id: str,
    value: bytes,
    paths: tuple[str, ...],
    policy: dict[str, Any],
) -> bool:
    allowlist = policy["allowlist"]
    value_sha256 = hashlib.sha256(value).hexdigest()
    try:
        text = value.decode("ascii").strip().lower()
    except UnicodeDecodeError:
        text = ""

    if "@" in text:
        domain = text.rsplit("@", 1)[-1].rstrip(".")
        if domain in allowlist["example_email_domains"]:
            return True
    if pattern_id == "pii_ip" and text:
        try:
            address = ipaddress.ip_address(text)
        except ValueError:
            return False
        if any(
            address in ipaddress.ip_network(network)
            for network in allowlist["documentation_ip_networks"]
        ):
            return True
    if pattern_id == "json_secret" and text:
        endpoint = urlsplit(text)
        if (
            endpoint.scheme == "https"
            and endpoint.hostname
            and endpoint.username is None
            and endpoint.password is None
            and not endpoint.query
            and not endpoint.fragment
        ):
            return True

    for row in allowlist["exact_match_hashes"]:
        if row["sha256"] != value_sha256 or pattern_id not in row["pattern_ids"]:
            continue
        globs = row["path_globs"]
        if paths and all(
            any(fnmatch.fnmatchcase(path, pattern) for pattern in globs)
            for path in paths
        ):
            return True
    return False


def _secret_pattern_applies(pattern_id: str, paths: tuple[str, ...]) -> bool:
    """Limit generic structured patterns to the formats they actually parse.

    Provider token/private-key signatures remain global. Generic JSON/YAML/key
    patterns are format-aware so source declarations such as ``token: String``
    and public package metadata do not become mass false positives.
    """

    normalized = tuple(Path(path) for path in paths)
    if pattern_id == "credential_assignment":
        return any(
            path.name == ".env"
            or path.name.startswith(".env.")
            or path.suffix.lower() in GENERIC_SECRET_CONFIG_SUFFIXES
            for path in normalized
        )
    if pattern_id in {"json_secret", "pii_email", "pii_phone", "pii_ip"}:
        return any(
            path.name.lower() not in DEPENDENCY_METADATA_NAMES
            and path.suffix.lower() in JSON_DATA_SUFFIXES
            for path in normalized
        )
    if pattern_id == "yaml_secret":
        return any(path.suffix.lower() in {".yaml", ".yml"} for path in normalized)
    if pattern_id == "php_secret_define":
        return any(path.suffix.lower() == ".php" for path in normalized)
    if pattern_id == "html_sensitive_input":
        return any(
            path.suffix.lower() in {".html", ".htm", ".php", ".jsx", ".tsx"}
            for path in normalized
        )
    return True


def _scan_secret_chunks(
    chunks: Any,
    *,
    paths: tuple[str, ...],
    policy: dict[str, Any],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    seen: set[tuple[str, str, int]] = set()
    tail = b""
    for chunk in chunks:
        if not isinstance(chunk, bytes):
            raise TypeError("secret scanner chunks must be bytes")
        window = tail + chunk
        previous_tail_length = len(tail)
        for pattern in SECRET_PATTERNS:
            if not _secret_pattern_applies(pattern.id, paths):
                continue
            for match in pattern.regex.finditer(window):
                if match.end() <= previous_tail_length:
                    continue
                value = match.group("value") if "value" in pattern.regex.groupindex else match.group(0)
                if _is_allowed_secret_match(pattern.id, value, paths, policy):
                    continue
                value_sha256 = hashlib.sha256(value).hexdigest()
                key = (pattern.id, value_sha256, len(value))
                if key in seen:
                    continue
                seen.add(key)
                findings.append(
                    {
                        "pattern_id": pattern.id,
                        "path_hint": paths[0] if paths else "<unresolved>",
                        "path_count": len(paths),
                        "value_sha256": value_sha256,
                        "value_length": len(value),
                    }
                )
        tail = window[-SECRET_SCAN_OVERLAP_BYTES:]
    return findings


def _scan_history_blobs(
    root: Path,
    blob_paths: dict[str, set[str]],
    policy: dict[str, Any],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    process = subprocess.Popen(
        ("git", "cat-file", "--batch"),
        cwd=root,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert process.stdin is not None and process.stdout is not None and process.stderr is not None
    try:
        for requested_oid in sorted(blob_paths):
            process.stdin.write(requested_oid.encode("ascii") + b"\n")
            process.stdin.flush()
            header = process.stdout.readline().rstrip(b"\n")
            fields = header.split()
            if len(fields) != 3 or fields[1] != b"blob" or not fields[2].isdigit():
                raise ValueError("secret history scanner received invalid Git object metadata")
            object_oid = fields[0].decode("ascii", "strict")
            remaining = int(fields[2])

            def chunks() -> Any:
                nonlocal remaining
                while remaining:
                    chunk = process.stdout.read(min(SECRET_SCAN_CHUNK_BYTES, remaining))
                    if not chunk:
                        raise ValueError("secret history scanner received a truncated Git blob")
                    remaining -= len(chunk)
                    yield chunk

            paths = tuple(sorted(blob_paths[requested_oid]))
            object_findings = _scan_secret_chunks(chunks(), paths=paths, policy=policy)
            if process.stdout.read(1) != b"\n":
                raise ValueError("secret history scanner lost Git batch framing")
            for finding in object_findings:
                finding["object_oid"] = object_oid[:12]
            findings.extend(object_findings)
        process.stdin.close()
        return_code = process.wait(timeout=300)
        if return_code != 0:
            detail = process.stderr.read().decode("utf-8", "replace").strip()
            raise RuntimeError(f"git cat-file --batch failed: {detail}")
    except BaseException:
        process.kill()
        process.wait()
        raise
    finally:
        for stream in (process.stdin, process.stdout, process.stderr):
            if stream is not None and not stream.closed:
                stream.close()
    return sorted(
        findings,
        key=lambda row: (
            row["path_hint"],
            row["pattern_id"],
            row["value_sha256"],
            row["object_oid"],
        ),
    )


def _current_tracked_findings(
    root: Path,
    policy: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:
    raw_paths = git_bytes("ls-files", "-z", "--cached", root=root)
    paths = sorted(
        _decode_git_path(raw_path)
        for raw_path in raw_paths.split(b"\0")
        if raw_path
    )
    findings: list[dict[str, Any]] = []
    scanned = 0
    for path in paths:
        absolute = root / path
        try:
            mode = absolute.lstat().st_mode
        except FileNotFoundError as error:
            raise ValueError(f"tracked path is missing during secret scan: {path}") from error
        if stat.S_ISLNK(mode):
            chunks: Any = (os.readlink(absolute).encode("utf-8", "surrogateescape"),)
        elif stat.S_ISREG(mode):
            def file_chunks() -> Any:
                with absolute.open("rb") as handle:
                    while chunk := handle.read(SECRET_SCAN_CHUNK_BYTES):
                        yield chunk

            chunks = file_chunks()
        else:
            continue
        scanned += 1
        file_findings = _scan_secret_chunks(chunks, paths=(path,), policy=policy)
        findings.extend(file_findings)
    return scanned, sorted(
        findings,
        key=lambda row: (row["path_hint"], row["pattern_id"], row["value_sha256"]),
    )


def secret_history_report(root: Path) -> dict[str, Any]:
    policy = load_secret_history_policy(root)
    history_paths, blob_paths = _history_blob_inventory(root)
    forbidden_paths = sorted(
        path
        for path in history_paths
        if any(path.startswith(prefix) for prefix in FORBIDDEN_HISTORY_PREFIXES)
    )
    history_findings = _scan_history_blobs(root, blob_paths, policy)
    current_file_count, current_findings = _current_tracked_findings(root, policy)
    return {
        "history_path_count": len(history_paths),
        "history_blob_count": len(blob_paths),
        "current_file_count": current_file_count,
        "forbidden_history_paths": forbidden_paths,
        "history_findings": history_findings,
        "current_findings": current_findings,
    }


def _finding_summary(findings: list[dict[str, Any]]) -> str:
    samples = [
        f"{row['pattern_id']}:{row['path_hint']}#{row['value_sha256'][:12]}"
        for row in findings[:5]
    ]
    suffix = f" samples={','.join(samples)}" if samples else ""
    return f"count={len(findings)}{suffix}"


def check_secret_history_hygiene(root: Path) -> str:
    report = secret_history_report(root)
    if report["history_blob_count"] == 0 or report["current_file_count"] == 0:
        raise ValueError(
            "scanner_zero: secret history scan must inspect reachable blobs and current tracked files"
        )
    failures: list[str] = []
    forbidden = report["forbidden_history_paths"]
    if forbidden:
        failures.append(
            f"forbidden_history_paths=count={len(forbidden)} samples={','.join(forbidden[:5])}"
        )
    if report["history_findings"]:
        failures.append("history_sensitive_matches=" + _finding_summary(report["history_findings"]))
    if report["current_findings"]:
        failures.append("current_sensitive_matches=" + _finding_summary(report["current_findings"]))
    if failures:
        raise ValueError("secret history hygiene failed: " + "; ".join(failures))
    return (
        "reachable Git history/current tracked secret·PII PASS; "
        f"paths={report['history_path_count']} blobs={report['history_blob_count']} "
        f"current_files={report['current_file_count']}"
    )


def hard_fail_states(manifest: dict[str, Any]) -> set[str]:
    raw = manifest.get("hard_fail_states")
    if not isinstance(raw, list) or not all(isinstance(item, str) and item for item in raw):
        raise ValueError("hard_fail_states must be a non-empty string array")
    configured = set(raw)
    if len(configured) != len(raw):
        raise ValueError("hard_fail_states contains duplicates")
    if configured != EXPECTED_HARD_FAIL_STATES:
        raise ValueError(
            "hard_fail_states mismatch: "
            f"expected={sorted(EXPECTED_HARD_FAIL_STATES)} actual={sorted(configured)}"
        )
    return configured


def validate_audit_manifest_contract(manifest: dict[str, Any]) -> None:
    profiles = manifest.get("profiles")
    if not isinstance(profiles, dict) or set(profiles) != set(EXPECTED_PROFILE_CONTRACTS):
        raise ValueError("audit profile inventory mismatch")
    for profile, expected in EXPECTED_PROFILE_CONTRACTS.items():
        row = profiles.get(profile)
        if not isinstance(row, dict):
            raise ValueError(f"audit profile is invalid: {profile}")
        actual = {
            "proof_level": row.get("proof_level"),
            "inherits": row.get("inherits"),
            "required_checks": row.get("required_checks"),
        }
        if actual != expected:
            raise ValueError(
                f"audit profile contract mismatch: {profile} expected={expected} actual={actual}"
            )
    if manifest.get("optional_live_checks") != [
        "notification.telegram_live_delivery",
        "notification.web_push_live_delivery",
    ]:
        raise ValueError("optional live check inventory mismatch")


def required_checks(manifest: dict[str, Any], profile: str) -> tuple[str, list[str]]:
    profiles = manifest.get("profiles")
    if not isinstance(profiles, dict) or profile not in profiles:
        raise ValueError(f"unknown audit profile: {profile}")
    visiting: set[str] = set()
    visited: set[str] = set()
    ordered: list[str] = []

    def visit(name: str) -> None:
        if name in visiting:
            raise ValueError(f"audit profile inheritance cycle at {name}")
        if name in visited:
            return
        raw = profiles.get(name)
        if not isinstance(raw, dict):
            raise ValueError(f"invalid audit profile: {name}")
        visiting.add(name)
        parent = raw.get("inherits")
        if parent is not None:
            if not isinstance(parent, str) or parent not in profiles:
                raise ValueError(f"unknown parent profile for {name}")
            visit(parent)
        checks = raw.get("required_checks")
        if not isinstance(checks, list) or not all(isinstance(item, str) and item for item in checks):
            raise ValueError(f"invalid required_checks for {name}")
        for check_id in checks:
            if check_id not in ordered:
                ordered.append(check_id)
        visiting.remove(name)
        visited.add(name)

    visit(profile)
    raw_profile = profiles[profile]
    proof_level = raw_profile.get("proof_level")
    if not isinstance(proof_level, str) or not proof_level:
        raise ValueError(f"profile has no proof level: {profile}")
    return proof_level, ordered


def check_constitution(root: Path) -> str:
    path = root / "governance/CONSTITUTION.md"
    text = path.read_text(encoding="utf-8")
    required = (
        "312 operations",
        "일반 게시판 26개",
        "관리자 Shop 26개",
        "전역 `active_site_id`",
        "MIGRATION_STATIC_PASS",
        "Apache-2.0",
    )
    missing = [item for item in required if item not in text]
    if missing:
        raise ValueError("constitution clauses missing: " + ", ".join(missing))
    return "제품·계약·보안·증거 등급 헌법 확인"


def check_destination_state(root: Path) -> str:
    revision = git("rev-parse", "--verify", "HEAD^{commit}", root=root)
    if not is_hex(revision, SHA1_LENGTH):
        raise ValueError("destination HEAD is not a full commit SHA")
    dirty = git("status", "--porcelain", "--untracked-files=all", root=root)
    if dirty:
        raise ValueError("destination worktree is dirty")
    return f"destination clean Git revision {revision} 확인"


def check_product_manifest(root: Path) -> str:
    payload = load_json(root / "PRODUCT_MANIFEST.json")
    if payload.get("product_id") != "g5-fleet" or payload.get("deployment_model") != "self_hosted_server":
        raise ValueError("product identity mismatch")
    editions = payload.get("editions")
    if not isinstance(editions, dict):
        raise ValueError("product editions missing")
    core = editions.get("fleet_core")
    commerce = editions.get("commerce")
    if not isinstance(core, dict) or core.get("pricing") != "free" or core.get("required") is not True:
        raise ValueError("Fleet Core boundary mismatch")
    if core.get("source_license") != "Apache-2.0":
        raise ValueError("Fleet Core license must be Apache-2.0")
    if not isinstance(commerce, dict) or commerce.get("pricing") != "paid" or commerce.get("required") is not False:
        raise ValueError("Commerce boundary mismatch")
    if (
        commerce.get("source_license") != "commercial"
        or commerce.get("sdk_license") != "Apache-2.0"
        or commerce.get("third_party_license_policy") != "independent_per_plugin"
    ):
        raise ValueError("Commerce plugin license boundary mismatch")
    baseline = payload.get("contract_baseline")
    expected = {
        "openapi_operations": 312,
        "openapi_operation_keys_sha256": "ff22a5d1649c9bf81317726f9561b7e1886ebda11b99833628eb9676989f8c62",
        "active_operations": 189,
        "admin_non_shop_operations": 184,
        "bootstrap_operations": 5,
        "protected_board_operations": 26,
        "shop_provider_operations": 26,
    }
    if baseline != expected:
        raise ValueError("product contract baseline mismatch")
    return "Apache Core·독립 Commerce 라이선스 및 exact operation set 312/189/26/26 기준 확인"


def check_license_policy(root: Path) -> str:
    canonical_license = root / "LICENSE"
    canonical_notice = root / "NOTICE"
    if not canonical_license.is_file() or not canonical_notice.is_file():
        raise ValueError("root Apache LICENSE or NOTICE is missing")
    license_text = canonical_license.read_text(encoding="utf-8")
    if (
        "Apache License" not in license_text
        or "Version 2.0, January 2004" not in license_text
        or "END OF TERMS AND CONDITIONS" not in license_text
    ):
        raise ValueError("root LICENSE is not the complete Apache License 2.0 text")

    license_copies = (
        "connectors/gnuboard5-php/LICENSE",
        "products/admin-desktop/LICENSE",
        "products/admin-desktop/g5-admin/LICENSE",
        "plugins/commerce-sdk/LICENSE",
    )
    notice_copies = (
        "connectors/gnuboard5-php/NOTICE",
        "products/admin-desktop/NOTICE",
        "products/admin-desktop/g5-admin/NOTICE",
        "plugins/commerce-sdk/NOTICE",
    )
    for relative in license_copies:
        path = root / relative
        if not path.is_file() or sha256(path) != sha256(canonical_license):
            raise ValueError(f"Apache license copy drifted: {relative}")
    for relative in notice_copies:
        path = root / relative
        if not path.is_file() or sha256(path) != sha256(canonical_notice):
            raise ValueError(f"NOTICE copy drifted: {relative}")

    legacy_proprietary_files = (
        root / "products/admin-desktop/g5-admin/LICENSE-RUNTIME",
        root / "products/admin-desktop/g5-admin/LICENSE-SOURCE",
    )
    if any(path.exists() for path in legacy_proprietary_files):
        raise ValueError("legacy proprietary desktop license files must be absent")

    composer = load_json(root / "connectors/gnuboard5-php/composer.json")
    package = load_json(root / "products/admin-desktop/g5-admin/package.json")
    if composer.get("license") != "Apache-2.0" or package.get("license") != "Apache-2.0":
        raise ValueError("PHP or frontend package license metadata drifted")

    cargo_manifests = sorted((root / "products/admin-desktop").rglob("Cargo.toml"))
    if not cargo_manifests:
        raise ValueError("Rust Cargo manifests are missing")
    for manifest in cargo_manifests:
        text = manifest.read_text(encoding="utf-8")
        if not re.search(r'(?m)^license = "Apache-2\.0"$', text):
            raise ValueError(
                "Rust package license metadata drifted: "
                + str(manifest.relative_to(root))
            )
    return (
        f"Apache-2.0 LICENSE·NOTICE와 PHP·frontend·Rust {len(cargo_manifests)}개 "
        "메타데이터, 독립 플러그인 경계 확인"
    )


def check_provenance(root: Path) -> str:
    payload = load_json(root / "MIGRATION_PROVENANCE.json")
    if payload.get("status") not in {"imported", "verified"}:
        raise ValueError("migration is not imported")
    policy = payload.get("policy")
    if not isinstance(policy, dict):
        raise ValueError("migration policy missing")
    expected_policy = {
        "direction": "one_way",
        "history_strategy": "sanitized_snapshot",
        "require_clean_sources": True,
        "legacy_evidence_certifies_destination": False,
        "private_source_history_reachable": False,
        "sensitive_outputs_imported": False,
    }
    if policy != expected_policy:
        raise ValueError("migration evidence boundary mismatch")
    sources = payload.get("sources")
    if not isinstance(sources, list) or len(sources) != 2:
        raise ValueError("exactly two source repositories are required")
    indexed_sources: dict[str, dict[str, Any]] = {}
    for source in sources:
        if not isinstance(source, dict) or source.get("clean") is not True:
            raise ValueError("source revision is not clean")
        source_id = source.get("id")
        if not isinstance(source_id, str) or source_id in indexed_sources:
            raise ValueError("source ids must be unique strings")
        indexed_sources[source_id] = source
        if not is_hex(source.get("source_commit"), SHA1_LENGTH):
            raise ValueError("source commit is not a full SHA")
        if not is_hex(source.get("source_tree"), SHA1_LENGTH):
            raise ValueError("source tree is not a full SHA")
        if not is_hex(source.get("original_source_commit"), SHA1_LENGTH):
            raise ValueError("original source commit is not a full SHA")
        if not is_hex(source.get("original_source_tree"), SHA1_LENGTH):
            raise ValueError("original source tree is not a full SHA")
        if source["source_commit"] == source["original_source_commit"]:
            raise ValueError("sanitized source commit must differ from private original commit")
        if source["source_tree"] == source["original_source_tree"]:
            raise ValueError("sanitized source tree must differ from private original tree")
        if source.get("original_repository_visibility") != "private_at_migration":
            raise ValueError("original source visibility boundary mismatch")
        excluded = source.get("excluded_output_files")
        if excluded != EXPECTED_EXCLUDED_OUTPUT_FILES.get(source_id):
            raise ValueError(f"excluded sensitive output count mismatch: {source_id}")
        artifacts = source.get("excluded_generated_artifacts")
        if not isinstance(artifacts, list):
            raise ValueError(f"excluded generated artifact inventory missing: {source_id}")
        actual_artifacts: dict[str, str] = {}
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                raise ValueError(f"excluded generated artifact row is invalid: {source_id}")
            path = artifact.get("path")
            sha256 = artifact.get("sha256")
            reason = artifact.get("reason")
            if (
                not isinstance(path, str)
                or not path
                or path.startswith("/")
                or ".." in Path(path).parts
                or path in actual_artifacts
                or not is_hex(sha256, SHA256_LENGTH)
                or not isinstance(reason, str)
                or len(reason.strip()) < 12
            ):
                raise ValueError(f"excluded generated artifact row is unsafe: {source_id}")
            actual_artifacts[path] = sha256
        if actual_artifacts != EXPECTED_EXCLUDED_GENERATED_ARTIFACTS.get(source_id):
            raise ValueError(f"excluded generated artifact inventory mismatch: {source_id}")
        prefix = source.get("destination_prefix")
        if not isinstance(prefix, str) or prefix.startswith("/") or ".." in Path(prefix).parts:
            raise ValueError("unsafe destination prefix")
    actual_destinations = {
        source_id: source["destination_prefix"] for source_id, source in indexed_sources.items()
    }
    if actual_destinations != EXPECTED_SOURCE_DESTINATIONS:
        raise ValueError(
            "source destination mapping mismatch: "
            f"expected={EXPECTED_SOURCE_DESTINATIONS} actual={actual_destinations}"
        )
    actual_roles = {
        source_id: source.get("role") for source_id, source in indexed_sources.items()
    }
    if actual_roles != EXPECTED_SOURCE_ROLES:
        raise ValueError(
            "source role mapping mismatch: "
            f"expected={EXPECTED_SOURCE_ROLES} actual={actual_roles}"
        )
    import_commits = payload.get("import_commits")
    if not isinstance(import_commits, dict) or set(import_commits) != set(EXPECTED_SOURCE_DESTINATIONS):
        raise ValueError("import_commits must map both exact source ids")
    for source_id, commit in import_commits.items():
        if not is_hex(commit, SHA1_LENGTH):
            raise ValueError(f"import commit is not a full SHA: {source_id}")
    return "두 sanitized source revision, private original 비도달 정책, exact destination/import 결속 확인"


def check_upstream_lock(root: Path) -> str:
    payload = load_json(root / "UPSTREAMS.lock.json")
    rows = payload.get("upstreams")
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict):
        raise ValueError("gnuboard5 upstream inventory mismatch")
    upstream = rows[0]
    if upstream.get("version") != "5.6.32" or upstream.get("ref") != "refs/tags/v5.6.32":
        raise ValueError("GnuBoard5 version pin mismatch")
    if not is_hex(upstream.get("commit"), SHA1_LENGTH) or not is_hex(upstream.get("tree"), SHA1_LENGTH):
        raise ValueError("upstream commit/tree must be full SHAs")
    for section in ("version_probe", "license"):
        row = upstream.get(section)
        if not isinstance(row, dict) or not is_hex(row.get("sha256"), SHA256_LENGTH):
            raise ValueError(f"invalid {section} fingerprint")
    return f"GnuBoard5 {upstream['version']} commit·tree·파일 fingerprint 확인"


def check_history(root: Path) -> str:
    payload = load_json(root / "MIGRATION_PROVENANCE.json")
    head = git("rev-parse", "--verify", "HEAD^{commit}", root=root)
    if not is_hex(head, SHA1_LENGTH):
        raise ValueError("destination HEAD is not a full commit SHA")
    dirty = git("status", "--porcelain", "--untracked-files=all", root=root)
    if dirty:
        raise ValueError("destination worktree is dirty")
    import_commits = payload.get("import_commits")
    if not isinstance(import_commits, dict):
        raise ValueError("import_commits missing")
    reachable_commits = set(git("rev-list", "--all", root=root).splitlines())
    for source in payload["sources"]:
        source_id = source["id"]
        commit = source["source_commit"]
        original_commit = source["original_source_commit"]
        if original_commit in reachable_commits:
            raise ValueError(f"private original source commit is reachable: {source_id}")
        original_probe = subprocess.run(
            ("git", "cat-file", "-e", f"{original_commit}^{{commit}}"),
            cwd=root,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if original_probe.returncode == 0:
            raise ValueError(
                f"private original source commit remains in destination object database: {source_id}"
            )
        actual_tree = git("rev-parse", f"{commit}^{{tree}}", root=root)
        if actual_tree != source["source_tree"]:
            raise ValueError(f"source tree mismatch: {source_id}")
        source_parents = git("show", "-s", "--format=%P", commit, root=root).split()
        if source_parents:
            raise ValueError(f"sanitized source snapshot must be a root commit: {source_id}")
        for artifact in source.get("excluded_generated_artifacts", []):
            artifact_probe = subprocess.run(
                ("git", "cat-file", "-e", f"{commit}:{artifact['path']}"),
                cwd=root,
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if artifact_probe.returncode == 0:
                raise ValueError(f"excluded generated artifact remains in source snapshot: {source_id}")
        import_commit = import_commits.get(source_id)
        if not is_hex(import_commit, SHA1_LENGTH):
            raise ValueError(f"import commit missing: {source_id}")
        resolved_import = git("rev-parse", "--verify", f"{import_commit}^{{commit}}", root=root)
        if resolved_import != import_commit:
            raise ValueError(f"import commit mismatch: {source_id}")
        import_parents = git("show", "-s", "--format=%P", import_commit, root=root).split()
        if len(import_parents) != 2 or import_parents[1] != commit:
            raise ValueError(f"sanitized source is not the sole second import parent: {source_id}")
        changed_paths = [
            _decode_git_path(path)
            for path in git_bytes(
                "diff-tree",
                "--no-commit-id",
                "--name-only",
                "-r",
                "-z",
                import_parents[0],
                import_commit,
                root=root,
            ).split(b"\0")
            if path
        ]
        prefix = source["destination_prefix"]
        if not changed_paths or any(
            path != prefix and not path.startswith(prefix + "/") for path in changed_paths
        ):
            raise ValueError(f"import commit changed paths outside destination prefix: {source_id}")
        for ancestor, descendant, detail in (
            (import_commit, head, "import commit is not an ancestor of HEAD"),
        ):
            completed = subprocess.run(
                ("git", "merge-base", "--is-ancestor", ancestor, descendant),
                cwd=root,
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if completed.returncode != 0:
                raise ValueError(f"{detail}: {source_id}")
        imported_tree = git("rev-parse", f"{import_commit}:{prefix}", root=root)
        if imported_tree != source["source_tree"]:
            raise ValueError(
                f"imported subtree mismatch: {source_id} "
                f"expected={source['source_tree']} actual={imported_tree}"
            )
        if not (root / prefix).is_dir():
            raise ValueError(f"destination prefix missing: {prefix}")
    return "private 원본 commit 비도달, sanitized PHP·Rust direct parent/subtree, clean HEAD 도달성 확인"


REQUIRED_TRACKED_PATHS = (
    "connectors/gnuboard5-php/scripts/run_phpunit_coverage.sh",
    "connectors/gnuboard5-php/scripts/fetch_live_admin_config.sh",
    "connectors/gnuboard5-php/scripts/fetch_live_admin_member_detail.sh",
    "connectors/gnuboard5-php/scripts/fetch_live_admin_members.sh",
    "connectors/gnuboard5-php/scripts/fetch_live_admin_schema.sh",
    "connectors/gnuboard5-php/scripts/fetch_local_admin_page.sh",
    "connectors/gnuboard5-php/api/v1/Admin/Shop/Catalog/Repository/AdminShopCatalogStockSmsRepository.php",
    "connectors/gnuboard5-php/api/v1/Admin/Shop/Catalog/Service/AdminShopCatalogStockSmsService.php",
    "products/admin-desktop/specs/integration/ACTIVE_CONSUMER_SCOPE.json",
    "products/admin-desktop/specs/integration/LIVE_DOMAIN_CERTIFICATION.json",
)


def missing_tracked_paths(tracked: set[str], required: tuple[str, ...] = REQUIRED_TRACKED_PATHS) -> list[str]:
    return sorted(path for path in required if path not in tracked)


def check_source_closure(root: Path) -> str:
    tracked = set(git("ls-files", root=root).splitlines())
    missing = missing_tracked_paths(tracked)
    if missing:
        raise ValueError("required sources are untracked: " + ", ".join(missing))
    return f"필수 clean-clone 소스 {len(REQUIRED_TRACKED_PATHS)}개 추적 확인"


def _manifest_dependency_names(path: Path) -> set[str]:
    if path.name == "Cargo.toml":
        text = path.read_text(encoding="utf-8")
        return {
            match.group(1).lower()
            for match in re.finditer(
                r"(?m)^[ \t]*([A-Za-z0-9_-]+)[ \t]*=",
                text,
            )
        }
    payload = load_json(path)
    names: set[str] = set()
    for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        values = payload.get(section)
        if isinstance(values, dict):
            names.update(str(name).lower() for name in values)
    return names


def active_manifest_paths(root: Path) -> list[Path]:
    ignored_parts = {"node_modules", "target", "dist", "coverage", ".cache"}
    manifests: list[Path] = []
    for base in (root / "apps", root / "crates"):
        if not base.is_dir():
            continue
        for pattern in ("Cargo.toml", "package.json"):
            for path in base.rglob(pattern):
                relative_parts = path.relative_to(base).parts
                if not ignored_parts.intersection(relative_parts):
                    manifests.append(path)
    return sorted(set(manifests))


def check_legacy_reference_boundary(root: Path) -> str:
    provenance = load_json(root / "MIGRATION_PROVENANCE.json")
    sources = provenance.get("sources")
    if not isinstance(sources, list):
        raise ValueError("migration source inventory missing")
    legacy = [
        row
        for row in sources
        if isinstance(row, dict) and row.get("id") == "rust-admin"
    ]
    if len(legacy) != 1:
        raise ValueError("legacy Rust reference provenance must have one source")
    if (
        legacy[0].get("role") != "legacy_consumer_reference"
        or legacy[0].get("destination_prefix") != "products/admin-desktop"
    ):
        raise ValueError("legacy Rust source must be reference-only")

    product = load_json(root / "PRODUCT_MANIFEST.json")
    web_delivery = product.get("web_delivery")
    if (
        not isinstance(web_delivery, dict)
        or web_delivery.get("desktop_binary") is not False
        or web_delivery.get("native_wrapper") is not False
    ):
        raise ValueError("product manifest re-enabled a native desktop/wrapper")

    active_manifests = active_manifest_paths(root)
    forbidden: list[str] = []
    for manifest in active_manifests:
        dependencies = _manifest_dependency_names(manifest)
        tauri_dependencies = sorted(
            name
            for name in dependencies
            if name == "tauri"
            or name.startswith("tauri-")
            or name.startswith("@tauri-apps/")
        )
        if tauri_dependencies:
            relative = manifest.relative_to(root).as_posix()
            forbidden.append(f"{relative}:{','.join(tauri_dependencies)}")
    if forbidden:
        raise ValueError(
            "active server/web manifests depend on Tauri: " + "; ".join(forbidden)
        )
    return (
        "legacy Rust/Tauri provenance는 reference-only이며 "
        f"활성 manifest {len(active_manifests)}개 Tauri 의존성 0"
    )


def check_active_workspace_boundary(root: Path) -> str:
    cargo_path = root / "Cargo.toml"
    cargo_lock = root / "Cargo.lock"
    web_package_path = root / "apps/admin-web/package.json"
    web_lock = root / "apps/admin-web/bun.lock"
    for path in (cargo_path, cargo_lock, web_package_path, web_lock):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"active workspace input missing or unsafe: {path.relative_to(root)}")

    cargo = tomllib.loads(cargo_path.read_text(encoding="utf-8"))
    workspace = cargo.get("workspace")
    members = workspace.get("members") if isinstance(workspace, dict) else None
    if not isinstance(members, list) or "apps/admin-server" not in members:
        raise ValueError("active Cargo workspace must include apps/admin-server")
    invalid_members = [
        member
        for member in members
        if not isinstance(member, str)
        or not member
        or member.startswith("products/")
        or not member.startswith(("apps/", "crates/"))
    ]
    if invalid_members:
        raise ValueError(f"active Cargo workspace has invalid members: {invalid_members}")
    workspace_package = cargo.get("workspace", {}).get("package")
    if not isinstance(workspace_package, dict) or workspace_package.get("license") != "Apache-2.0":
        raise ValueError("active Cargo workspace license must be Apache-2.0")

    web_package = load_json(web_package_path)
    if (
        web_package.get("name") != "@g5-fleet/admin-web"
        or web_package.get("license") != "Apache-2.0"
        or web_package.get("packageManager") != "bun@1.3.10"
    ):
        raise ValueError("active Admin Web package identity/toolchain mismatch")
    scripts = web_package.get("scripts")
    required_scripts = {"build", "lint", "test", "typecheck"}
    if not isinstance(scripts, dict) or not required_scripts.issubset(scripts):
        raise ValueError("active Admin Web quality scripts are incomplete")

    active_manifests = active_manifest_paths(root)
    forbidden_dependencies: list[str] = []
    for manifest in active_manifests:
        dependencies = _manifest_dependency_names(manifest)
        tauri = sorted(
            name
            for name in dependencies
            if name == "tauri"
            or name.startswith("tauri-")
            or name.startswith("@tauri-apps/")
        )
        if tauri:
            forbidden_dependencies.append(
                f"{manifest.relative_to(root)}:{','.join(tauri)}"
            )
    if forbidden_dependencies:
        raise ValueError(
            "active workspace contains Tauri dependencies: "
            + "; ".join(forbidden_dependencies)
        )

    tauri_source_hits: list[str] = []
    for base in (root / "apps", root / "crates"):
        if not base.is_dir():
            continue
        for path in base.rglob("*.rs"):
            text = path.read_text(encoding="utf-8")
            if "tauri::" in text or "#[tauri" in text:
                tauri_source_hits.append(path.relative_to(root).as_posix())
    if tauri_source_hits:
        raise ValueError(
            "active Rust source contains Tauri APIs: " + ", ".join(tauri_source_hits)
        )
    return (
        f"active Cargo member {len(members)}개, manifest {len(active_manifests)}개, "
        "Tauri dependency/API 0"
    )


def check_server_scaffold_contract(root: Path) -> str:
    registry_path = root / "apps/admin-server/contracts/routes.json"
    source_path = root / "apps/admin-server/src/lib.rs"
    if not registry_path.is_file() or not source_path.is_file():
        raise ValueError("active server scaffold contract/source is missing")
    registry = load_json(registry_path)
    if registry.get("schema") != "g5-fleet.server-routes/v1":
        raise ValueError("active server route registry schema mismatch")
    routes = registry.get("routes")
    if not isinstance(routes, list):
        raise ValueError("active server route registry is missing")
    actual = [
        (
            row.get("method"),
            row.get("path"),
            row.get("auth"),
            row.get("site_context"),
        )
        for row in routes
        if isinstance(row, dict)
    ]
    expected = [
        ("GET", "/healthz", "public", False),
        ("GET", "/readyz", "public", False),
        ("GET", "/api/v1/meta", "public", False),
        ("GET", "/api/v1/install/status", "public", False),
        ("POST", "/api/v1/install/challenge", "first_run_only", False),
        ("POST", "/api/v1/install/complete", "first_run_challenge", False),
        ("POST", "/api/v1/auth/login", "public", False),
        ("POST", "/api/v1/auth/logout", "session_csrf", False),
        ("POST", "/api/v1/auth/step-up", "session_csrf", False),
        ("GET", "/api/v1/session", "session", False),
        ("GET", "/api/v1/security/settings", "session", False),
        (
            "PUT",
            "/api/v1/security/password",
            "session_csrf_password_totp",
            False,
        ),
        (
            "PUT",
            "/api/v1/security/idle-timeout",
            "session_csrf_step_up",
            False,
        ),
        (
            "POST",
            "/api/v1/security/totp/challenge",
            "session_csrf_step_up",
            False,
        ),
        (
            "POST",
            "/api/v1/security/totp/enable",
            "session_csrf_step_up",
            False,
        ),
        (
            "POST",
            "/api/v1/security/totp/disable",
            "session_csrf",
            False,
        ),
        (
            "POST",
            "/api/v1/security/recovery-codes",
            "session_csrf_step_up",
            False,
        ),
        ("GET", "/api/v1/audit", "session", False),
        ("GET", "/api/v1/activity", "session", False),
        ("GET", "/api/v1/dashboard", "session", False),
        ("GET", "/api/v1/diagnostics/runtime", "session", False),
        (
            "POST",
            "/api/v1/backup/export",
            "session_csrf_step_up",
            False,
        ),
        (
            "POST",
            "/api/v1/backup/import",
            "session_csrf_step_up",
            False,
        ),
        ("POST", "/api/v1/users", "session_csrf", False),
        ("GET", "/api/v1/plugins", "session", False),
        ("GET", "/api/v1/core/registry", "session", False),
        ("GET", "/api/v1/sites", "session", False),
        ("POST", "/api/v1/sites", "session_csrf", False),
        ("GET", "/api/v1/sites/{site_id}", "session", True),
        (
            "PUT",
            "/api/v1/sites/{site_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "PUT",
            "/api/v1/sites/{site_id}/secrets",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/connector/health",
            "session",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/connector/login",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/connector/refresh",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/connector/logout",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/overview", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/dashboard", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/config", "session", True),
        (
            "PUT",
            "/api/v1/sites/{site_id}/admin/config",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/schema", "session", True),
        (
            "GET",
            "/api/v1/sites/{site_id}/admin/schema/{domain}",
            "session",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/member/me", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/auth", "session", True),
        (
            "PUT",
            "/api/v1/sites/{site_id}/admin/auth/{mb_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/auth/{mb_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/admin/permissions",
            "session",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/admin/permissions",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/permissions/{mb_id}/{au_menu}",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/members", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/members/export", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/members/{mb_id}", "session", True),
        (
            "PATCH",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "PATCH",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}/level",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}/icon",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}/icon",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}/image",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/members/{mb_id}/image",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/board-groups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/board-groups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/board-groups/{gr_id}/members/{mb_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/groups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/groups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/groups/{gr_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/groups/{gr_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/groups/{gr_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/groups/{gr_id}/members/{mb_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/boards", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/boards", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/boards/new-posts", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/boards/{bo_table}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/boards/{bo_table}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/boards/{bo_table}", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/boards/{bo_table}/copy", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/contents", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/contents", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/contents/{co_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/contents/{co_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/contents/{co_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/faq-masters", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/faq-masters", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/header-image", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/header-image", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/footer-image", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/footer-image", "session_csrf_step_up", True),
        (
            "GET",
            "/api/v1/sites/{site_id}/admin/faq-masters/{fm_id}/images/{kind}",
            "session",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/faqs", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/faqs", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/faqs/{fa_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/menus", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/menus", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/menus", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/menus/{me_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/menus/{me_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/menus/{me_id}", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/menus/reorder", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/layouts", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/layouts/{page_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/layouts/{page_id}", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets/{widget_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/layouts/{page_id}/widgets/{widget_id}", "session_csrf_step_up", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/layouts/{page_id}/reorder", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/theme", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/theme", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/themes", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/themes/{theme}", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/system/polls", "session", True),
        (
            "POST",
            "/api/v1/sites/{site_id}/admin/system/polls",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/admin/system/polls/{po_id}",
            "session",
            True,
        ),
        (
            "PUT",
            "/api/v1/sites/{site_id}/admin/system/polls/{po_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/system/polls/{po_id}",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/polls", "session", True),
        (
            "POST",
            "/api/v1/sites/{site_id}/admin/polls",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/admin/polls/{po_id}",
            "session",
            True,
        ),
        (
            "PATCH",
            "/api/v1/sites/{site_id}/admin/polls/{po_id}",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/admin/polls/{po_id}",
            "session_csrf_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/admin/system/popups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/system/popups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/system/popups/{nw_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/popups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/popups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/popups/{nw_id}", "session", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/popups/{nw_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/popups/{nw_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/popular", "session", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/popular", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/popular/rank", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/visits/stats", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/visits/search", "session", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/visits", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/reports", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/reports/stats", "session", True),
        ("PATCH", "/api/v1/sites/{site_id}/admin/reports/{report_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/system/qa-config", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/system/qa-config", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/qa", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/write-count/stats", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/mails", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/mails", "session_csrf_step_up_confirm_external", True),
        ("POST", "/api/v1/sites/{site_id}/admin/mails/templates", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/mails/recipients", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/mails/test", "session_csrf_step_up_confirm_external", True),
        ("POST", "/api/v1/sites/{site_id}/admin/mails/test/legacy", "session_csrf_step_up_confirm_external", True),
        ("GET", "/api/v1/sites/{site_id}/admin/mails/{ma_id}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/mails/{ma_id}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/mails/{ma_id}", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/system/mails", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/system/mail-recipients", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/system/mails/test", "session_csrf_step_up_confirm_external", True),
        ("POST", "/api/v1/sites/{site_id}/admin/system/mails/send", "session_csrf_step_up_confirm_external", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/config", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/sms/config", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/member-sync", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/contact-groups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/contact-groups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}", "session_csrf_step_up_confirm_mutation", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}/move", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/contact-groups/{bg_no}/contacts", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts/batch", "session_csrf_step_up_confirm_mutation", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/contacts/import", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts/export", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/contacts/{bk_no}", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/history/batches", "session", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}/resend-failures", "session_csrf_step_up_confirm_external", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/history/batches/{wr_no}/resend-all", "session_csrf_step_up_confirm_external", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/history/deliveries", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/messages", "session_csrf_step_up_confirm_external", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/template-groups", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/template-groups", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}", "session_csrf_step_up_confirm_mutation", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}/move", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/template-groups/{fg_no}/templates", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/templates", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/templates", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/sms/templates/batch", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}", "session", True),
        ("PUT", "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/sms/templates/{fo_no}", "session_csrf_step_up_confirm_mutation", True),
        ("GET", "/api/v1/sites/{site_id}/admin/points", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/points", "session_csrf_step_up", True),
        ("DELETE", "/api/v1/sites/{site_id}/admin/points", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/points/grant", "session_csrf_step_up", True),
        ("POST", "/api/v1/sites/{site_id}/admin/points/deduct", "session_csrf_step_up", True),
        ("GET", "/api/v1/sites/{site_id}/admin/points/summary", "session", True),
        ("POST", "/api/v1/sites/{site_id}/admin/points/expire", "session_csrf_step_up", True),
        (
            "GET",
            "/api/v1/sites/{site_id}/config/basic",
            "session",
            True,
        ),
        (
            "PUT",
            "/api/v1/sites/{site_id}/config/basic",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/core/{operation_id}",
            "session_csrf_risk_step_up",
            True,
        ),
        ("GET", "/api/v1/sites/{site_id}/ssh/profile", "session", True),
        (
            "PUT",
            "/api/v1/sites/{site_id}/ssh/profile",
            "session_csrf_step_up",
            True,
        ),
        (
            "DELETE",
            "/api/v1/sites/{site_id}/ssh/profile",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/ssh/host-key",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/terminal/ticket",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/terminal",
            "session_one_time_ticket",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/sftp",
            "session_csrf_risk_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/transfers/upload",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/transfers/download",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/transfers",
            "session",
            True,
        ),
        (
            "PUT",
            "/api/v1/sites/{site_id}/transfers/config",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/transfers/{job_id}",
            "session",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/transfers/{job_id}/cancel",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/transfers/{job_id}/retry",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/transfers/{job_id}/pause",
            "session_csrf_step_up",
            True,
        ),
        (
            "POST",
            "/api/v1/sites/{site_id}/notifications",
            "session_csrf_step_up",
            True,
        ),
        (
            "GET",
            "/api/v1/sites/{site_id}/notifications/{outbox_id}",
            "session",
            True,
        ),
    ]
    if actual != expected or len(routes) != len(expected):
        raise ValueError(f"active server scaffold route mismatch: {actual}")

    source = source_path.read_text(encoding="utf-8")
    required_tokens = (
        'route("/healthz"',
        'route("/readyz"',
        'nest("/api/v1"',
        'route("/meta"',
        "ServeDir::new",
        "ErrorEnvelope",
    )
    missing = [token for token in required_tokens if token not in source]
    if missing:
        raise ValueError(f"active server scaffold source tokens missing: {missing}")
    return "Axum healthz·readyz·meta, 설치·OTP·감사 API, JSON error envelope, React SPA fallback 확인"


def check_server_vertical_flow(root: Path) -> str:
    paths = {
        "openapi": root / "connectors/gnuboard5-php/api/docs/openapi.yaml",
        "connector": root / "crates/fleet-connector/src/lib.rs",
        "api": root / "apps/admin-server/src/api.rs",
        "server_test": root / "apps/admin-server/tests/http_contract.rs",
        "web_api": root / "apps/admin-web/src/api/fleet.ts",
        "web_flow": root / "apps/admin-web/src/components/VerticalFlow.tsx",
        "web_transport": root / "apps/admin-web/src/transport/browserHttpTransport.ts",
    }
    for label, path in paths.items():
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"vertical flow {label} input is missing or unsafe")

    openapi = paths["openapi"].read_text(encoding="utf-8")
    operation_ids = (
        "operationId: getHealth",
        "operationId: login",
        "operationId: adminGetConfig",
        "operationId: adminUpdateConfig",
    )
    missing_operations = [token for token in operation_ids if token not in openapi]
    if missing_operations:
        raise ValueError(
            f"vertical flow canonical OpenAPI operations missing: {missing_operations}"
        )

    connector = paths["connector"].read_text(encoding="utf-8")
    connector_tokens = (
        "ConnectorGateway",
        "UrlGuard<SystemResolver>",
        "revalidate_before_connect",
        "Policy::none()",
        '"auth/login"',
        '"admin/config"',
        "canonical_health_login_config_update_readback_and_rollback",
    )
    missing_connector = [token for token in connector_tokens if token not in connector]
    if missing_connector:
        raise ValueError(f"vertical flow connector boundary missing: {missing_connector}")

    api = paths["api"].read_text(encoding="utf-8")
    api_tokens = (
        '"/sites/{site_id}/connector/health"',
        '"/sites/{site_id}/connector/login"',
        '"/sites/{site_id}/overview"',
        '"/sites/{site_id}/config/basic"',
        "SecretPurpose::G5Api",
        "decrypt_secret_for_connector",
        "require_recent_step_up",
    )
    missing_api = [token for token in api_tokens if token not in api]
    if missing_api:
        raise ValueError(f"vertical flow server boundary missing: {missing_api}")

    server_test = paths["server_test"].read_text(encoding="utf-8")
    if "authenticated_site_connector_config_roundtrip_and_rollback" not in server_test:
        raise ValueError("vertical flow server roundtrip/rollback test is missing")

    web_api = paths["web_api"].read_text(encoding="utf-8")
    web_flow = paths["web_flow"].read_text(encoding="utf-8")
    web_transport = paths["web_transport"].read_text(encoding="utf-8")
    web_tokens = (
        "connectorHealth",
        "connectorLogin",
        "getSiteOverview",
        "getBasicConfig",
        "updateBasicConfig",
    )
    missing_web = [token for token in web_tokens if token not in web_api or token not in web_flow]
    if missing_web:
        raise ValueError(f"vertical flow web consumer missing: {missing_web}")
    if 'headers.set("x-csrf-token"' not in web_transport or 'credentials: "same-origin"' not in web_transport:
        raise ValueError("vertical flow web transport must keep CSRF and same-origin credentials")
    for forbidden in ("localStorage", "sessionStorage", "invoke("):
        if forbidden in web_api or forbidden in web_flow or forbidden in web_transport:
            raise ValueError(f"vertical flow web consumer contains forbidden token: {forbidden}")

    return (
        "canonical health·login·config 4연산, site-bound Axum, encrypted Connector token, "
        "same-origin React 수정·재조회·원복 흐름 확인"
    )


def check_remote_ssh_sftp_boundary(root: Path) -> str:
    paths = {
        "remote": root / "crates/fleet-remote/src/lib.rs",
        "api": root / "apps/admin-server/src/api.rs",
        "server_test": root / "apps/admin-server/tests/http_contract.rs",
        "web_api": root / "apps/admin-web/src/api/fleet.ts",
        "web_component": root / "apps/admin-web/src/components/RemoteWorkspace.tsx",
        "ssh_page": root / "apps/admin-web/src/features/server-ssh/SiteSshSessionPage.tsx",
        "ssh_surface": root / "apps/admin-web/src/features/server-ssh/SiteSshXtermSurface.tsx",
        "sftp_page": root / "apps/admin-web/src/features/server-files/SiteSftpBrowserPage.tsx",
        "sftp_list": root / "apps/admin-web/src/features/server-files/SiteSftpBrowserList.tsx",
        "sftp_tree": root / "apps/admin-web/src/features/server-files/SiteSftpDirectoryTree.tsx",
        "sftp_details": root / "apps/admin-web/src/features/server-files/SiteSftpEntryDetailsCard.tsx",
        "sftp_test": root / "apps/admin-web/src/features/server-files/SiteSftpBrowserPage.test.tsx",
        "ssh_test": root / "apps/admin-web/src/features/server-ssh/SiteSshSessionPage.test.tsx",
        "web_package": root / "apps/admin-web/package.json",
        "web_test": root / "apps/admin-web/src/api/fleet.test.ts",
        "runtime_test": root / "crates/fleet-remote/tests/runtime_certification.rs",
        "runtime_tool": root / "tools/certification/remote_runtime_smoke.py",
    }
    for label, path in paths.items():
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"remote {label} input is missing or unsafe")

    remote = paths["remote"].read_text(encoding="utf-8")
    remote_tokens = (
        'const SSH_BINARY: &str = "/usr/bin/ssh"',
        'const SFTP_BINARY: &str = "/usr/bin/sftp"',
        'const SSH_KEYSCAN_BINARY: &str = "/usr/bin/ssh-keyscan"',
        "StrictHostKeyChecking=yes",
        "UserKnownHostsFile=",
        "GlobalKnownHostsFile=/dev/null",
        "HostKeyAlias=",
        "resolve_host_port",
        "revalidate_before_connect",
        "UrlGuard::managed_remote",
        "kill_on_drop(true)",
        "token_hash(&ticket)",
        ".remove(&token_hash(ticket))",
        "validate_remote_path",
        "transfer_jobs_are_persistent_owned_and_controls_abort_running_work",
        "upload_cancellable",
        "signal_control",
        "terminal_ticket_is_single_use_and_owner_site_bound",
        "pub enum SftpEntryKind",
        "pub struct SftpEntry",
        "parse_sftp_listing",
        "listed_path.starts_with('/')",
        "sftp_listing_is_parsed_into_browser_entries_without_losing_spaces",
    )
    missing_remote = [token for token in remote_tokens if token not in remote]
    if missing_remote:
        raise ValueError(f"remote OpenSSH boundary missing: {missing_remote}")
    if 'Command::new("' in remote or '.arg("-c")' in remote:
        raise ValueError("remote process execution must use fixed binaries without a shell")

    api = paths["api"].read_text(encoding="utf-8")
    api_tokens = (
        '"/sites/{site_id}/ssh/profile"',
        '"/sites/{site_id}/ssh/host-key"',
        '"/sites/{site_id}/terminal/ticket"',
        '"/sites/{site_id}/terminal"',
        '"/sites/{site_id}/sftp"',
        '"/sites/{site_id}/transfers/upload"',
        '"/sites/{site_id}/transfers/download"',
        '"/sites/{site_id}/transfers/config"',
        '"/sites/{site_id}/transfers/{job_id}/pause"',
        "SecretPurpose::Ssh",
        "terminal_ticket_protocol",
        "relay_terminal",
        "body.into_data_stream()",
        "Body::from_stream",
        "owned_site_context",
        "require_recent_step_up",
    )
    missing_api = [token for token in api_tokens if token not in api]
    if missing_api:
        raise ValueError(f"remote Axum boundary missing: {missing_api}")

    web_api = paths["web_api"].read_text(encoding="utf-8")
    web_component = paths["web_component"].read_text(encoding="utf-8")
    ssh_page = paths["ssh_page"].read_text(encoding="utf-8")
    ssh_surface = paths["ssh_surface"].read_text(encoding="utf-8")
    sftp_page = paths["sftp_page"].read_text(encoding="utf-8")
    sftp_list = paths["sftp_list"].read_text(encoding="utf-8")
    sftp_tree = paths["sftp_tree"].read_text(encoding="utf-8")
    sftp_details = paths["sftp_details"].read_text(encoding="utf-8")
    sftp_test = paths["sftp_test"].read_text(encoding="utf-8")
    ssh_test = paths["ssh_test"].read_text(encoding="utf-8")
    web_package = paths["web_package"].read_text(encoding="utf-8")
    web_test = paths["web_test"].read_text(encoding="utf-8")
    web_tokens = (
        "openTerminalSocket",
        "g5-fleet-terminal",
        "ticket.${ticket}",
        "credentials: \"same-origin\"",
        "uploadSftpFile",
        "downloadSftpFile",
    )
    if any(token not in web_api for token in web_tokens):
        raise ValueError("remote Admin Web transport boundary is incomplete")
    if (
        "RemoteWorkspace" not in web_component
        or "SiteSshSessionPage" not in web_component
        or "SiteSftpBrowserPage" not in web_component
        or "setPrivateKey(\"\")" not in ssh_page
        or "known_hosts: inspection.known_hosts_line" not in ssh_page
        or "이 서버 키 지문을 신뢰" not in ssh_page
    ):
        raise ValueError("remote Admin Web secret-clearing workflow is incomplete")
    for token in (
        "SFTP 파일 브라우저",
        "SFTP 전송 큐",
        "setTransferConcurrency",
        "pauseTransfer",
        "retryTransfer",
        "SFTP 텍스트 편집기",
    ):
        if token not in sftp_page:
            raise ValueError(f"remote Admin Web SFTP workflow missing: {token}")
    sftp_workspace_tokens = (
        ("SiteSftpBrowserList", sftp_page),
        ("SiteSftpDirectoryTree", sftp_page),
        ("SiteSftpEntryDetailsCard", sftp_page),
        ("sortSftpEntries", sftp_list),
        ("onOpenDirectory", sftp_list),
        ("buildPathAncestors", sftp_tree),
        ("SFTP 선택 항목 상세", sftp_details),
        ("resubmits browser bytes after an authorized failed upload retry", sftp_test),
        ('name: "index.php"', sftp_test),
        ('kind: "directory"', sftp_test),
    )
    for token, source in sftp_workspace_tokens:
        if token not in source:
            raise ValueError(f"remote Admin Web structured SFTP workspace missing: {token}")
    ssh_workspace_tokens = (
        ("SiteSshXtermSurface", ssh_page),
        ("keepConnected", ssh_page),
        ("reconnectAttempts.current >= 3", ssh_page),
        ("작업면 최대화", ssh_page),
        ("빠른 명령", ssh_page),
        ('import("xterm")', ssh_surface),
        ("FitAddon", ssh_surface),
        ("ResizeObserver", ssh_surface),
        ("server-ready", ssh_test),
        ("현재 경로", ssh_test),
        ('"xterm": "5.3.0"', web_package),
        ('"@xterm/addon-fit": "0.11.0"', web_package),
    )
    for token, source in ssh_workspace_tokens:
        if token not in source:
            raise ValueError(f"remote Admin Web xterm workspace missing: {token}")
    if (
        "not.toContain(\"one-time-secret\")" not in web_test
        or "ticket.one-time-secret" not in web_test
    ):
        raise ValueError("terminal ticket URL-exclusion test is missing")
    for forbidden in ("localStorage", "sessionStorage", "file://", "invoke("):
        if any(
            forbidden in source
            for source in (web_api, web_component, ssh_page, sftp_page)
        ):
            raise ValueError(f"remote web consumer contains forbidden token: {forbidden}")

    server_test = paths["server_test"].read_text(encoding="utf-8")
    if (
        "strict_known_hosts" not in server_test
        or 'assert!(!ssh_profile_text.contains("PRIVATE KEY"))' not in server_test
    ):
        raise ValueError("remote server secret redaction test is missing")
    runtime_test = paths["runtime_test"].read_text(encoding="utf-8")
    runtime_tool = paths["runtime_tool"].read_text(encoding="utf-8")
    for token in (
        "managed_remote_survives_terminal_interrupt_reconnect_and_sftp_roundtrip",
        "open terminal before interruption",
        "reconnect terminal",
        "list structured remote directory",
        "directory.entries.iter()",
        "download over product SFTP executor",
        "pause running upload",
        "RemoteError::Cancelled",
        "delete remote fixture directory",
    ):
        if token not in runtime_test:
            raise ValueError(f"remote runtime certification test missing: {token}")
    if "LOCAL_RUNTIME_PASS" not in runtime_tool or "secrets_recorded" not in runtime_tool:
        raise ValueError("remote runtime certification receipt contract is incomplete")
    return (
        "server-owned SSH/SFTP, strict host key·DNS pin, hash-only one-time WebSocket ticket, "
        "site-bound streaming·persistent transfer state·실행 process 중단 확인"
    )


def _core_registry(root: Path) -> dict[str, Any]:
    contract = root / "contracts/core-operations.json"
    web_contract = root / "apps/admin-web/src/generated/core-operations.json"
    generator = root / "tools/codegen/generate_core_contract.py"
    for path in (contract, web_contract, generator):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Core registry input missing or unsafe: {path.relative_to(root)}")
    run_checked(
        sys.executable,
        str(generator),
        "--check",
        root=root,
        timeout_seconds=60,
    )
    if contract.read_bytes() != web_contract.read_bytes():
        raise ValueError("Rust/server and Admin Web Core registry bytes differ")
    payload = load_json(contract)
    if payload.get("schema") != "g5-fleet.core-operations/v1":
        raise ValueError("Core registry schema mismatch")
    source = payload.get("source")
    if not isinstance(source, dict):
        raise ValueError("Core registry source binding missing")
    expected_sources = {
        "openapi_sha256": sha256(root / "connectors/gnuboard5-php/api/docs/openapi.yaml"),
        "scope_sha256": sha256(
            root / "connectors/gnuboard5-php/api/docs/openapi.phase1-consumer-scope.json"
        ),
    }
    for key, expected in expected_sources.items():
        if source.get(key) != expected:
            raise ValueError(f"Core registry source fingerprint mismatch: {key}")
    return payload


def check_server_route_registry(root: Path) -> str:
    payload = _core_registry(root)
    counts = payload.get("counts")
    expected_counts = {
        "active": 189,
        "admin_non_shop": 184,
        "bootstrap": 5,
        "shop": 0,
        "schema_domains": 17,
    }
    if not isinstance(counts, dict) or any(
        counts.get(key) != value for key, value in expected_counts.items()
    ):
        raise ValueError(f"Core registry counts mismatch: {counts}")
    operations = payload.get("operations")
    if not isinstance(operations, list) or len(operations) != 189:
        raise ValueError("Core operation registry must contain exact 189 rows")
    active_key_hash = operation_set_sha256(
        {f"{row['method']} {row['path']}" for row in operations}
    )
    if payload["source"].get("active_operation_keys_sha256") != active_key_hash:
        raise ValueError("Core active operation key fingerprint mismatch")
    actual = {
        (
            row.get("method"),
            row.get("path"),
            row.get("operation_id"),
        )
        for row in operations
        if isinstance(row, dict)
    }
    manifest = load_json(
        root / "connectors/gnuboard5-php/api/docs/openapi.contract-manifest.json"
    )
    scope = load_json(
        root / "connectors/gnuboard5-php/api/docs/openapi.phase1-consumer-scope.json"
    )
    bootstrap = {
        (row["method"].upper(), row["path"])
        for row in scope["active_scope"]["include_operations"]
    }
    expected = {
        (row["method"], row["path"], row["operation_id"])
        for row in manifest["operations"]
        if (
            row["path"].startswith("/admin/")
            and not row["path"].startswith("/admin/shop/")
        )
        or (row["method"], row["path"]) in bootstrap
    }
    if actual != expected or len(actual) != 189:
        raise ValueError("Core operation registry drifted from canonical active 189 set")
    specialized = {
        row["operation_id"]
        for row in operations
        if row.get("transport") == "specialized"
    }
    if specialized != {"getHealth", "login", "logout", "refreshToken"}:
        raise ValueError(f"Core specialized operation boundary mismatch: {specialized}")
    external = {
        row["operation_id"]
        for row in operations
        if row.get("risk") == "external_effect"
    }
    expected_external = {
        "adminCreateMailTest",
        "adminSendMail",
        "adminSendTestMail",
        "adminSendPush",
        "adminCreateSmsMessage",
        "adminResendAllSmsBatch",
        "adminResendSmsFailures",
        "adminSystemSendMemberMail",
        "adminSystemSendMailTest",
    }
    if external != expected_external:
        raise ValueError(f"Core external-effect boundary mismatch: {external}")
    connector = (root / "crates/fleet-connector/src/lib.rs").read_text(encoding="utf-8")
    api = (root / "apps/admin-server/src/api.rs").read_text(encoding="utf-8")
    tests = (root / "apps/admin-server/tests/http_contract.rs").read_text(
        encoding="utf-8"
    )
    connector_tokens = (
        "CORE_REGISTRY_JSON",
        "pub fn core_operations",
        "pub fn core_operation",
        "validate_core_request",
        "revalidate_before_connect",
        "multipart_form",
        "ExternalEffectBlocked",
        "req-core-config-readback",
        "req-core-config-rollback",
    )
    api_tokens = (
        '"/core/registry"',
        '"/sites/{site_id}/core/{operation_id}"',
        '"/sites/{site_id}/connector/refresh"',
        '"/sites/{site_id}/connector/logout"',
        "owned_site_context",
        "require_recent_step_up",
        "external_effect_blocked",
    )
    if any(token not in connector for token in connector_tokens):
        raise ValueError("Core Rust connector registry/execution boundary incomplete")
    if any(token not in api for token in api_tokens):
        raise ValueError("Core Axum site-bound registry/execution route incomplete")
    if (
        "registry.as_array().map(Vec::len), Some(189)" not in tests
        or "adminListMembers" not in tests
        or "external_effect_blocked" not in tests
    ):
        raise ValueError("Core Axum registry/proxy policy tests incomplete")
    return (
        "canonical active 189 = admin 184 + bootstrap 5, Shop 0; "
        "site-bound Rust registry/proxy와 외부효과 9개 routine 차단 확인"
    )


def check_web_transport_registry(root: Path) -> str:
    payload = _core_registry(root)
    module = (root / "apps/admin-web/src/generated/coreOperations.ts").read_text(
        encoding="utf-8"
    )
    api = (root / "apps/admin-web/src/api/fleet.ts").read_text(encoding="utf-8")
    console = (root / "apps/admin-web/src/components/CoreDomainConsole.tsx").read_text(
        encoding="utf-8"
    )
    flow = (root / "apps/admin-web/src/components/VerticalFlow.tsx").read_text(
        encoding="utf-8"
    )
    required_module = (
        "CoreOperation",
        "CoreSchema",
        "CoreSchemaDomain",
        "coreRegistry",
        "coreOperationById",
    )
    required_api = (
        "getCoreRegistry",
        "executeCoreOperation",
        "connectorRefresh",
        "connectorLogout",
        "csrfToken",
    )
    required_console = (
        "coreRegistry.operations",
        "serverOperations",
        "executeCoreOperation",
        "confirm_destructive",
        "operation.transport",
        'operation.risk === "external_effect"',
    )
    if any(token not in module for token in required_module):
        raise ValueError("Admin Web generated Core registry types incomplete")
    if any(token not in api for token in required_api):
        raise ValueError("Admin Web Core same-origin transport incomplete")
    if any(token not in console for token in required_console):
        raise ValueError("Admin Web Core operation consumer incomplete")
    if "CoreDomainConsole" not in flow:
        raise ValueError("Admin Web Core console is not connected to the site flow")
    if payload["counts"]["active"] != 189:
        raise ValueError("Admin Web Core registry active count mismatch")
    for forbidden in ("localStorage", "sessionStorage", "invoke(", "https://g5"):
        if forbidden in module or forbidden in api or forbidden in console:
            raise ValueError(f"Admin Web Core consumer contains forbidden token: {forbidden}")
    return "React generated registry 189개와 same-origin site-bound 실행 transport 연결 확인"


def check_web_field_consumption(root: Path) -> str:
    payload = _core_registry(root)
    schemas = payload.get("schemas")
    domains = payload.get("schema_domains")
    if not isinstance(schemas, list) or not schemas:
        raise ValueError("Core schema registry is empty")
    if not isinstance(domains, list) or len(domains) != 17:
        raise ValueError("Core schema domain registry must contain exact 17 domains")
    actual_domains = {
        row.get("domain") for row in domains if isinstance(row, dict)
    }
    if actual_domains != EXPECTED_RUST_SCHEMA_DOMAINS:
        raise ValueError(f"Core schema domain set mismatch: {actual_domains}")
    for row in domains:
        if (
            not isinstance(row, dict)
            or not row.get("operation_ids")
            or not row.get("schema_refs")
            or not row.get("fields")
            or row.get("field_count") != len(row["fields"])
        ):
            raise ValueError(f"Core schema domain field parity is incomplete: {row}")
    console = (root / "apps/admin-web/src/components/CoreDomainConsole.tsx").read_text(
        encoding="utf-8"
    )
    for token in (
        "operation.request_fields",
        "operation.response_fields",
        "schemaDomain.fields",
        "schemaDomain.field_count",
        "parseObject",
    ):
        if token not in console:
            raise ValueError(f"Admin Web field consumer token missing: {token}")
    return (
        f"OpenAPI 연결 schema {len(schemas)}개와 17-domain generated field parity·"
        "React request/response 소비 확인"
    )


def check_security_site_context(root: Path) -> str:
    api = (root / "apps/admin-server/src/api.rs").read_text(encoding="utf-8")
    connector = (root / "crates/fleet-connector/src/lib.rs").read_text(encoding="utf-8")
    if "Path((site_id, operation_id))" not in api:
        raise ValueError("Core proxy route does not extract explicit site_id")
    core_handler = api[api.index("async fn core_execute(") : api.index("async fn owned_site_context(")]
    for token in (
        "owned_site_context",
        "&site.base_url",
        "&context.request_id",
        "&credentials.access_token",
    ):
        if token not in core_handler:
            raise ValueError(f"Core proxy site context token missing: {token}")
    if "active_site_id" in api or "active_site_id" in connector:
        raise ValueError("global active_site_id is forbidden")
    return "Core 189 proxy가 명시적 principal·site_id·request_id·site-owned secret에 귀속"


def check_security_csrf(root: Path) -> str:
    api = (root / "apps/admin-server/src/api.rs").read_text(encoding="utf-8")
    web = (root / "apps/admin-web/src/api/fleet.ts").read_text(encoding="utf-8")
    handler = api[api.index("async fn core_execute(") : api.index("async fn owned_site_context(")]
    if "owned_site_context(&state, &headers, site_id, true)" not in handler:
        raise ValueError("Core proxy must use mutation CSRF context")
    if "operation.requires_step_up" not in handler or "require_recent_step_up" not in handler:
        raise ValueError("Core proxy risk-based step-up is missing")
    if "csrfToken" not in web or "executeCoreOperation" not in web:
        raise ValueError("Core web transport does not attach CSRF")
    return "Core proxy POST 전 구간 CSRF, write·delete risk 기반 step-up 확인"


def check_security_ssrf(root: Path) -> str:
    connector = (root / "crates/fleet-connector/src/lib.rs").read_text(encoding="utf-8")
    required = (
        "UrlGuard<SystemResolver>",
        "resolve_initial",
        "revalidate_before_connect",
        "Policy::none()",
        "builder.resolve",
        "core_url",
    )
    missing = [token for token in required if token not in connector]
    if missing:
        raise ValueError(f"Core connector SSRF/DNS/redirect guard missing: {missing}")
    return "Core 189 outbound가 public-IP DNS pin·직전 재검증·redirect 차단을 공통 적용"


def check_web_transport_boundary(root: Path) -> str:
    transport_path = root / "apps/admin-web/src/transport/browserHttpTransport.ts"
    contract_path = root / "apps/admin-web/src/transport/contracts.ts"
    system_path = root / "apps/admin-web/src/api/system.ts"
    for path in (transport_path, contract_path, system_path):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Admin Web transport source missing or unsafe: {path}")
    transport = transport_path.read_text(encoding="utf-8")
    contract = contract_path.read_text(encoding="utf-8")
    system = system_path.read_text(encoding="utf-8")
    required_transport_tokens = (
        'credentials: "same-origin"',
        'redirect: "error"',
        "cross_origin_forbidden",
        "endpoint.origin !== this.browserOrigin",
    )
    missing = [token for token in required_transport_tokens if token not in transport]
    if missing:
        raise ValueError(f"Admin Web same-origin transport guards missing: {missing}")
    if "interface HttpTransport" not in contract or "interface ErrorEnvelope" not in contract:
        raise ValueError("Admin Web typed transport/error envelope contract is incomplete")
    if (
        'new BrowserHttpTransport("/api/v1")' not in system
        or 'path: "/healthz"' not in system
    ):
        raise ValueError("Admin Web system API is not bound to the Fleet server")

    forbidden_hits: list[str] = []
    web_source = root / "apps/admin-web/src"
    for path in web_source.rglob("*"):
        if (
            not path.is_file()
            or path.name.endswith((".test.ts", ".test.tsx"))
            or path.suffix not in {".ts", ".tsx"}
        ):
            continue
        text = path.read_text(encoding="utf-8")
        if "@tauri-apps/" in text or "invoke(" in text:
            forbidden_hits.append(path.relative_to(root).as_posix())
    if forbidden_hits:
        raise ValueError(
            "Admin Web source contains desktop bridge calls: " + ", ".join(forbidden_hits)
        )
    return "typed same-origin HTTP transport와 Tauri invoke·원격 G5 직접 호출 금지 경계 확인"


def check_sqlite_durability(root: Path) -> str:
    migration = root / "crates/fleet-store/migrations/0001_control_plane.sql"
    source = root / "crates/fleet-store/src/lib.rs"
    backup = root / "crates/fleet-store/src/backup.rs"
    failures = root / "crates/fleet-store/tests/durability.rs"
    server = root / "apps/admin-server/src/main.rs"
    for path in (migration, source, backup, failures, server):
        if not path.is_file() or path.is_symlink():
            raise ValueError(
                f"SQLite durability source missing or unsafe: {path.relative_to(root)}"
            )
    migration_text = migration.read_text(encoding="utf-8")
    required_tables = (
        "installation_metadata",
        "fleet_users",
        "web_sessions",
        "sites",
        "encrypted_secrets",
        "notification_outbox",
        "jobs",
        "audit_log",
    )
    missing_tables = [
        table
        for table in required_tables
        if f"CREATE TABLE {table}" not in migration_text
    ]
    if missing_tables:
        raise ValueError(f"SQLite base tables missing: {missing_tables}")

    source_text = source.read_text(encoding="utf-8")
    for token in (
        "SqliteJournalMode::Wal",
        "SqliteSynchronous::Full",
        ".foreign_keys(true)",
        "BUSY_TIMEOUT_MILLIS",
        "connect_database(&database_path, false)",
        ".create_if_missing(create)",
        "PRAGMA quick_check",
        "InstallationLocked",
    ):
        if token not in source_text:
            raise ValueError(f"SQLite fail-closed token missing: {token}")

    backup_text = backup.read_text(encoding="utf-8")
    for token in (
        'sqlx::query("VACUUM INTO ?")',
        "snapshot_sha256",
        "verify_snapshot",
        "restore_verified_backup",
        "readback",
    ):
        if token not in backup_text:
            raise ValueError(f"SQLite backup token missing: {token}")

    failures_text = failures.read_text(encoding="utf-8")
    for token in (
        "uncommitted_transaction_is_rolled_back_after_process_kill",
        "failed_migration_rolls_back_without_advancing_schema",
        "disk_full_write_rolls_back_and_database_reopens",
        "corrupted_page_fails_closed_without_replacing_database",
        "verified_backup_restores_critical_rows_to_separate_directory",
    ):
        if token not in failures_text:
            raise ValueError(f"SQLite failure test missing: {token}")
    if "FleetStore::open_existing" not in server.read_text(encoding="utf-8"):
        raise ValueError("server startup does not open the existing Fleet store")
    return "SQLite WAL·FULL·FK, fail-closed startup, 장애 4종과 checksum backup·restore readback 확인"


def check_auth_site_boundary(root: Path) -> str:
    api = root / "apps/admin-server/src/api.rs"
    main = root / "apps/admin-server/src/main.rs"
    auth = root / "crates/fleet-security/src/auth.rs"
    ssrf = root / "crates/fleet-security/src/ssrf.rs"
    tests = root / "crates/fleet-security/tests/security_boundary.rs"
    for path in (api, main, auth, ssrf, tests):
        if not path.is_file() or path.is_symlink():
            raise ValueError(
                f"auth/site security source missing or unsafe: {path.relative_to(root)}"
            )
    api_text = api.read_text(encoding="utf-8")
    for token in (
        "HttpOnly; Secure; SameSite=Strict",
        "CSRF_HEADER",
        "RequestContext",
        "require_recent_step_up",
        'Path(site_id): Path<String>',
    ):
        if token not in api_text:
            raise ValueError(f"auth/site HTTP boundary missing: {token}")
    auth_text = auth.read_text(encoding="utf-8")
    for token in (
        "Argon2::default()",
        "Aes256Gcm",
        "ct_eq",
        "complete_install",
        "login_with_factor",
        "decrypt_secret_for_connector",
        "secret_aad",
    ):
        if token not in auth_text:
            raise ValueError(f"auth/secret boundary missing: {token}")
    if "G5_FLEET_MASTER_KEY_BASE64" not in main.read_text(encoding="utf-8"):
        raise ValueError("server master key startup boundary is missing")
    ssrf_text = ssrf.read_text(encoding="utf-8")
    for token in (
        "validate_public_ip",
        "revalidate_before_connect",
        "DnsRebinding",
        "RedirectForbidden",
        "is_link_local",
        "is_unique_local",
    ):
        if token not in ssrf_text:
            raise ValueError(f"SSRF boundary missing: {token}")
    tests_text = tests.read_text(encoding="utf-8")
    for token in (
        "two_users_two_sites_sessions_csrf_and_secrets_are_isolated",
        "ssrf_metadata_redirect_and_dns_rebinding_are_rejected",
    ):
        if token not in tests_text:
            raise ValueError(f"security isolation test missing: {token}")
    active_site_hits: list[str] = []
    for base in (root / "apps", root / "crates"):
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in {".rs", ".ts", ".tsx"}:
                if "active_site_id" in path.read_text(encoding="utf-8"):
                    active_site_hits.append(path.relative_to(root).as_posix())
    if active_site_hits:
        raise ValueError(
            "global active_site_id is forbidden in active code: "
            + ", ".join(active_site_hits)
        )
    return "Argon2id session·CSRF·step-up, AES-GCM site secret, 2-user×2-site 격리와 SSRF/DNS rebinding 차단 확인"


def operation_set_sha256(operation_keys: set[str]) -> str:
    return hashlib.sha256("\n".join(sorted(operation_keys)).encode("utf-8")).hexdigest()


def validate_operation_rows(
    operations: object,
    *,
    expected_total: int,
    expected_keys_sha256: str,
) -> list[str]:
    if not isinstance(operations, list) or not operations:
        raise ValueError("OpenAPI operation scanner returned zero")
    operation_keys: set[str] = set()
    operation_ids: set[str] = set()
    paths: list[str] = []
    for index, row in enumerate(operations):
        if not isinstance(row, dict):
            raise ValueError(f"OpenAPI operation row {index} is not an object")
        method = row.get("method")
        path = row.get("path")
        operation_id = row.get("operation_id")
        if (
            not isinstance(method, str)
            or not method
            or method != method.upper()
            or not isinstance(path, str)
            or not path.startswith("/")
            or not isinstance(operation_id, str)
            or not operation_id
        ):
            raise ValueError(f"OpenAPI operation row {index} has an invalid identity")
        key = f"{method} {path}"
        if key in operation_keys:
            raise ValueError(f"duplicate OpenAPI method/path: {key}")
        if operation_id in operation_ids:
            raise ValueError(f"duplicate OpenAPI operation_id: {operation_id}")
        operation_keys.add(key)
        operation_ids.add(operation_id)
        paths.append(path)
    if len(operation_keys) != expected_total:
        raise ValueError(
            f"OpenAPI exact operation count mismatch: expected={expected_total} actual={len(operation_keys)}"
        )
    actual_hash = operation_set_sha256(operation_keys)
    if actual_hash != expected_keys_sha256:
        raise ValueError(
            "OpenAPI exact operation set mismatch: "
            f"expected={expected_keys_sha256} actual={actual_hash}"
        )
    return paths


def contract_counts(root: Path) -> dict[str, int | str]:
    connector = root / "connectors/gnuboard5-php"
    baseline = load_json(root / "PRODUCT_MANIFEST.json")["contract_baseline"]
    expected_total = baseline.get("openapi_operations")
    expected_keys_sha256 = baseline.get("openapi_operation_keys_sha256")
    if not isinstance(expected_total, int) or not is_hex(expected_keys_sha256, SHA256_LENGTH):
        raise ValueError("product exact operation baseline is invalid")
    manifest = load_json(connector / "api/docs/openapi.contract-manifest.json")
    operations = manifest.get("operations")
    paths = validate_operation_rows(
        operations,
        expected_total=expected_total,
        expected_keys_sha256=expected_keys_sha256,
    )
    stats = manifest.get("stats")
    if not isinstance(stats, dict) or stats.get("operation_count") != expected_total:
        raise ValueError("OpenAPI manifest stats operation_count mismatch")
    shop = sum(path.startswith("/admin/shop/") for path in paths)
    admin = sum(path.startswith("/admin/") for path in paths)
    scope = load_json(connector / "api/docs/openapi.phase1-consumer-scope.json")
    inventory = scope.get("contract_inventory")
    if not isinstance(inventory, dict):
        raise ValueError("provider contract inventory missing")
    classifications = inventory.get("expected_classification_counts")
    if not isinstance(classifications, dict):
        raise ValueError("provider classification inventory missing")
    if inventory.get("expected_total_operations") != expected_total:
        raise ValueError("provider expected_total_operations mismatch")
    if inventory.get("expected_operation_keys_sha256") != expected_keys_sha256:
        raise ValueError("provider expected_operation_keys_sha256 mismatch")
    if classifications != EXPECTED_CLASSIFICATION_COUNTS:
        raise ValueError(
            "provider classification counts mismatch: "
            f"expected={EXPECTED_CLASSIFICATION_COUNTS} actual={classifications}"
        )
    active = classifications["active"]
    admin_non_shop = admin - shop
    return {
        "openapi_operations": len(operations),
        "openapi_operation_keys_sha256": operation_set_sha256(
            {f"{row['method']} {row['path']}" for row in operations}
        ),
        "active_operations": active,
        "admin_non_shop_operations": admin_non_shop,
        "bootstrap_operations": active - admin_non_shop,
        "protected_board_operations": classifications["deferred_general_board"],
        "shop_provider_operations": shop,
    }


def check_contract_inventory(root: Path) -> str:
    connector = root / "connectors/gnuboard5-php"
    composed = root / ".cache/composed/gnuboard5-php"
    run_checked(
        "bash",
        "scripts/docs-check.sh",
        "--provider-contract-only",
        root=composed,
        timeout_seconds=300,
    )
    if sha256(composed / "api/docs/openapi.yaml") != sha256(connector / "api/docs/openapi.yaml"):
        raise ValueError("composed OpenAPI drifted from canonical connector OpenAPI")
    if sha256(composed / "api/docs/openapi.contract-manifest.json") != sha256(
        connector / "api/docs/openapi.contract-manifest.json"
    ):
        raise ValueError("composed OpenAPI manifest drifted from canonical connector manifest")
    actual = contract_counts(root)
    expected = load_json(root / "PRODUCT_MANIFEST.json")["contract_baseline"]
    if actual != expected:
        raise ValueError(f"contract inventory mismatch: expected={expected} actual={actual}")
    return "PHP route/OpenAPI와 exact 312-operation set, active 189, board 26, Shop 26 확인"


def validate_rust_scope_contract(payload: dict[str, Any]) -> None:
    contract = payload.get("audit_contract")
    if not isinstance(contract, dict):
        raise ValueError("Rust audit contract missing")
    if contract.get("id") != "API_PIPELINE_AUDIT_V1":
        raise ValueError("Rust audit contract id mismatch")
    if contract.get("provider_contract") != "connectors/gnuboard5-php/api/docs/openapi.yaml":
        raise ValueError("Rust provider_contract must point to the monorepo canonical OpenAPI")
    if contract.get("included_path_prefixes") != ["/admin/"]:
        raise ValueError("Rust included_path_prefixes mismatch")
    raw_bootstrap = contract.get("included_operations")
    if not isinstance(raw_bootstrap, list):
        raise ValueError("Rust bootstrap operation inventory missing")
    bootstrap: list[tuple[str, str]] = []
    for row in raw_bootstrap:
        if not isinstance(row, dict):
            raise ValueError("Rust bootstrap operation row must be an object")
        bootstrap.append((str(row.get("method", "")).upper(), str(row.get("path", ""))))
    if len(bootstrap) != len(EXPECTED_BOOTSTRAP_OPERATIONS) or set(bootstrap) != EXPECTED_BOOTSTRAP_OPERATIONS:
        raise ValueError("Rust bootstrap operation inventory mismatch")
    if contract.get("path_equivalents") not in ({}, None):
        raise ValueError("Rust path aliases cannot collapse OpenAPI operations")
    counts = contract.get("expected_operation_counts")
    expected = {
        "openapi_total": 312,
        "admin_total": 210,
        "shop_provider_only": 26,
        "admin_non_shop_exact": 184,
        "bootstrap": 5,
        "active_total_exact": 189,
    }
    if counts != expected:
        raise ValueError(f"Rust consumer scope mismatch: {counts}")
    domains = contract.get("expected_schema_domains")
    if (
        not isinstance(domains, list)
        or len(domains) != len(EXPECTED_RUST_SCHEMA_DOMAINS)
        or set(domains) != EXPECTED_RUST_SCHEMA_DOMAINS
    ):
        raise ValueError("Rust schema domain inventory must equal the exact 17-domain baseline")


def check_fingerprint(row: object, path: Path, label: str) -> None:
    if not isinstance(row, dict) or row.get("available") is not True:
        raise ValueError(f"Rust child audit did not bind {label}")
    if Path(str(row.get("path", ""))).resolve() != path.resolve():
        raise ValueError(f"Rust child audit {label} path mismatch")
    if row.get("sha256") != sha256(path):
        raise ValueError(f"Rust child audit {label} fingerprint mismatch")


def check_rust_scope(root: Path) -> str:
    rust_root = root / "products/admin-desktop"
    connector = root / "connectors/gnuboard5-php"
    composed = root / ".cache/composed/gnuboard5-php"
    scope_path = rust_root / "specs/integration/ACTIVE_CONSUMER_SCOPE.json"
    payload = load_json(scope_path)
    validate_rust_scope_contract(payload)

    runner = rust_root / "scripts/run_api_pipeline_audit.py"
    if not runner.is_file():
        raise ValueError("Rust static API pipeline audit runner is missing")
    parent_run_id = CURRENT_RUN_ID.get()
    child_root = (
        root / "output/audit/runs" / parent_run_id / "children"
        if parent_run_id
        else root / "output/audit/children"
    )
    child_id = uuid.uuid4().hex
    child_json = child_root / f"rust-api-pipeline-{child_id}.json"
    child_markdown = child_root / f"rust-api-pipeline-{child_id}.md"
    run_checked(
        sys.executable,
        str(runner),
        "--rust-root",
        str(rust_root),
        "--php-root",
        str(composed),
        "--static-only",
        "--output-json",
        str(child_json),
        "--output-md",
        str(child_markdown),
        root=rust_root,
    )
    report = load_json(child_json)
    summary = report.get("summary")
    if not isinstance(summary, dict):
        raise ValueError("Rust static API pipeline audit summary missing")
    if (
        summary.get("status") != "static_passed_not_certified"
        or summary.get("certified") is not False
        or summary.get("static_only") is not True
        or summary.get("failed") != 0
        or summary.get("blocked") != 0
    ):
        raise ValueError(f"Rust static API pipeline audit did not pass: {summary}")
    inputs = report.get("inputs")
    if not isinstance(inputs, dict):
        raise ValueError("Rust static API pipeline audit input fingerprints missing")
    check_fingerprint(inputs.get("openapi"), composed / "api/docs/openapi.yaml", "OpenAPI")
    check_fingerprint(
        inputs.get("openapi_manifest"),
        composed / "api/docs/openapi.contract-manifest.json",
        "OpenAPI manifest",
    )
    for relative in ("api/docs/openapi.yaml", "api/docs/openapi.contract-manifest.json"):
        if sha256(composed / relative) != sha256(connector / relative):
            raise ValueError(f"Rust composed provider input drifted from canonical connector: {relative}")
    check_fingerprint(inputs.get("consumer_scope"), scope_path, "consumer scope")
    child_run_id = report.get("run_id")
    if not isinstance(child_run_id, str) or not child_run_id:
        raise ValueError("Rust child audit run_id missing")
    return (
        "Rust/Tauri actual static pipeline와 exact 312/189/26, 17-domain 소비 증적 확인; "
        f"child_run_id={child_run_id} child_sha256={sha256(child_json)}"
    )


def check_commerce_retention(root: Path) -> str:
    counts = contract_counts(root)
    product = load_json(root / "PRODUCT_MANIFEST.json")
    if counts["shop_provider_operations"] != 26:
        raise ValueError("Shop provider contract was reduced")
    if product["provider_scope"].get("shop") != "provider_retained_commerce_consumer":
        raise ValueError("Commerce consumer boundary mismatch")
    for relative in REQUIRED_TRACKED_PATHS[6:8]:
        if not (root / relative).is_file():
            raise ValueError(f"Shop provider source missing: {relative}")
    return "Shop 26개 공급자 보존 및 Commerce 소비 경계 확인"


def check_notification_boundary(root: Path) -> str:
    notification = load_json(root / "PRODUCT_MANIFEST.json").get("notification_baseline")
    if not isinstance(notification, dict):
        raise ValueError("notification baseline missing")
    if set(notification.get("channels", [])) != {"telegram", "web_push"}:
        raise ValueError("notification channels mismatch")
    if notification.get("enabled_by_default") is not False or notification.get("external_delivery_in_routine_tests") is not False:
        raise ValueError("notification safety defaults mismatch")
    return "Telegram·Web Push 기본 경계와 외부 발송 금지 확인"


def _notification_contract_source(root: Path) -> tuple[str, str, str]:
    crate_path = root / "crates/fleet-notify/src/lib.rs"
    cargo_path = root / "crates/fleet-notify/Cargo.toml"
    store_path = root / "crates/fleet-store/src/records.rs"
    for path in (crate_path, cargo_path, store_path):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"notification source missing or unsafe: {path.relative_to(root)}")
    return (
        crate_path.read_text(encoding="utf-8"),
        cargo_path.read_text(encoding="utf-8"),
        store_path.read_text(encoding="utf-8"),
    )


def check_telegram_contract(root: Path) -> str:
    source, cargo, store = _notification_contract_source(root)
    required = (
        "NotificationWorker",
        "TelegramAdapter",
        "TelegramTransport",
        "FakeProvider",
        "enqueue_notification_deduplicated",
        "scoped_event_id",
        "fake_delivery_retries_then_succeeds_without_external_send",
        "redact_sensitive_text",
    )
    missing = [token for token in required if token not in source and token not in store]
    if missing:
        raise ValueError(f"Telegram outbox contract missing: {missing}")
    if "reqwest" in cargo or "TcpStream" in source:
        raise ValueError("routine notification crate contains direct external network transport")
    if (
        "claim_due_notification" not in store
        or "dead_letter_notification" not in store
        or "retry_notification" not in store
        or "attempts = attempts + 1" not in store
    ):
        raise ValueError("notification lease/retry/dead-letter persistence is incomplete")
    return "Telegram injected adapter와 SQLite lease·retry·dedupe·dead-letter, fake-only routine delivery 확인"


def check_web_push_contract(root: Path) -> str:
    source, cargo, store = _notification_contract_source(root)
    required = (
        "WebPushAdapter",
        "WebPushTransport",
        "WebPushDelivery",
        "fake_permanent_failure_moves_web_push_to_dead_letter",
        "provider_not_configured",
    )
    missing = [token for token in required if token not in source]
    if missing:
        raise ValueError(f"Web Push outbox contract missing: {missing}")
    if "reqwest" in cargo or "TcpStream" in source:
        raise ValueError("routine Web Push tests could perform external delivery")
    if "UNIQUE(event_id, channel)" not in (
        root / "crates/fleet-store/migrations/0001_control_plane.sql"
    ).read_text(encoding="utf-8"):
        raise ValueError("notification event/channel dedupe constraint missing")
    if "owned_notification" not in store:
        raise ValueError("notification owner/site readback boundary missing")
    return "Web Push injected adapter와 영구실패 dead-letter·owner/site 격리 fake delivery 확인"


def check_pwa_cache_safety(root: Path) -> str:
    manifest = load_json(root / "apps/admin-web/public/manifest.webmanifest")
    service_worker_path = root / "apps/admin-web/public/sw.js"
    registration_path = root / "apps/admin-web/src/pwa.ts"
    test_path = root / "apps/admin-web/src/pwa.test.ts"
    for path in (service_worker_path, registration_path, test_path):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"PWA input missing or unsafe: {path.relative_to(root)}")
    if (
        manifest.get("display") != "standalone"
        or manifest.get("scope") != "/"
        or not manifest.get("icons")
    ):
        raise ValueError("PWA manifest install contract is incomplete")
    worker = service_worker_path.read_text(encoding="utf-8")
    required = (
        'pathname.startsWith("/api/")',
        'pathname === "/healthz"',
        'pathname === "/readyz"',
        "request.method !== \"GET\"",
        "url.origin !== self.location.origin",
        "CACHEABLE_DESTINATIONS",
        "networkFirstAppShell",
        "cacheFirstStatic",
        "safeActionPath",
    )
    missing = [token for token in required if token not in worker]
    if missing:
        raise ValueError(f"PWA cache safety tokens missing: {missing}")
    sensitive_check = worker.index("isSensitivePath(url.pathname)")
    response_interception = worker.index("event.respondWith")
    if sensitive_check > response_interception:
        raise ValueError("PWA sensitive API exclusion must precede cache interception")
    registration = registration_path.read_text(encoding="utf-8")
    test = test_path.read_text(encoding="utf-8")
    if (
        'register("/sw.js", { scope: "/" })' not in registration
        or 'toHaveBeenCalledWith("/sw.js", { scope: "/" })' not in test
    ):
        raise ValueError("PWA same-origin registration contract/test missing")
    return "PWA install shell·static cache와 /api·health·ready 사용자 데이터 cache 금지 확인"


def check_commerce_core_isolation(root: Path) -> str:
    contract = load_json(
        root / "plugins/commerce-sdk/contracts/commerce-plugin-v1.json"
    )
    if (
        contract.get("schema") != "g5-fleet.commerce-plugin/v1"
        or contract.get("license_boundary", {}).get("required_by_core") is not False
        or contract.get("transport", {}).get("browser_to_plugin") is not False
        or contract.get("transport", {}).get("server_to_plugin") is not True
    ):
        raise ValueError("Commerce plugin contract/license/transport boundary mismatch")
    manifest = load_json(
        root / "connectors/gnuboard5-php/api/docs/openapi.contract-manifest.json"
    )
    expected_operations = {
        row["operation_id"]
        for row in manifest["operations"]
        if row["path"].startswith("/admin/shop/")
    }
    actual_operations = set(contract.get("operations", []))
    if len(expected_operations) != 26 or actual_operations != expected_operations:
        raise ValueError("Commerce SDK operation set drifted from canonical Shop 26")

    forbidden_hits: list[str] = []
    for base in (root / "apps", root / "crates"):
        for pattern in ("*.rs", "Cargo.toml"):
            for path in base.rglob(pattern):
                source = path.read_text(encoding="utf-8")
                if any(
                    token in source
                    for token in (
                        "g5_fleet_commerce",
                        "g5-fleet-commerce",
                        "commerce_sdk",
                    )
                ):
                    forbidden_hits.append(path.relative_to(root).as_posix())
    if forbidden_hits:
        raise ValueError(
            "Fleet Core imports/consumes Commerce implementation: "
            + ", ".join(sorted(set(forbidden_hits)))
        )
    registry = _core_registry(root)
    if registry.get("counts", {}).get("shop") != 0:
        raise ValueError("Fleet Core registry consumes Shop operations")
    api = (root / "apps/admin-server/src/api.rs").read_text(encoding="utf-8")
    tests = (root / "apps/admin-server/tests/http_contract.rs").read_text(
        encoding="utf-8"
    )
    if (
        'plugin_id: "commerce"' not in api
        or "installed: false" not in api
        or 'assert_eq!(plugins[0]["installed"], false)' not in tests
    ):
        raise ValueError("Commerce absent Core boot/plugin slot proof missing")
    return "canonical Shop 26 SDK 계약, Core import·소비 0, Commerce 미설치 서버 부팅 확인"


def check_package_operational_contract(root: Path) -> str:
    paths = {
        "container": root / "Containerfile",
        "compose": root / "deploy/compose/compose.yaml",
        "caddy": root / "deploy/compose/Caddyfile",
        "entrypoint": root / "deploy/container/entrypoint.sh",
        "install": root / "deploy/scripts/install.sh",
        "backup": root / "deploy/scripts/backup.sh",
        "restore": root / "deploy/scripts/restore.sh",
        "upgrade": root / "deploy/scripts/upgrade.sh",
        "release": root / "tools/package/build_release.sh",
        "connector": root / "tools/package/build_connector_package.py",
        "smoke": root / "tools/package/package_smoke.sh",
    }
    for label, path in paths.items():
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"package {label} input is missing or unsafe")

    container = paths["container"].read_text(encoding="utf-8")
    for token in (
        "FROM oven/bun:1.3.10-alpine AS web-builder",
        "FROM rust:1.88-bookworm AS rust-builder",
        "FROM debian:bookworm-slim AS runtime",
        "cargo build --release --locked -p g5-fleet-admin-server",
        "USER 10001:10001",
        'ENTRYPOINT ["/usr/local/bin/g5-fleet-entrypoint"]',
        "HEALTHCHECK",
        "org.opencontainers.image.revision",
    ):
        if token not in container:
            raise ValueError(f"OCI image contract token missing: {token}")
    if "tauri" in container.lower():
        raise ValueError("active OCI image must not build Tauri")

    compose = paths["compose"].read_text(encoding="utf-8")
    try:
        service_block = compose.split("services:\n", 1)[1].split("\nnetworks:", 1)[0]
    except IndexError as error:
        raise ValueError("Compose service block is malformed") from error
    services = re.findall(r"^  ([a-z0-9_-]+):$", service_block, re.MULTILINE)
    if services != ["app", "caddy"]:
        raise ValueError(f"Compose must contain exact app+caddy services: {services}")
    for forbidden in ("postgres:", "postgresql:", "mysql:", "mariadb:", "redis:"):
        if forbidden in compose.lower():
            raise ValueError(f"separate database/cache service is forbidden: {forbidden}")
    for token in (
        "G5_FLEET_STATE_DIR",
        "read_only: true",
        "no-new-privileges:true",
        "cap_drop:",
        "condition: service_healthy",
    ):
        if token not in compose:
            raise ValueError(f"Compose hardening token missing: {token}")

    entrypoint = paths["entrypoint"].read_text(encoding="utf-8")
    if (
        "refusing first-run initialization because the data directory is not empty"
        not in entrypoint
        or '"$binary" init-store' not in entrypoint
    ):
        raise ValueError("first-run-only fail-closed initialization is incomplete")

    install = paths["install"].read_text(encoding="utf-8")
    backup = paths["backup"].read_text(encoding="utf-8")
    restore = paths["restore"].read_text(encoding="utf-8")
    upgrade = paths["upgrade"].read_text(encoding="utf-8")
    if "existing installation detected; use upgrade.sh" not in install:
        raise ValueError("clean-install existing-state rejection is missing")
    for token in (
        "aes-256-cbc",
        "pbkdf2",
        "recovery.manifest",
        "master_key_sha256",
    ):
        if token not in backup or token not in restore:
            raise ValueError(f"encrypted master-key recovery token missing: {token}")
    operational_sources = upgrade + (
        root / "apps/admin-server/src/main.rs"
    ).read_text(encoding="utf-8")
    for token in (
        "before_readback",
        "after_readback",
        "rollback",
        "create_verified_backup",
    ):
        if token not in operational_sources:
            raise ValueError(f"verified upgrade/rollback token missing: {token}")

    release = paths["release"].read_text(encoding="utf-8")
    connector = paths["connector"].read_text(encoding="utf-8")
    smoke = paths["smoke"].read_text(encoding="utf-8")
    for token in (
        "--sbom=true",
        "docker scout sbom",
        "build_connector_package.py",
        "G5_FLEET_RELEASE_PLATFORM",
        '--platform "$platform"',
    ):
        if token not in release:
            raise ValueError(f"release artifact token missing: {token}")
    for token in (
        "--no-dev",
        "write_deterministic_tar",
        "PACKAGE-MANIFEST.json",
        "SBOM.cdx.json",
    ):
        if token not in connector:
            raise ValueError(f"PHP Connector package token missing: {token}")
    for token in (
        "successful upgrade did not preserve critical rows",
        "missing-image upgrade unexpectedly succeeded",
        "encrypted master key recovery readback mismatch",
        "write_package_evidence.py",
    ):
        if token not in smoke:
            raise ValueError(f"package smoke token missing: {token}")

    executable_paths = [
        paths[label]
        for label in (
            "entrypoint",
            "install",
            "backup",
            "restore",
            "upgrade",
            "release",
            "smoke",
        )
    ]
    non_executable = [
        path.relative_to(root).as_posix()
        for path in executable_paths
        if not path.stat().st_mode & stat.S_IXUSR
    ]
    if non_executable:
        raise ValueError(f"package scripts are not executable: {non_executable}")
    return (
        "단일 Axum+React OCI, app+Caddy Compose, DB·Redis 0, "
        "verified backup·암호화 master-key 복구·upgrade rollback harness 확인"
    )


def check_certification_harness_boundary(root: Path) -> str:
    paths = {
        "g5_image": root / "tools/certification/G5Containerfile",
        "g5_compose": root / "tools/certification/local-g5.compose.yaml",
        "local_stack": root / "tools/certification/local_stack.sh",
        "local_smoke": root / "tools/certification/local_runtime_smoke.py",
        "browser": root / "tools/certification/write_browser_evidence.py",
        "staging_receipt": root / "tools/certification/staging_receipt.py",
        "staging_rehearsal": root / "tools/certification/staging_rehearsal.sh",
        "staging": root / "tools/certification/staging_smoke.py",
        "production_image": root / "Containerfile",
        "production_compose": root / "deploy/compose/compose.yaml",
        "server_manifest": root / "apps/admin-server/Cargo.toml",
        "connector_manifest": root / "crates/fleet-connector/Cargo.toml",
        "security_manifest": root / "crates/fleet-security/Cargo.toml",
    }
    for label, path in paths.items():
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"certification {label} input is missing or unsafe")
    for label in ("server_manifest", "connector_manifest", "security_manifest"):
        if "local-certification" not in paths[label].read_text(encoding="utf-8"):
            raise ValueError(f"local certification feature boundary missing: {label}")
    production_image = paths["production_image"].read_text(encoding="utf-8")
    production_compose = paths["production_compose"].read_text(encoding="utf-8")
    if "local-certification" in production_image or "mariadb" in production_compose.lower():
        raise ValueError("local certification dependency leaked into production package")
    local_stack = paths["local_stack"].read_text(encoding="utf-8")
    local_smoke = paths["local_smoke"].read_text(encoding="utf-8")
    if (
        "--features local-certification" not in local_stack
        or "G5_FLEET_CERTIFICATION_MODE=local" not in local_stack
        or "G5_CERT_G5_IMAGE" not in local_stack
        or "START TRANSACTION;" not in local_stack
        or "fleet_cert_member" not in local_stack
        or '"version"] != "5.6.32"' not in local_smoke
        or '"/api/v1/install/challenge"' not in local_smoke
        or '"/api/v1/install/complete"' not in local_smoke
        or '"otp_install_login_step_up": "passed"' not in local_smoke
        or '"operations": 10' not in local_smoke
        or '"member_soft_delete_date_readback": "passed"' not in local_smoke
        or '"r13_groups"' not in local_smoke
        or '"operations": 17' not in local_smoke
        or '"legacy_alias_member_list_add_delete": "passed"' not in local_smoke
        or '"r15_contents"' not in local_smoke
        or '"html_mode_2_preserved": "passed"' not in local_smoke
        or '"content_cleanup_readback": "passed"' not in local_smoke
        or '"r16_faqs"' not in local_smoke
        or '"operations": 14' not in local_smoke
        or '"empty_pc_mobile_html_preserved": "passed"' not in local_smoke
        or '"header_footer_image_upload_delete": "passed"' not in local_smoke
        or '"faq_cleanup_readback": "passed"' not in local_smoke
        or '"external_delivery_attempts": 0' not in local_smoke
    ):
        raise ValueError("local G5/server certification harness contract incomplete")
    staging = paths["staging"].read_text(encoding="utf-8")
    for token in (
        "credential-free HTTPS origin",
        "staging deployment receipt identity mismatch",
        "staging rollback receipt mismatch",
        '"/readyz"',
        '"/api/v1/meta"',
    ):
        if token not in staging:
            raise ValueError(f"staging evidence boundary token missing: {token}")
    receipt = paths["staging_receipt"].read_text(encoding="utf-8")
    rehearsal = paths["staging_rehearsal"].read_text(encoding="utf-8")
    for token in (
        "staging deployment image/platform/version/revision readback mismatch",
        "staging rollback snapshot/readback mismatch",
        "rollback_from_failed_upgrade",
    ):
        if token not in receipt:
            raise ValueError(f"staging receipt token missing: {token}")
    for token in (
        "staging failed-upgrade rehearsal unexpectedly succeeded",
        "upgrade.sh",
        "staging_receipt.py",
        "restored_readback",
        "runtime_image_id",
        "runtime_platform",
    ):
        if token not in rehearsal:
            raise ValueError(f"staging rehearsal token missing: {token}")
    if not paths["staging_rehearsal"].stat().st_mode & stat.S_IXUSR:
        raise ValueError("staging rehearsal script is not executable")
    return (
        "test-only G5+MariaDB local feature가 production image/Compose와 분리되고 "
        "local·browser·package·실패 upgrade staging receipt harness가 fail-closed로 연결됨"
    )


def certification_evidence(root: Path, filename: str, schema: str) -> dict[str, Any]:
    path = root / ".cache/evidence" / filename
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"certification evidence is missing or unsafe: {filename}")
    payload = load_json(path)
    if payload.get("schema") != schema or payload.get("status") != "passed":
        raise ValueError(f"certification evidence identity/status mismatch: {filename}")
    revision = git("rev-parse", "HEAD", root=root)
    if payload.get("revision") != revision:
        raise ValueError(
            f"certification evidence is stale: {filename} "
            f"expected={revision} actual={payload.get('revision')}"
        )
    openapi = payload.get(
        "openapi_sha256",
        payload.get("canonical_openapi_sha256"),
    )
    if openapi is not None and openapi != sha256(
        root / "connectors/gnuboard5-php/api/docs/openapi.yaml"
    ):
        raise ValueError(f"certification OpenAPI fingerprint mismatch: {filename}")
    return payload


def check_local_composed_gnuboard(root: Path) -> str:
    evidence = certification_evidence(
        root,
        "local-runtime.json",
        "g5-fleet.local-runtime/v1",
    )
    upstream = evidence.get("upstream")
    locked = load_json(root / "UPSTREAMS.lock.json")["upstreams"][0]
    if (
        not isinstance(upstream, dict)
        or upstream.get("version") != "5.6.32"
        or upstream.get("commit") != locked.get("commit")
        or upstream.get("tree") != locked.get("tree")
        or not is_hex(upstream.get("runtime_fingerprint_sha256"), SHA256_LENGTH)
    ):
        raise ValueError("local G5 v5.6.32 identity/fingerprint mismatch")
    return (
        f"official G5 {upstream['version']} commit={upstream['commit']} "
        "composed PHP runtime 기동 증거 확인"
    )


def check_local_provider_identity(root: Path) -> str:
    evidence = certification_evidence(
        root,
        "local-runtime.json",
        "g5-fleet.local-runtime/v1",
    )
    provider = evidence.get("provider")
    if (
        not isinstance(provider, dict)
        or provider.get("status") != "ok"
        or not isinstance(provider.get("version"), str)
        or not provider["version"]
        or provider.get("shop_installed") is not True
    ):
        raise ValueError("local PHP Connector provider identity/Shop runtime mismatch")
    return (
        f"PHP Connector health version={provider['version']} 및 "
        "G5+Shop provider runtime 확인"
    )


def check_local_browser_e2e(root: Path) -> str:
    runtime_path = root / ".cache/evidence/local-runtime.json"
    browser = certification_evidence(
        root,
        "browser-e2e.json",
        "g5-fleet.browser-e2e/v1",
    )
    if browser.get("parent_local_runtime_sha256") != sha256(runtime_path):
        raise ValueError("browser E2E parent local-runtime evidence mismatch")
    sessions = browser.get("sessions")
    assertions = browser.get("assertions")
    if (
        not isinstance(sessions, list)
        or len(sessions) != 2
        or not isinstance(assertions, dict)
        or assertions.get("two_users_two_sites_isolated") is not True
        or assertions.get("connector_login") != "passed"
        or assertions.get("browser_received_g5_secret") is not False
        or assertions.get("browser_received_g5_jwt") is not False
    ):
        raise ValueError("2-user×2-site browser isolation assertions are incomplete")
    expected = [
        ("fleet-admin", ["owner-a-site"], ["owner-b-site"]),
        ("fleet-peer", ["owner-b-site"], ["owner-a-site"]),
    ]
    actual = [
        (row.get("name"), row.get("visible_sites"), row.get("hidden_sites"))
        for row in sessions
        if isinstance(row, dict)
    ]
    if actual != expected:
        raise ValueError(f"browser session/site visibility mismatch: {actual}")
    artifacts = browser.get("artifacts")
    if not isinstance(artifacts, dict):
        raise ValueError("browser evidence artifacts are missing")
    for label in ("admin_screenshot", "peer_screenshot", "trace"):
        row = artifacts.get(label)
        if not isinstance(row, dict):
            raise ValueError(f"browser artifact metadata missing: {label}")
        path_value = row.get("path")
        if not isinstance(path_value, str):
            raise ValueError(f"browser artifact path missing: {label}")
        path = Path(path_value)
        if (
            not path.is_absolute()
            or path.is_symlink()
            or not path.is_file()
            or sha256(path) != row.get("sha256")
            or path.stat().st_size != row.get("bytes")
        ):
            raise ValueError(f"browser artifact readback mismatch: {label}")
    return "Chromium named session 2개에서 사용자별 단일 site 가시성과 타 사용자 site 비노출 확인"


def check_local_mutation_cleanup(root: Path) -> str:
    runtime = certification_evidence(
        root,
        "local-runtime.json",
        "g5-fleet.local-runtime/v1",
    )
    browser = certification_evidence(
        root,
        "browser-e2e.json",
        "g5-fleet.browser-e2e/v1",
    )
    mutation = runtime.get("mutation")
    assertions = browser.get("assertions")
    if (
        not isinstance(mutation, dict)
        or mutation.get("field") != "cf_10"
        or mutation.get("update_readback") != "passed"
        or mutation.get("cleanup_readback") != "passed"
        or not isinstance(assertions, dict)
        or assertions.get("cf_10_update_readback") != "passed"
        or assertions.get("cf_10_rollback_readback") != "passed"
    ):
        raise ValueError("local provider/server/browser mutation cleanup evidence incomplete")
    return "G5 cf_10 provider→Fleet→browser 수정·재조회·원복 readback 확인"


def check_local_fake_notification(root: Path, channel: str) -> str:
    evidence = certification_evidence(
        root,
        "local-runtime.json",
        "g5-fleet.local-runtime/v1",
    )
    notifications = evidence.get("notifications")
    source = (root / "crates/fleet-notify/src/lib.rs").read_text(encoding="utf-8")
    required_test = {
        "telegram": "fake_delivery_retries_then_succeeds_without_external_send",
        "web_push": "fake_permanent_failure_moves_web_push_to_dead_letter",
    }[channel]
    if (
        not isinstance(notifications, dict)
        or notifications.get("external_delivery_attempts") != 0
        or required_test not in source
        or "FakeProvider" not in source
    ):
        raise ValueError(f"{channel} fake-only local delivery evidence mismatch")
    return f"{channel} fake adapter local test와 외부 delivery attempt 0 확인"


def package_release_evidence(root: Path) -> tuple[dict[str, Any], Path]:
    evidence = certification_evidence(
        root,
        "package-release.json",
        "g5-fleet.package-release/v1",
    )
    version = evidence.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z._-]{1,64}", version):
        raise ValueError("package release version is invalid")
    release_dir = root / "dist/release" / version
    manifest_path = release_dir / "release-manifest.json"
    if (
        manifest_path.is_symlink()
        or not manifest_path.is_file()
        or load_json(manifest_path) != evidence
    ):
        raise ValueError("package release manifest readback mismatch")
    return evidence, release_dir


def check_package_server_image(root: Path) -> str:
    evidence, _ = package_release_evidence(root)
    readback = evidence.get("version_readback")
    image_id = evidence.get("image_id")
    platform = evidence.get("platform")
    if (
        not isinstance(readback, dict)
        or readback.get("image_version") != evidence.get("version")
        or readback.get("build_revision") != evidence.get("revision")
        or not isinstance(image_id, str)
        or not image_id.startswith("sha256:")
        or platform not in {"linux/amd64", "linux/arm64"}
    ):
        raise ValueError("server image ID/version/revision readback mismatch")
    return (
        f"Axum+React image {evidence['image']} id={image_id[:19]} platform={platform} "
        "version/revision readback 확인"
    )


def check_package_php_connector(root: Path) -> str:
    evidence, _ = package_release_evidence(root)
    readback = evidence.get("connector_readback")
    if (
        not isinstance(readback, dict)
        or readback.get("schema") != "g5-fleet.php-connector-package/v1"
        or readback.get("version") != evidence.get("version")
        or readback.get("revision") != evidence.get("revision")
        or readback.get("canonical_openapi_sha256")
        != sha256(root / "connectors/gnuboard5-php/api/docs/openapi.yaml")
        or not isinstance(readback.get("production_dependencies"), int)
        or readback["production_dependencies"] <= 0
    ):
        raise ValueError("PHP Connector release readback mismatch")
    return (
        f"deterministic PHP Connector production dependency "
        f"{readback['production_dependencies']}개와 canonical OpenAPI 확인"
    )


def check_package_checksums(root: Path) -> str:
    evidence, release_dir = package_release_evidence(root)
    artifacts = evidence.get("artifacts")
    if not isinstance(artifacts, dict) or len(artifacts) != 4:
        raise ValueError("release artifact inventory must contain exact 4 artifacts")
    for label, row in artifacts.items():
        if not isinstance(row, dict):
            raise ValueError(f"release artifact metadata invalid: {label}")
        filename = row.get("path")
        if (
            not isinstance(filename, str)
            or Path(filename).name != filename
            or "/" in filename
        ):
            raise ValueError(f"release artifact filename unsafe: {label}")
        path = release_dir / filename
        if (
            path.is_symlink()
            or not path.is_file()
            or sha256(path) != row.get("sha256")
            or path.stat().st_size != row.get("bytes")
        ):
            raise ValueError(f"release artifact checksum/size mismatch: {label}")
    return "image·SPDX·PHP Connector·CycloneDX 4개 artifact SHA-256/size readback 확인"


def check_package_sbom(root: Path) -> str:
    evidence, release_dir = package_release_evidence(root)
    artifacts = evidence["artifacts"]
    image_sbom = load_json(release_dir / artifacts["sbom"]["path"])
    connector_sbom = load_json(release_dir / artifacts["php_connector_sbom"]["path"])
    if not str(image_sbom.get("spdxVersion", "")).startswith("SPDX-"):
        raise ValueError("image SPDX SBOM identity mismatch")
    components = connector_sbom.get("components")
    if (
        connector_sbom.get("bomFormat") != "CycloneDX"
        or not isinstance(components, list)
        or len(components)
        != evidence["connector_readback"]["production_dependencies"]
    ):
        raise ValueError("PHP Connector CycloneDX component count mismatch")
    return f"image SPDX와 PHP Connector CycloneDX component {len(components)}개 확인"


def check_upgrade_backup_restore(root: Path) -> str:
    evidence = certification_evidence(
        root,
        "package-smoke.json",
        "g5-fleet.package-smoke/v1",
    )
    install = evidence.get("install")
    upgrade = evidence.get("upgrade")
    backup = evidence.get("backup_restore")
    if (
        not isinstance(install, dict)
        or install.get("status") != "passed"
        or not isinstance(upgrade, dict)
        or upgrade.get("status") != "passed"
        or upgrade.get("critical_row_readback", {}).get("users") != 1
        or not isinstance(backup, dict)
        or backup.get("status") != "passed"
        or backup.get("master_key_recovered") is not True
        or not is_hex(backup.get("snapshot_sha256"), SHA256_LENGTH)
        or not is_hex(backup.get("encrypted_recovery_sha256"), SHA256_LENGTH)
    ):
        raise ValueError("clean install/upgrade/backup/master-key restore evidence mismatch")
    return "clean install, user row 보존 upgrade, DB snapshot·암호화 master-key 복원 확인"


def check_upgrade_rollback(root: Path) -> str:
    evidence = certification_evidence(
        root,
        "package-smoke.json",
        "g5-fleet.package-smoke/v1",
    )
    rollback = evidence.get("failed_upgrade_rollback")
    upgrade = evidence.get("upgrade")
    if (
        not isinstance(rollback, dict)
        or rollback.get("status") != "passed"
        or not isinstance(upgrade, dict)
        or rollback.get("restored_image") != upgrade.get("image")
        or rollback.get("critical_row_readback") != upgrade.get("critical_row_readback")
    ):
        raise ValueError("failed upgrade rollback image/readback mismatch")
    return "존재하지 않는 image upgrade 실패 후 이전 image·검증 snapshot·핵심 row 자동 복원 확인"


def staging_evidence(root: Path) -> dict[str, Any]:
    return certification_evidence(
        root,
        "staging.json",
        "g5-fleet.staging/v1",
    )


def check_staging_provider_identity(root: Path) -> str:
    evidence = staging_evidence(root)
    provider = evidence.get("provider")
    if (
        not isinstance(provider, dict)
        or not isinstance(provider.get("id"), str)
        or len(provider["id"]) < 3
        or not isinstance(provider.get("base_url"), str)
        or not provider["base_url"].startswith("https://")
    ):
        raise ValueError("staging provider identity/HTTPS origin mismatch")
    return f"staging provider id={provider['id']} HTTPS identity 확인"


def check_staging_deploy_smoke(root: Path) -> str:
    evidence = staging_evidence(root)
    deployment = evidence.get("deployment")
    smoke = evidence.get("smoke")
    if (
        not isinstance(deployment, dict)
        or deployment.get("status") != "passed"
        or not str(deployment.get("image_id", "")).startswith("sha256:")
        or deployment.get("platform") not in {"linux/amd64", "linux/arm64"}
        or not isinstance(smoke, dict)
        or smoke.get("status") != "passed"
        or smoke.get("ready", {}).get("status") != "ready"
        or smoke.get("meta", {}).get("build_revision") != evidence.get("revision")
        or smoke.get("meta", {}).get("image_version") != deployment.get("version")
    ):
        raise ValueError("staging deploy readiness/version/revision evidence mismatch")
    return (
        f"staging image={deployment['image_id'][:19]} platform={deployment['platform']} "
        "readyz·meta version/revision readback 확인"
    )


def check_staging_rollback(root: Path) -> str:
    evidence = staging_evidence(root)
    rollback = evidence.get("rollback")
    if (
        not isinstance(rollback, dict)
        or rollback.get("status") != "passed"
        or rollback.get("backup_restore_readback") is not True
        or not is_hex(rollback.get("snapshot_sha256"), SHA256_LENGTH)
        or not is_hex(rollback.get("receipt_sha256"), SHA256_LENGTH)
    ):
        raise ValueError("staging rollback backup/readback receipt mismatch")
    return "staging 실패 배포 rollback과 verified snapshot readback rehearsal 확인"


def check_composed_provider(root: Path) -> str:
    verifier = root / "tools/runtime/compose_gnuboard.py"
    if not verifier.is_file():
        raise ValueError("composed runtime verifier is missing")
    run_checked(
        sys.executable,
        str(verifier),
        "--verify-only",
        "--root",
        str(root),
        root=root,
        timeout_seconds=300,
    )
    return "잠금 G5+PHP connector+Composer prepared runtime 입력 fingerprint 오프라인 검증"


def check_audit_dependencies(root: Path) -> str:
    verifier = root / "tools/runtime/prepare_consumers.py"
    if not verifier.is_file():
        raise ValueError("audit dependency verifier is missing")
    manifest = load_json(root / AUDIT_DEPENDENCY_MANIFEST)
    tools = manifest.get("tools")
    python_tool = tools.get("python") if isinstance(tools, dict) else None
    prepared_python = python_tool.get("command") if isinstance(python_tool, dict) else None
    if not isinstance(prepared_python, str) or not prepared_python.strip():
        raise ValueError("audit dependency manifest Python command is missing")
    run_checked(
        sys.executable,
        str(verifier),
        "verify-audit",
        "--root",
        str(root),
        "--python",
        prepared_python,
        root=root,
        timeout_seconds=300,
    )
    return "Tauri와 분리된 Python audit dependency lock/cache fingerprint 검증"


CHECKS: dict[str, Callable[[Path], str]] = {
    "repository.destination_state": check_destination_state,
    "governance.schemas": check_schema_validation,
    "governance.constitution": check_constitution,
    "governance.product_manifest": check_product_manifest,
    "governance.license_policy": check_license_policy,
    "migration.provenance": check_provenance,
    "upstream.lock": check_upstream_lock,
    "migration.history": check_history,
    "migration.secret_history_hygiene": check_secret_history_hygiene,
    "migration.source_closure": check_source_closure,
    "migration.legacy_reference_boundary": check_legacy_reference_boundary,
    "runtime.composed_provider": check_composed_provider,
    "runtime.audit_dependencies": check_audit_dependencies,
    "php.contract_inventory": check_contract_inventory,
    "commerce.provider_retention": check_commerce_retention,
    "product.notification_boundary": check_notification_boundary,
    "active.workspace_boundary": check_active_workspace_boundary,
    "server.scaffold_contract": check_server_scaffold_contract,
    "web.transport_boundary": check_web_transport_boundary,
    "storage.sqlite_durability": check_sqlite_durability,
    "security.auth_site_boundary": check_auth_site_boundary,
    "server.vertical_flow": check_server_vertical_flow,
    "remote.ssh_sftp_boundary": check_remote_ssh_sftp_boundary,
    "server.route_registry": check_server_route_registry,
    "web.transport_registry": check_web_transport_registry,
    "web.field_consumption": check_web_field_consumption,
    "security.site_context": check_security_site_context,
    "security.csrf": check_security_csrf,
    "security.ssrf": check_security_ssrf,
    "notification.telegram_contract": check_telegram_contract,
    "notification.web_push_contract": check_web_push_contract,
    "web.pwa_cache_safety": check_pwa_cache_safety,
    "commerce.core_isolation": check_commerce_core_isolation,
    "package.operational_contract": check_package_operational_contract,
    "certification.harness_boundary": check_certification_harness_boundary,
    "compose.gnuboard_5_6_32": check_local_composed_gnuboard,
    "runtime.provider_identity": check_local_provider_identity,
    "runtime.server_browser_e2e": check_local_browser_e2e,
    "runtime.mutation_readback_cleanup": check_local_mutation_cleanup,
    "notification.telegram_fake_delivery": lambda root: check_local_fake_notification(
        root, "telegram"
    ),
    "notification.web_push_fake_delivery": lambda root: check_local_fake_notification(
        root, "web_push"
    ),
    "package.server_image": check_package_server_image,
    "package.php_connector": check_package_php_connector,
    "package.checksums": check_package_checksums,
    "package.sbom": check_package_sbom,
    "upgrade.backup_restore": check_upgrade_backup_restore,
    "upgrade.rollback": check_upgrade_rollback,
    "staging.provider_identity": check_staging_provider_identity,
    "staging.deploy_smoke": check_staging_deploy_smoke,
    "staging.rollback_rehearsal": check_staging_rollback,
}


def execute(profile: str, root: Path = ROOT) -> tuple[dict[str, Any], int]:
    run_id = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:12]}"
    audit_manifest = load_json(root / "AUDIT_MANIFEST.json")
    configured_hard_fail_states = hard_fail_states(audit_manifest)
    validate_audit_manifest_contract(audit_manifest)
    proof_level, check_ids = required_checks(audit_manifest, profile)
    results: list[CheckResult] = []
    token = CURRENT_RUN_ID.set(run_id)
    try:
        for check_id in check_ids:
            evaluator = CHECKS.get(check_id)
            if evaluator is None:
                results.append(CheckResult(check_id, "missing", "check evaluator is not implemented"))
                continue
            try:
                results.append(CheckResult(check_id, "passed", evaluator(root)))
            except (OSError, KeyError, TypeError, ValueError, RuntimeError, json.JSONDecodeError) as error:
                results.append(CheckResult(check_id, "failed", str(error)))
    finally:
        CURRENT_RUN_ID.reset(token)

    invalid_statuses = sorted(
        {result.status for result in results if result.status != "passed" and result.status not in configured_hard_fail_states}
    )
    if invalid_statuses:
        results.append(
            CheckResult(
                "harness.result_status",
                "failed",
                "result statuses are neither passed nor configured hard-fail states: "
                + ", ".join(invalid_statuses),
            )
        )
    failed = [result for result in results if result.status in configured_hard_fail_states]
    revision = "unavailable"
    try:
        revision = git("rev-parse", "HEAD", root=root)
    except RuntimeError:
        results.append(CheckResult("repository.git_revision", "failed", "Git HEAD is unavailable"))
        failed.append(results[-1])
    if revision != "unavailable" and not is_hex(revision, SHA1_LENGTH):
        results.append(CheckResult("repository.git_revision", "failed", "Git HEAD is not a full SHA"))
        failed.append(results[-1])
    connector_openapi = root / "connectors/gnuboard5-php/api/docs/openapi.yaml"
    upstream_rows = load_json(root / "UPSTREAMS.lock.json")["upstreams"]
    payload = {
        "schema": "g5-fleet.audit-result/v1",
        "run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "proof_level": proof_level if not failed else None,
        "status": "passed" if not failed else "failed",
        "git_revision": revision,
        "openapi_sha256": sha256(connector_openapi) if connector_openapi.is_file() else None,
        "gnuboard5_upstream_commit": upstream_rows[0].get("commit"),
        "checks": [asdict(result) for result in results],
        "summary": {"passed": len(results) - len(failed), "failed": len(failed), "total": len(results)},
    }
    return payload, 0 if not failed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail-closed G5 Fleet migration audit")
    parser.add_argument("--profile", default="migration_static")
    parser.add_argument("--output", default="output/audit/latest.json")
    args = parser.parse_args()
    try:
        payload, exit_code = execute(args.profile)
    except (OSError, KeyError, TypeError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"audit bootstrap failed: {error}", file=sys.stderr)
        return 1
    requested = Path(args.output)
    if requested.is_absolute() or ".." in requested.parts:
        print("audit output must be a safe repository-relative path", file=sys.stderr)
        return 1
    output = ROOT / requested
    immutable = ROOT / "output/audit/runs" / payload["run_id"] / "result.json"
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    try:
        immutable.parent.mkdir(parents=True, exist_ok=True)
        with immutable.open("x", encoding="utf-8") as handle:
            handle.write(encoded)
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_name(f".{output.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_text(encoded, encoding="utf-8")
        temporary.replace(output)
    except OSError as error:
        print(f"audit evidence write failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
