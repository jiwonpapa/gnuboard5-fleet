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
CONSUMER_DEPENDENCY_MANIFEST = Path(
    ".cache/runtime/admin-desktop-consumers.manifest.json"
)
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
        "proof_level": "MIGRATION_STATIC_PASS",
        "inherits": "scaffold",
        "required_checks": [
            "migration.history",
            "migration.secret_history_hygiene",
            "migration.source_closure",
            "runtime.composed_provider",
            "runtime.consumer_dependencies",
            "php.contract_inventory",
            "rust.consumer_scope",
            "commerce.provider_retention",
            "product.notification_boundary",
        ],
    },
    "server_static": {
        "proof_level": "SERVER_STATIC_PASS",
        "inherits": "migration_static",
        "required_checks": [
            "server.route_registry",
            "web.transport_registry",
            "web.field_consumption",
            "security.site_context",
            "security.csrf",
            "security.ssrf",
            "notification.telegram_contract",
            "notification.web_push_contract",
            "commerce.core_isolation",
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


REQUIRED_TAURI_ICONS = (
    "products/admin-desktop/g5-admin/src-tauri/icons/32x32.png",
    "products/admin-desktop/g5-admin/src-tauri/icons/128x128.png",
    "products/admin-desktop/g5-admin/src-tauri/icons/128x128@2x.png",
    "products/admin-desktop/g5-admin/src-tauri/icons/icon.icns",
    "products/admin-desktop/g5-admin/src-tauri/icons/icon.ico",
)

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
) + REQUIRED_TAURI_ICONS


def missing_tracked_paths(tracked: set[str], required: tuple[str, ...] = REQUIRED_TRACKED_PATHS) -> list[str]:
    return sorted(path for path in required if path not in tracked)


def check_source_closure(root: Path) -> str:
    tracked = set(git("ls-files", root=root).splitlines())
    missing = missing_tracked_paths(tracked)
    if missing:
        raise ValueError("required sources are untracked: " + ", ".join(missing))
    return f"필수 clean-clone 소스 {len(REQUIRED_TRACKED_PATHS)}개 추적 확인"


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


def check_consumer_dependencies(root: Path) -> str:
    verifier = root / "tools/runtime/prepare_consumers.py"
    if not verifier.is_file():
        raise ValueError("consumer dependency verifier is missing")
    manifest = load_json(root / CONSUMER_DEPENDENCY_MANIFEST)
    tools = manifest.get("tools")
    python_tool = tools.get("python") if isinstance(tools, dict) else None
    prepared_python = python_tool.get("command") if isinstance(python_tool, dict) else None
    if not isinstance(prepared_python, str) or not prepared_python.strip():
        raise ValueError("consumer dependency manifest Python command is missing")
    run_checked(
        sys.executable,
        str(verifier),
        "verify",
        "--root",
        str(root),
        "--python",
        prepared_python,
        root=root,
        timeout_seconds=300,
    )
    return "Bun·Cargo·Python audit dependency lock/cache fingerprint 오프라인 검증"


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
    "runtime.composed_provider": check_composed_provider,
    "runtime.consumer_dependencies": check_consumer_dependencies,
    "php.contract_inventory": check_contract_inventory,
    "rust.consumer_scope": check_rust_scope,
    "commerce.provider_retention": check_commerce_retention,
    "product.notification_boundary": check_notification_boundary,
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
