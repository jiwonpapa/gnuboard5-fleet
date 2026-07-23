import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("theme color capture regression", () => {
  it("does not leave unsupported oklch color functions in the runtime stylesheet", () => {
    const indexCssPath = resolve(import.meta.dirname, "../../index.css");
    const indexCss = readFileSync(indexCssPath, "utf8");

    expect(indexCss).not.toMatch(/\boklch\(/i);
    expect(indexCss).not.toMatch(/\boklab\(/i);
  });
});
