import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MemberProfile } from "../../types/MemberProfile";
import { AppShell } from "./AppShell";
import { ThemeProvider, devModeStorageKey } from "./theme";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

const headerVisibilityMock = vi.hoisted(() => ({
  showHeader: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  readText: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastMock.error,
    success: toastMock.success,
  },
}));

vi.mock("../../debug/DebugDock", () => ({
  DebugDock: () => <div data-testid="debug-dock">debug dock</div>,
}));

vi.mock("../../debug/DevDiagnosticsDrawer", () => ({
  DevDiagnosticsDrawer: () => (
    <div data-testid="dev-diagnostics-drawer">dev diagnostics drawer</div>
  ),
}));

vi.mock("./AppShellHeader", () => ({
  AppShellHeader: () => <div data-testid="app-shell-header">header</div>,
}));

vi.mock("./AppShellSidebar", () => ({
  AppShellSidebar: () => <div data-testid="app-shell-sidebar">sidebar</div>,
}));

vi.mock("./app-shell-refresh", () => ({
  useAppShellRefreshBridge: () => undefined,
}));

vi.mock("./useHeaderVisibility", () => ({
  useHeaderVisibility: () => ({
    headerElevated: false,
    headerVisible: true,
    showHeader: headerVisibilityMock.showHeader,
  }),
}));

const memberProfile: MemberProfile = {
  mb_email: "neo@example.com",
  mb_id: "neojins",
  mb_level: 10,
  mb_name: "Neo",
  mb_nick: "neo",
  mb_point: 1200,
};

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(devModeStorageKey, "enabled");
    toastMock.error.mockReset();
    toastMock.success.mockReset();
    headerVisibilityMock.showHeader.mockReset();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
      writable: true,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
      writable: true,
    });
    Object.defineProperty(window, "scrollX", {
      configurable: true,
      value: 24,
      writable: true,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 320,
      writable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2400,
    });
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(document.body, "clientHeight", {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(document.body, "clientWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(document.body, "scrollHeight", {
      configurable: true,
      value: 2200,
    });
    Object.defineProperty(document.body, "scrollWidth", {
      configurable: true,
      value: 1400,
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {},
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only reload in the context menu for plain surfaces", () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");

    renderShell();

    fireEvent.contextMenu(screen.getByText("workspace"), {
      clientX: 120,
      clientY: 140,
    });

    expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
  });

  it("uses the constrained admin shell viewport width contract", () => {
    const { container } = renderShell();

    const viewport = container.querySelector(".app-shell-viewport");
    expect(viewport).toHaveClass("max-w-[1500px]");
    expect(viewport).toHaveClass("min-w-[380px]");
  });

  it("applies only left padding to the main content rail", () => {
    const { container } = renderShell();

    const mainContent = container.querySelector(".app-shell-main-content");
    expect(mainContent).toHaveClass("pl-5");
    expect(mainContent).not.toHaveClass("p-5");
  });

});

function renderShell() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/overview"]}>
        <Routes>
          <Route
            element={
              <AppShell
                currentMember={memberProfile}
                isBusy={false}
                onLogout={async () => undefined}
              />
            }
          >
            <Route path="/overview" element={<div>workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
