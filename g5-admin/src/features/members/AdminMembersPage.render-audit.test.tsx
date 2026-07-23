import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AdminMemberDetailResponse } from "../../types/AdminMemberDetailResponse";
import type { AdminMemberListResponse } from "../../types/AdminMemberListResponse";
import type { AdminMemberUpdateInput } from "../../types/AdminMemberUpdateInput";
import type { AdminSchemaDetailResponse } from "../../types/AdminSchemaDetailResponse";
import { ThemeProvider } from "../layout/theme";
import { AdminMembersPage } from "./AdminMembersPage";

const apiMocks = vi.hoisted(() => ({
  deleteAdminMember: vi.fn(),
  deleteAdminMemberIcon: vi.fn(),
  deleteAdminMemberImage: vi.fn(),
  getAdminMember: vi.fn(),
  getAdminMemberList: vi.fn(),
  updateAdminMember: vi.fn(),
  updateAdminMemberLevel: vi.fn(),
  uploadAdminMemberIcon: vi.fn(),
  uploadAdminMemberImage: vi.fn(),
}));

const useAuthSessionMock = vi.hoisted(() => vi.fn());
const useAdminFieldSchemaMock = vi.hoisted(() => vi.fn());

vi.mock("../../api/client", () => ({
  deleteAdminMember: apiMocks.deleteAdminMember,
  deleteAdminMemberIcon: apiMocks.deleteAdminMemberIcon,
  deleteAdminMemberImage: apiMocks.deleteAdminMemberImage,
  getAdminMember: apiMocks.getAdminMember,
  getAdminMemberList: apiMocks.getAdminMemberList,
  updateAdminMember: apiMocks.updateAdminMember,
  updateAdminMemberLevel: apiMocks.updateAdminMemberLevel,
  uploadAdminMemberIcon: apiMocks.uploadAdminMemberIcon,
  uploadAdminMemberImage: apiMocks.uploadAdminMemberImage,
}));

vi.mock("../auth/use-auth-session", () => ({
  useAuthSession: (options?: { enabled?: boolean }) => useAuthSessionMock(options),
}));

vi.mock("../schema/useAdminFieldSchema", async () => {
  const actual = await vi.importActual<typeof import("../schema/useAdminFieldSchema")>(
    "../schema/useAdminFieldSchema",
  );
  return {
    ...actual,
    useAdminFieldSchema: (domain: string) => useAdminFieldSchemaMock(domain),
  };
});

const hasRenderAuditEnv =
  Boolean(process.env.ADMIN_MEMBERS_RENDER_AUDIT_LIST_JSON) &&
  Boolean(process.env.ADMIN_MEMBERS_RENDER_AUDIT_DETAIL_JSON) &&
  Boolean(process.env.ADMIN_MEMBERS_RENDER_AUDIT_SCHEMA_JSON);

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

function toOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toScalarString(value);
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function loadLiveListResponse(): AdminMemberListResponse {
  const raw = JSON.parse(
    readFileSync(requireEnv("ADMIN_MEMBERS_RENDER_AUDIT_LIST_JSON"), "utf-8"),
  ) as {
    data?: Record<string, unknown> | unknown[];
    meta?: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  };
  const data = raw.data ?? {};
  const meta = raw.meta ?? {};
  const members = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).members)
      ? (((data as Record<string, unknown>).members as unknown[]) ?? [])
      : [];
  const pagination =
    raw.pagination && typeof raw.pagination === "object"
      ? raw.pagination
      : data && typeof data === "object" && (data as Record<string, unknown>).pagination && typeof (data as Record<string, unknown>).pagination === "object"
        ? ((data as Record<string, unknown>).pagination as Record<string, unknown>)
        : {};

  return {
    members: members as AdminMemberListResponse["members"],
    pagination: {
      total: Number(pagination.total ?? 0),
      page: Number(pagination.page ?? 1),
      per_page: Number(pagination.per_page ?? members.length ?? 1),
      last_page: Number(pagination.last_page ?? 1),
      has_next: Boolean(pagination.has_next),
      has_prev: Boolean(pagination.has_prev),
    },
    request_id: toScalarString(meta.request_id),
    correlation_id: toScalarString(meta.correlation_id),
    server_request_id: toOptionalString(meta.server_request_id),
  };
}

