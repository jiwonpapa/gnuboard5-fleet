import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminPopularPage } from "./AdminPopularPage";

const api = vi.hoisted(() => ({
  getAdminPopularRank: vi.fn(), listAdminPopular: vi.fn(), resetAdminPopular: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(), ...api,
}));

const pagination = { mode: "page" as const, total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/popular"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/popular" element={<AdminPopularPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminPopular.mockResolvedValue({ items: [{ pp_word: "fleet", pp_date: "2026-08-20", pp_cnt: 3, pp_rank: 1 }], pagination });
  api.getAdminPopularRank.mockResolvedValue({ items: [{ rank: 1, pp_word: "fleet", hit_count: 3, first_date: "2026-08-20", last_date: "2026-08-20" }], pagination });
  api.resetAdminPopular.mockResolvedValue({ deleted_rows: 1, date_from: null, date_to: null });
});

describe("AdminPopularPage", () => {
  it("loads list and rank in explicit site scope", async () => {
    renderPage();
    expect((await screen.findAllByText("fleet"))[0]).toBeVisible();
    expect(api.listAdminPopular).toHaveBeenCalledWith("site-a", { page: 1, per_page: 20 });
    expect(api.getAdminPopularRank).toHaveBeenCalledWith("site-a", { limit: 20 });
    expect(screen.getByRole("heading", { name: "누적 순위" })).toBeVisible();
  });

  it("applies the reused date range to both read models", async () => {
    renderPage();
    await screen.findAllByText("fleet");
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-08-20" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(api.listAdminPopular).toHaveBeenLastCalledWith("site-a", {
      page: 1, per_page: 20, date_from: "2026-08-01", date_to: "2026-08-20",
    }));
  });

  it("requires confirmation before reset and reads back", async () => {
    renderPage();
    await screen.findAllByText("fleet");
    fireEvent.click(screen.getByRole("button", { name: "조회 범위 초기화" }));
    expect(screen.getByRole("dialog", { name: "인기검색어 초기화" })).toBeVisible();
    expect(api.resetAdminPopular).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "초기화·재조회" }));
    await waitFor(() => expect(api.resetAdminPopular).toHaveBeenCalledWith("site-a", {}, "csrf-1"));
    expect(await screen.findByText("인기검색어 1건을 초기화하고 재조회했습니다.")).toBeVisible();
  });
});
