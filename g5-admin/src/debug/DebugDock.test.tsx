import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, devModeStorageKey } from "../features/layout/theme";
import { DebugDock } from "./DebugDock";
import {
  clearDiagnostics,
  completeCommandDiagnostic,
  startCommandDiagnostic,
} from "./diagnostics";

const apiMocks = vi.hoisted(() => ({
  getDebugLogTail: vi.fn(),
  getDebugRuntimeInfo: vi.fn(),
}));

vi.mock("../api/client", () => ({
  getDebugLogTail: apiMocks.getDebugLogTail,
  getDebugRuntimeInfo: apiMocks.getDebugRuntimeInfo,
}));

function renderDebugDock() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const view = render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DebugDock />
      </QueryClientProvider>
    </ThemeProvider>,
  );

  return { ...view, queryClient };
}

describe("DebugDock", () => {
  beforeEach(() => {
    clearDiagnostics();
    window.localStorage.clear();
    window.localStorage.setItem(devModeStorageKey, "enabled");
    apiMocks.getDebugRuntimeInfo.mockResolvedValue({
      api_base_url: "http://127.0.0.1:9000/api/v1",
      debug_build: true,
      debug_overlay: true,
      log_file_path: "/tmp/g5-admin.log",
      session_storage: "memory",
      session_storage_target: "memory://session",
    });
    apiMocks.getDebugLogTail.mockResolvedValue({
      lines: ["[INFO] boot", "[INFO] ready"],
      request_id: "req-log",
      correlation_id: "corr-log",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearDiagnostics();
    window.localStorage.clear();
  });

  it("starts in compact left-dock mode and expands into the full-width panel", async () => {
    const user = userEvent.setup();
    const pendingId = startCommandDiagnostic({
      apiTarget: "/admin/members",
      area: "Admin Members",
      command: "cmd_admin_member_get_list",
      localTarget: "/members/manage",
      operation: "회원 목록 조회",
    });
    completeCommandDiagnostic(pendingId, {
      message: "server failed",
      requestId: "req-1",
      state: "error",
      status: 500,
    });
    startCommandDiagnostic({
      apiTarget: "/admin/menus",
      area: "Admin Menus",
      command: "cmd_admin_menu_get_list",
      localTarget: "/environment/menus",
      operation: "메뉴 목록 조회",
    });

    const { container } = renderDebugDock();

    expect(container.querySelector("aside")).toHaveClass("left-4", "w-fit");

    await user.click(screen.getByRole("button", { name: "디버그 독 열기" }));

    await screen.findByText("실시간 명령 추적");
    expect(container.querySelector("aside")).toHaveClass("left-4", "right-4");
    expect(screen.getByText("회원 목록 조회")).toBeInTheDocument();
    expect(screen.getByText("로컬 Rust 로그 tail")).toBeInTheDocument();
    expect(apiMocks.getDebugLogTail).toHaveBeenCalledWith(80);
  });

  it("turns off the dock and closes the expanded panel together", async () => {
    const user = userEvent.setup();

    renderDebugDock();

    await user.click(screen.getByRole("button", { name: "디버그 독 열기" }));
    await screen.findByText("실시간 명령 추적");

    await user.click(screen.getByRole("button", { name: "ON" }));

    await waitFor(() => {
      expect(screen.queryByText("실시간 명령 추적")).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem("g5-admin.debug-dock.enabled")).toBe(
      "disabled",
    );
  });

  it("collapses the expanded panel when the close action is pressed", async () => {
    const user = userEvent.setup();

    renderDebugDock();

    await user.click(screen.getByRole("button", { name: "디버그 독 열기" }));
    await screen.findByText("실시간 명령 추적");

    await user.click(screen.getByRole("button", { name: "닫기" }));

    await waitFor(() => {
      expect(screen.queryByText("실시간 명령 추적")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "디버그 독 열기" })).toBeInTheDocument();
  });

  it("does not render when development mode is off", async () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");

    renderDebugDock();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "디버그 독 열기" })).not.toBeInTheDocument();
    });
  });
});
