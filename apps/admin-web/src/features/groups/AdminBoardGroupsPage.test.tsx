import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminBoardGroupsPage } from "./AdminBoardGroupsPage";

const api = vi.hoisted(() => ({
  addAdminBoardGroupMember: vi.fn(),
  createAdminBoardGroup: vi.fn(),
  deleteAdminBoardGroup: vi.fn(),
  deleteAdminBoardGroupMember: vi.fn(),
  getAdminBoardGroup: vi.fn(),
  listAdminBoardGroupMembers: vi.fn(),
  listAdminBoardGroups: vi.fn(),
  updateAdminBoardGroup: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const group = {
  gr_id: "staff",
  gr_subject: "운영진",
  gr_admin: "g5admin",
  gr_device: "both" as const,
  gr_use_access: 0 as const,
};
const member = {
  gm_id: 1,
  gr_id: "staff",
  mb_id: "member01",
  gm_datetime: "2026-08-12 10:00:00",
  mb_name: "회원 이름",
  mb_nick: "회원 닉네임",
  mb_level: 2,
  mb_today_login: null,
};
const pagination = {
  mode: "page",
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/groups"]}>
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
          <Route path="/sites/:siteId/admin/groups" element={<AdminBoardGroupsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminBoardGroups.mockResolvedValue({ items: [group], pagination });
  api.getAdminBoardGroup.mockResolvedValue(group);
  api.listAdminBoardGroupMembers.mockResolvedValue({ items: [member], pagination });
  api.updateAdminBoardGroup.mockResolvedValue({ ...group, gr_subject: "운영팀" });
  api.addAdminBoardGroupMember.mockResolvedValue({
    gr_id: "staff",
    mb_id: "member02",
    gm_datetime: "2026-08-12 11:00:00",
  });
});

describe("AdminBoardGroupsPage", () => {
  it("loads groups and members in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "staff" })).toBeVisible();
    expect(screen.getByText("member01")).toBeVisible();
    expect(api.listAdminBoardGroups).toHaveBeenCalledWith("site-a");
    expect(api.getAdminBoardGroup).toHaveBeenCalledWith("site-a", "staff");
    expect(api.listAdminBoardGroupMembers).toHaveBeenCalledWith(
      "site-a", "staff", { page: 1, per_page: 20 },
    );
  });

  it("saves and verifies the selected group by readback", async () => {
    api.getAdminBoardGroup
      .mockResolvedValueOnce(group)
      .mockResolvedValue({ ...group, gr_subject: "운영팀" });
    renderPage();
    const subject = await screen.findByLabelText("그룹 제목");
    fireEvent.change(subject, { target: { value: "운영팀" } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminBoardGroup).toHaveBeenCalledWith(
      "site-a",
      "staff",
      expect.objectContaining({ gr_subject: "운영팀" }),
      "csrf-1",
    ));
    expect(api.getAdminBoardGroup).toHaveBeenCalledTimes(3);
    expect(await screen.findByText("게시판 그룹을 저장하고 재조회했습니다.")).toBeVisible();
  });

  it("adds a group member and reads the membership list back", async () => {
    renderPage();
    const input = await screen.findByLabelText("추가할 회원 ID");
    fireEvent.change(input, { target: { value: "member02" } });
    fireEvent.click(screen.getByRole("button", { name: "회원 추가" }));
    await waitFor(() => expect(api.addAdminBoardGroupMember).toHaveBeenCalledWith(
      "site-a", "staff", "member02", "csrf-1",
    ));
    expect(api.listAdminBoardGroupMembers).toHaveBeenCalledTimes(3);
  });
});
