import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminContentsPage } from "./AdminContentsPage";

const api = vi.hoisted(() => ({
  createAdminContent: vi.fn(),
  deleteAdminContent: vi.fn(),
  getAdminContent: vi.fn(),
  listAdminContents: vi.fn(),
  updateAdminContent: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const content = {
  co_id: "company",
  co_subject: "회사 소개",
  co_html: 2 as const,
  co_content: "<p>company</p>",
  co_mobile_content: "mobile company",
  co_include_head: "./head.php",
  co_include_tail: "./tail.php",
  co_tag_filter_use: 1 as const,
  co_skin: "basic",
  co_mobile_skin: "mobile",
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/contents"]}>
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
          <Route path="/sites/:siteId/admin/contents" element={<AdminContentsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminContents.mockResolvedValue({ items: [content], pagination });
  api.getAdminContent.mockResolvedValue(content);
  api.updateAdminContent.mockResolvedValue({ ...content, co_subject: "회사 안내" });
  api.createAdminContent.mockResolvedValue({ ...content, co_id: "fleet_terms" });
});

describe("AdminContentsPage", () => {
  it("loads list and detail while preserving HTML mode 2 in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "company" })).toBeVisible();
    expect(screen.getByLabelText("HTML 모드")).toHaveValue("2");
    expect(screen.getByLabelText("상단 파일 경로")).toHaveValue("./head.php");
    expect(api.listAdminContents).toHaveBeenCalledWith("site-a", expect.objectContaining({ page: 1 }));
    expect(api.getAdminContent).toHaveBeenCalledWith("site-a", "company");
  });

  it("sends changed fields only and verifies save by detail readback", async () => {
    api.getAdminContent
      .mockResolvedValueOnce(content)
      .mockResolvedValue({ ...content, co_subject: "회사 안내" });
    renderPage();
    fireEvent.change(await screen.findByLabelText("내용 제목"), { target: { value: "회사 안내" } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminContent).toHaveBeenCalledWith(
      "site-a", "company", { co_subject: "회사 안내" }, "csrf-1",
    ));
    expect(await screen.findByText("내용을 저장하고 상세를 재조회했습니다.")).toBeVisible();
  });

  it("deletes selected content only behind explicit confirmation", async () => {
    api.listAdminContents
      .mockResolvedValueOnce({ items: [content], pagination })
      .mockResolvedValue({ items: [], pagination: { ...pagination, total: 0 } });
    renderPage();
    await screen.findByRole("heading", { name: "company" });
    fireEvent.click(screen.getByRole("button", { name: "내용 삭제" }));
    expect(screen.getByText("company의 본문과 모바일 본문이 삭제됩니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminContent).toHaveBeenCalledWith(
      "site-a", "company", "csrf-1",
    ));
  });
});
