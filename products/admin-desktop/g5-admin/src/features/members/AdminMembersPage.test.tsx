import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../layout/theme";
import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
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

const memberSchema: AdminSchemaDetail = {
  domain: "members",
  fields_by_name: {
    mb_hp: buildFieldSchema("mb_hp", "휴대폰"),
    mb_tel: buildFieldSchema("mb_tel", "전화번호"),
    mb_password: buildFieldSchema("mb_password", "새 비밀번호"),
    mb_certify: buildFieldSchema("mb_certify", "본인확인방법", "radio", [
      { label: "간편인증", value: "simple" },
      { label: "휴대폰", value: "hp" },
      { label: "아이핀", value: "ipin" },
    ]),
    mb_memo: buildFieldSchema("mb_memo", "관리자 메모"),
    mb_adult: buildFieldSchema("mb_adult", "성인인증"),
    mb_open: buildFieldSchema("mb_open", "정보공개"),
    mb_1: buildFieldSchema("mb_1", "여분필드 1"),
    mb_icon: buildFieldSchema("mb_icon", "아이콘"),
    mb_img: buildFieldSchema("mb_img", "프로필 이미지"),
  },
  field_count: 10,
  generated_at: "2026-03-13T00:00:00Z",
  layout: null,
  legacy_form: "adm/member_form.php",
  section_count: 0,
  sections: [],
  title: "회원",
};

describe("AdminMembersPage", () => {
  beforeEach(() => {
    useAuthSessionMock.mockReset();
    useAuthSessionMock.mockImplementation(() => ({
      currentMember: {
        mb_id: "admin1",
        mb_name: "Admin",
        mb_nick: "admin",
        mb_email: "admin@example.com",
        mb_level: 10,
        mb_point: 0,
      },
      sessionError: null,
    }));
    useAdminFieldSchemaMock.mockReset();
    useAdminFieldSchemaMock.mockReturnValue({
      data: { schema: memberSchema },
      error: null,
      isLoading: false,
      isFetching: false,
    });
    apiMocks.getAdminMemberList.mockResolvedValue({
      members: [
        {
          mb_id: "neo",
          mb_name: "네오",
          mb_nick: "neo",
          mb_email: "neo@example.com",
          mb_level: 5,
          mb_point: 320,
          mb_datetime: "2026-03-08 10:00:00",
          mb_today_login: "2026-03-08 10:10:00",
          mb_leave_date: null,
          mb_intercept_date: null,
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
      request_id: "req-member-list",
      correlation_id: "corr-member-list",
      server_request_id: null,
    });
    apiMocks.getAdminMember.mockResolvedValue({
      member: {
        mb_id: "neo",
        mb_1: "여분값1",
        mb_2: null,
        mb_3: null,
        mb_4: null,
        mb_5: null,
        mb_6: null,
        mb_7: null,
        mb_8: null,
        mb_9: null,
        mb_10: null,
        mb_name: "네오",
        mb_nick: "neo",
        mb_email: "neo@example.com",
        mb_level: 5,
        mb_point: 320,
        mb_mailling: 1,
        mb_sms: 1,
        mb_marketing_agree: 1,
        mb_thirdparty_agree: 0,
        mb_agree_log: "log",
        mb_homepage: "https://example.com",
        mb_hp: "01012345678",
        mb_tel: "0212345678",
        mb_zip: "12345",
        mb_addr1: "서울",
        mb_addr2: "강남",
        mb_addr3: "빌딩",
        mb_addr_jibeon: "역삼동",
        mb_memo: "메모",
        mb_profile: "프로필",
        mb_signature: "서명",
        mb_adult: 1,
        mb_certify: "simple",
        mb_open: 1,
        mb_datetime: "2026-03-08 10:00:00",
        mb_today_login: "2026-03-08 10:10:00",
        mb_leave_date: "",
        mb_intercept_date: "",
      },
      request_id: "req-member-detail",
      correlation_id: "corr-member-detail",
      server_request_id: null,
    });
    apiMocks.updateAdminMember.mockResolvedValue({
      member: {
        mb_id: "neo",
        mb_1: "여분값1",
        mb_2: null,
        mb_3: null,
        mb_4: null,
        mb_5: null,
        mb_6: null,
        mb_7: null,
        mb_8: null,
        mb_9: null,
        mb_10: null,
        mb_name: "네오",
        mb_nick: "neo",
        mb_email: "neo@example.com",
        mb_level: 5,
        mb_point: 320,
        mb_mailling: 1,
        mb_sms: 1,
        mb_marketing_agree: 1,
        mb_thirdparty_agree: 0,
        mb_agree_log: "log",
        mb_homepage: "https://example.com",
        mb_hp: "01099998888",
        mb_tel: "0212345678",
        mb_zip: "12345",
        mb_addr1: "서울",
        mb_addr2: "강남",
        mb_addr3: "빌딩",
        mb_addr_jibeon: "역삼동",
        mb_memo: "메모",
        mb_profile: "프로필",
        mb_signature: "서명",
        mb_adult: 1,
        mb_certify: "simple",
        mb_open: 1,
        mb_datetime: "2026-03-08 10:00:00",
        mb_today_login: "2026-03-08 10:10:00",
        mb_leave_date: "",
        mb_intercept_date: "",
      },
      request_id: "req-member-update",
      correlation_id: "corr-member-update",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a validation-style empty state before a member is selected", async () => {
    renderPage("/admin/members");

    expect(await screen.findByText("회원 관리")).toBeInTheDocument();
    expect(screen.getByText("회원 상세를 선택하세요")).toBeInTheDocument();
  });

  it("saves the selected member profile from the route page", async () => {
    renderPage("/admin/members/neo?page=1&search=neo");

    expect(
      await screen.findByRole("textbox", { name: "휴대폰" }),
    ).toHaveValue("01012345678");
    fireEvent.change(screen.getByRole("textbox", { name: "휴대폰" }), {
      target: { value: "01099998888" },
    });
    fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));

    await waitFor(() => {
      expect(apiMocks.updateAdminMember).toHaveBeenCalled();
      expect(apiMocks.updateAdminMember.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          mb_id: "neo",
          mb_hp: "01099998888",
        }),
      );
    });
  });

  it("shows the members error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminMemberList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-members-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "회원 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-members-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/members",
      user_actionable: true,
    });

    renderPage("/admin/members");

    expect(
      await screen.findByText("회원 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
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
            <Route path="/admin/members" element={<AdminMembersPage />} />
            <Route path="/admin/members/:mbId" element={<AdminMembersPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function buildFieldSchema(
  name: string,
  label: string,
  inputType = "text",
  options: Array<{ label: string; value: string }> = [],
): AdminFieldSchema {
  return {
    create_only: false,
    data_type: "string",
    default_value: null,
    description: null,
    input_type: inputType,
    label,
    name,
    options,
    readonly_on_update: false,
    required: false,
  };
}
