import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminMenusPage } from "./AdminMenusPage";

const api = vi.hoisted(() => ({
  createAdminMenu: vi.fn(),
  deleteAdminMenu: vi.fn(),
  getAdminMenu: vi.fn(),
  listAdminMenus: vi.fn(),
  reorderAdminMenus: vi.fn(),
  updateAdminMenu: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const menu = {
  me_id: 7,
  me_code: "100100",
  me_name: "회사 소개",
  me_link: "/company",
  me_target: "_self",
  me_order: 10,
  me_use: 1 as const,
  me_mobile_use: 1 as const,
};
const pagination = {
  mode: "page",
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/menus"]}>
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
          <Route path="/sites/:siteId/admin/menus" element={<AdminMenusPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminMenus.mockResolvedValue({ items: [menu], pagination });
  api.getAdminMenu.mockResolvedValue(menu);
  api.updateAdminMenu.mockResolvedValue({ ...menu, me_name: "회사 안내" });
  api.reorderAdminMenus.mockResolvedValue({ result: "ok" });
});

describe("AdminMenusPage", () => {
  it("loads list and detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "회사 소개" })).toBeVisible();
    expect(screen.getByLabelText("메뉴 코드")).toHaveValue("100100");
    expect(api.listAdminMenus).toHaveBeenCalledWith("site-a");
    expect(api.getAdminMenu).toHaveBeenCalledWith("site-a", 7);
  });

  it("sends changed fields only and verifies update by detail readback", async () => {
    api.getAdminMenu
      .mockResolvedValueOnce(menu)
      .mockResolvedValue({ ...menu, me_name: "회사 안내" });
    renderPage();
    fireEvent.change(await screen.findByLabelText("메뉴 이름"), { target: { value: "회사 안내" } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminMenu).toHaveBeenCalledWith(
      "site-a", 7, { me_name: "회사 안내" }, "csrf-1",
    ));
    expect(await screen.findByText("메뉴를 저장하고 상세를 재조회했습니다.")).toBeVisible();
  });

  it("uses canonical PATCH reorder and refreshes server order", async () => {
    api.listAdminMenus
      .mockResolvedValueOnce({ items: [menu], pagination })
      .mockResolvedValue({ items: [{ ...menu, me_order: 20 }], pagination });
    renderPage();
    fireEvent.change(await screen.findByLabelText("회사 소개 메뉴 순서"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "정렬 저장·재조회" }));
    await waitFor(() => expect(api.reorderAdminMenus).toHaveBeenCalledWith(
      "site-a", { orders: [{ me_id: 7, me_order: 20 }] }, "csrf-1",
    ));
    expect(await screen.findByText("메뉴 순서를 저장하고 목록을 재조회했습니다.")).toBeVisible();
  });

  it("deletes selected menu only behind explicit confirmation", async () => {
    api.listAdminMenus
      .mockResolvedValueOnce({ items: [menu], pagination })
      .mockResolvedValue({ items: [], pagination: { ...pagination, total: 0 } });
    renderPage();
    await screen.findByRole("heading", { name: "회사 소개" });
    fireEvent.click(screen.getByRole("button", { name: "메뉴 삭제" }));
    expect(screen.getByText("선택한 메뉴(회사 소개)와 연결 정보가 삭제됩니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminMenu).toHaveBeenCalledWith("site-a", 7, "csrf-1"));
  });
});
