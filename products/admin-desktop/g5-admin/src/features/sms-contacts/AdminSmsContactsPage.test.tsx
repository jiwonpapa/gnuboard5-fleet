import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminSmsContactsPage } from "./AdminSmsContactsPage";

const apiMocks = vi.hoisted(() => ({
  batchAdminSmsContacts: vi.fn(),
  clearAdminSmsContactGroup: vi.fn(),
  createAdminSmsContact: vi.fn(),
  createAdminSmsContactGroup: vi.fn(),
  deleteAdminSmsContact: vi.fn(),
  deleteAdminSmsContactGroup: vi.fn(),
  exportAdminSmsContacts: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminSmsConfig: vi.fn(),
  getAdminSmsContact: vi.fn(),
  getAdminSmsContactGroup: vi.fn(),
  getAdminSmsContactGroupList: vi.fn(),
  getAdminSmsContactList: vi.fn(),
  importAdminSmsContacts: vi.fn(),
  moveAdminSmsContactGroup: vi.fn(),
  updateAdminSmsContact: vi.fn(),
  updateAdminSmsContactGroup: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  batchAdminSmsContacts: apiMocks.batchAdminSmsContacts,
  clearAdminSmsContactGroup: apiMocks.clearAdminSmsContactGroup,
  createAdminSmsContact: apiMocks.createAdminSmsContact,
  createAdminSmsContactGroup: apiMocks.createAdminSmsContactGroup,
  deleteAdminSmsContact: apiMocks.deleteAdminSmsContact,
  deleteAdminSmsContactGroup: apiMocks.deleteAdminSmsContactGroup,
  exportAdminSmsContacts: apiMocks.exportAdminSmsContacts,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminSmsConfig: apiMocks.getAdminSmsConfig,
  getAdminSmsContact: apiMocks.getAdminSmsContact,
  getAdminSmsContactGroup: apiMocks.getAdminSmsContactGroup,
  getAdminSmsContactGroupList: apiMocks.getAdminSmsContactGroupList,
  getAdminSmsContactList: apiMocks.getAdminSmsContactList,
  importAdminSmsContacts: apiMocks.importAdminSmsContacts,
  moveAdminSmsContactGroup: apiMocks.moveAdminSmsContactGroup,
  updateAdminSmsContact: apiMocks.updateAdminSmsContact,
  updateAdminSmsContactGroup: apiMocks.updateAdminSmsContactGroup,
}));

