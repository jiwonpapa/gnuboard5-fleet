import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DebugDockPanel } from "./DebugDockPanel";
import type { CommandDiagnosticEntry } from "./diagnostics";
import type { DebugLogTailResponse } from "../types/DebugLogTailResponse";
import type { DebugRuntimeInfo } from "../types/DebugRuntimeInfo";

const diagnosticsMocks = vi.hoisted(() => ({
  clearDiagnostics: vi.fn(),
}));

vi.mock("./diagnostics", async () => {
  const actual = await vi.importActual<typeof import("./diagnostics")>("./diagnostics");
  return {
    ...actual,
    clearDiagnostics: diagnosticsMocks.clearDiagnostics,
  };
});

function createQueryResult<T>(
  overrides: Record<string, unknown>,
): UseQueryResult<T, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    ...overrides,
  } as unknown as UseQueryResult<T, Error>;
}

describe("DebugDockPanel", () => {
  it("renders empty and log-error states and wires control buttons", async () => {
    const user = userEvent.setup();
    const setExpanded = vi.fn();

    render(
      <DebugDockPanel
        entries={[]}
        logTailQuery={createQueryResult<DebugLogTailResponse>({
          error: new Error("tail failed"),
          isError: true,
          status: "error",
        })}
        runtimeInfoQuery={createQueryResult<DebugRuntimeInfo>({
          data: undefined,
        })}
        setExpanded={setExpanded}
      />,
    );

    expect(screen.getByText("아직 추적된 요청이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("로그 tail 조회 실패: tail failed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "기록 비우기" }));
    await user.click(screen.getByRole("button", { name: "접기" }));

    expect(diagnosticsMocks.clearDiagnostics).toHaveBeenCalledTimes(1);
    expect(setExpanded).toHaveBeenCalledWith(false);
  });

  it("renders trace metadata and log lines for populated entries", () => {
    const entry: CommandDiagnosticEntry = {
      apiTarget: "/admin/menus",
      area: "Admin Menus",
      code: "MENU_ERROR",
      command: "cmd_admin_menu_get_list",
      completedAt: "2026-03-08T15:00:02+09:00",
      correlationId: "corr-1",
      durationMs: 128,
      errorCategory: "application",
      faultDomain: "php",
      id: "diag-1",
      localTarget: "/environment/menus",
      message: "menu failed",
      operation: "메뉴 목록 조회",
      owner: "server",
      requestId: "req-1",
      retryable: false,
      serverRequestId: "srv-1",
      startedAt: "2026-03-08T15:00:00+09:00",
      state: "error",
      status: 500,
      userActionable: true,
    };

    render(
      <DebugDockPanel
        entries={[entry]}
        logTailQuery={createQueryResult<DebugLogTailResponse>({
          data: {
            correlation_id: "corr-log",
            lines: ["[INFO] boot", "[ERROR] menu failed"],
            request_id: "req-log",
            server_request_id: null,
          },
        })}
        runtimeInfoQuery={createQueryResult<DebugRuntimeInfo>({
          data: {
            api_base_url: "http://127.0.0.1:9000/api/v1",
            debug_build: true,
            debug_overlay: true,
            log_file_path: "/tmp/g5-admin.log",
            session_storage: "memory",
            session_storage_target: "memory://session",
          },
        })}
        setExpanded={vi.fn()}
      />,
    );

    expect(screen.getByText("메뉴 목록 조회")).toBeInTheDocument();
    expect(screen.getByText(/api_target:/)).toBeInTheDocument();
    expect(screen.getByText(/local_target:/)).toBeInTheDocument();
    expect(screen.getByText(/code:/)).toBeInTheDocument();
    expect(screen.getByText(/message:/)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("[ERROR] menu failed")),
    ).toBeInTheDocument();
  });
});
