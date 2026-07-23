import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminMailsPage } from "./AdminMailsPage";

const apiMocks = vi.hoisted(() => ({
  createAdminMailTemplate: vi.fn(),
  deleteAdminMailTemplate: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminMailRecipients: vi.fn(),
  getAdminMailTemplate: vi.fn(),
  getAdminMailTemplateList: vi.fn(),
  sendAdminMail: vi.fn(),
  updateAdminMailTemplate: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createAdminMailTemplate: apiMocks.createAdminMailTemplate,
  deleteAdminMailTemplate: apiMocks.deleteAdminMailTemplate,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminMailRecipients: apiMocks.getAdminMailRecipients,
  getAdminMailTemplate: apiMocks.getAdminMailTemplate,
  getAdminMailTemplateList: apiMocks.getAdminMailTemplateList,
  sendAdminMail: apiMocks.sendAdminMail,
  updateAdminMailTemplate: apiMocks.updateAdminMailTemplate,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={createQueryClient()}>
        <AdminMailsPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("AdminMailsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("mails", {
      schema: {
        fields_by_name: {
          ma_subject: {
            name: "ma_subject",
            label: "메일 제목",
            description: null,
            options: [],
          },
          ma_content: {
            name: "ma_content",
            label: "메일 내용",
            description: null,
            options: [],
          },
          target_type: {
            name: "target_type",
            label: "대상선택",
            description: null,
            options: [
              { label: "전체", value: "all" },
              { label: "권한", value: "level" },
              { label: "게시판그룹회원", value: "group" },
              { label: "회원 ID", value: "member" },
            ],
          },
          gr_id: {
            name: "gr_id",
            label: "게시판그룹회원",
            description: null,
            options: [],
          },
          email_contains: {
            name: "email_contains",
            label: "E-mail",
            description: "메일 주소에 포함된 문자열로 후보를 좁힙니다.",
            options: [],
          },
          use_selected_template: {
            name: "use_selected_template",
            label: "선택 템플릿 사용",
            description: null,
            options: [],
          },
          dry_run: {
            name: "dry_run",
            label: "드라이런",
            description: null,
            options: [],
          },
          subject: {
            name: "subject",
            label: "메일 제목",
            description: null,
            options: [],
          },
          content: {
            name: "content",
            label: "메일 내용",
            description: null,
            options: [],
          },
        },
      },
      request_id: "req-mail-schema",
      correlation_id: "corr-mail-schema",
      server_request_id: null,
    }));
    apiMocks.getAdminMailTemplateList.mockResolvedValue({
      mails: [
        {
          ma_id: 11,
          ma_subject: "환영 메일",
          ma_content: "안녕하세요 회원님",
          ma_time: "2026-03-12 09:00:00",
          ma_ip: "127.0.0.1",
          ma_last_option: null,
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        per_page: 10,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
      request_id: "req-templates",
      correlation_id: "corr-templates",
      server_request_id: null,
    });
    apiMocks.getAdminMailRecipients.mockResolvedValue({
      recipients: [
        {
          mb_id: "alpha",
          mb_name: "알파",
          mb_nick: "알파닉",
          mb_email: "alpha@example.com",
          mb_level: 3,
          mb_mailling: 1,
          mb_datetime: "2026-03-12 08:00:00",
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
      request_id: "req-recipients",
      correlation_id: "corr-recipients",
      server_request_id: null,
    });
    apiMocks.getAdminMailTemplate.mockResolvedValue({
      mail: {
        ma_id: 11,
        ma_subject: "환영 메일",
        ma_content: "안녕하세요 회원님",
        ma_time: "2026-03-12 09:00:00",
        ma_ip: "127.0.0.1",
        ma_last_option: null,
        last_option: {
          mb_id1: 0,
          mb_id1_from: "",
          mb_id1_to: "",
          mb_email: "",
          mb_mailling: 1,
          mb_level_from: 1,
          mb_level_to: 10,
          gr_id: "",
        },
        preview_html: "<p>미리보기 본문</p>",
      },
      request_id: "req-detail",
      correlation_id: "corr-detail",
      server_request_id: null,
    });
    apiMocks.createAdminMailTemplate.mockResolvedValue({
      mail: {
        ma_id: 12,
        ma_subject: "운영 공지",
        ma_content: "본문",
        ma_time: "2026-03-12 10:00:00",
        ma_ip: "127.0.0.1",
        ma_last_option: null,
        last_option: null,
        preview_html: "<p>본문</p>",
      },
      request_id: "req-mail-create",
      correlation_id: "corr-mail-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the mail workspace and loads selected template details", async () => {
    renderPage();

    expect(await screen.findByText("회원메일발송")).toBeInTheDocument();
    expect(await screen.findByText("템플릿 목록")).toBeInTheDocument();
    expect(screen.getByText("수신자 미리보기")).toBeInTheDocument();
    expect(screen.getByText("회원 메일 발송")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("mails");
      expect(apiMocks.getAdminMailTemplateList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminMailRecipients).toHaveBeenCalledTimes(1);
    });
  });

  it("creates a mail template from the page editor", async () => {
    renderPage();

    const createButton = await screen.findByRole("button", { name: "템플릿 생성" });
    const templateEditorForm = createButton.closest("form");
    expect(templateEditorForm).not.toBeNull();
    const templateEditor = within(templateEditorForm!);

    fireEvent.change(templateEditor.getByLabelText("메일 제목"), {
      target: { value: "  운영 공지  " },
    });
    fireEvent.change(templateEditor.getByLabelText("메일 내용"), {
      target: { value: "  본문  " },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiMocks.createAdminMailTemplate).toHaveBeenCalledWith({
        ma_subject: "운영 공지",
        ma_content: "본문",
      });
    });
  });

  it("shows the mail error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminMailTemplateList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-mail-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "회원 메일 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-mail-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/mails",
      user_actionable: true,
    });

    renderPage();

    expect(
      await screen.findByText("회원 메일 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("uses schema labels for mail recipient and send controls", async () => {
    renderPage();

    expect(await screen.findByLabelText("대상선택")).toBeInTheDocument();
    expect(screen.getAllByLabelText("메일 제목").length).toBeGreaterThan(0);
    expect(screen.getByText("메일 주소에 포함된 문자열로 후보를 좁힙니다.")).toBeInTheDocument();
  });
});
