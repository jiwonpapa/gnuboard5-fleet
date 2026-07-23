#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable


SCHEMA = "gnuboard5.php.openapi-consumer-scope/v1"


def load_scope(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    document = json.loads(raw.decode("utf-8"))
    if not isinstance(document, dict) or document.get("schema") != SCHEMA:
        raise SystemExit(f"Unsupported consumer scope schema: {path}")
    for string_key in ("scope_id", "contract"):
        if not isinstance(document.get(string_key), str) or not document[string_key]:
            raise SystemExit(f"consumer scope {string_key} is invalid: {path}")
    active = document.get("active_scope")
    if not isinstance(active, dict):
        raise SystemExit(f"consumer scope active_scope is missing: {path}")
    for list_key in (
        "include_path_prefixes",
        "exclude_path_prefixes",
        "include_operations",
    ):
        if not isinstance(active.get(list_key), list):
            raise SystemExit(f"consumer scope {list_key} is invalid: {path}")
    count_keys = (
        "expected_admin_non_shop_operations",
        "expected_bootstrap_operations",
        "expected_total_operations",
    )
    if any(not isinstance(active.get(key), int) or active[key] < 0 for key in count_keys):
        raise SystemExit(f"consumer scope counts are invalid: {path}")
    if (
        active["expected_admin_non_shop_operations"]
        + active["expected_bootstrap_operations"]
        != active["expected_total_operations"]
    ):
        raise SystemExit(f"consumer scope expected counts do not add up: {path}")
    bootstrap_keys: list[str] = []
    for operation in active["include_operations"]:
        if (
            not isinstance(operation, dict)
            or not isinstance(operation.get("method"), str)
            or not operation["method"]
            or not isinstance(operation.get("path"), str)
            or not operation["path"].startswith("/")
        ):
            raise SystemExit(f"consumer scope include_operations is invalid: {path}")
        bootstrap_keys.append(operation_key(operation["method"], operation["path"]))
    if (
        len(set(bootstrap_keys)) != len(bootstrap_keys)
        or len(bootstrap_keys) != active["expected_bootstrap_operations"]
    ):
        raise SystemExit(f"consumer scope bootstrap count does not match: {path}")
    inventory = document.get("contract_inventory")
    if (
        not isinstance(inventory, dict)
        or not isinstance(inventory.get("expected_total_operations"), int)
        or inventory["expected_total_operations"] < 0
        or not isinstance(inventory.get("expected_operation_keys_sha256"), str)
        or len(inventory["expected_operation_keys_sha256"]) != 64
        or any(character not in "0123456789abcdef" for character in inventory["expected_operation_keys_sha256"])
        or not isinstance(inventory.get("expected_classification_counts"), dict)
    ):
        raise SystemExit(f"consumer scope contract_inventory is invalid: {path}")
    classification_counts = inventory["expected_classification_counts"]
    if any(
        not isinstance(classification, str)
        or not classification
        or not isinstance(count, int)
        or count < 0
        for classification, count in classification_counts.items()
    ):
        raise SystemExit(f"consumer scope classification counts are invalid: {path}")
    if sum(classification_counts.values()) != inventory["expected_total_operations"]:
        raise SystemExit(f"consumer scope contract inventory counts do not add up: {path}")
    deferred = document.get("deferred_scope")
    if not isinstance(deferred, dict) or deferred.get("hard_fail") is not False:
        raise SystemExit(f"consumer scope deferred_scope must set hard_fail=false: {path}")
    classification_ids: list[str] = []
    for classification in deferred.get("classifications", []):
        if not isinstance(classification, dict) or not isinstance(classification.get("id"), str):
            raise SystemExit(f"consumer scope deferred classification is invalid: {path}")
        classification_ids.append(classification["id"])
        for list_key in ("include_paths", "include_path_prefixes", "expected_operations"):
            if list_key in classification and not isinstance(classification[list_key], list):
                raise SystemExit(f"consumer scope deferred {list_key} is invalid: {path}")
        expected_operations = classification.get("expected_operations", [])
        if any(
            not isinstance(operation, str) or " /" not in operation
            for operation in expected_operations
        ) or len(set(expected_operations)) != len(expected_operations):
            raise SystemExit(f"consumer scope expected_operations is invalid: {path}")
        classification_key = f"deferred_{classification['id']}"
        if expected_operations and classification_counts.get(classification_key) != len(
            expected_operations
        ):
            raise SystemExit(f"consumer scope protected operation count does not match: {path}")
    if len(set(classification_ids)) != len(classification_ids):
        raise SystemExit(f"consumer scope deferred classification ids are duplicated: {path}")
    document["_path"] = str(path)
    document["_sha256"] = hashlib.sha256(raw).hexdigest()
    return document


def operation_key(method: str, path: str) -> str:
    return f"{method.upper()} {path}"


def is_active_operation(method: str, path: str, scope: dict[str, Any]) -> bool:
    active = scope["active_scope"]
    key = operation_key(method, path)
    included_operations = {
        operation_key(str(item.get("method", "")), str(item.get("path", "")))
        for item in active.get("include_operations", [])
        if isinstance(item, dict)
    }
    if key in included_operations:
        return True
    if any(path.startswith(str(prefix)) for prefix in active.get("exclude_path_prefixes", [])):
        return False
    return any(path.startswith(str(prefix)) for prefix in active.get("include_path_prefixes", []))


def is_bootstrap_operation(method: str, path: str, scope: dict[str, Any]) -> bool:
    key = operation_key(method, path)
    return key in {
        operation_key(str(item.get("method", "")), str(item.get("path", "")))
        for item in scope["active_scope"].get("include_operations", [])
        if isinstance(item, dict)
    }


def classify_operation(method: str, path: str, scope: dict[str, Any]) -> str:
    if is_active_operation(method, path, scope):
        return "active"
    active = scope["active_scope"]
    if any(path.startswith(str(prefix)) for prefix in active.get("exclude_path_prefixes", [])):
        return "excluded_admin_shop"
    deferred = scope.get("deferred_scope", {})
    for classification in deferred.get("classifications", []):
        if not isinstance(classification, dict):
            continue
        if path in classification.get("include_paths", []):
            return f"deferred_{classification.get('id', 'unclassified')}"
        if any(
            path.startswith(str(prefix))
            for prefix in classification.get("include_path_prefixes", [])
        ):
            return f"deferred_{classification.get('id', 'unclassified')}"
    return f"deferred_{deferred.get('fallback_classification', 'unclassified')}"


def operation_counts(
    operations: Iterable[tuple[str, str]], scope: dict[str, Any]
) -> dict[str, int]:
    included_operations = {
        operation_key(str(item.get("method", "")), str(item.get("path", "")))
        for item in scope["active_scope"].get("include_operations", [])
        if isinstance(item, dict)
    }
    counts = {
        "active": 0,
        "admin_non_shop": 0,
        "bootstrap": 0,
        "deferred": 0,
        "excluded_admin_shop": 0,
    }
    for path, method in operations:
        classification = classify_operation(method, path, scope)
        counts[classification] = counts.get(classification, 0) + 1
        if classification == "active":
            if operation_key(method, path) in included_operations:
                counts["bootstrap"] += 1
            else:
                counts["admin_non_shop"] += 1
        elif classification == "excluded_admin_shop":
            continue
        else:
            counts["deferred"] += 1
    return counts


def expected_count_findings(counts: dict[str, int], scope: dict[str, Any]) -> list[dict[str, Any]]:
    active = scope["active_scope"]
    expected = {
        "active": active["expected_total_operations"],
        "admin_non_shop": active["expected_admin_non_shop_operations"],
        "bootstrap": active["expected_bootstrap_operations"],
    }
    rules = {
        "active": "active_operation_count_mismatch",
        "admin_non_shop": "active_admin_operation_count_mismatch",
        "bootstrap": "active_bootstrap_operation_count_mismatch",
    }
    return [
        {
            "rule": rules[key],
            "severity": "failure",
            "detail": f"expected={expected_count} actual={counts[key]}",
            "path": None,
            "method": None,
            "operation_id": None,
            "location": str(scope.get("_path", "consumer_scope")),
        }
        for key, expected_count in expected.items()
        if counts[key] != expected_count
    ]


def protected_operation_keys(scope: dict[str, Any]) -> set[str]:
    return {
        operation
        for classification in scope.get("deferred_scope", {}).get("classifications", [])
        if isinstance(classification, dict) and classification.get("id") == "general_board"
        for operation in classification.get("expected_operations", [])
        if isinstance(operation, str)
    }


def is_protected_operation(method: str, path: str, scope: dict[str, Any]) -> bool:
    return classify_operation(method, path, scope) == "deferred_general_board"


def inventory_findings(
    operations: Iterable[tuple[str, str]], scope: dict[str, Any]
) -> list[dict[str, Any]]:
    operations = list(operations)
    keys = {operation_key(method, path) for path, method in operations}
    counts = operation_counts(operations, scope)
    inventory = scope["contract_inventory"]
    findings: list[dict[str, Any]] = []

    def add(rule: str, detail: str) -> None:
        findings.append(
            {
                "rule": rule,
                "severity": "failure",
                "detail": detail,
                "path": None,
                "method": None,
                "operation_id": None,
                "location": str(scope.get("_path", "consumer_scope")),
            }
        )

    expected_total = inventory["expected_total_operations"]
    if len(keys) != expected_total:
        add("contract_operation_count_mismatch", f"expected={expected_total} actual={len(keys)}")
    actual_operation_hash = hashlib.sha256("\n".join(sorted(keys)).encode("utf-8")).hexdigest()
    expected_operation_hash = inventory["expected_operation_keys_sha256"]
    if actual_operation_hash != expected_operation_hash:
        add(
            "contract_operation_set_mismatch",
            f"expected={expected_operation_hash} actual={actual_operation_hash}",
        )
    for classification, expected in inventory["expected_classification_counts"].items():
        actual = counts.get(classification, 0)
        if actual != expected:
            add(
                "contract_classification_count_mismatch",
                f"classification={classification} expected={expected} actual={actual}",
            )
    protected = protected_operation_keys(scope)
    for operation in sorted(protected - keys):
        add("protected_operation_missing", operation)
    for path, method in operations:
        key = operation_key(method, path)
        if classify_operation(method, path, scope) == "deferred_general_board" and key not in protected:
            add("protected_operation_unexpected", key)
    return findings
