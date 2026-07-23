import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DebugDockCompact } from "./DebugDockCompact";

describe("DebugDockCompact", () => {
  it("opens the dock when enabled and collapses it when toggled off", async () => {
    const user = userEvent.setup();
    const setEnabled = vi.fn();
    const setExpanded = vi.fn();

    render(
      <DebugDockCompact
        enabled
        entriesCount={3}
        errorCount={1}
        expanded={false}
        pendingCount={2}
        setEnabled={setEnabled}
        setExpanded={setExpanded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "디버그 독 열기" }));
    expect(setExpanded).toHaveBeenCalledTimes(1);
    expect(setExpanded.mock.calls[0]?.[0](false)).toBe(true);

    await user.click(screen.getByRole("button", { name: "디버그 독 끄기" }));

    expect(setEnabled).toHaveBeenCalledTimes(1);
    const enabledUpdater = setEnabled.mock.calls[0]?.[0];
    expect(enabledUpdater(true)).toBe(false);
    expect(setExpanded).toHaveBeenCalledTimes(2);
    expect(setExpanded.mock.calls[1]?.[0](true)).toBe(false);
  });

  it("stays disabled until the dock is re-enabled", () => {
    render(
      <DebugDockCompact
        enabled={false}
        entriesCount={0}
        errorCount={0}
        expanded={false}
        pendingCount={0}
        setEnabled={vi.fn()}
        setExpanded={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "디버그 독 비활성화됨" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "디버그 독 켜기" })).toBeEnabled();
  });
});
