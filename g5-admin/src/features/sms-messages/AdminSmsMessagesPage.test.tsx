import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminSmsMessagesPage } from "./AdminSmsMessagesPage";

const apiMocks = vi.hoisted(() => ({
  getAdminFieldSchema: vi.fn(),
  getAdminSmsConfig: vi.fn(),
  getAdminSmsContactGroupList: vi.fn(),
  getAdminSmsTemplateList: vi.fn(),
  sendAdminSmsMessage: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminSmsConfig: apiMocks.getAdminSmsConfig,
  getAdminSmsContactGroupList: apiMocks.getAdminSmsContactGroupList,
  getAdminSmsTemplateList: apiMocks.getAdminSmsTemplateList,
  sendAdminSmsMessage: apiMocks.sendAdminSmsMessage,
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
        <AdminSmsMessagesPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("AdminSmsMessagesPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(
      completeAdminSchemaResponseForTest("sms-messages", {
        schema: {
          fields_by_name: {
            template_id: {
              name: "template_id",
              label: "이모티콘 목록",
              description: null,
              options: [],
            },
            message: {
              name: "message",
              label: "내용",
              description: null,
              options: [],
            },
            wr_reply: {
              name: "wr_reply",
              label: "회신",
              description: null,
              options: [],
            },
            group_ids_csv: {
              name: "group_ids_csv",
              label: "그룹",
              description: "쉼표 또는 줄바꿈으로 그룹 번호를 입력합니다.",
              options: [],
            },
            contact_ids_csv: {
              name: "contact_ids_csv",
              label: "개인",
              description: "쉼표 또는 줄바꿈으로 연락처 번호를 입력합니다.",
              options: [],
            },
            member_levels_csv: {
              name: "member_levels_csv",
              label: "권한",
              description: "쉼표 또는 줄바꿈으로 회원 레벨을 입력합니다.",
              options: [],
            },
            manual_targets_text: {
              name: "manual_targets_text",
              label: "받는사람",
              description: "한 줄에 이름과 번호를 입력합니다.",
              options: [],
            },
            booking_at: {
              name: "booking_at",
              label: "예약전송",
              description: null,
              options: [],
            },
          },
        },
        request_id: "req-sms-messages-schema",
        correlation_id: "corr-sms-messages-schema",
        server_request_id: null,
      }),
    );
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: true,
        storage_ready: true,
        missing_tables: [],
      },
      request_id: "req-sms-config",
      correlation_id: "corr-sms-config",
      server_request_id: null,
    });
    apiMocks.getAdminSmsContactGroupList.mockResolvedValue({
      groups: [
        {
          bg_no: 3,
          bg_name: "VIP 고객",
          bg_count: 12,
        },
      ],
      request_id: "req-sms-groups",
      correlation_id: "corr-sms-groups",
      server_request_id: null,
    });
    apiMocks.getAdminSmsTemplateList.mockResolvedValue({
      templates: [
        {
          fo_no: 7,
          fo_name: "안내 템플릿",
        },
      ],
      request_id: "req-sms-templates",
      correlation_id: "corr-sms-templates",
      server_request_id: null,
    });
    apiMocks.sendAdminSmsMessage.mockResolvedValue({
      result: {
        write_no: 99,
        write_renum: 1,
        total: 1,
        success: 1,
        failure: 0,
      },
      request_id: "req-sms-send",
      correlation_id: "corr-sms-send",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders sms message send page smoke", async () => {
    renderPage();

    expect(await screen.findByText("문자 보내기")).toBeInTheDocument();
    expect(await screen.findByText("발송 작성")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("sms-messages");
      expect(apiMocks.getAdminSmsConfig).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminSmsContactGroupList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminSmsTemplateList).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("빠른 그룹 선택")).toBeInTheDocument();
    expect(screen.getByText("VIP 고객")).toBeInTheDocument();
    expect(screen.getByText("발송 요약")).toBeInTheDocument();
    expect(screen.getByText("READY")).toBeInTheDocument();
  });

  it("keeps 문자 발송 버튼 비활성화 when provider is not ready", async () => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: true,
        missing_tables: [],
      },
      request_id: "req-sms-config-disabled",
      correlation_id: "corr-sms-config-disabled",
      server_request_id: null,
    });

    renderPage();

    expect(await screen.findByText("문자 보내기")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "문자 발송" }),
    ).toBeDisabled();
  });

  it("sends an sms message from the page", async () => {
    const view = renderPage();
    await screen.findByText("발송 작성");

    const messageField = view.container.querySelector(
      'textarea[name="message"]',
    ) as HTMLTextAreaElement | null;
    const manualTargetsField = view.container.querySelector(
      'textarea[name="manual_targets_text"]',
    ) as HTMLTextAreaElement | null;
    const replyField = view.container.querySelector(
      'input[name="wr_reply"]',
    ) as HTMLInputElement | null;

    expect(messageField).not.toBeNull();
    expect(manualTargetsField).not.toBeNull();
    expect(replyField).not.toBeNull();

    fireEvent.change(messageField!, {
      target: { value: "운영 공지" },
    });
    fireEvent.change(manualTargetsField!, {
      target: { value: "홍길동,010-1234-5678" },
    });
    fireEvent.change(replyField!, {
      target: { value: "02-123-4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "문자 발송" }));

    await waitFor(() => {
      expect(apiMocks.sendAdminSmsMessage).toHaveBeenCalled();
      expect(apiMocks.sendAdminSmsMessage.mock.calls[0]?.[0]).toEqual({
        template_id: null,
        message: "운영 공지",
        group_ids: [],
        contact_ids: [],
        member_levels: [],
        manual_targets: [{ name: "홍길동", phone: "01012345678" }],
        booking_at: null,
        wr_reply: "021234567",
      });
    });
  });

  it("does not request SMS storage endpoints when SMS5 tables are missing", async () => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: false,
        missing_tables: ["g5_sms5_book", "g5_sms5_form"],
      },
      request_id: "req-sms-config-storage-missing",
      correlation_id: "corr-sms-config-storage-missing",
      server_request_id: null,
    });

    renderPage();

    expect(await screen.findByText("SMS 저장소 미구성")).toBeInTheDocument();
    expect(screen.getByText(/g5_sms5_book, g5_sms5_form/)).toBeInTheDocument();
    expect(apiMocks.getAdminSmsContactGroupList).not.toHaveBeenCalled();
    expect(apiMocks.getAdminSmsTemplateList).not.toHaveBeenCalled();
  });

  it("shows the sms message error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminSmsConfig.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-sms-messages-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "문자 발송 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-sms-messages-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/sms/messages",
      user_actionable: true,
    });

    renderPage();

    expect(
      await screen.findByText("문자 발송 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("uses schema labels for sms send controls", async () => {
    renderPage();

    expect(await screen.findByLabelText("이모티콘 목록")).toBeInTheDocument();
    expect(screen.getByLabelText("회신")).toBeInTheDocument();
    expect(
      screen.getByText("한 줄에 이름과 번호를 입력합니다."),
    ).toBeInTheDocument();
  });
});
