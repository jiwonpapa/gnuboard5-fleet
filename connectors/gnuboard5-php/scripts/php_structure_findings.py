#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GATEWAY_RULES_PATH = ROOT / "docs" / "architecture" / "GATEWAY_USAGE_RULES.json"

ROOT_ORCHESTRATORS = (
    "api/routes/v1.php",
    "api/routes/v1/admin.php",
    "api/container.php",
)
ROOT_WARNING_THRESHOLD = 220
ROOT_FAILURE_THRESHOLD = 320
SERVICE_REPOSITORY_WARNING_THRESHOLD = 320
SERVICE_REPOSITORY_FAILURE_THRESHOLD = 480
HTTP_DEPENDENCY_PATTERN = re.compile(r"\b(ServerRequestInterface|ResponseInterface)\b")
LEGACY_ACCESS_PATTERN = re.compile(r"\$_ENV|getenv\(|\$GLOBALS|common\.php|sql_query\(|get_member\(")
INTEGRATION_CONTRACT_PATTERN = re.compile(r"Api\\Integration\\Contracts")


@dataclass(frozen=True)
class Finding:
    severity: str
    rule: str
    path: str
    detail: str


@dataclass(frozen=True)
class PhpMethod:
    visibility: str
    name: str
    body: str


@dataclass(frozen=True)
class GatewayRule:
    fqcn: str
    domain: str
    allowed: tuple[str, ...]
    prefixes: tuple[str, ...]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def php_line_count(path: Path) -> int:
    return sum(1 for _ in path.open("r", encoding="utf-8"))


def strip_inline_comments(line: str, *, in_block_comment: bool) -> tuple[str, bool]:
    result: list[str] = []
    index = 0
    block = in_block_comment

    while index < len(line):
        if block:
            end = line.find("*/", index)
            if end == -1:
                return ("".join(result), True)
            index = end + 2
            block = False
            continue

        if line.startswith("//", index):
            break
        if line.startswith("/*", index):
            block = True
            index += 2
            continue

        result.append(line[index])
        index += 1

    return ("".join(result), block)


def extract_methods(contents: str) -> list[PhpMethod]:
    methods: list[PhpMethod] = []
    header_pattern = re.compile(r"^\s*(public|protected|private)\s+function\s+([A-Za-z0-9_]+)\s*\(")
    lines = contents.splitlines()
    index = 0

    while index < len(lines):
        match = header_pattern.match(lines[index])
        if match is None:
            index += 1
            continue

        visibility = match.group(1)
        name = match.group(2)
        brace_balance = lines[index].count("{") - lines[index].count("}")
        started = "{" in lines[index]
        method_lines: list[str] = []
        index += 1

        while index < len(lines):
            current = lines[index]
            if started:
                method_lines.append(current)
            brace_balance += current.count("{") - current.count("}")
            if "{" in current:
                started = True
            index += 1
            if started and brace_balance <= 0:
                break

        methods.append(PhpMethod(visibility=visibility, name=name, body="\n".join(method_lines)))

    return methods


def normalize_method_body(method: PhpMethod) -> str:
    normalized_parts: list[str] = []
    in_block_comment = False

    for line in method.body.splitlines():
        without_comments, in_block_comment = strip_inline_comments(line, in_block_comment=in_block_comment)
        stripped = without_comments.strip()
        if not stripped or stripped in {"{", "}"}:
            continue
        if stripped == "*/" or stripped.startswith("*"):
            continue
        normalized_parts.append(stripped)

    return " ".join(normalized_parts).rstrip("}")


def is_simple_delegation_method(method: PhpMethod) -> bool:
    normalized = normalize_method_body(method)
    if normalized == "":
        return method.name == "__construct"

    if method.name == "__construct":
        return bool(
            re.fullmatch(
                r"(?:parent::__construct\([^;]*\);\s*)?(?:\$this->[A-Za-z0-9_]+\s*=\s*[^;]+;\s*)*",
                normalized,
            )
        )

    if re.search(r"\b(if|foreach|for|while|switch|match|try|catch|throw|new)\b", normalized):
        return False

    return bool(
        re.fullmatch(
            r"(return\s+)?\$this->[A-Za-z0-9_]+(?:\(\))?(?:->[A-Za-z0-9_]+(?:\(\))?)*\([^;]*\);",
            normalized,
        )
    )


