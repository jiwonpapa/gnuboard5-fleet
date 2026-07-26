import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("theme color regression", () => {
  it("preserves the Fleet ink, accent and danger semantic tokens", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toContain("--ink: #202523");
    expect(styles).toContain("--accent: #147d78");
    expect(styles).toContain("--danger: #9c4133");
  });
});
