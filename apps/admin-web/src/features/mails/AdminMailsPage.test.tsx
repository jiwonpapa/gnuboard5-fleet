import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminMailsPage } from "./AdminMailsPage";

const api = vi.hoisted(() => ({
  createAdminMailTemplate: vi.fn(), createAdminMailTest: vi.fn(), deleteAdminMail: vi.fn(), getAdminMail: vi.fn(),
  listAdminMailRecipients: vi.fn(), listAdminMails: vi.fn(), listAdminSystemMailRecipients: vi.fn(), listAdminSystemMails: vi.fn(),
  sendAdminMail: vi.fn(), sendAdminMailTestLegacy: vi.fn(), sendAdminSystemMailTest: vi.fn(), sendAdminSystemMemberMail: vi.fn(), updateAdminMailTemplate: vi.fn(),
}));
vi.mock("../../api/fleet", () => api);

const pagination = { mode: "page", total: 1, page: 1, per_page: 50, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };
const mail = { ma_id: 11, ma_subject: "R28 안내", ma_content: "메일 본문", ma_time: "2026-08-21 12:00:00", ma_ip: "127.0.0.1", ma_last_option: "" };
const detail = { ...mail, last_option: { mb_id1: 0, mb_id1_from: "", mb_id1_to: "", mb_email: "", mb_mailling: 1, mb_level_from: 1, mb_level_to: 10, gr_id: "" }, preview_html: "<p>메일 본문</p>" };
const member = { mb_id: "fleetcert", mb_name: "인증 회원", mb_nick: "인증", mb_email: "fleet@example.test", mb_level: 2, mb_mailling: 1, mb_datetime: "2026-08-21 12:00:00" };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/mails"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/mails" element={<AdminMailsPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminMails.mockResolvedValue({ items: [mail], pagination });
  api.listAdminSystemMails.mockResolvedValue({ items: [mail], pagination });
  api.listAdminMailRecipients.mockResolvedValue({ items: [member], pagination });
  api.listAdminSystemMailRecipients.mockResolvedValue({ items: [{ ...member, mb_today_login: "2026-08-21 12:00:00" }], pagination });
  api.getAdminMail.mockResolvedValue(detail);
  api.createAdminMailTemplate.mockResolvedValue({ ...detail, ma_id: 12, ma_subject: "신규 안내" });
  api.updateAdminMailTemplate.mockResolvedValue({ ...detail, ma_subject: "수정 안내" });
  api.deleteAdminMail.mockResolvedValue(undefined);
  api.sendAdminMail.mockResolvedValue({ ma_id: 11, template_used: true, target_count: 1, sent_count: 0, skipped_count: 0, mail_enabled: false, dry_run: true, targets: [{ mb_id: "fleetcert", mb_email: "fleet@example.test" }] });
  api.createAdminMailTest.mockResolvedValue({ ma_id: 11, template_used: true, mail_enabled: false, sent: false, to: "admin@example.test" });
  api.sendAdminMailTestLegacy.mockResolvedValue({ ma_id: 11, template_used: true, mail_enabled: false, sent: false, to: "admin@example.test" });
  api.sendAdminSystemMailTest.mockResolvedValue({ sent: true, mail_log_id: 77, to: "admin@example.test" });
  api.sendAdminSystemMemberMail.mockResolvedValue({ mail_log_id: 78, target_count: 1, sent_count: 0, skipped_count: 0, mail_enabled: false, dry_run: true, recipients: [{ mb_id: "fleetcert", mb_email: "fleet@example.test" }] });
});

describe("AdminMailsPage", () => {
  it("loads both mail contracts, detail, and recipients in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByText("R28 안내")).toBeVisible();
    await waitFor(() => expect(api.getAdminMail).toHaveBeenCalledWith("site-a", 11));
    expect(api.listAdminMails).toHaveBeenCalledWith("site-a", { page: 1, per_page: 50 });
    expect(api.listAdminSystemMails).toHaveBeenCalledWith("site-a", { page: 1, per_page: 50 });
    expect(api.listAdminMailRecipients).toHaveBeenCalledWith("site-a", { page: 1, per_page: 50, mailling_only: true });
    expect(await screen.findByText("fleet@example.test")).toBeVisible();
  });

  it("creates a trimmed template and performs server readback", async () => {
    renderPage();
    const form = (await screen.findByRole("heading", { name: "새 템플릿" })).closest("form");
    const editor = within(form!);
    fireEvent.change(editor.getByLabelText("새 템플릿 제목"), { target: { value: " 신규 안내 " } });
    fireEvent.change(editor.getByLabelText("새 템플릿 본문"), { target: { value: " 새 본문 " } });
    fireEvent.click(editor.getByRole("button", { name: "생성·재조회" }));
    await waitFor(() => expect(api.createAdminMailTemplate).toHaveBeenCalledWith("site-a", { ma_subject: "신규 안내", ma_content: "새 본문" }, "csrf-1"));
    expect(await screen.findByText("메일 템플릿을 생성하고 목록·상세를 재조회했습니다.")).toBeVisible();
  });

  it("requires one-time confirmation and keeps member delivery dry-run", async () => {
    renderPage();
    await screen.findByText("fleet@example.test");
    fireEvent.click(screen.getByLabelText("fleetcert 선택"));
    expect(screen.getByRole("button", { name: "관리 계약 실행" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("선택한 사이트·대상·dry-run 상태를 확인했고 이 1회 실행을 승인합니다."));
    fireEvent.click(screen.getByRole("button", { name: "관리 계약 실행" }));
    await waitFor(() => expect(api.sendAdminMail).toHaveBeenCalledWith("site-a", expect.objectContaining({ ma_id: 11, target_type: "member", mb_ids: ["fleetcert"], mailling_only: true, dry_run: true }), "csrf-1"));
    expect(await screen.findByText(/대상 1명, 발송 0명의 dry-run/)).toBeVisible();
  });
});
