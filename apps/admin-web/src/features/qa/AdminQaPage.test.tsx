import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminQaConfig } from "../../api/fleet";
import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminQaPage } from "./AdminQaPage";

const api = vi.hoisted(() => ({ deleteAdminQaBulk: vi.fn(), getAdminQaConfig: vi.fn(), updateAdminQaConfig: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

const config = {
  qa_id: 1, qa_title: "1:1 문의", qa_category: "회원,결제", qa_skin: "basic", qa_mobile_skin: "basic",
  qa_use_email: "1", qa_req_email: "0", qa_use_hp: "1", qa_req_hp: "0", qa_use_sms: "0",
  qa_send_number: "", qa_admin_hp: "", qa_admin_email: "admin@example.test", qa_use_editor: "1",
  qa_subject_len: "40", qa_mobile_subject_len: "30", qa_page_rows: "15", qa_mobile_page_rows: "10",
  qa_image_width: "800", qa_upload_size: "1048576", qa_insert_content: "기본 본문", qa_include_head: "",
  qa_include_tail: "", qa_content_head: "", qa_content_tail: "", qa_mobile_content_head: "", qa_mobile_content_tail: "",
  qa_1_subj: "추가 항목", qa_2_subj: "", qa_3_subj: "", qa_4_subj: "", qa_5_subj: "",
  qa_1: "", qa_2: "", qa_3: "", qa_4: "", qa_5: "",
} satisfies AdminQaConfig;

function renderPage() {
  return render(<MemoryRouter initialEntries={["/sites/site-a/admin/qa"]}><AuthSessionProvider value={{
    idleTimeoutMinutes: 30, logout: async () => {},
    session: { principal_id: "principal-1", web_session_id: "session-1", expires_at_unix: 1, step_up_active: true, csrf_token: "csrf-1" },
    updateIdleTimeout: () => {}, updateSession: () => {},
  }}><Routes><Route path="/sites/:siteId/admin/qa" element={<AdminQaPage />} /></Routes></AuthSessionProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminQaConfig.mockResolvedValue(config);
  api.updateAdminQaConfig.mockResolvedValue({ ...config, qa_title: "Fleet 문의" });
  api.deleteAdminQaBulk.mockResolvedValue({ deleted_count: 2, qa_ids: [71, 72] });
});

describe("AdminQaPage", () => {
  it("hydrates the complete site-scoped QA config", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("1:1 문의")).toBeVisible();
    expect(screen.getByDisplayValue("추가 항목")).toBeVisible();
    expect(api.getAdminQaConfig).toHaveBeenCalledWith("site-a");
  });

  it("confirms a diff-only update and reads the config back", async () => {
    api.getAdminQaConfig.mockResolvedValueOnce(config).mockResolvedValueOnce({ ...config, qa_title: "Fleet 문의" });
    renderPage();
    fireEvent.change(await screen.findByLabelText("문의 화면 제목"), { target: { value: "Fleet 문의" } });
    fireEvent.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("1개 QA 설정");
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.updateAdminQaConfig).toHaveBeenCalledWith("site-a", { qa_title: "Fleet 문의" }, "csrf-1"));
    expect(await screen.findByText("1개 설정을 저장하고 서버 값을 재조회했습니다.")).toBeVisible();
    expect(api.getAdminQaConfig).toHaveBeenCalledTimes(2);
  });

  it("rejects unsafe ids and confirms an exact bulk delete", async () => {
    renderPage();
    const input = await screen.findByLabelText("삭제할 문의 ID");
    const button = screen.getByRole("button", { name: "문의 삭제 확인" });
    fireEvent.change(input, { target: { value: "71, 71" } });
    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: "71, 72" } });
    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toHaveTextContent("문의 ID 71, 72");
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(api.deleteAdminQaBulk).toHaveBeenCalledWith("site-a", { qa_ids: [71, 72] }, "csrf-1"));
    expect(await screen.findByText("문의 2건을 삭제했습니다. 요청 ID: 71, 72")).toBeVisible();
  });
});
