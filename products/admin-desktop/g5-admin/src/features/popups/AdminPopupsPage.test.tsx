import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminPopupsPage } from "./AdminPopupsPage";

const apiMocks = vi.hoisted(() => ({
  createAdminPopup: vi.fn(),
  deleteAdminPopup: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminPopup: vi.fn(),
  getAdminPopupList: vi.fn(),
  updateAdminPopup: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createAdminPopup: apiMocks.createAdminPopup,
  deleteAdminPopup: apiMocks.deleteAdminPopup,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminPopup: apiMocks.getAdminPopup,
  getAdminPopupList: apiMocks.getAdminPopupList,
  updateAdminPopup: apiMocks.updateAdminPopup,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createPopup(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    nw_begin_time: "2026-03-07 09:00:00",
    nw_content: "<p>본문</p>",
    nw_content_html: 1,
    nw_device: "both",
    nw_disable_hours: 24,
    nw_division: "both",
    nw_end_time: "2026-03-31 23:59:59",
    nw_height: 480,
    nw_id: 9,
    nw_left: 120,
    nw_subject: "봄맞이 공지",
    nw_top: 160,
    nw_width: 640,
    ...overrides,
  };
}

function getCreatePopupForm() {
  const heading = screen.getByRole("heading", { name: "팝업 생성" });
  return heading.parentElement?.nextElementSibling?.querySelector("form") as HTMLFormElement | null;
}

describe("AdminPopupsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("popups", {
      schema: {
        fields_by_name: {
          nw_division: {
            label: "구분",
            options: [
              { label: "both", value: "both" },
              { label: "comm", value: "comm" },
              { label: "shop", value: "shop" },
              { label: "layer", value: "layer" },
              { label: "new", value: "new" },
            ],
          },
          nw_device: {
            label: "디바이스",
            options: [
              { label: "both", value: "both" },
              { label: "pc", value: "pc" },
              { label: "mobile", value: "mobile" },
            ],
          },
          nw_begin_time: { label: "시작 시각" },
          nw_end_time: { label: "종료 시각" },
          nw_disable_hours: { label: "비활성 시간" },
          nw_left: { label: "좌측" },
          nw_top: { label: "상단" },
          nw_height: { label: "높이" },
          nw_width: { label: "너비" },
          nw_subject: { label: "제목" },
          nw_content: { label: "본문" },
          nw_content_html: { label: "HTML 본문" },
        },
        sections: [],
      },
    }));
    apiMocks.getAdminPopupList.mockResolvedValue({
      popups: [createPopup()],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
    });
    apiMocks.getAdminPopup.mockImplementation(async (nwId: number) => ({
      popup: createPopup({
        nw_id: nwId,
        nw_subject: nwId === 14 ? "신규 팝업" : "봄맞이 공지",
      }),
    }));
    apiMocks.createAdminPopup.mockResolvedValue({
      popup: createPopup({
        nw_id: 14,
        nw_subject: "신규 팝업",
        nw_content: "<p>안내</p>",
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders route-native popup workspace smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPopupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("팝업 관리")).toBeInTheDocument();
    expect(screen.getByText("팝업 목록")).toBeInTheDocument();
    expect(screen.getByText("선택 팝업 편집")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByLabelText("제목").length).toBeGreaterThan(0);
    });
  });

  it("shows validation when popup create is submitted without required values", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPopupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getCreatePopupForm()).not.toBeNull();
    });

    const createForm = getCreatePopupForm();
    expect(createForm).not.toBeNull();
    const createEditor = within(createForm!);

    fireEvent.change(createEditor.getByLabelText("제목"), {
      target: { value: "" },
    });
    fireEvent.change(createEditor.getByLabelText("본문"), {
      target: { value: "" },
    });
    fireEvent.submit(createForm!);

    expect(await screen.findByText("팝업 제목을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("본문을 입력해 주세요.")).toBeInTheDocument();
  });

  it("creates a popup from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPopupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getCreatePopupForm()).not.toBeNull();
    });

    const createForm = getCreatePopupForm();
    expect(createForm).not.toBeNull();
    const createEditor = within(createForm!);

    fireEvent.change(createEditor.getByLabelText("제목"), {
      target: { value: " 신규 팝업 " },
    });
    fireEvent.change(createEditor.getByLabelText("본문"), {
      target: { value: " <p>안내</p> " },
    });
    fireEvent.submit(createForm!);

    await waitFor(() => {
      expect(apiMocks.createAdminPopup).toHaveBeenCalledWith({
        nw_begin_time: null,
        nw_content: "<p>안내</p>",
        nw_content_html: 0,
        nw_device: "both",
        nw_disable_hours: 24,
        nw_division: "both",
        nw_end_time: null,
        nw_height: 400,
        nw_left: 100,
        nw_subject: "신규 팝업",
        nw_top: 100,
        nw_width: 600,
      });
    });
  });

  it("shows the popup error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminPopupList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-popup-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "팝업 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-popup-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/system/popups",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPopupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("팝업 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
