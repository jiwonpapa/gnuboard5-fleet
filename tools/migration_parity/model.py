from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class InventoryItem:
    item_id: str
    path: str
    sha256: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Inventory:
    categories: dict[str, list[InventoryItem]]
    anomalies: list["Finding"] = field(default_factory=list)

    def counts(self) -> dict[str, int]:
        return {name: len(items) for name, items in self.categories.items()}

    def to_dict(self) -> dict[str, Any]:
        return {
            "counts": self.counts(),
            "categories": {
                name: [item.to_dict() for item in items]
                for name, items in sorted(self.categories.items())
            },
            "anomalies": [finding.to_dict() for finding in self.anomalies],
        }


@dataclass(frozen=True)
class Finding:
    code: str
    message: str
    category: str | None = None
    item_id: str | None = None
    severity: str = "error"

    def to_dict(self) -> dict[str, Any]:
        return {
            key: value
            for key, value in asdict(self).items()
            if value is not None
        }


@dataclass
class AuditReport:
    schema: str
    run_id: str
    generated_at: str
    profile: str
    status: str
    proof_level: str | None
    git_revision: str
    manifest_path: str
    manifest_sha256: str
    legacy: Inventory
    active: Inventory
    coverage: dict[str, dict[str, int]]
    capabilities: dict[str, int]
    findings: list[Finding]
    live_probes: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "run_id": self.run_id,
            "generated_at": self.generated_at,
            "profile": self.profile,
            "status": self.status,
            "proof_level": self.proof_level,
            "git_revision": self.git_revision,
            "manifest": {
                "path": self.manifest_path,
                "sha256": self.manifest_sha256,
            },
            "summary": {
                "finding_count": len(self.findings),
                "coverage": self.coverage,
                "capabilities": self.capabilities,
            },
            "legacy_inventory": self.legacy.to_dict(),
            "active_inventory": self.active.to_dict(),
            "live_probes": self.live_probes,
            "findings": [finding.to_dict() for finding in self.findings],
        }
