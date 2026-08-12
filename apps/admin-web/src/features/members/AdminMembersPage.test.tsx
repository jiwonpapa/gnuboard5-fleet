import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminMembersPage } from "./AdminMembersPage";

const api = vi.hoisted(() => ({
  deleteAdminMember: vi.fn(),
  deleteAdminMemberMedia: vi.fn(),
  getAdminMember: vi.fn(),
  getMyProfile: vi.fn(),
  listAdminMembers: vi.fn(),
  updateAdminMember: vi.fn(),
  updateAdminMemberLevel: vi.fn(),
  uploadAdminMemberMedia: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const member = {
  mb_id: "member01",
  mb_name: "회원 이름",
  mb_nick: "회원 닉네임",
  mb_email: "member@example.test",
  mb_level: 2,
  mb_point: 1200,
  mb_datetime: "2026-08-01 10:00:00",
  mb_today_login: "2026-08-12 09:00:00",
  mb_mailling: 1,
  mb_sms: 0,
  mb_open: 1,
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/members"]}>
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
          <Route path="/sites/:siteId/admin/members" element={<AdminMembersPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyProfile.mockResolvedValue({ mb_id: "g5admin", mb_level: 10 });
  api.listAdminMembers.mockResolvedValue({ items: [member], pagination });
  api.getAdminMember.mockResolvedValue(member);
  api.updateAdminMember.mockResolvedValue({ ...member, mb_nick: "변경 닉네임" });
  api.updateAdminMemberLevel.mockResolvedValue({ ...member, mb_level: 3 });
  api.deleteAdminMemberMedia.mockResolvedValue({
    mb_id: "member01",
    storage: "member_image",
    relative_path: "member_image/member01.gif",
    url: "",
    deleted: true,
  });
});

describe("AdminMembersPage", () => {
  it("loads member list and detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "member01" })).toBeVisible();
    expect(screen.getByText("회원 이름")).toBeVisible();
    expect(api.listAdminMembers).toHaveBeenCalledWith("site-a", expect.objectContaining({
      page: 1,
      per_page: 20,
    }));
    expect(api.getAdminMember).toHaveBeenCalledWith("site-a", "member01");
  });

  it("sends changed fields only and verifies the member by readback", async () => {
    api.getAdminMember
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce({ ...member, mb_nick: "변경 닉네임" });
    renderPage();
    const nickname = await screen.findByLabelText("닉네임");
    fireEvent.change(nickname, { target: { value: "변경 닉네임" } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminMember).toHaveBeenCalledWith(
      "site-a",
      "member01",
      { mb_nick: "변경 닉네임" },
      "csrf-1",
    ));
    expect(api.getAdminMember).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("회원 정보를 저장하고 재조회했습니다.")).toBeVisible();
  });

  it("keeps destructive member media actions behind site CSRF", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "member01" });
    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(deleteButtons[1]);
    await waitFor(() => expect(api.deleteAdminMemberMedia).toHaveBeenCalledWith(
      "site-a",
      "member01",
      "image",
      "csrf-1",
    ));
  });
});
