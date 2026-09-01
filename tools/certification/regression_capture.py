"""Parse executed test results and bind only observable replacement regressions.

Frontend inventory items are test *files*: their complete replacement suites
must run. Other legacy items require a named executed test anchor, not merely a
passing file or an implementation symbol. Browser/provider proof is never made.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any


def artifact(root: Path, path: Path) -> dict[str, Any]:
    relative = path.relative_to(root).as_posix()
    current = root
    for part in Path(relative).parts:
        current /= part
        if current.is_symlink():
            raise ValueError("test artifact may not contain a symlink")
    content = path.read_bytes()
    return {"path": relative, "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}


def parse_vitest(root: Path, report: dict[str, Any]) -> list[dict[str, str]]:
    root = root.resolve()
    if report.get("success") is not True or report.get("numFailedTests") != 0:
        raise ValueError("Vitest run did not pass")
    cases: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for suite in report.get("testResults", []):
        path = Path(suite["name"]).resolve()
        if not path.is_relative_to(root / "apps/admin-web/src"):
            raise ValueError("Vitest source is outside the active web product")
        relative = path.relative_to(root).as_posix()
        if not re.search(r"\.test\.tsx?$", relative) or suite.get("status") != "passed":
            raise ValueError("invalid or failed Vitest suite")
        assertions = suite.get("assertionResults")
        if not isinstance(assertions, list) or not assertions:
            raise ValueError("empty Vitest suite cannot certify a replacement")
        for row in assertions:
            name = row.get("fullName")
            if not isinstance(name, str) or not name or row.get("status") != "passed":
                raise ValueError("failed/skipped/unnamed Vitest case")
            if (relative, name) in seen:
                raise ValueError("duplicate Vitest case")
            seen.add((relative, name))
            cases.append({"runner": "vitest", "file": relative, "name": name})
    if not cases or len(cases) != report.get("numTotalTests") or len(cases) != report.get("numPassedTests"):
        raise ValueError("Vitest executed count differs from report totals")
    return cases


def parse_libtest(output: str, source: str) -> tuple[list[dict[str, str]], list[str]]:
    summaries = re.findall(
        r"^test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;",
        output, flags=re.M,
    )
    if len(summaries) != 1:
        raise ValueError("libtest must have exactly one successful summary")
    passed, failed, ignored, measured, filtered = map(int, summaries[0])
    rows = re.findall(r"^test (\S+) \.\.\. (ok|FAILED|ignored)(?:, [^\n]*)?$", output, flags=re.M)
    if failed or measured or filtered or any(status == "FAILED" for _, status in rows):
        raise ValueError("failed/filtered libtest run cannot certify replacements")
    if len({name for name, _ in rows}) != len(rows):
        raise ValueError("duplicate libtest case")
    if sum(status == "ok" for _, status in rows) != passed or sum(status == "ignored" for _, status in rows) != ignored:
        raise ValueError("libtest case counts differ from summary")
    return (
        [{"runner": "libtest", "file": source, "name": name} for name, status in rows if status == "ok"],
        [name for name, status in rows if status == "ignored"],
    )


def rust_source_matches(root: Path, source: str, case: dict[str, str]) -> bool:
    if case["file"] == source:
        return True
    # Unit tests in a lib's child module have a lib.rs Cargo target. Never match
    # another package, an integration target, or a same-named helper function.
    target = Path(case["file"])
    if target.name != "lib.rs" or not Path(source).is_relative_to(target.parent):
        return False
    stem = Path(source).relative_to(target.parent).with_suffix("").parts
    modules = stem[:-1] if stem[-1] == "mod" else stem
    return case["name"].startswith("::".join(modules) + "::")


def named_check_matches(root: Path, check: dict[str, str], case: dict[str, str]) -> bool:
    anchor = check.get("contains", "")
    source = check.get("path", "")
    if case["runner"] == "vitest":
        return source == case["file"] and len(anchor) >= 8 and anchor in case["name"]
    anchor = re.sub(r"^(?:async )?fn ", "", anchor)
    if not re.fullmatch(r"[a-z_][a-z_0-9]{7,}", anchor):
        return False
    function_name = case["name"].split("::")[-1]
    if anchor not in function_name or not rust_source_matches(root, source, case):
        return False
    # An implementation symbol cannot certify a same-named test elsewhere.
    return bool(re.search(r"\bfn\s+" + re.escape(function_name) + r"\s*\(", (root / source).read_text()))


def bind_regressions(
    root: Path, manifest: dict[str, Any], executed: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], dict[str, list[str]]]:
    cases, missing = [], {}
    for category, mappings in manifest["mappings"].items():
        if category == "react_pages":
            continue
        missing[category] = []
        for mapping in mappings:
            selected: list[dict[str, str]] = []
            paths = mapping["test_paths"]
            if category == "frontend_tests":
                # This inventory counts replacement test files, not UI pages.
                for path in paths:
                    suite = [case for case in executed if case["runner"] == "vitest" and case["file"] == path]
                    if not suite:
                        selected = []
                        break
                    selected.extend(suite)
            elif mapping.get("execution_tests") is not None:
                selectors = mapping["execution_tests"]
                if not isinstance(selectors, list) or not selectors:
                    missing[category].append(mapping["legacy_id"])
                    continue
                for selector in selectors:
                    if (
                        not isinstance(selector, dict)
                        or selector.get("runner") not in {"vitest", "libtest"}
                        or selector.get("file") not in paths
                        or not isinstance(selector.get("name"), str)
                        or not selector["name"]
                    ):
                        selected = []
                        break
                    matches = [case for case in executed if case == selector]
                    if len(matches) != 1:
                        selected = []
                        break
                    selected.extend(matches)
            else:
                checks = [check for check in mapping["checks"] if check["path"] in paths]
                for check in checks:
                    matches = [case for case in executed if named_check_matches(root, check, case)]
                    # Ambiguous names and assertion-body/implementation anchors
                    # need an explicit reviewed mapping, not a file-wide PASS.
                    if len(matches) != 1:
                        selected = []
                        break
                    selected.extend(matches)
            selected = list({(row["runner"], row["file"], row["name"]): row for row in selected}.values())
            if not selected:
                missing[category].append(mapping["legacy_id"])
                continue
            cases.append({
                "id": f"regression:{category}:{mapping['legacy_id']}",
                "kind": "regression", "status": "PASS",
                "subjects": [{"category": category, "item_id": mapping["legacy_id"]}],
                "assertions": [f"executed {row['runner']} {row['file']} :: {row['name']}" for row in selected],
                "executed_tests": selected,
            })
    return cases, missing
