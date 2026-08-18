import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPollsPage } from "./AdminPollsPage";

const api = vi.hoisted(() => ({
  createAdminSystemPoll: vi.fn(),
  deleteAdminSystemPoll: vi.fn(),
  getAdminSystemPoll: vi.fn(),
  listAdminSystemPolls: vi.fn(),
  updateAdminSystemPoll: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const poll = {
  po_id: 11,
  po_subject: "R21 투표",
  po_poll1: "찬성",
  po_poll2: "반대",
  po_poll3: "",
  po_poll4: "",
  po_poll5: "",
  po_poll6: "",
  po_poll7: "",
  po_poll8: "",
  po_poll9: "",
  po_cnt1: 2,
  po_cnt2: 1,
  po_cnt3: 0,
  po_cnt4: 0,
  po_cnt5: 0,
  po_cnt6: 0,
  po_cnt7: 0,
  po_cnt8: 0,
  po_cnt9: 0,
  po_etc: "",
  po_level: 1,
  po_point: 0,
  po_date: "2026-08-18",
  po_ips: "",
  mb_ids: "",
  po_use: 1,
};

const pagination = {
  mode: "page" as const,
  total: 1,
  page: 1,
  per_page: 20,
  last_page: 1,
  cursor: null,
  next_cursor: null,
  has_next: false,
  has_prev: false,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/polls"]}>
      <AuthSessionProvider value={{
        idleTimeoutMinutes: 30,
        logout: async () => {},
        session: {
          principal_id: "principal-1",
          web_session_id: "session-1",
          expires_at_unix: 1,
          step_up_active: true,
          csrf_token: "csrf-1",
        },
        updateIdleTimeout: () => {},
        updateSession: () => {},
      }}>
        <Routes>
          <Route path="/sites/:siteId/admin/polls" element={<AdminPollsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminSystemPolls.mockResolvedValue({ items: [poll], pagination });
  api.getAdminSystemPoll.mockResolvedValue(poll);
  api.createAdminSystemPoll.mockResolvedValue({ ...poll, po_id: 12, po_subject: "신규 투표" });
  api.updateAdminSystemPoll.mockResolvedValue({ ...poll, po_subject: "수정 투표" });
  api.deleteAdminSystemPoll.mockResolvedValue(undefined);
});

describe("AdminPollsPage", () => {
  it("loads list and selected detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByText("R21 투표")).toBeVisible();
    await waitFor(() => expect(api.getAdminSystemPoll).toHaveBeenCalledWith("site-a", 11));
    expect(api.listAdminSystemPolls).toHaveBeenCalledWith("site-a", { page: 1, per_page: 20 });
    expect(screen.getByRole("heading", { name: "선택 투표 #11" })).toBeVisible();
  });

  it("creates a validated poll and performs list-detail readback", async () => {
    renderPage();
    await screen.findByText("R21 투표");
    const form = screen.getByRole("heading", { name: "투표 생성" }).closest("form");
    expect(form).not.toBeNull();
    const editor = within(form!);
    fireEvent.change(editor.getByLabelText("투표 제목"), { target: { value: " 신규 투표 " } });
    fireEvent.change(editor.getByLabelText("항목 1"), { target: { value: " 예 " } });
    fireEvent.change(editor.getByLabelText("항목 2"), { target: { value: " 아니오 " } });
    fireEvent.click(editor.getByRole("button", { name: "투표 생성·재조회" }));
    await waitFor(() => expect(api.createAdminSystemPoll).toHaveBeenCalledWith(
      "site-a",
      expect.objectContaining({ po_subject: "신규 투표", po_poll1: "예", po_poll2: "아니오" }),
      "csrf-1",
    ));
    expect(await screen.findByText("투표를 생성하고 목록·상세를 재조회했습니다.")).toBeVisible();
    expect(api.listAdminSystemPolls).toHaveBeenCalledTimes(2);
  });

  it("requires confirmation before deleting the selected poll", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "선택 투표 #11" });
    fireEvent.click(screen.getByRole("button", { name: "투표 삭제" }));
    expect(screen.getByRole("dialog", { name: "투표 삭제" })).toBeVisible();
    expect(api.deleteAdminSystemPoll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "삭제·재조회" }));
    await waitFor(() => expect(api.deleteAdminSystemPoll).toHaveBeenCalledWith("site-a", 11, "csrf-1"));
  });
});
