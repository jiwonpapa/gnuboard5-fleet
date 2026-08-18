import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminFaqsPage } from "./AdminFaqsPage";

const api = vi.hoisted(() => ({
  createAdminFaq: vi.fn(), createAdminFaqMaster: vi.fn(), deleteAdminFaq: vi.fn(),
  deleteAdminFaqMaster: vi.fn(), deleteAdminFaqMasterImage: vi.fn(),
  getAdminFaq: vi.fn(), getAdminFaqMaster: vi.fn(), listAdminFaqs: vi.fn(),
  listAdminFaqMasters: vi.fn(), updateAdminFaq: vi.fn(), updateAdminFaqMaster: vi.fn(),
  uploadAdminFaqMasterImage: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const image = { exists: false, relative_path: "", url: "", width: null, height: null, mime: null, size: null };
const master = {
  fm_id: 7, fm_subject: "이용 안내", fm_order: 1, faq_count: 1,
  fm_head_html: "", fm_tail_html: "", fm_mobile_head_html: "", fm_mobile_tail_html: "",
  header_image: image, footer_image: image,
};
const faq = { fa_id: 3, fm_id: 7, fm_subject: "이용 안내", fa_subject: "배송은?", fa_content: "답변", fa_order: 1 };
const pagination = { mode: "page", total: 1, page: 1, per_page: 20, last_page: 1, cursor: null, next_cursor: null, has_next: false, has_prev: false };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/faqs"]}>
      <AuthSessionProvider value={{
        idleTimeoutMinutes: 30, logout: async () => {}, updateIdleTimeout: () => {}, updateSession: () => {},
        session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
      }}>
        <Routes><Route path="/sites/:siteId/admin/faqs" element={<AdminFaqsPage />} /></Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listAdminFaqMasters.mockResolvedValue({ items: [master], pagination });
  api.getAdminFaqMaster.mockResolvedValue(master);
  api.listAdminFaqs.mockResolvedValue({ items: [faq], pagination });
  api.getAdminFaq.mockResolvedValue(faq);
  api.updateAdminFaqMaster.mockResolvedValue(master);
  api.updateAdminFaq.mockResolvedValue(faq);
});

describe("AdminFaqsPage", () => {
  it("loads masters and items in explicit site scope while preserving empty mobile HTML", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "이용 안내" })).toBeVisible();
    expect(screen.getByLabelText("모바일 상단 HTML")).toHaveValue("");
    expect(await screen.findByText("배송은?")).toBeVisible();
    expect(api.listAdminFaqMasters).toHaveBeenCalledWith("site-a", expect.objectContaining({ page: 1 }));
    expect(api.listAdminFaqs).toHaveBeenCalledWith("site-a", expect.objectContaining({ fm_id: 7 }));
  });

  it("sends only changed FAQ fields and verifies save by readback", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("배송은?"));
    fireEvent.change(await screen.findByLabelText("답변 내용"), { target: { value: "변경 답변" } });
    fireEvent.click(screen.getAllByRole("button", { name: "저장·재조회" })[1]);
    await waitFor(() => expect(api.updateAdminFaq).toHaveBeenCalledWith(
      "site-a", 3, { fa_content: "변경 답변" }, "csrf-1",
    ));
    expect(api.getAdminFaq).toHaveBeenCalledWith("site-a", 3);
    await waitFor(() => expect(api.listAdminFaqMasters).toHaveBeenCalledTimes(2));
    expect(api.getAdminFaqMaster).toHaveBeenCalledWith("site-a", 7);
  });

  it("deletes a master only behind explicit confirmation", async () => {
    api.deleteAdminFaqMaster.mockResolvedValue(undefined);
    api.listAdminFaqMasters
      .mockResolvedValueOnce({ items: [master], pagination })
      .mockResolvedValue({ items: [], pagination: { ...pagination, total: 0 } });
    renderPage();
    await screen.findByRole("heading", { name: "이용 안내" });
    fireEvent.click(screen.getByRole("button", { name: "분류 삭제" }));
    expect(screen.getByText(/속한 문항이 함께 영향/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminFaqMaster).toHaveBeenCalledWith("site-a", 7, "csrf-1"));
  });
});
