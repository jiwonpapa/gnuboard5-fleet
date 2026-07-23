#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import tomllib

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "docs" / "audits" / "ADMIN_SCHEMA_PROVIDER_READINESS.toml"
SCHEMA_MANIFEST_PATH = ROOT / "api" / "v1" / "Admin" / "Schema" / "schema-domains.json"
OUTPUT_DIR = ROOT / "output" / "admin-schema-provider-readiness"
MARKDOWN_PATH = OUTPUT_DIR / "latest.md"
JSON_PATH = OUTPUT_DIR / "latest.json"


def load_registry() -> list[dict[str, object]]:
    document = tomllib.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    return [entry for entry in document.get("features", []) if isinstance(entry, dict)]


def load_manifest_domains() -> list[str]:
    document = json.loads(SCHEMA_MANIFEST_PATH.read_text(encoding="utf-8"))
    domains: list[str] = []
    for raw in document.get("domains", []):
        if not isinstance(raw, dict):
            continue
        domain = str(raw.get("domain", "")).strip()
        if domain:
            domains.append(domain)
    return sorted(domains)


def read_string_list(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [value.strip() for value in raw if isinstance(value, str) and value.strip()]


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    features = load_registry()
    manifest_domains = load_manifest_domains()
    implemented = [entry for entry in features if str(entry.get("status", "")).strip() == "implemented"]
    blocked = [entry for entry in features if str(entry.get("status", "")).strip() == "blocked"]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "blocked" if blocked else "passed",
        "summary": {
            "implemented_features": len(implemented),
            "blocked_features": len(blocked),
            "manifest_domains": len(manifest_domains),
        },
        "registry": str(REGISTRY_PATH.relative_to(ROOT)),
        "schema_manifest": str(SCHEMA_MANIFEST_PATH.relative_to(ROOT)),
        "manifest_domains": manifest_domains,
        "implemented": [
            {
                "feature": str(entry.get("feature", "")).strip(),
                "schema_domains": read_string_list(entry.get("schema_domains")),
                "priority": str(entry.get("priority", "")).strip(),
                "summary": str(entry.get("summary", "")).strip(),
                "next_action": str(entry.get("next_action", "")).strip(),
            }
            for entry in implemented
        ],
        "blocked": [
            {
                "feature": str(entry.get("feature", "")).strip(),
                "planned_schema_domains": read_string_list(entry.get("planned_schema_domains")),
                "priority": str(entry.get("priority", "")).strip(),
                "blocker": str(entry.get("blocker", "")).strip(),
                "summary": str(entry.get("summary", "")).strip(),
                "next_action": str(entry.get("next_action", "")).strip(),
            }
            for entry in blocked
        ],
    }

    markdown_lines = [
        "# Admin Schema Provider Readiness",
        "",
        f"- generated_at: `{payload['generated_at']}`",
        f"- status: `{payload['status']}`",
        f"- implemented_features: `{payload['summary']['implemented_features']}`",
        f"- blocked_features: `{payload['summary']['blocked_features']}`",
        f"- manifest_domains: `{payload['summary']['manifest_domains']}`",
        "",
        "## Implemented",
    ]
    if payload["implemented"]:
        for item in payload["implemented"]:
            markdown_lines.append(
                f"- `{item['feature']}` domains=`{', '.join(item['schema_domains'])}` priority=`{item['priority']}`"
            )
            markdown_lines.append(f"  - {item['summary']}")
            markdown_lines.append(f"  - next_action: {item['next_action']}")
    else:
        markdown_lines.append("- none")

    markdown_lines.extend(["", "## Blocked"])
    if payload["blocked"]:
        for item in payload["blocked"]:
            markdown_lines.append(
                f"- `{item['feature']}` planned_domains=`{', '.join(item['planned_schema_domains'])}` blocker=`{item['blocker']}` priority=`{item['priority']}`"
            )
            markdown_lines.append(f"  - {item['summary']}")
            markdown_lines.append(f"  - next_action: {item['next_action']}")
    else:
        markdown_lines.append("- none")

    markdown_lines.extend(
        [
            "",
            "## Evidence",
            f"- registry=`{payload['registry']}`",
            f"- schema_manifest=`{payload['schema_manifest']}`",
            "- manifest_domains=" + ", ".join(f"`{domain}`" for domain in manifest_domains),
            "",
        ]
    )

    MARKDOWN_PATH.write_text("\n".join(markdown_lines), encoding="utf-8")
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("[admin_schema_provider_report]")
    print(f"markdown={MARKDOWN_PATH.relative_to(ROOT).as_posix()}")
    print(f"json={JSON_PATH.relative_to(ROOT).as_posix()}")
    print(f"status={payload['status']}")
    print(f"implemented_features={payload['summary']['implemented_features']}")
    print(f"blocked_features={payload['summary']['blocked_features']}")
    print("PASS: generated admin schema provider readiness report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
