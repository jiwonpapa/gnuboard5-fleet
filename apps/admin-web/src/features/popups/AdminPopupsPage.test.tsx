import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPopupsPage } from "./AdminPopupsPage";

const api = vi.hoisted(() => ({
  createAdminSystemPopup: vi.fn(), deleteAdminSystemPopup: vi.fn(),
  getAdminSystemPopup: vi.fn(), listAdminSystemPopups: vi.fn(), updateAdminSystemPopup: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(), ...api,
}));

const popup = {
  nw_id: 22, nw_division: "both", nw_device: "both",
  nw_begin_time: "2026-08-18 09:00:00", nw_end_time: "2026-08-19 09:00:00",
  nw_disable_hours: 24, nw_left: 100, nw_top: 100, nw_height: 400, nw_width: 600,
  nw_subject: "R22 팝업", nw_content: "팝업 본문", nw_content_html: 0,
};
const pagination = { mode: "page" as const, total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/popups"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/popups" element={<AdminPopupsPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminSystemPopups.mockResolvedValue({ items: [popup], pagination });
  api.getAdminSystemPopup.mockResolvedValue(popup);
  api.createAdminSystemPopup.mockResolvedValue({ ...popup, nw_id: 23, nw_subject: "신규 팝업" });
  api.updateAdminSystemPopup.mockResolvedValue({ ...popup, nw_device: "mobile" });
  api.deleteAdminSystemPopup.mockResolvedValue(undefined);
});

describe("AdminPopupsPage", () => {
  it("loads the list and detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByText("R22 팝업")).toBeVisible();
    await waitFor(() => expect(api.getAdminSystemPopup).toHaveBeenCalledWith("site-a", 22));
    expect(api.listAdminSystemPopups).toHaveBeenCalledWith("site-a", { page: 1, per_page: 20 });
    expect(screen.getByRole("heading", { name: "선택 팝업 #22" })).toBeVisible();
  });

  it("reuses defaults to create and read back a popup", async () => {
    renderPage();
    await screen.findByText("R22 팝업");
    const form = screen.getByRole("heading", { name: "팝업 생성" }).closest("form");
    const editor = within(form!);
    fireEvent.change(editor.getByLabelText("팝업 제목"), { target: { value: " 신규 팝업 " } });
    fireEvent.change(editor.getByLabelText("팝업 본문"), { target: { value: " 신규 본문 " } });
    fireEvent.click(editor.getByRole("button", { name: "팝업 생성·재조회" }));
    await waitFor(() => expect(api.createAdminSystemPopup).toHaveBeenCalledWith(
      "site-a", expect.objectContaining({ nw_subject: "신규 팝업", nw_content: "신규 본문", nw_width: 600 }), "csrf-1",
    ));
    expect(await screen.findByText("팝업을 생성하고 목록·상세를 재조회했습니다.")).toBeVisible();
  });

  it("requires confirmation before deleting", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "선택 팝업 #22" });
    fireEvent.click(screen.getByRole("button", { name: "팝업 삭제" }));
    expect(screen.getByRole("dialog", { name: "팝업 삭제" })).toBeVisible();
    expect(api.deleteAdminSystemPopup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "삭제·재조회" }));
    await waitFor(() => expect(api.deleteAdminSystemPopup).toHaveBeenCalledWith("site-a", 22, "csrf-1"));
  });
});
