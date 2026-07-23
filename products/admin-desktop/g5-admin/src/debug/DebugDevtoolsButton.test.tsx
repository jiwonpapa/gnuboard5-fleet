import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DebugDevtoolsButton } from "./DebugDevtoolsButton";

const devtoolsMocks = vi.hoisted(() => ({
  openDesktopDevtools: vi.fn().mockResolvedValue("opened"),
}));

vi.mock("./devtools", () => ({
  openDesktopDevtools: devtoolsMocks.openDesktopDevtools,
}));

describe("DebugDevtoolsButton", () => {
  it("opens desktop devtools from the launcher button", async () => {
    const user = userEvent.setup();

    render(<DebugDevtoolsButton />);

    await user.click(screen.getByRole("button", { name: "DOM 검사 열기" }));

    expect(devtoolsMocks.openDesktopDevtools).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/F11/)).toBeInTheDocument();
  });
});
