import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useHeaderVisibility } from "./useHeaderVisibility";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
    writable: true,
  });
}

describe("useHeaderVisibility", () => {
  beforeEach(() => {
    setScrollY(0);
  });

  it("hides after enough downward scroll and re-shows after upward recovery", () => {
    const { result } = renderHook(() => useHeaderVisibility());

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(false);

    act(() => {
      setScrollY(80);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(true);

    act(() => {
      setScrollY(180);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      setScrollY(165);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      setScrollY(160);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(true);
  });

  it("forces the header visible again when showHeader is called", () => {
    const { result } = renderHook(() => useHeaderVisibility());

    act(() => {
      setScrollY(180);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      result.current.showHeader(0);
    });

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(false);
  });

  it("starts elevated when the current scroll position is already below the header threshold", () => {
    setScrollY(24);

    const { result } = renderHook(() => useHeaderVisibility());

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(true);
  });

  it("resets hidden state when scrolling back above the hide threshold", () => {
    const { result } = renderHook(() => useHeaderVisibility());

    act(() => {
      setScrollY(220);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      setScrollY(96);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(true);
  });

  it("uses the current window scroll position when showHeader is called without an explicit value", () => {
    const { result } = renderHook(() => useHeaderVisibility());

    act(() => {
      setScrollY(220);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      setScrollY(32);
      result.current.showHeader();
    });

    expect(result.current.headerVisible).toBe(true);
    expect(result.current.headerElevated).toBe(true);
  });

  it("does not change visibility on a zero-delta scroll event", () => {
    const { result } = renderHook(() => useHeaderVisibility());

    act(() => {
      setScrollY(180);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.headerVisible).toBe(false);
  });
});
