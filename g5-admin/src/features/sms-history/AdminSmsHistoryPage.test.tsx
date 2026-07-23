import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../layout/theme";
import { AdminSmsHistoryPage } from "./AdminSmsHistoryPage";

const apiMocks = vi.hoisted(() => ({
  getAdminSmsConfig: vi.fn(),
  getAdminSmsDeliveryList: vi.fn(),
  getAdminSmsMessageBatch: vi.fn(),
  getAdminSmsMessageBatchList: vi.fn(),
  resendAdminSmsBatchAll: vi.fn(),
  resendAdminSmsBatchFailures: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminSmsConfig: apiMocks.getAdminSmsConfig,
  getAdminSmsDeliveryList: apiMocks.getAdminSmsDeliveryList,
  getAdminSmsMessageBatch: apiMocks.getAdminSmsMessageBatch,
  getAdminSmsMessageBatchList: apiMocks.getAdminSmsMessageBatchList,
  resendAdminSmsBatchAll: apiMocks.resendAdminSmsBatchAll,
  resendAdminSmsBatchFailures: apiMocks.resendAdminSmsBatchFailures,
}));

describe("AdminSmsHistoryPage", () => {
  beforeEach(() => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: true,
        missing_tables: [],
      },
      request_id: "req-sms-config",
      correlation_id: "corr-sms-config",
      server_request_id: null,
    });
    apiMocks.getAdminSmsMessageBatchList.mockResolvedValue({
      batches: [
        {
          wr_no: 11,
          wr_renum: 2,
          wr_message: "테스트 발송",
          wr_success: 3,
          wr_failure: 1,
          wr_datetime: "2026-03-12 11:00:00",
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
      request_id: "req-batch-list",
      correlation_id: "corr-batch-list",
      server_request_id: null,
    });
    apiMocks.getAdminSmsDeliveryList.mockResolvedValue({
      deliveries: [
        {
          hs_no: 9,
          wr_no: 11,
          wr_renum: 2,
          hs_name: "네오",
          hs_hp: "01012345678",
          hs_code: "0000",
          hs_memo: "성공",
          hs_log: null,
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
      request_id: "req-deliveries",
      correlation_id: "corr-deliveries",
      server_request_id: null,
    });
    apiMocks.getAdminSmsMessageBatch.mockResolvedValue({
      batch: {
        wr_no: 11,
        wr_renum: 2,
        wr_message: "테스트 발송",
        wr_success: 3,
        wr_failure: 1,
        duplicate_summary: { total: 0, duplicates: [] },
        deliveries: [],
        deliveries_pagination: {
          total: 0,
          page: 1,
          per_page: 20,
          last_page: 1,
          has_next: false,
          has_prev: false,
        },
      },
      request_id: "req-batch-detail",
      correlation_id: "corr-batch-detail",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the batch history workspace", async () => {
    renderPage("/admin/sms/history/batches");

    expect(await screen.findByText("전송내역-건별")).toBeInTheDocument();
    expect(screen.getByText("배치 목록")).toBeInTheDocument();
    expect(screen.getByText("배치 상세 / 재전송")).toBeInTheDocument();
    expect(await screen.findByText("테스트 발송")).toBeInTheDocument();
  });

  it("renders the delivery history workspace", async () => {
    renderPage("/admin/sms/history/deliveries");

    expect(await screen.findByText("전송내역-번호별")).toBeInTheDocument();
    expect(screen.getByText("번호별 이력 조회")).toBeInTheDocument();
    expect(await screen.findByText("네오")).toBeInTheDocument();
  });

  it("does not request history storage endpoints when SMS5 tables are missing", async () => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: false,
        missing_tables: ["g5_sms5_write", "g5_sms5_history"],
      },
      request_id: "req-sms-config-storage-missing",
      correlation_id: "corr-sms-config-storage-missing",
      server_request_id: null,
    });

    renderPage("/admin/sms/history/batches");

    expect(await screen.findByText("SMS 저장소 미구성")).toBeInTheDocument();
    expect(apiMocks.getAdminSmsMessageBatchList).not.toHaveBeenCalled();
    expect(apiMocks.getAdminSmsDeliveryList).not.toHaveBeenCalled();
  });
});

function renderPage(pathname: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[pathname]}>
          <Routes>
            <Route path="*" element={<AdminSmsHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
