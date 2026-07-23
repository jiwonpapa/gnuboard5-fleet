import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPageDiagnostics,
  getPageDiagnosticsSnapshot,
} from "../../debug/page-diagnostics";
import {
  createConfigResponse,
  createSchemaResponse,
} from "./admin-config-page-test-fixtures";
import {
  renderAdminConfigPage,
  stubMatchMedia,
} from "./admin-config-page-test-support";

const apiMocks = vi.hoisted(() => ({
  getAdminConfig: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  updateAdminConfig: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminConfig: apiMocks.getAdminConfig,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  updateAdminConfig: apiMocks.updateAdminConfig,
}));

vi.mock("../sites/site-routing", () => ({
  useCurrentSiteId: () => "site-1",
}));

describe("AdminConfigPage", () => {
  beforeEach(() => {
    stubMatchMedia(true);
    apiMocks.getAdminConfig.mockResolvedValue(createConfigResponse());
    apiMocks.getAdminFieldSchema.mockResolvedValue(createSchemaResponse());
    apiMocks.updateAdminConfig.mockResolvedValue(createConfigResponse());
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearPageDiagnostics();
  });

  it("hides config fields until schema metadata is ready", async () => {
    apiMocks.getAdminFieldSchema.mockRejectedValue({
      code: "schema_error",
      command: "cmd_admin_schema_get",
      correlation_id: "corr-schema",
      detail: null,
      guide: { action: "retry", reason: "schema" },
      message: "설정 스키마를 불러오지 못했습니다.",
      operation: "getAdminFieldSchema",
      owner: "rust",
      request_id: "req-schema",
      retryable: false,
      server_request_id: null,
      status: 500,
      target: "/admin/schema/config",
    });

    renderAdminConfigPage({ apiMocks });

    expect(
      await screen.findByText(
        /화면 구성을 불러오지 못해 기본환경설정 편집 폼을 잠시 숨겼습니다/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("설정 스키마를 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("cf_email_use")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("사이트 제목")).not.toBeInTheDocument();
  });

  it("shows skeleton placeholders while config and schema are loading", async () => {
    apiMocks.getAdminConfig.mockImplementation(() => new Promise(() => undefined));
    apiMocks.getAdminFieldSchema.mockImplementation(() => new Promise(() => undefined));

    renderAdminConfigPage({ apiMocks });

    expect(screen.getByTestId("admin-config-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "기본환경" })).not.toBeInTheDocument();
  });

  it("renders schema section tabs in legacy order on desktop", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    expect(await screen.findByRole("tab", { name: "기본환경" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "게시판기본" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "본인확인" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "짧은주소" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "메일" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SNS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SMS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "레이아웃 추가설정" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "여분필드" })).toBeInTheDocument();
    expect(screen.getByLabelText("홈페이지 제목")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "회원가입" }));
    expect(screen.getByLabelText("회원가입시 권한")).toBeInTheDocument();
    expect(screen.queryByLabelText("홈페이지 제목")).not.toBeInTheDocument();
  });

  it("groups legacy mail sections under one mail tab while keeping subsection headings", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "메일" }));

    expect(screen.getByText("기본 메일 환경 설정")).toBeInTheDocument();
    expect(screen.getByText("게시판 글 작성 시 메일 설정")).toBeInTheDocument();
    expect(screen.getByText("회원가입 시 메일 설정")).toBeInTheDocument();
    expect(screen.getByText("투표 기타의견 작성 시 메일 설정")).toBeInTheDocument();
    expect(screen.getByLabelText("메일발송 사용")).toBeInTheDocument();
    expect(screen.getByLabelText("글작성메일 최고관리자 발송")).toBeInTheDocument();
    expect(screen.getByLabelText("가입메일 최고관리자 발송")).toBeInTheDocument();
    expect(screen.getByLabelText("투표메일 최고관리자 발송")).toBeInTheDocument();
  });

  it("renders the short-url tab as an editable radio group", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "짧은주소" }));

    expect(screen.getByText("짧은 URL 사용")).toBeInTheDocument();
    expect(screen.getByLabelText("사용 안함")).toBeInTheDocument();
    expect(screen.getByLabelText("숫자")).toBeInTheDocument();
    expect(screen.getByLabelText("글 이름")).toBeInTheDocument();
    expect(screen.queryByLabelText("홈페이지 제목")).not.toBeInTheDocument();
  });

  it("keeps cf_admin as an editable select even when choice metadata is deferred", async () => {
    renderAdminConfigPage({ apiMocks });

    const adminIdField = (await screen.findByLabelText("최고관리자")) as HTMLSelectElement;

    expect(adminIdField.disabled).toBe(false);
    expect(adminIdField.value).toBe("admin");
    expect(adminIdField.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "admin" })).toBeInTheDocument();
  });

  it("keeps dynamic legacy skin fields rendered as selects while provider options are pending", async () => {
    renderAdminConfigPage({ apiMocks });

    const newSkinField = (await screen.findByLabelText("최근게시물 스킨")) as HTMLSelectElement;

    expect(newSkinField.disabled).toBe(false);
    expect(newSkinField.tagName).toBe("SELECT");
    expect(newSkinField.value).toBe("basic");
    expect(newSkinField.required).toBe(true);
    expect(within(newSkinField).getByRole("option", { name: "basic" })).toBeInTheDocument();
  });

  it("renders cf_admin as a select when the provider supplies runtime options", async () => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(
      createSchemaResponse({
        adminOptions: [
          { label: "선택안함", value: "" },
          { label: "admin", value: "admin" },
          { label: "opsadmin", value: "opsadmin" },
        ],
      }),
    );

    renderAdminConfigPage({ apiMocks });

    const adminIdField = (await screen.findByLabelText("최고관리자")) as HTMLSelectElement;

    expect(adminIdField.tagName).toBe("SELECT");
    expect(adminIdField.disabled).toBe(false);
    expect(adminIdField.value).toBe("admin");
    expect(screen.getByRole("option", { name: "opsadmin" })).toBeInTheDocument();
  });

  it("shows the current session admin as a fallback label when cf_admin metadata and value are both missing", async () => {
    const configResponse = createConfigResponse();
    configResponse.config.cf_admin = "";

    renderAdminConfigPage({
      apiMocks,
      configResponse,
      currentMemberId: "neojins",
      schemaResponse: createSchemaResponse({ adminOptions: [] }),
    });

    const adminIdField = (await screen.findByLabelText("최고관리자")) as HTMLSelectElement;

    expect(adminIdField.tagName).toBe("SELECT");
    expect(adminIdField.value).toBe("");
    expect(
      within(adminIdField).getByRole("option", {
        name: "neojins (현재 세션 관리자)",
      }),
    ).toBeInTheDocument();
  });

  it("renders integer schema fields as number inputs", async () => {
    renderAdminConfigPage({ apiMocks });

    const loginPointField = (await screen.findByLabelText("로그인 포인트")) as HTMLInputElement;

    expect(loginPointField.type).toBe("number");
    expect(loginPointField.required).toBe(true);
  });

  it("shows clearer legacy labels, descriptions, and unit suffixes for ambiguous config fields", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    expect(await screen.findByLabelText("정보공개 수정")).toBeInTheDocument();
    expect(screen.getByText(/정보공개.*바꿀 수 없습니다\./)).toBeInTheDocument();
    expect(screen.getByText("일 동안 바꿀 수 없음")).toBeInTheDocument();

    await user.click(await screen.findByRole("tab", { name: "회원가입" }));

    expect(screen.getByLabelText("홈페이지 입력 필수")).toBeInTheDocument();
    expect(screen.getByLabelText("전화번호 입력 필수")).toBeInTheDocument();
    expect(screen.getByLabelText("휴대폰번호 입력 필수")).toBeInTheDocument();
    expect(screen.getByLabelText("주소 입력 필수")).toBeInTheDocument();
    expect(screen.getByText("회원가입 시 홈페이지를 필수 입력으로 받습니다.")).toBeInTheDocument();
    expect(screen.getAllByText("바이트 이하").length).toBeGreaterThanOrEqual(2);
  });

  it("registers config diagnostics for the shared development drawer", async () => {
    renderAdminConfigPage({ apiMocks });

    await screen.findByLabelText("홈페이지 제목");

    await waitFor(() => {
      expect(getPageDiagnosticsSnapshot()).toMatchObject({
        commands: expect.arrayContaining([
          expect.objectContaining({
            apiTarget: "/admin/config",
            command: "cmd_admin_config_get",
          }),
          expect.objectContaining({
            apiTarget: "/admin/config",
            command: "cmd_admin_config_update",
          }),
          expect.objectContaining({
            apiTarget: "/admin/schema/config",
            command: "cmd_admin_schema_get",
          }),
        ]),
        title: "기본환경설정",
      });
    });
  });

  it("renders extra fields as legacy title/value pairs", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "여분필드" }));

    expect(screen.getByText("여분필드1")).toBeInTheDocument();
    expect(screen.getByLabelText("여분필드1 제목")).toBeInTheDocument();
    expect(screen.getByLabelText("여분필드1 값")).toBeInTheDocument();
  });

  it("keeps config groups as tabs on mobile", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    expect(await screen.findByRole("tab", { name: "기본환경" })).toBeInTheDocument();
    expect(screen.getByLabelText("홈페이지 제목")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "회원가입" }));
    expect(screen.getByLabelText("회원가입시 권한")).toBeInTheDocument();
    expect(screen.queryByLabelText("홈페이지 제목")).not.toBeInTheDocument();
  });

  it("shows the config error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminConfig.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-config-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "기본환경설정 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-config-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/config",
      user_actionable: true,
    });

    renderAdminConfigPage({ apiMocks });

    expect(
      await screen.findByText("기본환경설정 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
