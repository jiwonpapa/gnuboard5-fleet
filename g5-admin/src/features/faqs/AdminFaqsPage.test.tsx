import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminFaqsPage } from "./AdminFaqsPage";

const apiMocks = vi.hoisted(() => ({
  createAdminFaq: vi.fn(),
  createAdminFaqMaster: vi.fn(),
  deleteAdminFaq: vi.fn(),
  deleteAdminFaqMaster: vi.fn(),
  deleteAdminFaqMasterFooterImage: vi.fn(),
  deleteAdminFaqMasterHeaderImage: vi.fn(),
  getAdminFaq: vi.fn(),
  getAdminFaqList: vi.fn(),
  getAdminFaqMaster: vi.fn(),
  getAdminFaqMasterList: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  updateAdminFaq: vi.fn(),
  updateAdminFaqMaster: vi.fn(),
  uploadAdminFaqMasterFooterImage: vi.fn(),
  uploadAdminFaqMasterHeaderImage: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createAdminFaq: apiMocks.createAdminFaq,
  createAdminFaqMaster: apiMocks.createAdminFaqMaster,
  deleteAdminFaq: apiMocks.deleteAdminFaq,
  deleteAdminFaqMaster: apiMocks.deleteAdminFaqMaster,
  deleteAdminFaqMasterFooterImage: apiMocks.deleteAdminFaqMasterFooterImage,
  deleteAdminFaqMasterHeaderImage: apiMocks.deleteAdminFaqMasterHeaderImage,
  getAdminFaq: apiMocks.getAdminFaq,
  getAdminFaqList: apiMocks.getAdminFaqList,
  getAdminFaqMaster: apiMocks.getAdminFaqMaster,
  getAdminFaqMasterList: apiMocks.getAdminFaqMasterList,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  updateAdminFaq: apiMocks.updateAdminFaq,
  updateAdminFaqMaster: apiMocks.updateAdminFaqMaster,
  uploadAdminFaqMasterFooterImage: apiMocks.uploadAdminFaqMasterFooterImage,
  uploadAdminFaqMasterHeaderImage: apiMocks.uploadAdminFaqMasterHeaderImage,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createSchemaResponse(domain: string, fields: string[]) {
  const labels: Record<string, string> = {
    fm_subject: "마스터 제목",
    fm_order: "정렬 순서",
    fm_head_html: "상단 HTML",
    fm_tail_html: "하단 HTML",
    fm_mobile_head_html: "모바일 상단 HTML",
    fm_mobile_tail_html: "모바일 하단 HTML",
    fm_id: "FAQ 마스터 ID",
    fa_subject: "질문 제목",
    fa_order: "정렬 순서",
    fa_content: "답변 내용",
  };

  return completeAdminSchemaResponseForTest(domain, {
    schema: {
      domain,
      title: domain,
      legacy_form: `${domain}.php`,
      field_count: fields.length,
      section_count: 1,
      generated_at: "2026-03-12T00:00:00Z",
      sections: [],
      fields_by_name: Object.fromEntries(
        fields.map((field) => [
          field,
          {
            name: field,
            label: labels[field] ?? field,
            input_type: "text",
            data_type: "string",
            required: false,
            create_only: false,
            readonly_on_update: false,
            description: null,
            options: [],
          },
        ])
      ),
    },
    request_id: `req-${domain}`,
    correlation_id: `corr-${domain}`,
    server_request_id: null,
  });
}

function createPagination(total = 1) {
  return {
    total,
    page: 1,
    per_page: 20,
    last_page: 1,
    has_next: false,
    has_prev: false,
  };
}

function createMasterSummary(fmId = 3, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fm_id: fmId,
    fm_subject: "회원 FAQ",
    fm_order: 1,
    faq_count: 2,
    header_image: { exists: false, url: "", size: null, width: null, height: null },
    footer_image: { exists: false, url: "", size: null, width: null, height: null },
    ...overrides,
  };
}

function createMasterDetail(fmId = 3, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...createMasterSummary(fmId, overrides),
    fm_head_html: "",
    fm_tail_html: "",
    fm_mobile_head_html: "",
    fm_mobile_tail_html: "",
    ...overrides,
  };
}

describe("AdminFaqsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockImplementation(async (domain: string) => {
      if (domain === "faq-masters") {
        return createSchemaResponse(domain, [
          "fm_subject",
          "fm_order",
          "fm_head_html",
          "fm_tail_html",
          "fm_mobile_head_html",
          "fm_mobile_tail_html",
          "fm_himg",
          "fm_timg",
        ]);
      }

      return createSchemaResponse(domain, ["fm_id", "fa_subject", "fa_order", "fa_content"]);
    });
    apiMocks.getAdminFaqMasterList.mockResolvedValue({
      masters: [createMasterSummary()],
      pagination: createPagination(),
      request_id: "req-master-list",
      correlation_id: "corr-master-list",
      server_request_id: null,
    });
    apiMocks.getAdminFaqMaster.mockImplementation(async (fmId: number) => ({
      master: createMasterDetail(fmId, {
        fm_subject: fmId === 5 ? "신규 FAQ" : "회원 FAQ",
        faq_count: fmId === 5 ? 0 : 2,
      }),
      request_id: `req-master-detail-${fmId}`,
      correlation_id: `corr-master-detail-${fmId}`,
      server_request_id: null,
    }));
    apiMocks.getAdminFaqList.mockResolvedValue({
      faqs: [],
      pagination: createPagination(0),
      request_id: "req-faq-list",
      correlation_id: "corr-faq-list",
      server_request_id: null,
    });
    apiMocks.createAdminFaqMaster.mockResolvedValue({
      master: createMasterDetail(5, {
        fm_subject: "신규 FAQ",
        faq_count: 0,
      }),
      request_id: "req-master-create",
      correlation_id: "corr-master-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders FAQ master workspace and waits for master selection before FAQ items", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminFaqsPage />
        </QueryClientProvider>
      </ThemeProvider>
    );

    expect(await screen.findByText("FAQ관리")).toBeInTheDocument();
    expect(screen.getByText("FAQ 마스터")).toBeInTheDocument();
    expect(screen.getByText("FAQ 문항")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFaqMasterList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText("회원 FAQ")).toBeInTheDocument();
    expect(
      screen.getByText(
        "먼저 좌측에서 FAQ 마스터를 선택해 주십시오. 선택된 마스터를 기준으로 문항 목록과 생성 폼이 열립니다."
      )
    ).toBeInTheDocument();
  });

  it("shows master validation when create is submitted without a title", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminFaqsPage />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(apiMocks.getAdminFaqMasterList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("faq-masters");
    });
    expect(await screen.findByText("회원 FAQ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "마스터 생성" }));

    expect(
      await screen.findByText("마스터 제목을 입력해 주십시오.")
    ).toBeInTheDocument();
  });

  it("creates an FAQ master from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminFaqsPage />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(apiMocks.getAdminFaqMasterList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("faq-masters");
    });
    expect(await screen.findByText("회원 FAQ")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("마스터 제목"), {
      target: { value: "  신규 FAQ  " },
    });
    fireEvent.change(screen.getByLabelText("정렬 순서"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "마스터 생성" }));

    await waitFor(() => {
      expect(apiMocks.createAdminFaqMaster).toHaveBeenCalledWith({
        fm_subject: "신규 FAQ",
        fm_order: 2,
        fm_head_html: null,
        fm_tail_html: null,
        fm_mobile_head_html: null,
        fm_mobile_tail_html: null,
      });
      expect(apiMocks.getAdminFaqMaster).toHaveBeenCalledWith(5);
      expect(apiMocks.getAdminFaqList).toHaveBeenCalledWith({
        fm_id: 5,
        page: 1,
        per_page: 20,
      });
    });
  });

  it("shows the faq error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminFaqMasterList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-faq-master-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "FAQ 마스터 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-faq-master-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/faq-masters",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminFaqsPage />
        </QueryClientProvider>
      </ThemeProvider>
    );

    expect(
      await screen.findByText("FAQ 마스터 API를 찾을 수 없습니다.")
    ).toBeInTheDocument();
  });
});
