import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminSmsTemplatesPage } from "./AdminSmsTemplatesPage";

const apiMocks = vi.hoisted(() => ({
  batchAdminSmsTemplates: vi.fn(),
  clearAdminSmsTemplateGroup: vi.fn(),
  createAdminSmsTemplate: vi.fn(),
  createAdminSmsTemplateGroup: vi.fn(),
  deleteAdminSmsTemplate: vi.fn(),
  deleteAdminSmsTemplateGroup: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminSmsConfig: vi.fn(),
  getAdminSmsTemplate: vi.fn(),
  getAdminSmsTemplateGroup: vi.fn(),
  getAdminSmsTemplateGroupList: vi.fn(),
  getAdminSmsTemplateList: vi.fn(),
  moveAdminSmsTemplateGroup: vi.fn(),
  updateAdminSmsTemplate: vi.fn(),
  updateAdminSmsTemplateGroup: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  batchAdminSmsTemplates: apiMocks.batchAdminSmsTemplates,
  clearAdminSmsTemplateGroup: apiMocks.clearAdminSmsTemplateGroup,
  createAdminSmsTemplate: apiMocks.createAdminSmsTemplate,
  createAdminSmsTemplateGroup: apiMocks.createAdminSmsTemplateGroup,
  deleteAdminSmsTemplate: apiMocks.deleteAdminSmsTemplate,
  deleteAdminSmsTemplateGroup: apiMocks.deleteAdminSmsTemplateGroup,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminSmsConfig: apiMocks.getAdminSmsConfig,
  getAdminSmsTemplate: apiMocks.getAdminSmsTemplate,
  getAdminSmsTemplateGroup: apiMocks.getAdminSmsTemplateGroup,
  getAdminSmsTemplateGroupList: apiMocks.getAdminSmsTemplateGroupList,
  getAdminSmsTemplateList: apiMocks.getAdminSmsTemplateList,
  moveAdminSmsTemplateGroup: apiMocks.moveAdminSmsTemplateGroup,
  updateAdminSmsTemplate: apiMocks.updateAdminSmsTemplate,
  updateAdminSmsTemplateGroup: apiMocks.updateAdminSmsTemplateGroup,
}));