function loadLiveDetailResponse(): AdminMemberDetailResponse {
  const raw = JSON.parse(
    readFileSync(requireEnv("ADMIN_MEMBERS_RENDER_AUDIT_DETAIL_JSON"), "utf-8"),
  ) as {
    data?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
  const data = raw.data ?? {};
  const meta = raw.meta ?? {};

  return {
    member: {
      mb_id: toScalarString(data.mb_id),
      mb_1: toOptionalString(data.mb_1),
      mb_2: toOptionalString(data.mb_2),
      mb_3: toOptionalString(data.mb_3),
      mb_4: toOptionalString(data.mb_4),
      mb_5: toOptionalString(data.mb_5),
      mb_6: toOptionalString(data.mb_6),
      mb_7: toOptionalString(data.mb_7),
      mb_8: toOptionalString(data.mb_8),
      mb_9: toOptionalString(data.mb_9),
      mb_10: toOptionalString(data.mb_10),
      mb_name: toOptionalString(data.mb_name),
      mb_nick: toOptionalString(data.mb_nick),
      mb_email: toOptionalString(data.mb_email),
      mb_level: toOptionalNumber(data.mb_level),
      mb_point: toOptionalNumber(data.mb_point),
      mb_mailling: toOptionalNumber(data.mb_mailling),
      mb_sms: toOptionalNumber(data.mb_sms),
      mb_marketing_agree: toOptionalNumber(data.mb_marketing_agree),
      mb_thirdparty_agree: toOptionalNumber(data.mb_thirdparty_agree),
      mb_agree_log: toOptionalString(data.mb_agree_log),
      mb_homepage: toOptionalString(data.mb_homepage),
      mb_hp: toOptionalString(data.mb_hp),
      mb_tel: toOptionalString(data.mb_tel),
      mb_zip: toOptionalString(data.mb_zip),
      mb_addr1: toOptionalString(data.mb_addr1),
      mb_addr2: toOptionalString(data.mb_addr2),
      mb_addr3: toOptionalString(data.mb_addr3),
      mb_addr_jibeon: toOptionalString(data.mb_addr_jibeon),
      mb_memo: toOptionalString(data.mb_memo),
      mb_profile: toOptionalString(data.mb_profile),
      mb_signature: toOptionalString(data.mb_signature),
      mb_adult: toOptionalNumber(data.mb_adult),
      mb_certify: toOptionalString(data.mb_certify),
      mb_open: toOptionalNumber(data.mb_open),
      mb_datetime: toOptionalString(data.mb_datetime),
      mb_today_login: toOptionalString(data.mb_today_login),
      mb_leave_date: toOptionalString(data.mb_leave_date),
      mb_intercept_date: toOptionalString(data.mb_intercept_date),
    },
    request_id: toScalarString(meta.request_id),
    correlation_id: toScalarString(meta.correlation_id),
    server_request_id: toOptionalString(meta.server_request_id),
  };
}

function loadLiveSchemaResponse(): AdminSchemaDetailResponse {
  const raw = JSON.parse(
    readFileSync(requireEnv("ADMIN_MEMBERS_RENDER_AUDIT_SCHEMA_JSON"), "utf-8"),
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
      layout: null,
      sections: sections as AdminSchemaDetailResponse["schema"]["sections"],
      fields_by_name:
        fieldsByName as AdminSchemaDetailResponse["schema"]["fields_by_name"],
    },
    request_id: toScalarString(meta.request_id),
    correlation_id: toScalarString(meta.correlation_id),
    server_request_id: toOptionalString(meta.server_request_id),
  };
}

