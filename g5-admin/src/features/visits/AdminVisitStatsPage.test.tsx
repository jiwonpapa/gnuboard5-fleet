import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { AdminVisitStatsPage } from "./AdminVisitStatsPage";

const apiMocks = vi.hoisted(() => ({
  getAdminVisitStats: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminVisitStats: apiMocks.getAdminVisitStats,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("AdminVisitStatsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminVisitStats.mockResolvedValue({
      type: "date",
      summary: {
        total_visits: 120,
        active_days: 7,
        visit_rows: 120,
        unique_ips: 45,
        first_date: "2026-03-01",
        last_date: "2026-03-07",
      },
      items: [
        {
          stat_key: "2026-03-07",
          visit_count: 25,
        },
      ],
      request_id: "req-visit-stats",
      correlation_id: "corr-visit-stats",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders visit stats page smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminVisitStatsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("접속자집계")).toBeInTheDocument();
    expect(screen.getByText("집계 조건")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminVisitStats).toHaveBeenCalledWith({
        date_from: null,
        date_to: null,
        limit: 30,
        type: "date",
      });
    });

    expect(screen.getByText("집계 결과")).toBeInTheDocument();
    expect(screen.getByText("요약")).toBeInTheDocument();
    expect(screen.getAllByText("2026-03-07").length).toBeGreaterThan(0);
  });
});