describe("AdminSmsTemplatesPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(
      completeAdminSchemaResponseForTest("sms-templates", {
        schema: {
          fields_by_name: {
            fg_name: {
              name: "fg_name",
              label: "그룹명",
              description: null,
              options: [],
            },
            fg_member: {
              name: "fg_member",
              label: "회원",
              description: null,
              options: [],
            },
            fg_no: {
              name: "fg_no",
              label: "그룹",
              description: null,
              options: [
                { label: "미분류", value: "0" },
                { label: "기본 그룹", value: "1" },
              ],
            },
            fo_name: {
              name: "fo_name",
              label: "제목",
              description: null,
              options: [],
            },
            fo_content: {
              name: "fo_content",
              label: "메세지",
              description: null,
              options: [],
            },
          },
        },
        request_id: "req-sms-templates-schema",
        correlation_id: "corr-sms-templates-schema",
        server_request_id: null,
      }),
    );
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
    apiMocks.getAdminSmsTemplateGroupList.mockResolvedValue({
      groups: [
        { fg_no: 1, fg_name: "기본 그룹", fg_member: 0, fg_count: 2 },
        { fg_no: 2, fg_name: "회원 그룹", fg_member: 1, fg_count: 1 },
      ],
      total: 2,
      request_id: "req-group-list",
      correlation_id: "corr-group-list",
      server_request_id: null,
    });
    apiMocks.getAdminSmsTemplateGroup.mockResolvedValue({
      group: { fg_no: 1, fg_name: "기본 그룹", fg_member: 0, fg_count: 2 },
      request_id: "req-group-detail",
      correlation_id: "corr-group-detail",
      server_request_id: null,
    });
    apiMocks.getAdminSmsTemplateList.mockResolvedValue({
      templates: [
        {
          fo_no: 10,
          fg_no: 1,
          fg_name: "기본 그룹",
          fo_name: "거래처 기본문구",
          fo_content: "안녕하세요. 안내드립니다.",
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
      request_id: "req-template-list",
      correlation_id: "corr-template-list",
      server_request_id: null,
    });
    apiMocks.getAdminSmsTemplate.mockImplementation(async (foNo: number) => ({
      template:
        foNo === 11
          ? {
              fo_no: 11,
              fg_no: 1,
              fg_name: "기본 그룹",
              fo_name: "신규 공지",
              fo_content: "안내 문구",
            }
          : {
              fo_no: 10,
              fg_no: 1,
              fg_name: "기본 그룹",
              fo_name: "거래처 기본문구",
              fo_content: "안녕하세요. 안내드립니다.",
            },
      request_id: `req-template-detail-${foNo}`,
      correlation_id: `corr-template-detail-${foNo}`,
      server_request_id: null,
    }));
    apiMocks.createAdminSmsTemplate.mockResolvedValue({
      template: {
        fo_no: 11,
        fg_no: 1,
        fg_name: "기본 그룹",
        fo_name: "신규 공지",
        fo_content: "안내 문구",
      },
      request_id: "req-template-create",
      correlation_id: "corr-template-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the split workspace for the templates route", async () => {
    renderPage("/admin/sms/templates");

    expect(await screen.findByText("이모티콘 관리")).toBeInTheDocument();
    expect(await screen.findByText("그룹 목록")).toBeInTheDocument();
    expect(screen.getByText("템플릿 목록")).toBeInTheDocument();
    expect(screen.getByText("템플릿 편집")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith(
        "sms-templates",
      );
      expect(apiMocks.getAdminSmsTemplateGroupList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminSmsTemplateGroup).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminSmsTemplateList).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText("거래처 기본문구")).toBeInTheDocument();
  });

  it("switches the intro title for the template groups route", async () => {
    renderPage("/admin/sms/template-groups");

    expect(await screen.findByText("이모티콘 그룹")).toBeInTheDocument();
  });

  it("does not request template storage endpoints when SMS5 tables are missing", async () => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: false,
        missing_tables: ["g5_sms5_form", "g5_sms5_form_group"],
      },
      request_id: "req-sms-config-storage-missing",
      correlation_id: "corr-sms-config-storage-missing",
      server_request_id: null,
    });

    renderPage("/admin/sms/templates");

    expect(await screen.findByText("SMS 저장소 미구성")).toBeInTheDocument();
    expect(apiMocks.getAdminSmsTemplateGroupList).not.toHaveBeenCalled();
    expect(apiMocks.getAdminSmsTemplateList).not.toHaveBeenCalled();
  });

  it("shows validation errors before creating a template", async () => {
    renderPage("/admin/sms/templates");

    const createButton = await screen.findByRole("button", {
      name: "템플릿 생성",
    });
    fireEvent.click(createButton);

    expect(
      await screen.findByText("템플릿 이름을 입력해 주십시오."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("템플릿 내용을 입력해 주십시오."),
    ).toBeInTheDocument();
  });

  it("creates a template from the page editor", async () => {
    renderPage("/admin/sms/templates");

    await screen.findByText("거래처 기본문구");
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "  신규 공지  " },
    });
    fireEvent.change(screen.getByLabelText("메세지"), {
      target: { value: "  안내 문구  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));

    await waitFor(() => {
      expect(apiMocks.createAdminSmsTemplate).toHaveBeenCalledWith({
        fg_no: 1,
        fo_name: "신규 공지",
        fo_content: "안내 문구",
      });
    });
  });

  it("shows the template error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminSmsTemplateGroupList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-sms-template-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "이모티콘 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-sms-template-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/sms/templates",
      user_actionable: true,
    });

    renderPage("/admin/sms/templates");

    expect(
      await screen.findByText("이모티콘 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("uses schema labels for template group and editor forms", async () => {
    renderPage("/admin/sms/templates");

    expect(await screen.findByLabelText("그룹명")).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("메세지")).toBeInTheDocument();
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
            <Route path="*" element={<AdminSmsTemplatesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
