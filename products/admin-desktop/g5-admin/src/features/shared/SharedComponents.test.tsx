import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommandError } from "../../api/client";
import { ThemeProvider, devModeStorageKey } from "../layout/theme";
import { ErrorBanner } from "./ErrorBanner";
import { ListPagination } from "./ListPagination";
import { SelectionPlaceholder } from "./SelectionPlaceholder";

const commandError = {
  message: "요청 실패",
  detail: "detail text",
  operation: "list",
  area: "members",
  command: "cmd_admin_member_list",
  local_target: "/members/manage",
  target: "/admin/members",
  status: 500,
  code: "SERVER_ERROR",
  request_id: "req-1",
  correlation_id: "corr-1",
  server_request_id: "srv-1",
  owner: "server",
  fault_domain: "php",
  error_category: "application",
  retryable: false,
  user_actionable: true,
  occurred_at: "2026-03-08T14:00:00+09:00",
  guide: {
    reason: "서버 예외",
    action: "로그를 확인하십시오.",
  },
  debug_summary: "trace summary",
} satisfies CommandError;

describe("shared components", () => {
  it("renders the error banner with guide and diagnostics", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    render(
      <ThemeProvider>
        <ErrorBanner error={commandError} />
      </ThemeProvider>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("요청 실패")).toBeInTheDocument();
    expect(screen.getByText(/조치:/)).toBeInTheDocument();
    expect(screen.getByText("trace summary")).toBeInTheDocument();
  });

  it("renders pagination and fires navigation handlers", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(
      <ListPagination
        hasNext
        hasPrev
        isBusy={false}
        onNext={onNext}
        onPrev={onPrev}
        page={2}
        total={40}
        totalPages={4}
      />,
    );

    fireEvent.click(screen.getByText("이전"));
    fireEvent.click(screen.getByText("다음"));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/page 2 \/ 4/)).toBeInTheDocument();
  });

  it("renders selection placeholder text", () => {
    render(<SelectionPlaceholder description="선택해 주십시오." />);

    expect(screen.getByText("선택해 주십시오.")).toBeInTheDocument();
  });
});
