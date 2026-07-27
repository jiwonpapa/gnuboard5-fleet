import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPermissionsWorkspacePage } from "./AdminPermissionsWorkspacePage";

const api = vi.hoisted(() => ({
  deleteAdminAuthByMember: vi.fn(),
  deleteAdminSystemPermission: vi.fn(),
  getMyProfile: vi.fn(),
  listAdminAuth: vi.fn(),
  listAdminSystemPermissions: vi.fn(),
  saveAdminSystemPermission: vi.fn(),
  upsertAdminAuth: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const pagination = {
  mode: "cursor",
  total: 1,
  page: 1,
  per_page: 100,
  last_page: 1,
  cursor: null,
  next_cursor: null,
  has_next: false,
  has_prev: false,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/permissions"]}>
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
          <Route
            path="/sites/:siteId/admin/permissions"
            element={<AdminPermissionsWorkspacePage />}
          />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyProfile.mockResolvedValue({
    mb_id: "g5admin",
    mb_name: "관리자",
    mb_nick: "관리자",
    mb_email: "admin@example.test",
    mb_level: 10,
    mb_point: 100,
  });
  api.listAdminSystemPermissions.mockResolvedValue({
    items: [{
      mb_id: "g5admin",
      au_menu: "config_100",
      au_auth: "r",
      mb_name: "관리자",
      mb_nick: "관리자",
    }],
    pagination,
  });
  api.listAdminAuth.mockResolvedValue({
    items: [{
      mb_id: "g5admin",
      mb_name: "관리자",
      mb_nick: "관리자",
      auths: [{ au_menu: "100100", au_auth: "r" }],
    }],
    pagination,
  });
  api.saveAdminSystemPermission.mockResolvedValue({
    mb_id: "g5admin",
    au_menu: "config_100",
    au_auth: "rw",
    mb_name: "관리자",
    mb_nick: "관리자",
  });
});

describe("AdminPermissionsWorkspacePage", () => {
  it("loads self profile, menu permissions and grouped grants in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByText("Connected identity")).toBeVisible();
    expect(screen.getByText("config_100")).toBeVisible();
    expect(api.getMyProfile).toHaveBeenCalledWith("site-a");
    expect(api.listAdminSystemPermissions).toHaveBeenCalledWith(
      "site-a",
      { page: 1, per_page: 100 },
    );
    expect(api.listAdminAuth).toHaveBeenCalledWith(
      "site-a",
      { page: 1, per_page: 100 },
    );
    fireEvent.click(screen.getByRole("button", { name: /회원별 권한 묶음/ }));
    expect(screen.getByText("100100")).toBeVisible();
  });

  it("normalizes, saves and reads a menu permission back", async () => {
    renderPage();
    await screen.findByDisplayValue("config_100");
    fireEvent.click(screen.getByLabelText(/쓰기/));
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() =>
      expect(api.saveAdminSystemPermission).toHaveBeenCalledWith(
        "site-a",
        {
          mb_id: "g5admin",
          au_menu: "config_100",
          au_auth: "rw",
        },
        "csrf-1",
      )
    );
    expect(api.listAdminSystemPermissions).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("메뉴 권한을 저장하고 목록을 재조회했습니다.")).toBeVisible();
  });
});