def is_delegation_facade(contents: str) -> bool:
    public_methods = [method for method in extract_methods(contents) if method.visibility == "public"]
    if len(public_methods) < 8:
        return False

    return all(is_simple_delegation_method(method) for method in public_methods)


def iter_service_repository_files() -> list[Path]:
    files: list[Path] = []
    for path in (ROOT / "api" / "v1").rglob("*.php"):
        relative = path.as_posix()
        if "/Service/" in relative or "/Repository/" in relative:
            files.append(path)
    return sorted(files)


def iter_service_files() -> list[Path]:
    files: list[Path] = []
    for path in (ROOT / "api" / "v1").rglob("*.php"):
        if "/Service/" in path.as_posix():
            files.append(path)
    return sorted(files)


def iter_structure_scan_files() -> list[Path]:
    files: list[Path] = []
    for root in (ROOT / "api" / "v1", ROOT / "tests"):
        if not root.is_dir():
            continue
        files.extend(sorted(root.rglob("*.php")))
    return files


def load_gateway_rules() -> dict[str, list[GatewayRule]]:
    document = json.loads(GATEWAY_RULES_PATH.read_text(encoding="utf-8"))
    if document.get("schema_version") != 1:
        raise ValueError("gateway usage rules schema_version must be 1")

    rules: dict[str, list[GatewayRule]] = {}
    for section in ("local_only_compat_contracts", "shared_inventory_contracts"):
        raw_section = document.get(section, {})
        if not isinstance(raw_section, dict):
            raise ValueError(f"{section} must be an object")

        items: list[GatewayRule] = []
        for fqcn, meta in raw_section.items():
            if not isinstance(meta, dict):
                raise ValueError(f"{section}.{fqcn} must be an object")
            domain = str(meta.get("domain", "")).strip()
            if domain == "":
                raise ValueError(f"{section}.{fqcn} missing domain")
            allowed = tuple(
                value
                for value in meta.get("allowed", [])
                if isinstance(value, str) and value.strip()
            )
            prefixes = tuple(
                value
                for value in meta.get("prefixes", [])
                if isinstance(value, str) and value.strip()
            )
            items.append(
                GatewayRule(
                    fqcn=str(fqcn).strip(),
                    domain=domain,
                    allowed=allowed,
                    prefixes=prefixes,
                )
            )
        rules[section] = items

    return rules


def is_allowed_gateway_usage(relative_path: str, rule: GatewayRule) -> bool:
    for suffix in rule.allowed:
        if relative_path.endswith(suffix):
            return True
    for prefix in rule.prefixes:
        if relative_path.startswith(prefix):
            return True
    return False


def collect_gateway_usage_findings(*, rules: list[GatewayRule], rule_name: str, detail_label: str) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_structure_scan_files():
        relative_path = "/" + rel(path)
        contents = path.read_text(encoding="utf-8")
        for rule in rules:
            if rule.fqcn not in contents:
                continue
            if is_allowed_gateway_usage(relative_path, rule):
                continue
            findings.append(
                Finding(
                    severity="failure",
                    rule=rule_name,
                    path=rel(path),
                    detail=(
                        f"{detail_label} `{rule.fqcn}` for `{rule.domain}` "
                        "outside documented allowlist"
                    ),
                )
            )
    return findings


