import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminPointsPage } from "./AdminPointsPage";

const apiMocks = vi.hoisted(() => ({
  deductAdminPoint: vi.fn(),
  deleteAdminPointHistory: vi.fn(),
  expireAdminPoints: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminPointList: vi.fn(),
  getAdminPointSummary: vi.fn(),
  grantAdminPoint: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  deductAdminPoint: apiMocks.deductAdminPoint,
  deleteAdminPointHistory: apiMocks.deleteAdminPointHistory,
  expireAdminPoints: apiMocks.expireAdminPoints,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminPointList: apiMocks.getAdminPointList,
  getAdminPointSummary: apiMocks.getAdminPointSummary,
  grantAdminPoint: apiMocks.grantAdminPoint,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AdminPointsPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("AdminPointsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("points", {
      schema: {
        fields_by_name: {
          search_field: {
            name: "search_field",
            label: "검색대상",
            description: null,
            options: [
              { label: "회원아이디", value: "mb_id" },
              { label: "내용", value: "po_content" },
            ],
          },
          search: {
            name: "search",
            label: "검색어",
            description: null,
            options: [],
          },
          mb_id: {
            name: "mb_id",
            label: "회원아이디",
            description: null,
            options: [],
          },
          point: {
            name: "point",
            label: "포인트",
            description: null,
            options: [],
          },
          po_content: {
            name: "po_content",
            label: "포인트 내용",
            description: null,
            options: [],
          },
          base_date: {
            name: "base_date",
            label: "기준일",
            description: null,
            options: [],
          },
        },
      },
      request_id: "req-point-schema",
      correlation_id: "corr-point-schema",
      server_request_id: null,
    }));
    apiMocks.getAdminPointList.mockResolvedValue({
      points: [
        {
          po_id: 10,
          mb_id: "neo1",
          po_content: "관리자 지급",
          po_point: 100,
          po_mb_point: 300,
          po_rel_table: "member",
          po_rel_id: "neo1",
          po_rel_action: "grant",
          po_datetime: "2026-03-12 10:00:00",
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
      request_id: "req-point-list",
      correlation_id: "corr-point-list",
      server_request_id: null,
    });
    apiMocks.getAdminPointSummary.mockResolvedValue({
      summary: {
        mb_id: null,
        total_point: 300,
        total_rows: 1,
      },
      request_id: "req-point-summary",
      correlation_id: "corr-point-summary",
      server_request_id: null,
    });
    apiMocks.grantAdminPoint.mockResolvedValue({
      result: {
        mb_id: "neo1",
        changed_point: 300,
        after_point: 600,
      },
      request_id: "req-point-grant",
      correlation_id: "corr-point-grant",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the split points workspace", async () => {
    renderPage();

    expect(await screen.findByText("포인트관리")).toBeInTheDocument();
    expect(await screen.findByText("조회 조건")).toBeInTheDocument();
    expect(screen.getByText("포인트 내역")).toBeInTheDocument();
    expect(screen.getByText("수동 지급 / 차감")).toBeInTheDocument();
    expect(screen.getByText("만료 처리")).toBeInTheDocument();
    expect(screen.getByText("요약")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("points");
      expect(apiMocks.getAdminPointList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminPointSummary).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByText("neo1").length).toBeGreaterThan(0);
    expect(screen.getByText("관리자 지급")).toBeInTheDocument();
  });

  it("grants points from the page action form", async () => {
    renderPage();

    const grantButton = await screen.findByRole("button", { name: "포인트 지급" });
    const actionForm = grantButton.closest("form");
    expect(actionForm).not.toBeNull();
    const actionFormScope = within(actionForm!);

    fireEvent.change(actionFormScope.getByLabelText("회원아이디"), {
      target: { value: "neo1" },
    });
    fireEvent.change(actionFormScope.getByLabelText("포인트"), {
      target: { value: "300" },
    });
    fireEvent.change(actionFormScope.getByLabelText("포인트 내용"), {
      target: { value: "관리자 수동 지급" },
    });
    fireEvent.click(grantButton);

    await waitFor(() => {
      expect(apiMocks.grantAdminPoint).toHaveBeenCalled();
      expect(apiMocks.grantAdminPoint.mock.calls[0]?.[0]).toEqual({
        mb_id: "neo1",
        po_content: "관리자 수동 지급",
        point: 300,
      });
    });
  });

  it("shows the point error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminPointList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-point-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "포인트 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-point-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/points",
      user_actionable: true,
    });

    renderPage();

    expect(
      await screen.findByText("포인트 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("uses schema labels for point filters and action forms", async () => {
    renderPage();

    expect(await screen.findByLabelText("검색대상")).toBeInTheDocument();
    expect(screen.getAllByLabelText("회원아이디").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("포인트 내용")).toBeInTheDocument();
  });
});
