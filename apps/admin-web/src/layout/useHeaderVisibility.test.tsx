import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHeaderVisibility } from "./useHeaderVisibility";

describe("useHeaderVisibility", () => {
  it("hides on downward scroll and returns on upward scroll", () => {
    let scrollY = 0;
    Object.defineProperty(globalThis, "scrollY", {
      configurable: true,
      get: () => scrollY,
    });
    const { result } = renderHook(() => useHeaderVisibility(24));
    act(() => {
      scrollY = 80;
      globalThis.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
    act(() => {
      scrollY = 40;
      globalThis.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);
  });
});
