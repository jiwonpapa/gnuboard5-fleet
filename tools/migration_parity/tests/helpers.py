from __future__ import annotations

from pathlib import Path
from typing import Any

from tools.migration_parity.inventory import category_fingerprint, sha256_file
from tools.migration_parity.model import Inventory, InventoryItem


CATEGORIES = (
    "tauri_commands",
    "react_pages",
    "rust_workspace_members",
    "frontend_tests",
    "rust_tests",
)


def make_fixture(root: Path) -> tuple[dict[str, Any], Inventory, Inventory]:
    target = root / "apps/admin-server/src/lib.rs"
    test = root / "apps/admin-server/tests/parity.rs"
    target.parent.mkdir(parents=True)
    test.parent.mkdir(parents=True)
    target.write_text("pub fn migrated_contract() {}\n", encoding="utf-8")
    test.write_text("#[test]\nfn migration_is_preserved() {}\n", encoding="utf-8")

    legacy_categories: dict[str, list[InventoryItem]] = {}
    mappings: dict[str, list[dict[str, Any]]] = {}
    baseline: dict[str, dict[str, Any]] = {}
    for category in CATEGORIES:
        item = InventoryItem(
            item_id=f"{category}:legacy",
            path=f"products/admin-desktop/{category}.txt",
            sha256="a" * 64,
        )
        legacy_categories[category] = [item]
        baseline[category] = {
            "count": 1,
            "fingerprint": category_fingerprint([item]),
        }
        mappings[category] = [
            {
                "legacy_id": item.item_id,
                "disposition": "adapted",
                "target_paths": ["apps/admin-server/src/lib.rs"],
                "test_paths": ["apps/admin-server/tests/parity.rs"],
                "checks": [
                    {
                        "path": "apps/admin-server/src/lib.rs",
                        "contains": "migrated_contract",
                    }
                ],
                "evidence_ids": [],
                "rationale": "fixture mapping",
            }
        ]

    active = Inventory(
        categories={
            "server_routes": [],
            "core_operations": [],
            "active_workspace_members": [],
            "web_pages": [],
            "web_tests": [],
        }
    )
    manifest: dict[str, Any] = {
        "schema": "g5-fleet.migration-parity/v1",
        "policy": {
            "allowed_target_roots": ["apps/admin-server"],
            "runtime_evidence_max_age_hours": 24,
        },
        "legacy_baseline": baseline,
        "active_expectations": {},
        "mappings": mappings,
        "required_capabilities": [
            {
                "id": "fixture_capability",
                "state": "implemented",
                "target_paths": ["apps/admin-server/src/lib.rs"],
                "test_paths": ["apps/admin-server/tests/parity.rs"],
                "checks": [
                    {
                        "path": "apps/admin-server/src/lib.rs",
                        "contains": "migrated_contract",
                    }
                ],
                "evidence_ids": [],
                "rationale": "fixture capability",
            }
        ],
        "evidence_registry": {},
        "profile_evidence": {"static": [], "runtime": [], "staging": []},
        "staging": {"base_url_env": "TEST_URL", "probes": []},
    }
    return manifest, Inventory(legacy_categories), active


def refresh_target_hash(root: Path) -> str:
    return sha256_file(root / "apps/admin-server/src/lib.rs")
