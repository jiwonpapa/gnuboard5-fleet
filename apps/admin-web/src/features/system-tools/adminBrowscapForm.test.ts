import { describe, expect, it } from "vitest";

import { parseBrowscapRows, validateBrowscapRows } from "./adminBrowscapForm";

describe("adminBrowscapForm", () => {
  it("keeps an empty value as the provider default and parses positive integers", () => {
    expect(parseBrowscapRows("")).toBeUndefined();
    expect(parseBrowscapRows(" 25 ")).toBe(25);
    expect(validateBrowscapRows("25")).toBe("");
  });

  it("rejects zero, fractions and non-numeric input", () => {
    expect(validateBrowscapRows("0")).not.toBe("");
    expect(validateBrowscapRows("1.5")).not.toBe("");
    expect(validateBrowscapRows("all")).not.toBe("");
  });
});
