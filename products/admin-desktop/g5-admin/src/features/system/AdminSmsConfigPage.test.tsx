import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPageDiagnostics,
  getPageDiagnosticsSnapshot,
} from "../../debug/page-diagnostics";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminSmsConfigPage } from "./AdminSmsConfigPage";

const apiMocks = vi.hoisted(() => ({
  getAdminFieldSchema: vi.fn(),
  getAdminSmsConfig: vi.fn(),
  syncAdminSmsMembers: vi.fn(),
  updateAdminSmsConfig: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminSmsConfig: apiMocks.getAdminSmsConfig,
  syncAdminSmsMembers: apiMocks.syncAdminSmsMembers,
  updateAdminSmsConfig: apiMocks.updateAdminSmsConfig,
}));

describe("AdminSmsConfigPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("g5-admin-dev-mode", "disabled");
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("system", {
      schema: {
        fields_by_name: {
          cf_sms_use: {
            name: "cf_sms_use",
            label: "SMS 사용",
            description: null,
            options: [
              { label: "사용안함", value: "" },
              { label: "아이코드", value: "icode" },
            ],
          },
          cf_sms_type: {
            name: "cf_sms_type",
            label: "SMS 전송유형",
            description: "전송 타입을 선택합니다.",
            options: [
              { label: "SMS", value: "" },
              { label: "LMS", value: "LMS" },
            ],
          },
          cf_icode_id: {
            name: "cf_icode_id",
            label: "아이코드 회원아이디 (구버전)",
            description: "아이코드에서 사용하시는 회원아이디를 입력합니다.",
            options: [],
          },
          cf_icode_pw: {
            name: "cf_icode_pw",
            label: "아이코드 비밀번호 (구버전)",
            description: "아이코드에서 사용하시는 비밀번호를 입력합니다.",
            options: [],
          },
          cf_icode_token_key: {
            name: "cf_icode_token_key",
            label: "아이코드 토큰키 (JSON버전)",
            description: "아이코드 JSON 버전 토큰키입니다.",
            options: [],
          },
          cf_icode_server_ip: {
            name: "cf_icode_server_ip",
            label: "아이코드 서버 IP",
            description: null,
            options: [],
          },
          cf_icode_server_port: {
            name: "cf_icode_server_port",
            label: "아이코드 서버 포트",
            description: null,
            options: [],
          },
          cf_phone: {
            name: "cf_phone",
            label: "회신번호",
            description: "SMS 발송 시 기본 회신번호입니다.",
            options: [],
          },
        },
      },
      request_id: "req-sms-schema",
      correlation_id: "corr-sms-schema",
      server_request_id: null,
    }));
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        cf_title: "그누보드",
        cf_sms_use: "icode",
        cf_sms_type: "LMS",
        cf_icode_id: "icode-user",
        cf_icode_pw: "secret",
        cf_icode_server_ip: "121.78.96.124",
        cf_icode_server_port: "7295",
        cf_icode_token_key: "token-key",
        cf_phone: "0212345678",
        cf_datetime: "2026-03-12 09:00:00",
        provider_ready: true,
        uses_token_key: true,
        uses_legacy_credentials: false,
        storage_ready: true,
        missing_tables: [],
      },
      request_id: "req-sms-config",
      correlation_id: "corr-sms-config",
      server_request_id: null,
    });
    apiMocks.updateAdminSmsConfig.mockResolvedValue({
      config: {
        cf_title: "그누보드",
        cf_sms_use: "icode",
        cf_sms_type: "LMS",
        cf_icode_id: "icode-user",
        cf_icode_pw: "secret",
        cf_icode_server_ip: "121.78.96.124",
        cf_icode_server_port: "7295",
        cf_icode_token_key: "token-key",
        cf_phone: "0211112222",
        cf_datetime: "2026-03-12 09:00:00",
        provider_ready: true,
        uses_token_key: true,
        uses_legacy_credentials: false,
        storage_ready: true,
        missing_tables: [],
      },
      request_id: "req-sms-config-update",
      correlation_id: "corr-sms-config-update",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearPageDiagnostics();
    window.localStorage.removeItem("g5-admin-dev-mode");
  });

  it("renders the split sms config workspace", async () => {
    renderPage();

    expect(await screen.findByText("SMS 기본설정")).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("system");
    });
    expect(await screen.findByText("공급자 연결")).toBeInTheDocument();
    expect(await screen.findByText("아이코드 회원아이디 (구버전)")).toBeInTheDocument();
    expect(
      screen.getByText("아이코드에서 사용하시는 회원아이디를 입력합니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "회원 연락처 동기화" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "회원 연락처 동기화" })).toBeInTheDocument();
    expect(screen.getAllByText("SMS 설정 저장").length).toBeGreaterThan(0);
    expect(await screen.findByDisplayValue("icode-user")).toBeInTheDocument();
  });

  it("shows the unsupported message when the backend does not provide sms endpoints", async () => {
    apiMocks.getAdminSmsConfig.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-sms-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "SMS 설정 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-sms-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/sms/config",
      user_actionable: true,
    });

    renderPage();

    expect(
      await screen.findByText("SMS 기능을 사용할 수 없습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/현재 서버에서 SMS 관리 API를 제공하지 않거나 비활성화했습니다\./),
    ).toBeInTheDocument();
  });

  it("saves changed sms config values from the page", async () => {
    renderPage();

    const phoneInput = await screen.findByDisplayValue("0212345678");

    fireEvent.change(phoneInput, {
      target: { value: "0211112222" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "SMS 설정 저장" })[0]);

    await waitFor(() => {
      expect(apiMocks.updateAdminSmsConfig).toHaveBeenCalled();
      expect(apiMocks.updateAdminSmsConfig.mock.calls[0]?.[0]).toEqual({
        cf_phone: "0211112222",
      });
    });
  });

  it("shows inline validation below the invalid field before save", async () => {
    renderPage();

    const portInput = (await screen.findByDisplayValue("7295")) as HTMLInputElement;

    fireEvent.change(portInput, {
      target: { value: "not-a-port" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "SMS 설정 저장" })[0]);

    expect(
      await screen.findByText("포트는 숫자만 입력해야 합니다."),
    ).toBeInTheDocument();
    expect(apiMocks.updateAdminSmsConfig).not.toHaveBeenCalled();
  });

  it("registers sms diagnostics for the shared development drawer", async () => {
    renderPage();

    await screen.findByText("SMS 기본설정");

    await waitFor(() => {
      expect(getPageDiagnosticsSnapshot()).toMatchObject({
        commands: expect.arrayContaining([
          expect.objectContaining({
            apiTarget: "/admin/sms/config",
            command: "cmd_admin_sms_config_get",
          }),
          expect.objectContaining({
            apiTarget: "/admin/sms/config",
            command: "cmd_admin_sms_config_update",
          }),
          expect.objectContaining({
            apiTarget: "/admin/sms/member-sync",
            command: "cmd_admin_sms_member_sync",
          }),
          expect.objectContaining({
            apiTarget: "/admin/schema/system",
            command: "cmd_admin_schema_get",
          }),
        ]),
        title: "SMS 기본설정",
      });
    });
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AdminSmsConfigPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
