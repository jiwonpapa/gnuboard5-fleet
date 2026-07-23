import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { AdminLayoutsPage } from "./AdminLayoutsPage";

const apiMocks = vi.hoisted(() => ({
  addAdminLayoutWidget: vi.fn(),
  deleteAdminLayoutWidget: vi.fn(),
  getAdminLayout: vi.fn(),
  getAdminLayoutList: vi.fn(),
  reorderAdminLayoutWidgets: vi.fn(),
  saveAdminLayout: vi.fn(),
  updateAdminLayoutWidget: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  addAdminLayoutWidget: apiMocks.addAdminLayoutWidget,
  deleteAdminLayoutWidget: apiMocks.deleteAdminLayoutWidget,
  getAdminLayout: apiMocks.getAdminLayout,
  getAdminLayoutList: apiMocks.getAdminLayoutList,
  reorderAdminLayoutWidgets: apiMocks.reorderAdminLayoutWidgets,
  saveAdminLayout: apiMocks.saveAdminLayout,
  updateAdminLayoutWidget: apiMocks.updateAdminLayoutWidget,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AdminLayoutsPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("AdminLayoutsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminLayoutList.mockResolvedValue({
      layouts: [
        {
          sl_page_id: "dashboard",
          sl_title: "대시보드",
          sl_active: 1,
          sl_updated: "2026-03-12 10:00:00",
          sl_datetime: "2026-03-11 09:00:00",
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
      request_id: "req-layout-list",
      correlation_id: "corr-layout-list",
      server_request_id: null,
    });
    apiMocks.getAdminLayout.mockResolvedValue({
      layout: {
        sl_page_id: "dashboard",
        sl_title: "대시보드",
        sl_active: 1,
        sl_updated: "2026-03-12 10:00:00",
        sl_datetime: "2026-03-11 09:00:00",
        sl_schema: JSON.stringify({
          widgets: [
            {
              widget_id: "hero",
              type: "html_block",
              title: "히어로",
              order: 1,
            },
          ],
        }),
      },
      request_id: "req-layout-detail",
      correlation_id: "corr-layout-detail",
      server_request_id: null,
    });
    apiMocks.saveAdminLayout.mockResolvedValue({
      layout: {
        sl_page_id: "campaign",
        sl_title: "캠페인 랜딩",
        sl_active: 0,
        sl_updated: "2026-03-12 11:00:00",
        sl_datetime: "2026-03-12 11:00:00",
        sl_schema: JSON.stringify({
          widgets: [
            {
              widget_id: "hero",
              type: "html_block",
              title: "히어로",
              order: 1,
            },
          ],
        }),
      },
      request_id: "req-layout-save",
      correlation_id: "corr-layout-save",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the split layouts workspace", async () => {
    renderPage();

    expect(await screen.findByText("레이아웃 관리")).toBeInTheDocument();
    expect(screen.getByText("레이아웃 목록")).toBeInTheDocument();
    expect(screen.getByText("새 레이아웃 저장")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminLayoutList).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("위젯 작업")).toBeInTheDocument();
    expect(screen.getAllByText("레이아웃 저장").length).toBeGreaterThan(0);

    expect(screen.getAllByText("대시보드").length).toBeGreaterThan(0);
    expect(screen.getByText(/hero · html_block/)).toBeInTheDocument();
  });

  it("keeps 신규 레이아웃 저장 버튼 비활성화 when page_id is empty", async () => {
    renderPage();

    expect(await screen.findByText("새 레이아웃 저장")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "신규 레이아웃 저장" }),
    ).toBeDisabled();
  });

  it("saves the selected layout from the page", async () => {
    renderPage();
    const layoutSaveButton = (await screen.findAllByRole("button", {
      name: "레이아웃 저장",
    }))[0];
    fireEvent.click(layoutSaveButton!);

    await waitFor(() => {
      expect(apiMocks.saveAdminLayout).toHaveBeenCalled();
      expect(apiMocks.saveAdminLayout.mock.calls[0]?.[0]?.page_id).toBe("dashboard");
      expect(apiMocks.saveAdminLayout.mock.calls[0]?.[0]?.title).toBe("대시보드");
      expect(
        JSON.parse(apiMocks.saveAdminLayout.mock.calls[0]?.[0]?.widgets_json ?? "[]"),
      ).toEqual([
        {
          order: 1,
          title: "히어로",
          type: "html_block",
          widget_id: "hero",
        },
      ]);
    });
  });

  it("shows the layout error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminLayoutList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-layout-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "레이아웃 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-layout-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/layouts",
      user_actionable: true,
    });

    renderPage();

    expect(
      await screen.findByText("레이아웃 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
