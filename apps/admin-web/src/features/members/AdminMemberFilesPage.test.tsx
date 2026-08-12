import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminMemberFilesPage } from "./AdminMemberFilesPage";

const api = vi.hoisted(() => ({ exportAdminMembers: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

beforeEach(() => {
  api.exportAdminMembers.mockResolvedValue({
    items: [{ mb_id: "member01", mb_name: "회원", mb_email: "member@example.test", mb_level: 2 }],
    pagination: { total: 1 },
  });
});

describe("AdminMemberFilesPage", () => {
  it("inspects export members through the site-scoped server API", async () => {
    render(
      <MemoryRouter initialEntries={["/sites/site-a/admin/members/export"]}>
        <Routes>
          <Route path="/sites/:siteId/admin/members/export" element={<AdminMemberFilesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("내보내기 검색어"), { target: { value: "member" } });
    fireEvent.click(screen.getByRole("button", { name: "대상 조회" }));
    await waitFor(() => expect(api.exportAdminMembers).toHaveBeenCalledWith("site-a", {
      search: "member",
      search_field: "all",
    }));
    expect(await screen.findByText("member@example.test")).toBeVisible();
    expect(screen.getByText("내보내기 대상 1명")).toBeVisible();
  });
});
