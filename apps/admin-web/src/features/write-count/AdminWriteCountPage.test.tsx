import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminWriteCountPage } from "./AdminWriteCountPage";

const api = vi.hoisted(() => ({ getAdminWriteCountStats: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(), ...api,
}));

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/write-count"]}><Routes><Route path="/sites/:siteId/admin/write-count" element={<AdminWriteCountPage />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminWriteCountStats.mockResolvedValue({
    period: "day", date_from: "2026-08-01", date_to: "2026-08-21", bo_table: null,
    summary: { write_total: 7, comment_total: 3 },
    items: [{ bucket: "2026-08-21", write_count: 7, comment_count: 3 }],
  });
});

describe("AdminWriteCountPage", () => {
  it("loads the site-scoped summary and bucket table", async () => {
    renderPage();
    expect((await screen.findAllByText("7건"))[0]).toBeVisible();
    expect(screen.getAllByText("2026-08-21")[0]).toBeVisible();
    expect(api.getAdminWriteCountStats).toHaveBeenCalledWith("site-a", { period: "day" });
  });

  it("applies the reused period, date and board filters", async () => {
    renderPage();
    await screen.findAllByText("7건");
    fireEvent.change(screen.getByLabelText("기간 단위"), { target: { value: "week" } });
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-08-21" } });
    fireEvent.change(screen.getByLabelText("게시판"), { target: { value: "notice" } });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    await waitFor(() => expect(api.getAdminWriteCountStats).toHaveBeenLastCalledWith("site-a", {
      period: "week", date_from: "2026-08-01", date_to: "2026-08-21", bo_table: "notice",
    }));
  });
});
