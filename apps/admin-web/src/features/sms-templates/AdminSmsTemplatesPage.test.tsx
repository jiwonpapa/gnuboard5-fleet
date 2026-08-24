import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminSmsTemplatesPage } from "./AdminSmsTemplatesPage";

const api = vi.hoisted(() => ({
  batchAdminSmsTemplates: vi.fn(), clearAdminSmsTemplateGroup: vi.fn(), createAdminSmsTemplate: vi.fn(),
  createAdminSmsTemplateGroup: vi.fn(), deleteAdminSmsTemplate: vi.fn(), deleteAdminSmsTemplateGroup: vi.fn(),
  getAdminSmsTemplate: vi.fn(), getAdminSmsTemplateGroup: vi.fn(), listAdminSmsTemplateGroups: vi.fn(),
  listAdminSmsTemplates: vi.fn(), moveAdminSmsTemplateGroup: vi.fn(), updateAdminSmsTemplate: vi.fn(),
  updateAdminSmsTemplateGroup: vi.fn(),
}));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const unclassified = { fg_no: 0, fg_name: "미분류", fg_count: 0, fg_member: 0, is_virtual: true };
const group = { fg_no: 3, fg_name: "예약 안내", fg_count: 1, fg_member: 1, is_virtual: false };
const template = { fo_no: 9, fg_no: 3, fg_name: "예약 안내", fg_member: 1, fo_name: "예약 확정", fo_content: "예약이 확정되었습니다.", fo_datetime: "2026-08-24 09:00:00" };
const pagination = { mode: "page", total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/sms-templates"]}><AuthSessionProvider value={{ idleTimeoutMinutes: 30, logout: async () => {}, session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" }, updateIdleTimeout: () => {}, updateSession: () => {} }}><Routes><Route path="/sites/:siteId/admin/sms-templates" element={<AdminSmsTemplatesPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminSmsTemplateGroups.mockResolvedValue({ groups: [group, unclassified], total: 2 });
  api.listAdminSmsTemplates.mockResolvedValue({ templates: [template], pagination });
  api.getAdminSmsTemplateGroup.mockResolvedValue(group);
  api.getAdminSmsTemplate.mockResolvedValue(template);
  api.createAdminSmsTemplate.mockResolvedValue(template);
  api.updateAdminSmsTemplate.mockResolvedValue({ ...template, fo_content: "변경된 안내입니다." });
  api.batchAdminSmsTemplates.mockResolvedValue({ action: "delete", affected: 1, target_fg_no: null });
});

describe("AdminSmsTemplatesPage", () => {
  it("hydrates the site-scoped group and template inventory including the virtual group", async () => {
    renderPage();
    expect(await screen.findByText("예약 확정")).toBeVisible();
    expect(screen.getAllByText("미분류").length).toBeGreaterThan(0);
    expect(api.listAdminSmsTemplateGroups).toHaveBeenCalledWith("site-a");
    expect(api.listAdminSmsTemplates).toHaveBeenCalledWith("site-a", expect.objectContaining({ fg_no: 3 }));
  });

  it("keeps explicit group-create mode until the create mutation completes", async () => {
    const created = { ...group, fg_no: 4, fg_name: "배송 안내" };
    api.createAdminSmsTemplateGroup.mockResolvedValue(created);
    api.listAdminSmsTemplateGroups.mockResolvedValueOnce({ groups: [group, unclassified], total: 2 }).mockResolvedValue({ groups: [group, created, unclassified], total: 3 });
    renderPage();
    await screen.findByText("예약 확정");

    fireEvent.click(screen.getByRole("button", { name: "새 그룹" }));
    fireEvent.change(screen.getByLabelText("템플릿 그룹명"), { target: { value: "배송 안내" } });
    fireEvent.click(screen.getByRole("button", { name: "그룹 만들기" }));

    await waitFor(() => expect(api.createAdminSmsTemplateGroup).toHaveBeenCalledWith("site-a", { fg_name: "배송 안내", fg_member: 0 }, "csrf-1"));
    expect(await screen.findByText("새 템플릿 그룹을 만들었습니다.")).toBeVisible();
  });

  it("saves a selected template and keeps the read-back value", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "예약 확정" }));
    await waitFor(() => expect(screen.getByLabelText("템플릿 본문")).toHaveValue("예약이 확정되었습니다."));
    fireEvent.change(screen.getByLabelText("템플릿 본문"), { target: { value: "변경된 안내입니다." } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));

    await waitFor(() => expect(api.updateAdminSmsTemplate).toHaveBeenCalledWith("site-a", 9, { fg_no: 3, fo_name: "예약 확정", fo_content: "변경된 안내입니다." }, "csrf-1"));
    expect(screen.getByLabelText("템플릿 본문")).toHaveValue("변경된 안내입니다.");
  });

  it("requires explicit confirmation before a destructive batch mutation", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("예약 확정 선택"));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("1건");
    expect(api.batchAdminSmsTemplates).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "삭제 실행" }));
    await waitFor(() => expect(api.batchAdminSmsTemplates).toHaveBeenCalledWith("site-a", { action: "delete", template_ids: [9] }, "csrf-1"));
  });
});
