#!/usr/bin/env python3

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from check_form_metadata_coverage import (
    PROVIDER_SCHEMA_PATH,
    REGISTRY_PATH,
    collect_findings,
    load_provider_schema_domains,
    load_registry,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "form-metadata-blockers"
MARKDOWN_PATH = OUTPUT_DIR / "latest.md"
JSON_PATH = OUTPUT_DIR / "latest.json"


def build_payload() -> dict[str, object]:
    findings, notes, results = collect_findings()
    registry_by_feature = {entry.feature: entry for entry in load_registry()}
    blocked_results = [
        result
        for result in results
        if result.mode == "schema_planned" and result.provider_blocker
    ]
    warnings = [finding for finding in findings if finding.severity == "warning"]
    failures = [finding for finding in findings if finding.severity == "failure"]

    blocked_features = []
    for result in blocked_results:
        registry_entry = registry_by_feature[result.feature]
        blocked_features.append(
            {
                "feature": result.feature,
                "path": str(registry_entry.path.relative_to(ROOT)),
                "priority": result.priority,
                "target_level": result.target_level,
                "provider_blocker": result.provider_blocker,
                "next_action": result.next_action,
                "source_files": result.source_files,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "registry": str(REGISTRY_PATH.relative_to(ROOT)),
        "provider_schema_catalog": str(PROVIDER_SCHEMA_PATH),
        "provider_schema_domains": sorted(load_provider_schema_domains()),
        "features": len(results),
        "blocked_count": len(blocked_features),
        "warning_count": len(warnings),
        "failure_count": len(failures),
        "blocked_features": blocked_features,
        "notes": notes,
        "warnings": [
            {"feature": finding.feature, "detail": finding.detail}
            for finding in warnings
        ],
        "failures": [
            {"feature": finding.feature, "detail": finding.detail}
            for finding in failures
        ],
    }


def render_markdown(payload: dict[str, object]) -> str:
    provider_domains = payload["provider_schema_domains"]
    blocked_features = payload["blocked_features"]
    warnings = payload["warnings"]
    lines = [
        "# Form Metadata Provider Blockers",
        "",
        f"- generated_at: `{payload['generated_at']}`",
        f"- registry: `{payload['registry']}`",
        f"- provider_schema_catalog: `{payload['provider_schema_catalog']}`",
        f"- provider_schema_domains: `{len(provider_domains)}`",
        f"- blocked_features: `{payload['blocked_count']}`",
        f"- warnings: `{payload['warning_count']}`",
        f"- failures: `{payload['failure_count']}`",
        "",
        "## Provider Domains",
        "",
    ]

    if provider_domains:
        for domain in provider_domains:
            lines.append(f"- `{domain}`")
    else:
        lines.append("- none")

    lines.extend(["", "## Blocked Features", ""])
    if blocked_features:
        for item in blocked_features:
            lines.append(
                f"- `{item['feature']}`: priority=`{item['priority']}`, target=`{item['target_level']}`, "
                f"blocker=`{item['provider_blocker']}`, path=`{item['path']}`"
            )
            lines.append(f"  next_action: {item['next_action']}")
    else:
        lines.append("- none")

    lines.extend(["", "## Warning Mirror", ""])
    if warnings:
        for item in warnings:
            lines.append(f"- `{item['feature']}`: {item['detail']}")
    else:
        lines.append("- none")

    return "\n".join(lines) + "\n"


def main() -> None:
    payload = build_payload()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    MARKDOWN_PATH.write_text(render_markdown(payload), encoding="utf-8")
    print(f"Wrote {JSON_PATH.relative_to(ROOT)}")
    print(f"Wrote {MARKDOWN_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