function getSchemaLabel(
  schema: AdminSchemaDetailResponse,
  fieldName: string,
  fallback: string,
): string {
  const field = schema.schema.fields_by_name?.[fieldName];
  return typeof field?.label === "string" && field.label.trim().length > 0
    ? field.label
    : fallback;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyMemberUpdate(
  response: AdminMemberDetailResponse,
  payload: Partial<AdminMemberUpdateInput>,
): AdminMemberDetailResponse {
  const next = cloneJson(response);
  const member = next.member;

  const assignString = (key: keyof AdminMemberUpdateInput) => {
    const value = payload[key];
    if (value !== undefined && key in member) {
      (member as Record<string, unknown>)[key] = value;
    }
  };
  const assignNumber = (
    key: "mb_mailling" | "mb_sms" | "mb_marketing_agree" | "mb_thirdparty_agree" | "mb_adult" | "mb_open",
  ) => {
    const value = payload[key];
    if (value !== undefined) {
      member[key] = value;
    }
  };

  assignString("mb_1");
  assignString("mb_2");
  assignString("mb_3");
  assignString("mb_4");
  assignString("mb_5");
  assignString("mb_6");
  assignString("mb_7");
  assignString("mb_8");
  assignString("mb_9");
  assignString("mb_10");
  assignString("mb_name");
  assignString("mb_nick");
  assignString("mb_email");
  assignString("mb_homepage");
  assignString("mb_hp");
  assignString("mb_tel");
  assignString("mb_zip");
  assignString("mb_addr1");
  assignString("mb_addr2");
  assignString("mb_addr3");
  assignString("mb_addr_jibeon");
  assignString("mb_memo");
  assignString("mb_profile");
  assignString("mb_signature");
  assignString("mb_password");
  assignString("mb_certify");
  assignString("mb_leave_date");
  assignString("mb_intercept_date");
  assignNumber("mb_mailling");
  assignNumber("mb_sms");
  assignNumber("mb_marketing_agree");
  assignNumber("mb_thirdparty_agree");
  assignNumber("mb_adult");
  assignNumber("mb_open");

  next.request_id = "req-member-update";
  next.correlation_id = "corr-member-update";
  next.server_request_id = "srv-member-update";
  return next;
}

function renderPage(pathname: string) {
  const listResponse = loadLiveListResponse();
  const detailResponse = loadLiveDetailResponse();
  const schemaResponse = loadLiveSchemaResponse();
  const bootstrapMemberId =
    process.env.ADMIN_MEMBERS_RENDER_AUDIT_BOOTSTRAP_MEMBER_ID?.trim() || "neojins";

  apiMocks.getAdminMemberList.mockResolvedValue(listResponse);
  apiMocks.getAdminMember.mockResolvedValue(detailResponse);
  apiMocks.updateAdminMember.mockResolvedValue(detailResponse);
  useAuthSessionMock.mockReturnValue({
    currentMember: {
      mb_id: bootstrapMemberId,
      mb_name: "운영자",
      mb_nick: bootstrapMemberId,
      mb_email: "admin@example.com",
      mb_level: 10,
      mb_point: 0,
    },
    sessionError: null,
  });
  useAdminFieldSchemaMock.mockReturnValue({
    data: { schema: schemaResponse.schema },
    error: null,
    isLoading: false,
    isFetching: false,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[pathname]}>
          <Routes>
            <Route path="/admin/members" element={<AdminMembersPage />} />
            <Route path="/admin/members/:mbId" element={<AdminMembersPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe.runIf(hasRenderAuditEnv)("AdminMembersPage live render parity", () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset();
    useAdminFieldSchemaMock.mockReset();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders live members controls with contract-compatible widgets and values", async () => {
    const detailResponse = loadLiveDetailResponse();
    const schemaResponse = loadLiveSchemaResponse();
    const memberId = detailResponse.member.mb_id;
    const certifyLabel = getSchemaLabel(schemaResponse, "mb_certify", "본인확인방법");
    const extra1Label = getSchemaLabel(schemaResponse, "mb_1", "여분필드 1");
    const mailingLabel = getSchemaLabel(schemaResponse, "mb_mailling", "광고 메일 수신");
    const openLabel = getSchemaLabel(schemaResponse, "mb_open", "정보공개");

    renderPage(`/admin/members/${memberId}`);

    expect(await screen.findByText("회원 관리")).toBeInTheDocument();
    expect(await screen.findByLabelText("새 레벨")).toHaveValue(
      detailResponse.member.mb_level == null ? "" : String(detailResponse.member.mb_level),
    );

    const certifyGroup = screen.getByRole("group", { name: certifyLabel });
    expect(certifyGroup).toBeInTheDocument();
    const certifyRadioGroup = within(certifyGroup);
    expect(certifyRadioGroup.getByRole("radio", { name: "간편인증" })).toBeInTheDocument();
    expect(certifyRadioGroup.getByRole("radio", { name: "휴대폰" })).toBeInTheDocument();
    expect(certifyRadioGroup.getByRole("radio", { name: "아이핀" })).toBeInTheDocument();
    const currentCertifyLabel =
      detailResponse.member.mb_certify === "hp"
        ? "휴대폰"
        : detailResponse.member.mb_certify === "ipin"
          ? "아이핀"
          : detailResponse.member.mb_certify === "simple"
            ? "간편인증"
            : null;
    if (currentCertifyLabel) {
      expect(
        certifyRadioGroup.getByRole("radio", {
          name: currentCertifyLabel,
        }),
      ).toBeChecked();
    } else {
      expect(certifyRadioGroup.getByRole("radio", { name: "간편인증" })).not.toBeChecked();
      expect(certifyRadioGroup.getByRole("radio", { name: "휴대폰" })).not.toBeChecked();
      expect(certifyRadioGroup.getByRole("radio", { name: "아이핀" })).not.toBeChecked();
    }

    expect(screen.queryByLabelText("지번주소")).not.toBeInTheDocument();
    expect(((await screen.findByLabelText(extra1Label)) as HTMLInputElement).disabled).toBe(false);

    expect(screen.getByLabelText(/아이콘.*파일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/회원이미지.*파일|프로필 이미지.*파일/)).toBeInTheDocument();

    const mailingGroup = screen.getByRole("group", { name: mailingLabel });
    expect(mailingGroup).toBeInTheDocument();
    expect(within(mailingGroup).getByRole("radio", { name: "예" })).toBeInTheDocument();
    expect(within(mailingGroup).getByRole("radio", { name: "아니오" })).toBeInTheDocument();

    const openGroup = screen.getByRole("group", { name: openLabel });
    expect(openGroup).toBeInTheDocument();
    expect(within(openGroup).getByRole("radio", { name: "예" })).toBeInTheDocument();
    expect(within(openGroup).getByRole("radio", { name: "아니오" })).toBeInTheDocument();
  });

  it("saves live member changes and rehydrates updated values after success", async () => {
    const user = userEvent.setup();
    const listResponse = loadLiveListResponse();
    const schemaResponse = loadLiveSchemaResponse();
    let serverState = loadLiveDetailResponse();
    const memberId = serverState.member.mb_id;
    const initialOpen = serverState.member.mb_open ?? 0;
    const hpLabel = getSchemaLabel(schemaResponse, "mb_hp", "휴대폰");
    const certifyLabel = getSchemaLabel(schemaResponse, "mb_certify", "본인확인방법");
    const extra1Label = getSchemaLabel(schemaResponse, "mb_1", "여분필드 1");
    const openLabel = getSchemaLabel(schemaResponse, "mb_open", "정보공개");
    const bootstrapMemberId =
      process.env.ADMIN_MEMBERS_RENDER_AUDIT_BOOTSTRAP_MEMBER_ID?.trim() || "neojins";

    apiMocks.getAdminMemberList.mockResolvedValue(listResponse);
    apiMocks.getAdminMember.mockImplementation(async () => cloneJson(serverState));
    apiMocks.updateAdminMember.mockImplementation(
      async (payload: Partial<AdminMemberUpdateInput>) => {
        serverState = applyMemberUpdate(serverState, payload);
        return cloneJson(serverState);
      },
    );
    useAuthSessionMock.mockReturnValue({
      currentMember: {
        mb_id: bootstrapMemberId,
        mb_name: "운영자",
        mb_nick: bootstrapMemberId,
        mb_email: "admin@example.com",
        mb_level: 10,
        mb_point: 0,
      },
      sessionError: null,
    });
    useAdminFieldSchemaMock.mockReturnValue({
      data: { schema: schemaResponse.schema },
      error: null,
      isLoading: false,
      isFetching: false,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/admin/members/${memberId}`]}>
            <Routes>
              <Route path="/admin/members" element={<AdminMembersPage />} />
              <Route path="/admin/members/:mbId" element={<AdminMembersPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const hpField = (await screen.findByRole("textbox", {
      name: hpLabel,
    })) as HTMLInputElement;
    await user.clear(hpField);
    await user.type(hpField, "01099998888");

    const extra1Field = (await screen.findByLabelText(extra1Label)) as HTMLInputElement;
    await user.clear(extra1Field);
    await user.type(extra1Field, "render-audit-extra");

    const certifyGroup = screen.getByRole("group", { name: certifyLabel });
    expect(certifyGroup).toBeInTheDocument();
    await user.click(within(certifyGroup).getByRole("radio", { name: "휴대폰" }));

    const openGroup = screen.getByRole("group", { name: openLabel });
    expect(openGroup).toBeInTheDocument();
    await user.click(
      within(openGroup).getByRole("radio", {
        name: initialOpen === 1 ? "아니오" : "예",
      }),
    );
    await user.click(screen.getByRole("button", { name: "프로필 저장" }));

    expect(apiMocks.updateAdminMember.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        mb_id: memberId,
        mb_1: "render-audit-extra",
        mb_hp: "01099998888",
        mb_certify: "hp",
        mb_open: initialOpen === 1 ? 0 : 1,
      }),
    );

    await waitFor(() => {
      expect((screen.getByRole("textbox", { name: hpLabel }) as HTMLInputElement).value).toBe(
        "01099998888",
      );
    });
    expect((screen.getByLabelText(extra1Label) as HTMLInputElement).value).toBe(
      "render-audit-extra",
    );
    expect(
      within(certifyGroup).getByRole("radio", { name: "휴대폰" }),
    ).toBeChecked();
    expect(
      within(openGroup).getByRole("radio", {
        name: initialOpen === 1 ? "아니오" : "예",
      }),
    ).toBeChecked();
  });
});
