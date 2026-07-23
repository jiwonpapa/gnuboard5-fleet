import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminConfigResponse } from "../../types/AdminConfigResponse";
import type { AdminSchemaDetailResponse } from "../../types/AdminSchemaDetailResponse";
import { clearPageDiagnostics } from "../../debug/page-diagnostics";
import { buildAuthStatusKey } from "../auth/use-auth-session";
import { ThemeProvider } from "../layout/theme";
import { AdminConfigPage } from "./AdminConfigPage";
import type { AdminConfigUpdateInput } from "../../types/AdminConfigUpdateInput";

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

const adminConfigTopLevelFields = [
  "cf_title",
  "cf_admin",
  "cf_admin_email",
  "cf_admin_email_name",
  "cf_register_level",
  "cf_register_point",
  "cf_login_point",
  "cf_use_point",
  "cf_write_point",
  "cf_comment_point",
  "cf_download_point",
  "cf_read_point",
  "cf_memo_send_point",
  "cf_use_email_certify",
  "cf_use_homepage",
  "cf_req_homepage",
  "cf_use_tel",
  "cf_req_tel",
  "cf_use_hp",
  "cf_req_hp",
  "cf_use_addr",
  "cf_req_addr",
  "cf_new_skin",
  "cf_search_skin",
  "cf_connect_skin",
  "cf_faq_skin",
  "cf_editor",
  "cf_member_skin",
  "cf_mobile_member_skin",
  "cf_captcha",
  "cf_social_login_use",
] as const;

const hasRenderAuditEnv =
  Boolean(process.env.ADMIN_CONFIG_RENDER_AUDIT_CONFIG_JSON) &&
  Boolean(process.env.ADMIN_CONFIG_RENDER_AUDIT_SCHEMA_JSON);

function stubMatchMedia(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("min-width: 768px") ? desktop : false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }
  return value;
}

