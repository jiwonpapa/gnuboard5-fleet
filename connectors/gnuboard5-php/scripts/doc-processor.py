#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT / "docs" / "DOCUMENT_REGISTRY.md"

SSOT_DOCS = {
    "docs/README.md": "문서 인덱스 SSOT",
    "docs/IMPLEMENTATION_ROADMAP.md": "구현 우선순위 SSOT",
    "docs/TODO.md": "작업 상태 SSOT",
    "docs/HISTORY.md": "영구 완료 이력",
    "docs/AUDIT_SYSTEM.md": "감사 운영 SSOT",
    "docs/DOCUMENT_REGISTRY.md": "문서 분류 레지스트리 SSOT",
    "docs/API_SPEC.md": "OpenAPI 보조 설명 문서",
    "docs/ddls/README.md": "DDL 인덱스",
    "docs/codex/README.md": "Codex 인덱스",
    "api/docs/openapi.yaml": "공개 HTTP 계약 SSOT",
}

ARCHIVE_CANDIDATES: dict[str, str] = {}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def support_note(relative_path: str) -> str:
    if relative_path.startswith("docs/planning/"):
        if relative_path.endswith("04_G5_DECOUPLING_ROADMAP.md"):
            return "장기 전략 지원 문서. 실행 우선순위는 IMPLEMENTATION_ROADMAP가 관리."
        return "기능 제안/계획 문서. SSOT 아님."
    if relative_path.startswith("docs/architecture/"):
        return "설계 및 운영 기준 문서."
    if relative_path.startswith("docs/testing/"):
        return "테스트 전략 및 시나리오 문서."
    if relative_path.startswith("docs/compatibility/"):
        return "호환성 정보 문서."
    if relative_path.startswith("docs/ddls/"):
        return "도메인 저장소/스키마 계약 문서."
    if relative_path.startswith("docs/codex/"):
        return "Codex 실행 지시 또는 결과 문서."
    return "지원 문서."


def record_note(relative_path: str) -> str:
    if relative_path.endswith("AUDIT_LATEST.md"):
        return "최신 표준 감사본."
    return "감사 결과/증적 기록 문서."


def collect_documents() -> tuple[list[tuple[str, str]], list[tuple[str, str]], list[tuple[str, str]], list[tuple[str, str]]]:
    ssot_rows: list[tuple[str, str]] = []
    support_rows: list[tuple[str, str]] = []
    record_rows: list[tuple[str, str]] = []
    archive_rows: list[tuple[str, str]] = []

    active_docs = sorted(
        path
        for path in (ROOT / "docs").rglob("*.md")
        if "docs/archive/" not in path.as_posix()
    )

    for path in active_docs:
        relative_path = rel(path)
        if relative_path in ARCHIVE_CANDIDATES:
            archive_rows.append((relative_path, ARCHIVE_CANDIDATES[relative_path]))
            continue

        if relative_path in SSOT_DOCS:
            ssot_rows.append((relative_path, SSOT_DOCS[relative_path]))
            continue

        if relative_path.startswith("docs/audits/"):
            record_rows.append((relative_path, record_note(relative_path)))
            continue

        support_rows.append((relative_path, support_note(relative_path)))

    for path, note in SSOT_DOCS.items():
        if any(existing_path == path for existing_path, _existing_note in ssot_rows):
            continue
        if path in {"api/docs/openapi.yaml", "docs/DOCUMENT_REGISTRY.md"} or (ROOT / path).exists():
            ssot_rows.append((path, note))
    ssot_rows.sort()
    support_rows.sort()
    record_rows.sort()
    archive_rows.sort()

    return ssot_rows, support_rows, record_rows, archive_rows


def render_table(rows: list[tuple[str, str]], second_header: str) -> str:
    if not rows:
        return "| 경로 | " + second_header + " |\n|------|------|\n| - | - |\n"

    lines = ["| 경로 | " + second_header + " |", "|------|------|"]
    for path, note in rows:
        lines.append(f"| `{path}` | {note} |")
    return "\n".join(lines) + "\n"


def generate_registry() -> str:
    ssot_rows, support_rows, record_rows, archive_rows = collect_documents()

    return "\n".join(
        [
            "# 문서 분류 레지스트리",
            "",
            "이 문서는 활성 문서를 `SSOT / 지원 문서 / 기록 문서 / 아카이브 후보`로 분류하는 canonical 레지스트리입니다.",
            "삭제 대신 먼저 이 문서에서 역할을 확정합니다.",
            "",
            "## 요약",
            "",
            f"- SSOT: {len(ssot_rows)}건",
            f"- 지원 문서: {len(support_rows)}건",
            f"- 기록 문서: {len(record_rows)}건",
            f"- 아카이브 후보: {len(archive_rows)}건",
            "",
            "## SSOT",
            "",
            render_table(ssot_rows, "역할").rstrip(),
            "",
            "## 지원 문서",
            "",
            render_table(support_rows, "설명").rstrip(),
            "",
            "## 기록 문서",
            "",
            render_table(record_rows, "설명").rstrip(),
            "",
            "## 아카이브 후보",
            "",
            render_table(archive_rows, "사유").rstrip(),
            "",
            "## 운영 원칙",
            "",
            "- 로드맵 SSOT는 `docs/IMPLEMENTATION_ROADMAP.md` 하나만 유지합니다.",
            "- 작업 상태 SSOT는 `docs/TODO.md` 하나만 유지합니다.",
            "- 완료 이력은 `docs/HISTORY.md`로 이관합니다.",
            "- `docs/docs.db`는 검색 인덱스이며 권위 원본이 아닙니다.",
            "",
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate or validate the document registry.")
    parser.add_argument("--write", action="store_true", help="Write the generated registry to docs/DOCUMENT_REGISTRY.md")
    parser.add_argument("--check", action="store_true", help="Check whether docs/DOCUMENT_REGISTRY.md matches the generated output")
    args = parser.parse_args()

    content = generate_registry()

    if args.write:
        OUTPUT_PATH.write_text(content, encoding="utf-8")
        print(f"wrote {OUTPUT_PATH.relative_to(ROOT)}")
        return 0

    if args.check:
        if not OUTPUT_PATH.exists():
            print("missing docs/DOCUMENT_REGISTRY.md")
            return 1
        current = OUTPUT_PATH.read_text(encoding="utf-8")
        if current != content:
            print("docs/DOCUMENT_REGISTRY.md is out of date")
            return 1
        print("docs/DOCUMENT_REGISTRY.md is up to date")
        return 0

    print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
