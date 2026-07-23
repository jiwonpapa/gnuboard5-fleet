import { readFileSync } from "node:fs";

export const FATAL_BUILD_WARNING_PATTERNS = [
  /^Circular chunk:/m,
];

export function findFatalBuildWarnings(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.filter((line) =>
    FATAL_BUILD_WARNING_PATTERNS.some((pattern) => pattern.test(line)),
  );
}

export function extractBuiltEntryScript(indexHtmlSource) {
  const match = indexHtmlSource.match(
    /<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/i,
  );
  if (!match?.[1]) {
    throw new Error("dist/index.html에서 module entry script를 찾지 못했습니다.");
  }

  return match[1];
}

export function readBuiltEntryScript(indexHtmlPath) {
  return extractBuiltEntryScript(readFileSync(indexHtmlPath, "utf8"));
}
