import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayToolbar } from "./DisplayToolbar";
import { devModeStorageKey, themeStorageKey, ThemeProvider } from "./theme";

describe("DisplayToolbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query.includes("prefers-color-scheme") ? false : false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  it("persists the development mode toggle", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(devModeStorageKey, "disabled");

    render(
      <ThemeProvider>
        <DisplayToolbar />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "개발 모드 켜기" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(devModeStorageKey)).toBe("enabled");
    });
  });

  it("toggles between light and dark modes from the toolbar", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <DisplayToolbar />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "테마 전환 (현재 라이트)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "테마 전환 (현재 라이트)" }));
    await waitFor(() => {
      expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
      expect(document.documentElement.dataset.themeMode).toBe("dark");
      expect(document.documentElement.dataset.resolvedTheme).toBe("dark");
    });

    await user.click(screen.getByRole("button", { name: "테마 전환 (현재 다크)" }));
    await waitFor(() => {
      expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
      expect(document.documentElement.dataset.themeMode).toBe("light");
      expect(document.documentElement.dataset.resolvedTheme).toBe("light");
    });
  });
});