function toScalarString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function loadLiveConfigResponse(): {
  currentAdminId: string;
  response: AdminConfigResponse;
} {
  const raw = JSON.parse(
    readFileSync(requireEnv("ADMIN_CONFIG_RENDER_AUDIT_CONFIG_JSON"), "utf-8"),
  ) as {
    data?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
  const data = raw.data ?? {};
  const meta = raw.meta ?? {};
  const fieldValue = (field: (typeof adminConfigTopLevelFields)[number]) =>
    toScalarString(data[field]);
  const extra = Object.fromEntries(
    Object.entries(data)
      .filter(([field]) => field.startsWith("cf_") && !adminConfigTopLevelFields.includes(field as (typeof adminConfigTopLevelFields)[number]))
      .map(([field, value]) => [field, toScalarString(value)]),
  );
  const currentAdminId = toScalarString(data.cf_admin);

  return {
    currentAdminId,
    response: {
      config: {
        cf_title: fieldValue("cf_title"),
        cf_admin: fieldValue("cf_admin"),
        cf_admin_email: fieldValue("cf_admin_email"),
        cf_admin_email_name: fieldValue("cf_admin_email_name"),
        cf_register_level: fieldValue("cf_register_level"),
        cf_register_point: fieldValue("cf_register_point"),
        cf_login_point: fieldValue("cf_login_point"),
        cf_use_point: fieldValue("cf_use_point"),
        cf_write_point: fieldValue("cf_write_point"),
        cf_comment_point: fieldValue("cf_comment_point"),
        cf_download_point: fieldValue("cf_download_point"),
        cf_read_point: fieldValue("cf_read_point"),
        cf_memo_send_point: fieldValue("cf_memo_send_point"),
        cf_use_email_certify: fieldValue("cf_use_email_certify"),
        cf_use_homepage: fieldValue("cf_use_homepage"),
        cf_req_homepage: fieldValue("cf_req_homepage"),
        cf_use_tel: fieldValue("cf_use_tel"),
        cf_req_tel: fieldValue("cf_req_tel"),
        cf_use_hp: fieldValue("cf_use_hp"),
        cf_req_hp: fieldValue("cf_req_hp"),
        cf_use_addr: fieldValue("cf_use_addr"),
        cf_req_addr: fieldValue("cf_req_addr"),
        cf_new_skin: fieldValue("cf_new_skin"),
        cf_search_skin: fieldValue("cf_search_skin"),
        cf_connect_skin: fieldValue("cf_connect_skin"),
        cf_faq_skin: fieldValue("cf_faq_skin"),
        cf_editor: fieldValue("cf_editor"),
        cf_member_skin: fieldValue("cf_member_skin"),
        cf_mobile_member_skin: fieldValue("cf_mobile_member_skin"),
        cf_captcha: fieldValue("cf_captcha"),
        cf_social_login_use: fieldValue("cf_social_login_use"),
        extra,
      },
      request_id: toScalarString(meta.request_id),
      correlation_id: toScalarString(meta.correlation_id),
      server_request_id:
        meta.server_request_id === null || meta.server_request_id === undefined
          ? null
          : toScalarString(meta.server_request_id),
    },
  };
}

function loadLiveSchemaResponse(): AdminSchemaDetailResponse {
  const raw = JSON.parse(
    readFileSync(requireEnv("ADMIN_CONFIG_RENDER_AUDIT_SCHEMA_JSON"), "utf-8"),
  ) as {
    data?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
  const data = raw.data ?? {};
  const meta = raw.meta ?? {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const fieldsByName =
    data.fields_by_name && typeof data.fields_by_name === "object"
      ? (data.fields_by_name as Record<string, unknown>)
      : {};

  return {
    schema: {
      domain: toScalarString(data.domain),
      title: toScalarString(data.title),
      legacy_form: toScalarString(data.legacy_form),
      field_count: Number(data.field_count ?? 0),
      section_count: Number(data.section_count ?? 0),
      generated_at: toScalarString(data.generated_at),
      layout:
        data.layout && typeof data.layout === "object"
          ? {
              desktop: toScalarString((data.layout as Record<string, unknown>).desktop),
              mobile: toScalarString((data.layout as Record<string, unknown>).mobile),
              single_open: Boolean(
                (data.layout as Record<string, unknown>).single_open,
              ),
            }
          : null,
      sections: sections as AdminSchemaDetailResponse["schema"]["sections"],
      fields_by_name:
        fieldsByName as AdminSchemaDetailResponse["schema"]["fields_by_name"],
    },
    request_id: toScalarString(meta.request_id),
    correlation_id: toScalarString(meta.correlation_id),
    server_request_id:
      meta.server_request_id === null || meta.server_request_id === undefined
        ? null
        : toScalarString(meta.server_request_id),
  };
}

function renderPage() {
  const { currentAdminId, response: configResponse } = loadLiveConfigResponse();
  const schemaResponse = loadLiveSchemaResponse();

  apiMocks.getAdminConfig.mockResolvedValue(configResponse);
  apiMocks.getAdminFieldSchema.mockResolvedValue(schemaResponse);
  apiMocks.updateAdminConfig.mockResolvedValue(configResponse);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(buildAuthStatusKey("site-1"), {
    authenticated: true,
    correlation_id: "corr-auth",
    member: {
      mb_email: configResponse.config.cf_admin_email ?? "",
      mb_id: currentAdminId,
      mb_level: 10,
      mb_name: "운영자",
      mb_nick: "운영자",
      mb_point: 0,
    },
    request_id: "req-auth",
    server_request_id: null,
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AdminConfigPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyConfigUpdate(
  response: AdminConfigResponse,
  payload: Partial<AdminConfigUpdateInput>,
): AdminConfigResponse {
  const next = cloneJson(response);

  if (payload.cf_title !== undefined) {
    next.config.cf_title = payload.cf_title;
  }
  if (payload.cf_admin !== undefined) {
    next.config.cf_admin = payload.cf_admin;
  }
  if (payload.cf_admin_email !== undefined) {
    next.config.cf_admin_email = payload.cf_admin_email;
  }
  if (payload.cf_admin_email_name !== undefined) {
    next.config.cf_admin_email_name = payload.cf_admin_email_name;
  }
  if (payload.cf_register_level !== undefined) {
    next.config.cf_register_level = payload.cf_register_level;
  }
  if (payload.cf_register_point !== undefined) {
    next.config.cf_register_point = payload.cf_register_point;
  }
  if (payload.cf_login_point !== undefined) {
    next.config.cf_login_point = payload.cf_login_point;
  }
  if (payload.cf_use_point !== undefined) {
    next.config.cf_use_point = payload.cf_use_point;
  }
  if (payload.cf_write_point !== undefined) {
    next.config.cf_write_point = payload.cf_write_point;
  }
  if (payload.cf_comment_point !== undefined) {
    next.config.cf_comment_point = payload.cf_comment_point;
  }
  if (payload.cf_download_point !== undefined) {
    next.config.cf_download_point = payload.cf_download_point;
  }
  if (payload.cf_read_point !== undefined) {
    next.config.cf_read_point = payload.cf_read_point;
  }
  if (payload.cf_memo_send_point !== undefined) {
    next.config.cf_memo_send_point = payload.cf_memo_send_point;
  }
  if (payload.cf_use_email_certify !== undefined) {
    next.config.cf_use_email_certify = payload.cf_use_email_certify;
  }
  if (payload.cf_use_homepage !== undefined) {
    next.config.cf_use_homepage = payload.cf_use_homepage;
  }
  if (payload.cf_req_homepage !== undefined) {
    next.config.cf_req_homepage = payload.cf_req_homepage;
  }
  if (payload.cf_use_tel !== undefined) {
    next.config.cf_use_tel = payload.cf_use_tel;
  }
  if (payload.cf_req_tel !== undefined) {
    next.config.cf_req_tel = payload.cf_req_tel;
  }
  if (payload.cf_use_hp !== undefined) {
    next.config.cf_use_hp = payload.cf_use_hp;
  }
  if (payload.cf_req_hp !== undefined) {
    next.config.cf_req_hp = payload.cf_req_hp;
  }
  if (payload.cf_use_addr !== undefined) {
    next.config.cf_use_addr = payload.cf_use_addr;
  }
  if (payload.cf_req_addr !== undefined) {
    next.config.cf_req_addr = payload.cf_req_addr;
  }
  if (payload.cf_new_skin !== undefined) {
    next.config.cf_new_skin = payload.cf_new_skin;
  }
  if (payload.cf_search_skin !== undefined) {
    next.config.cf_search_skin = payload.cf_search_skin;
  }
  if (payload.cf_connect_skin !== undefined) {
    next.config.cf_connect_skin = payload.cf_connect_skin;
  }
  if (payload.cf_faq_skin !== undefined) {
    next.config.cf_faq_skin = payload.cf_faq_skin;
  }
  if (payload.cf_editor !== undefined) {
    next.config.cf_editor = payload.cf_editor;
  }
  if (payload.cf_member_skin !== undefined) {
    next.config.cf_member_skin = payload.cf_member_skin;
  }
  if (payload.cf_mobile_member_skin !== undefined) {
    next.config.cf_mobile_member_skin = payload.cf_mobile_member_skin;
  }
  if (payload.cf_captcha !== undefined) {
    next.config.cf_captcha = payload.cf_captcha;
  }
  if (payload.cf_social_login_use !== undefined) {
    next.config.cf_social_login_use = payload.cf_social_login_use;
  }
  if (payload.extra) {
    next.config.extra = {
      ...next.config.extra,
      ...payload.extra,
    };
  }

  next.request_id = "req-config-update";
  next.correlation_id = "corr-config-update";
  next.server_request_id = "srv-config-update";
  return next;
}

describe.runIf(hasRenderAuditEnv)("AdminConfigPage live render parity", () => {
  beforeEach(() => {
    stubMatchMedia(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearPageDiagnostics();
  });

  it("renders live config critical controls with legacy-compatible widgets and values", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("tab", { name: "기본환경" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "짧은주소" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "본인확인" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SNS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "여분필드" })).toBeInTheDocument();

    const adminField = screen.getByLabelText("최고관리자") as HTMLSelectElement;
    expect(adminField.tagName).toBe("SELECT");
    expect(adminField.disabled).toBe(false);
    expect(adminField.value).toBe("neojins");
    expect(within(adminField).getByRole("option", { name: "neojins" })).toBeInTheDocument();

    const pointToggle = screen.getByRole("switch", { name: "포인트 사용" });
    expect(pointToggle).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "짧은주소" }));
    expect(screen.getByText("짧은 URL 사용")).toBeInTheDocument();
    expect(screen.getAllByText("짧은 URL 사용")).toHaveLength(1);
    expect(screen.getByLabelText("사용 안함")).toBeInTheDocument();
    expect(screen.getByLabelText("숫자")).toBeInTheDocument();
    expect(screen.getByLabelText("글 이름")).toBeInTheDocument();
    expect(screen.queryByLabelText("홈페이지 제목")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "회원가입" }));
    const iconUseField = screen.getByLabelText("회원아이콘 사용") as HTMLSelectElement;
    const iconLevelField = screen.getByLabelText(
      "회원 아이콘, 이미지 업로드 권한",
    ) as HTMLSelectElement;
    expect(iconUseField.tagName).toBe("SELECT");
    expect(iconUseField.disabled).toBe(false);
    expect(iconLevelField.tagName).toBe("SELECT");
    expect(iconLevelField.disabled).toBe(false);
    expect(screen.getAllByText("바이트 이하").length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByRole("tab", { name: "본인확인" }));
    const certUseField = screen.getByRole("combobox", {
      name: "본인확인",
    }) as HTMLSelectElement;
    expect(certUseField.tagName).toBe("SELECT");
    expect(certUseField.disabled).toBe(false);

    await user.click(screen.getByRole("tab", { name: "SNS" }));
    const socialLoginToggle = screen.getByRole("switch", {
      name: "소셜 로그인 사용",
    });
    expect(socialLoginToggle).toBeInTheDocument();
    expect(socialLoginToggle.getAttribute("aria-disabled")).not.toBe("true");

    await user.click(screen.getByRole("tab", { name: "여분필드" }));
    const extraTitleField = screen.getByLabelText("여분필드1 제목") as HTMLInputElement;
    const extraValueField = screen.getByLabelText("여분필드1 값") as HTMLInputElement;
    expect(screen.getByText("여분필드1")).toBeInTheDocument();
    expect(extraTitleField.disabled).toBe(false);
    expect(extraValueField.disabled).toBe(false);
  });

  it("saves live config changes and rehydrates the updated values after success", async () => {
    const user = userEvent.setup();
    const { response: liveConfigResponse } = loadLiveConfigResponse();
    const liveSchemaResponse = loadLiveSchemaResponse();
    let serverState = cloneJson(liveConfigResponse);

    apiMocks.getAdminConfig.mockResolvedValue(serverState);
    apiMocks.getAdminFieldSchema.mockResolvedValue(liveSchemaResponse);
    apiMocks.updateAdminConfig.mockImplementation(
      async (payload: Partial<AdminConfigUpdateInput>) => {
        serverState = applyConfigUpdate(serverState, payload);
        return cloneJson(serverState);
      },
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(buildAuthStatusKey("site-1"), {
      authenticated: true,
      correlation_id: "corr-auth",
      member: {
        mb_email: liveConfigResponse.config.cf_admin_email ?? "",
        mb_id: liveConfigResponse.config.cf_admin ?? "",
        mb_level: 10,
        mb_name: "운영자",
        mb_nick: "운영자",
        mb_point: 0,
      },
      request_id: "req-auth",
      server_request_id: null,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AdminConfigPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const titleField = (await screen.findByLabelText("홈페이지 제목")) as HTMLInputElement;
    await user.clear(titleField);
    await user.type(titleField, "그누보드5 QA");

    await user.click(screen.getByRole("tab", { name: "짧은주소" }));
    await user.click(screen.getByLabelText("글 이름"));

    await user.click(screen.getByRole("tab", { name: "회원가입" }));
    const iconUseField = screen.getByLabelText("회원아이콘 사용") as HTMLSelectElement;
    await user.selectOptions(iconUseField, "1");

    await user.click(screen.getByRole("tab", { name: "여분필드" }));
    const extraTitleField = screen.getByLabelText("여분필드1 제목") as HTMLInputElement;
    const extraValueField = screen.getByLabelText("여분필드1 값") as HTMLInputElement;
    await user.clear(extraTitleField);
    await user.type(extraTitleField, "테스트 제목");
    await user.clear(extraValueField);
    await user.type(extraValueField, "테스트 값");

    await user.click(screen.getAllByRole("button", { name: "기본환경설정 저장" })[0]!);

    expect(apiMocks.updateAdminConfig.mock.calls[0]?.[0]).toEqual({
      cf_title: "그누보드5 QA",
      extra: {
        cf_1: "테스트 값",
        cf_1_subj: "테스트 제목",
        cf_bbs_rewrite: "2",
        cf_use_member_icon: "1",
      },
    });

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "기본환경설정 저장" })[0],
      ).toBeDisabled();
    });

    await user.click(screen.getByRole("tab", { name: "기본환경" }));
    expect((screen.getByLabelText("홈페이지 제목") as HTMLInputElement).value).toBe(
      "그누보드5 QA",
    );

    await user.click(screen.getByRole("tab", { name: "짧은주소" }));
    expect((screen.getByLabelText("글 이름") as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole("tab", { name: "회원가입" }));
    expect((screen.getByLabelText("회원아이콘 사용") as HTMLSelectElement).value).toBe("1");

    await user.click(screen.getByRole("tab", { name: "여분필드" }));
    expect((screen.getByLabelText("여분필드1 제목") as HTMLInputElement).value).toBe(
      "테스트 제목",
    );
    expect((screen.getByLabelText("여분필드1 값") as HTMLInputElement).value).toBe(
      "테스트 값",
    );

    expect(screen.getAllByRole("button", { name: "기본환경설정 저장" })[0]).toBeDisabled();
  });
});
