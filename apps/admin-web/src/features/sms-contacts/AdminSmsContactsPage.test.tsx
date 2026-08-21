import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminSmsContactsPage } from "./AdminSmsContactsPage";

const api = vi.hoisted(() => ({
  batchAdminSmsContacts: vi.fn(), clearAdminSmsContactGroup: vi.fn(), createAdminSmsContact: vi.fn(),
  createAdminSmsContactGroup: vi.fn(), deleteAdminSmsContact: vi.fn(), deleteAdminSmsContactGroup: vi.fn(),
  exportAdminSmsContacts: vi.fn(), getAdminSmsContact: vi.fn(), getAdminSmsContactGroup: vi.fn(),
  importAdminSmsContacts: vi.fn(), listAdminSmsContactGroups: vi.fn(), listAdminSmsContacts: vi.fn(),
  moveAdminSmsContactGroup: vi.fn(), updateAdminSmsContact: vi.fn(), updateAdminSmsContactGroup: vi.fn(),
}));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const group = { bg_no: 1, bg_name: "기본", bg_count: 1, bg_member: 0, bg_nomember: 1, bg_receipt: 1, bg_reject: 0 };
const contact = { bk_no: 7, bg_no: 1, bg_name: "기본", mb_id: null, bk_name: "홍길동", bk_hp: "01012345678", bk_receipt: 1, bk_datetime: "2026-08-21 12:00:00", bk_memo: null, receipt_label: "수신", member_type: "비회원", member_sync_skipped: false };
const contactList = { contacts: [contact], pagination: { mode: "page", total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false }, summary: { total_count: 1, receipt_count: 1, reject_count: 0, member_count: 0, non_member_count: 1, last_synced_at: null } };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/sms-contacts"]}><AuthSessionProvider value={{ idleTimeoutMinutes: 30, logout: async () => {}, session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" }, updateIdleTimeout: () => {}, updateSession: () => {} }}><Routes><Route path="/sites/:siteId/admin/sms-contacts" element={<AdminSmsContactsPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminSmsContactGroups.mockResolvedValue({ groups: [group], total: 1 });
  api.listAdminSmsContacts.mockResolvedValue(contactList);
  api.getAdminSmsContactGroup.mockResolvedValue(group);
  api.getAdminSmsContact.mockResolvedValue(contact);
  api.batchAdminSmsContacts.mockResolvedValue({ action: "reject", affected: 1, target_bg_no: null });
  api.importAdminSmsContacts.mockResolvedValue({ total_count: 2, invalid_count: 1, duplicate_count: 0, importable_count: 1, imported_count: 0, dry_run: true, duplicate_phones: [], importable_phones: ["01012345678"] });
});

describe("AdminSmsContactsPage", () => {
  it("hydrates the site-scoped group and contact inventory", async () => {
    renderPage();
    expect(await screen.findByText("홍길동")).toBeVisible();
    expect(screen.getAllByText("기본").length).toBeGreaterThan(0);
    expect(api.listAdminSmsContactGroups).toHaveBeenCalledWith("site-a");
    expect(api.listAdminSmsContacts).toHaveBeenCalled();
  });

  it("keeps an explicit create mode while group reads refresh", async () => {
    api.createAdminSmsContactGroup.mockResolvedValue({ ...group, bg_no: 2, bg_name: "신규" });
    api.listAdminSmsContactGroups.mockResolvedValue({ groups: [group, { ...group, bg_no: 2, bg_name: "신규" }], total: 2 });
    renderPage();
    await screen.findByText("홍길동");

    fireEvent.click(screen.getByRole("button", { name: "새 그룹" }));
    fireEvent.change(screen.getByLabelText("그룹명"), { target: { value: "신규" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "그룹 만들기" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "그룹 만들기" }));

    await waitFor(() => expect(api.createAdminSmsContactGroup).toHaveBeenCalledWith("site-a", "신규", "csrf-1"));
    expect(await screen.findByText("새 연락처 그룹을 만들었습니다.")).toBeVisible();
  });

  it("requires explicit confirmation for a batch mutation", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("홍길동 선택"));
    fireEvent.click(screen.getByRole("button", { name: "수신 거부" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("1건");
    expect(api.batchAdminSmsContacts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "수신 거부 실행" }));
    await waitFor(() => expect(api.batchAdminSmsContacts).toHaveBeenCalledWith("site-a", { action: "reject", contact_ids: [7] }, "csrf-1"));
  });

  it("previews parsed imports without an external-send action", async () => {
    renderPage();
    await screen.findByText("홍길동");
    fireEvent.change(screen.getByLabelText("가져올 연락처"), { target: { value: "신규,010-9999-8888\n오류,123" } });
    fireEvent.click(screen.getByRole("button", { name: "가져오기 미리보기" }));
    await waitFor(() => expect(api.importAdminSmsContacts).toHaveBeenCalledWith("site-a", expect.objectContaining({ bg_no: 1, dry_run: true }), "csrf-1"));
    expect(await screen.findByText("미리보기: 1건 가져오기 가능")).toBeVisible();
    expect(screen.queryByText("문자 발송")).not.toBeInTheDocument();
  });
});
