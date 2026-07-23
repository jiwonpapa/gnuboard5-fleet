#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
AUDITS_DIR = ROOT / "docs" / "audits"
ARCHIVE_DIR = ROOT / "docs" / "archive" / "audits"
DATE_PATTERN = re.compile(r"(?P<date>\d{4}-\d{2}-\d{2})")


def list_due_files(retention_days: int) -> list[tuple[Path, int]]:
    now = datetime.now(ZoneInfo("Asia/Seoul")).date()
    due: list[tuple[Path, int]] = []
    dated_files: list[tuple[Path, datetime.date]] = []

    for path in sorted(AUDITS_DIR.iterdir()):
        if not path.is_file():
            continue
        if path.name in {"AUDIT_LATEST.md", ".keep"}:
            continue

        match = DATE_PATTERN.search(path.name)
        if match is None:
            continue

        file_date = datetime.strptime(match.group("date"), "%Y-%m-%d").date()
        dated_files.append((path, file_date))

    latest_dated_path = max(dated_files, key=lambda item: item[1])[0] if dated_files else None

    for path, file_date in dated_files:
        if latest_dated_path is not None and path == latest_dated_path:
            continue
        age = (now - file_date).days
        if age > retention_days:
            due.append((path, age))

    return due


def main() -> int:
    parser = argparse.ArgumentParser(description="Archive dated audit files older than the retention window.")
    parser.add_argument("--days", type=int, default=7, help="Retention period in days")
    parser.add_argument("--check", action="store_true", help="Exit non-zero if files are due for archive")
    parser.add_argument("--apply", action="store_true", help="Move due files to docs/archive/audits/")
    args = parser.parse_args()

    due_files = list_due_files(args.days)

    if not due_files:
        print(f"no audits older than {args.days} days")
        return 0

    for path, age in due_files:
        print(f"{path.relative_to(ROOT)} (age={age}d)")

    if args.check:
        return 1

    if args.apply:
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        for path, _age in due_files:
            target = ARCHIVE_DIR / path.name
            if target.exists():
                raise SystemExit(f"archive target already exists: {target}")
            shutil.move(str(path), str(target))
        print(f"archived {len(due_files)} audit files")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
