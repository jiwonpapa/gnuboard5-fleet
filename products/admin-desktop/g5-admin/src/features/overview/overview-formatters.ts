export function formatActivityAction(action: string) {
  return action
    .split(".")
    .filter(Boolean)
    .map((token, index) =>
      index === 0 ? token.toUpperCase() : token.replace(/_/g, " "),
    )
    .join(" · ");
}

export function formatCount(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return "데이터 없음";
  }

  return `${value.toLocaleString("ko-KR")}${unit}`;
}

export function formatLastSeen(value: string | null | undefined) {
  return value ? `최근 ${value}` : null;
}

export function formatParts(parts: Array<string | null | undefined>) {
  const values = parts.filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );

  return values.length > 0 ? values.join(" · ") : undefined;
}