def collect_findings() -> list[Finding]:
    findings: list[Finding] = []
    gateway_rules: dict[str, list[GatewayRule]] | None = None

    try:
        gateway_rules = load_gateway_rules()
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        findings.append(
            Finding(
                severity="failure",
                rule="gateway_usage_rule_registry_invalid",
                path=rel(GATEWAY_RULES_PATH),
                detail=str(exc),
            )
        )

    for relative_path in ROOT_ORCHESTRATORS:
        path = ROOT / relative_path
        if not path.is_file():
            findings.append(
                Finding(
                    severity="failure",
                    rule="root_orchestrator_missing",
                    path=relative_path,
                    detail="required central orchestrator file is missing",
                )
            )
            continue

        line_count = php_line_count(path)
        if line_count > ROOT_FAILURE_THRESHOLD:
            findings.append(
                Finding(
                    severity="failure",
                    rule="root_orchestrator_growth",
                    path=relative_path,
                    detail=(
                        f"root orchestrator is {line_count} LOC; "
                        f"failure threshold is {ROOT_FAILURE_THRESHOLD}"
                    ),
                )
            )
        elif line_count > ROOT_WARNING_THRESHOLD:
            findings.append(
                Finding(
                    severity="warning",
                    rule="root_orchestrator_growth",
                    path=relative_path,
                    detail=(
                        f"root orchestrator is {line_count} LOC; "
                        f"warning threshold is {ROOT_WARNING_THRESHOLD}"
                    ),
                )
            )

    for path in iter_service_repository_files():
        contents = path.read_text(encoding="utf-8")
        line_count = php_line_count(path)
        relative_path = rel(path)
        if is_delegation_facade(contents):
            continue
        if line_count > SERVICE_REPOSITORY_FAILURE_THRESHOLD:
            findings.append(
                Finding(
                    severity="failure",
                    rule="oversized_service_or_repository",
                    path=relative_path,
                    detail=(
                        f"service/repository is {line_count} LOC; "
                        f"failure threshold is {SERVICE_REPOSITORY_FAILURE_THRESHOLD}"
                    ),
                )
            )
        elif line_count > SERVICE_REPOSITORY_WARNING_THRESHOLD:
            findings.append(
                Finding(
                    severity="warning",
                    rule="oversized_service_or_repository",
                    path=relative_path,
                    detail=(
                        f"service/repository is {line_count} LOC; "
                        f"warning threshold is {SERVICE_REPOSITORY_WARNING_THRESHOLD}"
                    ),
                )
            )

    for path in iter_service_files():
        contents = path.read_text(encoding="utf-8")
        relative_path = rel(path)
        if HTTP_DEPENDENCY_PATTERN.search(contents):
            findings.append(
                Finding(
                    severity="failure",
                    rule="service_http_dependency",
                    path=relative_path,
                    detail="service layer references HTTP request/response interfaces directly",
                )
            )
        if LEGACY_ACCESS_PATTERN.search(contents):
            findings.append(
                Finding(
                    severity="failure",
                    rule="service_legacy_access",
                    path=relative_path,
                    detail="service layer directly references env/global/legacy helpers",
                )
            )

    if gateway_rules is not None:
        findings.extend(
            collect_gateway_usage_findings(
                rules=gateway_rules["local_only_compat_contracts"],
                rule_name="local_compat_contract_leak",
                detail_label="deprecated compatibility contract leaks",
            )
        )
        findings.extend(
            collect_gateway_usage_findings(
                rules=gateway_rules["shared_inventory_contracts"],
                rule_name="shared_gateway_inventory_drift",
                detail_label="shared gateway inventory leaks",
            )
        )

    return findings


def collect_metrics() -> dict[str, object]:
    service_repository_files = iter_service_repository_files()
    gateway_rules_available = GATEWAY_RULES_PATH.is_file()
    local_rule_count = 0
    shared_rule_count = 0
    if gateway_rules_available:
        try:
            gateway_rules = load_gateway_rules()
            local_rule_count = len(gateway_rules["local_only_compat_contracts"])
            shared_rule_count = len(gateway_rules["shared_inventory_contracts"])
        except (OSError, ValueError, json.JSONDecodeError):
            gateway_rules_available = False

    top_service_repository = sorted(
        [
            {"path": rel(path), "lines": php_line_count(path)}
            for path in service_repository_files
        ],
        key=lambda item: item["lines"],
        reverse=True,
    )[:20]

    integration_contract_refs: set[str] = set()
    delegation_facade_files: list[str] = []
    for path in (ROOT / "api" / "v1").rglob("*.php"):
        contents = path.read_text(encoding="utf-8")
        if INTEGRATION_CONTRACT_PATTERN.search(contents):
            integration_contract_refs.add(rel(path))
        if ("/Service/" in path.as_posix() or "/Repository/" in path.as_posix()) and is_delegation_facade(contents):
            delegation_facade_files.append(rel(path))

    return {
        "service_repository_count": len(service_repository_files),
        "top_service_repository": top_service_repository,
        "integration_contract_reference_files": sorted(integration_contract_refs),
        "integration_contract_reference_count": len(integration_contract_refs),
        "delegation_facade_files": sorted(delegation_facade_files),
        "gateway_rule_registry": rel(GATEWAY_RULES_PATH),
        "gateway_rule_registry_available": gateway_rules_available,
        "local_only_rule_count": local_rule_count,
        "shared_inventory_rule_count": shared_rule_count,
    }
