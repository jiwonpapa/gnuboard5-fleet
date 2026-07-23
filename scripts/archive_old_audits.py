#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import re
import shutil
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
AUDIT_DIR = PROJECT_ROOT / "specs" / "audits"
ARCHIVE_DIR = PROJECT_ROOT / "specs" / "archive" / "audits"
AUDIT_NAME = re.compile(r"^(?P<date>\d{4}-\d{2}-\d{2})[-_].+\.md$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Move expired audit markdown files into specs/archive."
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=7,
        help="Number of days to keep dated audit files in specs/audits.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print files that would move without changing the filesystem.",
    )
    return parser.parse_args()


def iter_expired_files(retention_days: int) -> list[tuple[Path, dt.date]]:
    today = dt.date.today()
    expired: list[tuple[Path, dt.date]] = []

    if not AUDIT_DIR.exists():
        return expired

    for path in sorted(AUDIT_DIR.glob("*.md")):
        if path.name == "README.md":
            continue

        match = AUDIT_NAME.match(path.name)
        if not match:
            continue

        file_date = dt.date.fromisoformat(match.group("date"))
        if (today - file_date).days > retention_days:
            expired.append((path, file_date))

    return expired


def archive_file(path: Path, file_date: dt.date, dry_run: bool) -> None:
    target_dir = ARCHIVE_DIR / str(file_date.year)
    target = target_dir / path.name

    if target.exists():
        raise SystemExit(f"archive target already exists: {target}")

    print(f"{path.relative_to(PROJECT_ROOT)} -> {target.relative_to(PROJECT_ROOT)}")
    if dry_run:
        return

    target_dir.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), str(target))


def main() -> int:
    args = parse_args()
    expired = iter_expired_files(args.retention_days)

    if not expired:
        print("No expired audit files found.")
        return 0

    for path, file_date in expired:
        archive_file(path, file_date, args.dry_run)

    print(f"Archived {len(expired)} audit file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
