import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { AdminReportsPage } from "./AdminReportsPage";

const apiMocks = vi.hoisted(() => ({
  getAdminReportList: vi.fn(),
  getAdminReportStats: vi.fn(),
  updateAdminReport: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminReportList: apiMocks.getAdminReportList,
  getAdminReportStats: apiMocks.getAdminReportStats,
  updateAdminReport: apiMocks.updateAdminReport,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("AdminReportsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminReportStats.mockResolvedValue({
      stats: {
        total: 5,
        pending: 2,
        approved: 1,
        rejected: 1,
        hold: 1,
      },
      request_id: "req-report-stats",
      correlation_id: "corr-report-stats",
      server_request_id: null,
    });
    apiMocks.getAdminReportList.mockResolvedValue({
      reports: [
        {
          rp_id: 41,
          mb_id: "admin",
          rp_target_type: "post",
          rp_target_id: "wr_10",
          rp_reason: "스팸",
          rp_detail: "중복 홍보 댓글",
          rp_status: "pending",
          rp_admin_memo: null,
          rp_datetime: "2026-03-13 10:00:00",
          rp_processed_at: null,
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
      request_id: "req-report-list",
      correlation_id: "corr-report-list",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders reports workspace smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminReportsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("신고 관리")).toBeInTheDocument();
    expect(screen.getByText("신고 목록")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminReportStats).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminReportList).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("통계")).toBeInTheDocument();
    expect(screen.getByText("신고 처리")).toBeInTheDocument();
    expect(screen.getByText("#41")).toBeInTheDocument();
    expect(screen.getByText("스팸")).toBeInTheDocument();
  });
});
