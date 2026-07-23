import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevDiagnosticsDrawer } from "./DevDiagnosticsDrawer";
import {
  clearDiagnostics,
  completeCommandDiagnostic,
  startCommandDiagnostic,
} from "./diagnostics";
import { clearPageDiagnostics, usePageDiagnostics } from "./page-diagnostics";

const apiMocks = vi.hoisted(() => ({
  getDebugRuntimeInfo: vi.fn(),
}));

vi.mock("../api/client", () => ({
  getDebugRuntimeInfo: apiMocks.getDebugRuntimeInfo,
}));

function DiagnosticsSource() {
  usePageDiagnostics({
    commands: [
      {
        apiTarget: "/admin/config",
        command: "cmd_admin_config_get",
        label: "기본환경설정 조회",
      },
      {
        apiTarget: "/admin/schema/config",
        command: "cmd_admin_schema_get",
        label: "config 스키마 조회",
      },
    ],
    description: "config 도메인 REST 소비 경로를 표시합니다.",
    items: [
      { label: "사이트 제목", value: "그누보드5" },
      { label: "관리자 이메일", value: "admin@example.com" },
      { label: "변경 여부", value: true },
    ],
    title: "기본환경설정",
  });

  return <div>page</div>;
}

function renderDrawer() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DiagnosticsSource />
      <DevDiagnosticsDrawer
        activeDescription="기본환경설정 화면"
        activeGroupLabel="환경설정"
        activeLabel="기본환경설정"
      />
    </QueryClientProvider>,
  );
}

describe("DevDiagnosticsDrawer", () => {
  beforeEach(() => {
    clearDiagnostics();
    clearPageDiagnostics();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query.includes("min-width"),
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    apiMocks.getDebugRuntimeInfo.mockResolvedValue({
      active_site_id: "site-1",
      active_site_name: "그누보드5",
      api_base_url: "http://127.0.0.1:9000/api/v1",
      correlation_id: "corr-runtime",
      database_path: "/tmp/g5-admin.db",
      debug_build: true,
      debug_overlay: true,
      log_file_path: "/tmp/g5-admin.log",
      request_id: "req-runtime",
      server_request_id: null,
      session_storage: "file",
      session_storage_target: "file://session",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearDiagnostics();
    clearPageDiagnostics();
    vi.unstubAllGlobals();
  });

  it("opens a right-side diagnostics drawer with page API targets and runtime info", async () => {
    const user = userEvent.setup();
    const requestId = startCommandDiagnostic({
      apiTarget: "/admin/config",
      area: "Admin Config",
      command: "cmd_admin_config_get",
      operation: "기본환경설정 조회",
    });
    completeCommandDiagnostic(requestId, {
      correlationId: "corr-config",
      requestId: "req-config",
      serverRequestId: "srv-config",
      state: "success",
      status: 200,
    });

    renderDrawer();

    await user.click(screen.getByRole("button", { name: "개발 진단" }));

    expect(await screen.findByText("현재 화면이 소비하는 API")).toBeInTheDocument();
    expect(screen.getAllByText("기본환경설정 조회").length).toBeGreaterThan(0);
    expect(screen.getByText("config 스키마 조회")).toBeInTheDocument();
    expect(screen.getAllByText("/admin/config").length).toBeGreaterThan(0);
    expect(
      screen.getByText("http://127.0.0.1:9000/api/v1/admin/config"),
    ).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, node) => node?.textContent?.includes("req-config") ?? false,
      ).length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(apiMocks.getDebugRuntimeInfo).toHaveBeenCalledTimes(1);
    });
  });

  it("marks the drawer content as non-draggable and text-selectable", async () => {
    const user = userEvent.setup();

    renderDrawer();

    await user.click(screen.getByRole("button", { name: "개발 진단" }));

    const drawer = await screen.findByTestId("dev-diagnostics-drawer");
    expect(drawer).toHaveAttribute("data-vaul-no-drag");
    expect(drawer.className).toContain("select-text");
  });
});
