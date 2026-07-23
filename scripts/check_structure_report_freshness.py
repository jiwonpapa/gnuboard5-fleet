#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
MARKDOWN_PATH = ROOT / "output" / "php-structure-audit" / "latest.md"
JSON_PATH = ROOT / "output" / "php-structure-audit" / "latest.json"


def iter_inputs() -> list[Path]:
    paths: list[Path] = [
        ROOT / "api" / "container.php",
        ROOT / "api" / "routes" / "v1.php",
        ROOT / "api" / "routes" / "v1" / "admin.php",
        ROOT / "docs" / "architecture" / "GATEWAY_USAGE_RULES.json",
        ROOT / "docs" / "audits" / "BLOCKERS.toml",
        ROOT / "docs" / "audits" / "WARNING_BUDGETS.toml",
        ROOT / "scripts" / "check_active_structure_boundaries.py",
        ROOT / "scripts" / "check_structure_report_freshness.py",
        ROOT / "scripts" / "generate_structure_audit_report.py",
        ROOT / "scripts" / "php_structure_findings.py",
    ]
    paths.extend(sorted((ROOT / "api" / "v1").rglob("*.php")))
    paths.extend(sorted((ROOT / "tests").rglob("*.php")))

    return [path for path in paths if path.is_file()]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def main() -> int:
    outputs = [MARKDOWN_PATH, JSON_PATH]
    failures: list[str] = []
    warnings: list[str] = []

    missing_outputs = [path for path in outputs if not path.is_file()]
    if missing_outputs:
        failures.extend(f"missing generated artifact `{rel(path)}`" for path in missing_outputs)

    inputs = iter_inputs()
    if not inputs:
        failures.append("no structure report input files were found")

    if failures:
        print("[structure_report_freshness]")
        print(f"markdown={rel(MARKDOWN_PATH)}")
        print(f"json={rel(JSON_PATH)}")
        print(f"inputs={len(inputs)}")
        print(f"failures={len(failures)}")
        print(f"warnings={len(warnings)}")
        print()
        print("[warnings]")
        print("none")
        print()
        print("[failures]")
        for failure in failures:
            print(f"FAIL {failure}")
        print("FAIL: structure report freshness")
        return 1

    oldest_output_mtime = min(path.stat().st_mtime for path in outputs)
    stale_inputs = sorted(
        (
            path for path in inputs if path.stat().st_mtime > oldest_output_mtime
        ),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    if stale_inputs:
        failures.extend(
            f"generated report is stale because `{rel(path)}` is newer than output/php-structure-audit/latest.*"
            for path in stale_inputs[:10]
        )
        if len(stale_inputs) > 10:
            warnings.append(f"{len(stale_inputs) - 10} additional newer inputs omitted from output")

    newest_input = max(inputs, key=lambda path: path.stat().st_mtime)
    newest_output = max(outputs, key=lambda path: path.stat().st_mtime)

    print("[structure_report_freshness]")
    print(f"markdown={rel(MARKDOWN_PATH)}")
    print(f"json={rel(JSON_PATH)}")
    print(f"inputs={len(inputs)}")
    print(f"newest_input={rel(newest_input)}")
    print(f"newest_output={rel(newest_output)}")
    print(f"failures={len(failures)}")
    print(f"warnings={len(warnings)}")
    print()

    print("[warnings]")
    if warnings:
        for warning in warnings:
            print(f"WARN {warning}")
    else:
        print("none")
    print()

    print("[failures]")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        print("FAIL: structure report freshness")
        return 1

    print("none")
    print("PASS: structure report freshness")
    return 0


if __name__ == "__main__":
    sys.exit(main())
