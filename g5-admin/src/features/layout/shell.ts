export const shellIconClass = "h-[1.05rem] w-[1.05rem] shrink-0 stroke-[1.85]";

export const shellControlSurfaceClass =
  "h-10 rounded-sm border border-border bg-background/96 backdrop-blur";

export function buildInitials(label: string) {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "GM";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
