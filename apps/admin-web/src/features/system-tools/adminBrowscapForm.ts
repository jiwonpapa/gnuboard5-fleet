export function parseBrowscapRows(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const rows = Number(normalized);
  return Number.isSafeInteger(rows) && rows > 0 ? rows : undefined;
}

export function validateBrowscapRows(value: string): string {
  if (!value.trim()) return "";
  return parseBrowscapRows(value) === undefined
    ? "처리 행 수는 1 이상의 정수여야 합니다."
    : "";
}
