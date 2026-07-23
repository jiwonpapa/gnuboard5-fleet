#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TIMINGS_DIR = ROOT / "target" / "cargo-timings"
UNIT_DATA_PATTERN = re.compile(r"const UNIT_DATA = (\[.*?\]);", re.S)
SUMMARY_LABELS = {
    "Total time:": "total_time",
    "Fresh units:": "fresh_units",
    "Dirty units:": "dirty_units",
    "Total units:": "total_units",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cargo --timings HTML 리포트에서 병목 크레이트를 요약합니다.",
    )
    parser.add_argument(
        "--html",
        help="cargo timing HTML 경로. 생략하면 target/cargo-timings 최신 파일을 사용합니다.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="출력할 상위 항목 수",
    )
    return parser.parse_args()


def resolve_report(path_arg: str | None) -> Path:
    if path_arg:
        path = Path(path_arg).resolve()
        if not path.is_file():
            raise SystemExit(f"timing report 파일이 없습니다: {path}")
        return path

    candidates = sorted(
        TIMINGS_DIR.glob("cargo-timing-*.html"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise SystemExit(
            f"{TIMINGS_DIR} 아래 cargo timing report 가 없습니다. 먼저 cargo build --timings 를 실행해 주세요."
        )
    return candidates[0]


def parse_report(path: Path) -> tuple[list[dict[str, Any]], dict[str, str]]:
    text = path.read_text(encoding="utf-8")
    match = UNIT_DATA_PATTERN.search(text)
    if match is None:
        raise SystemExit(f"{path} 에서 UNIT_DATA 를 찾지 못했습니다.")

    units = json.loads(match.group(1))
    summary: dict[str, str] = {}
    for label, key in SUMMARY_LABELS.items():
        summary_match = re.search(rf"<td>{re.escape(label)}</td><td>(.*?)</td>", text)
        if summary_match is not None:
            summary[key] = summary_match.group(1)

    return units, summary


def normalize_features(features: list[str]) -> tuple[str, ...]:
    return tuple(sorted(features))


def print_individual_top(units: list[dict[str, Any]], top: int) -> None:
    print("Top individual compile units")
    for index, unit in enumerate(
        sorted(units, key=lambda item: float(item.get("duration", 0) or 0), reverse=True)[:top],
        start=1,
    ):
        duration = float(unit.get("duration", 0) or 0)
        target = str(unit.get("target") or "").strip() or "-"
        mode = str(unit.get("mode") or "-")
        print(f"{index:>2}. {duration:>6.2f}s  {unit['name']}  target={target}  mode={mode}")


def print_aggregate_top(units: list[dict[str, Any]], top: int) -> None:
    totals: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)
    for unit in units:
        name = str(unit["name"])
        totals[name] += float(unit.get("duration", 0) or 0)
        counts[name] += 1

    print("\nTop aggregate crate cost")
    for index, (name, duration) in enumerate(
        sorted(totals.items(), key=lambda item: item[1], reverse=True)[:top],
        start=1,
    ):
        print(f"{index:>2}. {duration:>6.2f}s  {name}  units={counts[name]}")


def print_duplicate_feature_builds(units: list[dict[str, Any]], top: int) -> None:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for unit in units:
        grouped[(str(unit["name"]), str(unit.get("version") or ""))].append(unit)

    duplicates: list[tuple[float, str, str, int, list[tuple[str, ...]]]] = []
    for (name, version), group in grouped.items():
        feature_sets = {normalize_features(list(unit.get("features") or [])) for unit in group if unit.get("target", "") == ""}
        if len(feature_sets) < 2:
            continue
        total_duration = sum(float(unit.get("duration", 0) or 0) for unit in group)
        duplicates.append((total_duration, name, version, len(group), sorted(feature_sets)))

    if not duplicates:
        return

    print("\nCrates compiled multiple times with different feature sets")
    for index, (duration, name, version, count, feature_sets) in enumerate(
        sorted(duplicates, key=lambda item: item[0], reverse=True)[:top],
        start=1,
    ):
        preview = " | ".join(
            ",".join(features[:6]) + ("..." if len(features) > 6 else "")
            for features in feature_sets[:3]
        )
        print(f"{index:>2}. {duration:>6.2f}s  {name} {version}  units={count}  feature_sets={preview}")


def main() -> int:
    args = parse_args()
    report_path = resolve_report(args.html)
    units, summary = parse_report(report_path)

    print(f"Report: {report_path.relative_to(ROOT)}")
    if summary:
        print(
            "Summary: "
            f"total_time={summary.get('total_time', 'n/a')}, "
            f"fresh={summary.get('fresh_units', 'n/a')}, "
            f"dirty={summary.get('dirty_units', 'n/a')}, "
            f"units={summary.get('total_units', 'n/a')}"
        )
    print()

    print_individual_top(units, args.top)
    print_aggregate_top(units, args.top)
    print_duplicate_feature_builds(units, args.top)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
