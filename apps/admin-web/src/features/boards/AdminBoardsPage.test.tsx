import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminBoardsPage } from "./AdminBoardsPage";

const api = vi.hoisted(() => ({
  copyAdminBoard: vi.fn(),
  createAdminBoard: vi.fn(),
  deleteAdminBoard: vi.fn(),
  deleteAdminNewPosts: vi.fn(),
  getAdminBoard: vi.fn(),
  listAdminBoards: vi.fn(),
  updateAdminBoard: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const board = {
  bo_table: "notice",
  bo_subject: "공지사항",
  gr_id: "staff",
  bo_device: "both",
  bo_use_category: false,
  bo_category_list: "",
  bo_admin: "g5admin",
  bo_read_level: 1,
  bo_write_level: 10,
  bo_comment_level: 2,
  bo_download_level: 2,
  bo_use_secret: 0,
  bo_upload_count: 2,
  bo_upload_size: 1048576,
  bo_count_write: 4,
  bo_count_comment: 1,
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
    <MemoryRouter initialEntries={["/sites/site-a/admin/boards"]}>
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
          <Route path="/sites/:siteId/admin/boards" element={<AdminBoardsPage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminBoards.mockResolvedValue({ items: [board], pagination });
  api.getAdminBoard.mockResolvedValue(board);
  api.updateAdminBoard.mockResolvedValue({ ...board, bo_subject: "운영 공지" });
  api.copyAdminBoard.mockResolvedValue({ ...board, bo_table: "notice_copy", bo_subject: "복제 공지" });
  api.deleteAdminNewPosts.mockResolvedValue({
    deleted: true,
    deleted_count: 2,
    deleted_posts: 2,
    deleted_comments: 0,
    skipped: 0,
    bn_ids: [101, 102],
  });
});

describe("AdminBoardsPage", () => {
  it("loads board list and detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "notice" })).toBeVisible();
    expect(screen.getByText("4 / 1")).toBeVisible();
    expect(api.listAdminBoards).toHaveBeenCalledWith("site-a", expect.objectContaining({ page: 1 }));
    expect(api.getAdminBoard).toHaveBeenCalledWith("site-a", "notice");
  });

  it("sends changed fields only and verifies the saved board by readback", async () => {
    api.getAdminBoard
      .mockResolvedValueOnce(board)
      .mockResolvedValue({ ...board, bo_subject: "운영 공지" });
    renderPage();
    fireEvent.change(await screen.findByLabelText("게시판 제목"), { target: { value: "운영 공지" } });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminBoard).toHaveBeenCalledWith(
      "site-a", "notice", { bo_subject: "운영 공지" }, "csrf-1",
    ));
    expect(await screen.findByText("게시판을 저장하고 상세를 재조회했습니다.")).toBeVisible();
  });

  it("copies a board and deletes explicit new-post ids behind confirmations", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "notice" });
    fireEvent.click(screen.getByRole("button", { name: "게시판 복제" }));
    fireEvent.change(screen.getByLabelText("복제 게시판 ID"), { target: { value: "notice_copy" } });
    fireEvent.change(screen.getByLabelText("복제 게시판 제목"), { target: { value: "복제 공지" } });
    fireEvent.click(screen.getByRole("button", { name: "복제·재조회" }));
    await waitFor(() => expect(api.copyAdminBoard).toHaveBeenCalledWith(
      "site-a", "notice", { target_bo_table: "notice_copy", target_bo_subject: "복제 공지", copy_posts: false }, "csrf-1",
    ));

    fireEvent.change(screen.getByLabelText("최근글 ID"), { target: { value: "101, 102" } });
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminNewPosts).toHaveBeenCalledWith(
      "site-a", [101, 102], "csrf-1",
    ));
  });
});
