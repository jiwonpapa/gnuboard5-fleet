export function toSchemaFallbackLabel(field: string) {
  return field
    .replace(/^[a-z]{2}_/, "")
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}
