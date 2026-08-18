import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminLayoutsPage } from "./AdminLayoutsPage";

const api = vi.hoisted(() => ({
  addAdminLayoutWidget: vi.fn(),
  deleteAdminLayoutWidget: vi.fn(),
  getAdminLayout: vi.fn(),
  listAdminLayouts: vi.fn(),
  reorderAdminLayoutWidgets: vi.fn(),
  saveAdminLayout: vi.fn(),
  updateAdminLayoutWidget: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const widget = {
  widget_id: "hero",
  type: "html_block" as const,
  title: "Hero",
  order: 1,
  config: {},
  style: {},
};
const secondWidget = {
  widget_id: "notice",
  type: "notice_banner" as const,
  title: "알림",
  order: 2,
  config: {},
  style: {},
};
const layout = {
  sl_id: 3,
  sl_page_id: "dashboard-main",
  sl_title: "대시보드",
  sl_schema: JSON.stringify({ widgets: [widget, secondWidget] }),
  sl_active: 1,
  sl_datetime: "2026-08-18 00:00:00",
  sl_updated: "2026-08-18 00:01:00",
};
const summary = { ...layout, sl_schema: undefined };
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/layouts"]}>
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
          <Route path="/sites/:siteId/admin/layouts" element={<AdminLayoutsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminLayouts.mockResolvedValue({ items: [summary], pagination });
  api.getAdminLayout.mockResolvedValue(layout);
  api.saveAdminLayout.mockResolvedValue(layout);
  api.addAdminLayoutWidget.mockResolvedValue(layout);
  api.updateAdminLayoutWidget.mockResolvedValue(layout);
  api.reorderAdminLayoutWidgets.mockResolvedValue(layout);
  api.deleteAdminLayoutWidget.mockResolvedValue(layout);
});

describe("AdminLayoutsPage", () => {
  it("loads list, detail and saves the legacy widgets editor in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "대시보드" })).toBeVisible();
    expect(api.listAdminLayouts).toHaveBeenCalledWith("site-a", { page: 1, per_page: 20 });
    expect(api.getAdminLayout).toHaveBeenCalledWith("site-a", "dashboard-main");

    fireEvent.change(screen.getByLabelText("레이아웃 제목"), { target: { value: "운영 대시보드" } });
    fireEvent.click(screen.getByRole("button", { name: "레이아웃 저장·재조회" }));
    await waitFor(() => expect(api.saveAdminLayout).toHaveBeenCalledWith(
      "site-a",
      "dashboard-main",
      { title: "운영 대시보드", widgets: [widget, secondWidget] },
      "csrf-1",
    ));
    expect(await screen.findByText("레이아웃을 저장하고 상세를 재조회했습니다.")).toBeVisible();
  });

  it("adds and updates a widget with typed payloads", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "대시보드" });
    fireEvent.change(screen.getByLabelText("widget_id"), { target: { value: "new_widget" } });
    fireEvent.change(screen.getByLabelText("위젯 제목"), { target: { value: "신규" } });
    fireEvent.change(screen.getByLabelText("위젯 순서"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "위젯 추가·재조회" }));
    await waitFor(() => expect(api.addAdminLayoutWidget).toHaveBeenCalledWith(
      "site-a",
      "dashboard-main",
      { widget_id: "new_widget", type: "html_block", title: "신규", order: 3, config: {}, style: {} },
      "csrf-1",
    ));

    fireEvent.click(screen.getAllByRole("button", { name: "편집" })[0]);
    fireEvent.change(screen.getByLabelText("위젯 제목"), { target: { value: "Hero 갱신" } });
    fireEvent.click(screen.getByRole("button", { name: "위젯 수정·재조회" }));
    await waitFor(() => expect(api.updateAdminLayoutWidget).toHaveBeenCalledWith(
      "site-a", "dashboard-main", "hero", { title: "Hero 갱신" }, "csrf-1",
    ));
  });

  it("uses canonical reorder and confirmation-gated delete", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "대시보드" });
    fireEvent.click(screen.getByRole("button", { name: "notice 위로" }));
    await waitFor(() => expect(api.reorderAdminLayoutWidgets).toHaveBeenCalledWith(
      "site-a", "dashboard-main", { widget_ids: ["notice", "hero"] }, "csrf-1",
    ));

    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
    expect(screen.getByText("선택한 위젯(hero)을 레이아웃에서 삭제합니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminLayoutWidget).toHaveBeenCalledWith(
      "site-a", "dashboard-main", "hero", "csrf-1",
    ));
  });
});
