import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MasterIdleGuard } from "./MasterIdleGuard";

describe("MasterIdleGuard", () => {
  afterEach(() => vi.useRealTimers());

  it("locks after the configured idle time and resets on user activity", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    render(
      <MasterIdleGuard onIdle={onIdle} timeoutMinutes={5}>
        <p>protected</p>
      </MasterIdleGuard>,
    );

    act(() => vi.advanceTimersByTime(4 * 60 * 1000));
    fireEvent.pointerDown(globalThis.window);
    act(() => vi.advanceTimersByTime(4 * 60 * 1000));
    expect(onIdle).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(onIdle).toHaveBeenCalledOnce();
  });
});