describe("AdminSmsContactsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(
      completeAdminSchemaResponseForTest("sms-contacts", {
        schema: {
          fields_by_name: {
            bg_name: {
              name: "bg_name",
              label: "그룹명",
              description: null,
              options: [],
            },
            bg_no: {
              name: "bg_no",
              label: "그룹",
              description: null,
              options: [
                { label: "기본 그룹", value: "1" },
                { label: "거래처", value: "2" },
              ],
            },
            mb_id: {
              name: "mb_id",
              label: "회원 아이디",
              description: null,
              options: [],
            },
            bk_name: {
              name: "bk_name",
              label: "이름",
              description: null,
              options: [],
            },
            bk_hp: {
              name: "bk_hp",
              label: "휴대폰번호",
              description: null,
              options: [],
            },
            bk_receipt: {
              name: "bk_receipt",
              label: "수신여부",
              description: null,
              options: [
                { label: "수신허용", value: "1" },
                { label: "수신거부", value: "0" },
              ],
            },
            bk_memo: {
              name: "bk_memo",
              label: "메모",
              description: null,
              options: [],
            },
            contacts_text: {
              name: "contacts_text",
              label: "텍스트 가져오기",
              description: "한 줄에 이름과 번호를 입력합니다.",
              options: [],
            },
            dry_run: {
              name: "dry_run",
              label: "드라이런",
              description: null,
              options: [],
            },
            include_no_phone: {
              name: "include_no_phone",
              label: "휴대폰 번호 없는 회원 포함",
              description: null,
              options: [],
            },
            with_hyphen: {
              name: "with_hyphen",
              label: "하이픈 포함",
              description: null,
              options: [],
            },
          },
        },
        request_id: "req-sms-contacts-schema",
        correlation_id: "corr-sms-contacts-schema",
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
    apiMocks.getAdminSmsContactGroupList.mockResolvedValue({
      groups: [
        {
          bg_no: 1,
          bg_name: "기본 그룹",
          bg_count: 2,
          bg_member: 1,
          bg_nomember: 1,
          bg_receipt: 1,
          bg_reject: 1,
        },
        {
          bg_no: 2,
          bg_name: "거래처",
          bg_count: 3,
          bg_member: 2,
          bg_nomember: 1,
          bg_receipt: 2,
          bg_reject: 1,
        },
      ],
      total: 2,
      request_id: "req-groups",
      correlation_id: "corr-groups",
      server_request_id: null,
    });
    apiMocks.getAdminSmsContactGroup.mockResolvedValue({
      group: {
        bg_no: 1,
        bg_name: "기본 그룹",
        bg_count: 2,
        bg_member: 1,
        bg_nomember: 1,
        bg_receipt: 1,
        bg_reject: 1,
      },
      request_id: "req-group-detail",
      correlation_id: "corr-group-detail",
      server_request_id: null,
    });
    apiMocks.getAdminSmsContactList.mockResolvedValue({
      contacts: [
        {
          bk_no: 101,
          bg_no: 1,
          bg_name: "기본 그룹",
          mb_id: "neo",
          bk_name: "네오",
          bk_hp: "01012345678",
          bk_receipt: 1,
          bk_datetime: "2026-03-12 09:00:00",
          bk_memo: "메모",
          receipt_label: "허용",
          member_type: "member",
          member_sync_skipped: false,
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
      summary: {
        total_count: 1,
        receipt_count: 1,
        reject_count: 0,
        member_count: 1,
        non_member_count: 0,
        last_synced_at: "2026-03-12 09:10:00",
      },
      request_id: "req-contacts",
      correlation_id: "corr-contacts",
      server_request_id: null,
    });
    apiMocks.getAdminSmsContact.mockResolvedValue({
      contact: {
        bk_no: 101,
        bg_no: 1,
        bg_name: "기본 그룹",
        mb_id: "neo",
        bk_name: "네오",
        bk_hp: "01012345678",
        bk_receipt: 1,
        bk_datetime: "2026-03-12 09:00:00",
        bk_memo: "메모",
        receipt_label: "허용",
        member_type: "member",
        member_sync_skipped: false,
      },
      request_id: "req-contact-detail",
      correlation_id: "corr-contact-detail",
      server_request_id: null,
    });
    apiMocks.createAdminSmsContact.mockResolvedValue({
      contact: {
        bk_no: 202,
        bg_no: 1,
        bg_name: "기본 그룹",
        mb_id: null,
        bk_name: "홍길동",
        bk_hp: "01077778888",
        bk_receipt: 1,
        bk_datetime: "2026-03-13 09:00:00",
        bk_memo: "테스트 메모",
        receipt_label: "허용",
        member_type: "guest",
        member_sync_skipped: false,
      },
      request_id: "req-contact-create",
      correlation_id: "corr-contact-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the split group/contact/import sections for the contacts route", async () => {
    renderPage("/admin/sms/contacts");

    expect(await screen.findByText("휴대폰번호 관리")).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("sms-contacts");
    });
    expect(
      await screen.findByRole("button", { name: "그룹 비우기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("그룹 목록")).toBeInTheDocument();
    expect(screen.getByText("연락처 목록")).toBeInTheDocument();
    expect(screen.getByText("파일 가져오기 / 내보내기")).toBeInTheDocument();
    expect(screen.getByText("네오")).toBeInTheDocument();
  });

  it("switches the page intro for the contact-files route", async () => {
    renderPage("/admin/sms/contact-files");

    expect(await screen.findByText("휴대폰번호 파일")).toBeInTheDocument();
    expect(
      screen.getByText(
        /텍스트 입력과 파일 업로드를 둘 다 지원하고, 내보내기 미리보기도 같은 화면에서 확인합니다\./,
      ),
    ).toBeInTheDocument();
  });

  it("does not request contact storage endpoints when SMS5 tables are missing", async () => {
    apiMocks.getAdminSmsConfig.mockResolvedValue({
      config: {
        provider_ready: false,
        storage_ready: false,
        missing_tables: ["g5_sms5_book", "g5_sms5_book_group"],
      },
      request_id: "req-sms-config-storage-missing",
      correlation_id: "corr-sms-config-storage-missing",
      server_request_id: null,
    });

    renderPage("/admin/sms/contacts");

    expect(await screen.findByText("SMS 저장소 미구성")).toBeInTheDocument();
    expect(apiMocks.getAdminSmsContactGroupList).not.toHaveBeenCalled();
    expect(apiMocks.getAdminSmsContactList).not.toHaveBeenCalled();
  });

  it("shows validation errors before creating a contact", async () => {
    renderPage("/admin/sms/contacts");

    await screen.findByText("연락처 편집");
    fireEvent.change(screen.getByLabelText("휴대폰번호"), {
      target: { value: "010-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "연락처 생성" }));

    expect(
      await screen.findByText("이름을 입력해 주십시오."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("휴대폰번호를 정확히 입력해 주십시오."),
    ).toBeInTheDocument();
  });

  it("creates a contact from the page editor", async () => {
    renderPage("/admin/sms/contacts");

    await screen.findByText("연락처 편집");
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "  홍길동  " },
    });
    fireEvent.change(screen.getByLabelText("휴대폰번호"), {
      target: { value: "010-7777-8888" },
    });
    fireEvent.change(screen.getByLabelText("메모"), {
      target: { value: "  테스트 메모  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "연락처 생성" }));

    await waitFor(() => {
      expect(apiMocks.createAdminSmsContact).toHaveBeenCalledWith({
        bg_no: 1,
        mb_id: null,
        bk_name: "홍길동",
        bk_hp: "01077778888",
        bk_receipt: 1,
        bk_memo: "테스트 메모",
      });
    });
  });

  it("shows the contact error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminSmsContactGroupList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-sms-contact-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "휴대폰번호 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-sms-contact-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/sms/contacts",
      user_actionable: true,
    });

    renderPage("/admin/sms/contacts");

    expect(
      await screen.findByText("휴대폰번호 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("uses schema labels for contact editor and import forms", async () => {
    renderPage("/admin/sms/contacts");

    expect((await screen.findAllByLabelText("그룹")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("휴대폰번호")).toBeInTheDocument();
    expect(
      screen.getByText("한 줄에 이름과 번호를 입력합니다."),
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
            <Route path="*" element={<AdminSmsContactsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
