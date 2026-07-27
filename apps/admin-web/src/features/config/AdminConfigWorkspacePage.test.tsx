import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminSchemaDetail } from "../../api/fleet";
import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminConfigWorkspacePage } from "./AdminConfigWorkspacePage";

const api = vi.hoisted(() => ({
  getAdminConfig: vi.fn(),
  getAdminDashboard: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  listAdminFieldSchemas: vi.fn(),
  updateAdminConfig: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

const titleField = {
  name: "cf_title",
  label: "사이트 제목",
  input_type: "text" as const,
  data_type: "string" as const,
  required: true,
  create_only: false,
  readonly_on_update: false,
  description: "브라우저 제목과 관리자 표시에 사용합니다.",
  default_value: "",
  options: [],
  option_source: null,
};
const sentinelField = {
  ...titleField,
  name: "cf_10",
  label: "여분 필드 10",
  required: false,
  description: null,
};

const configSchema: AdminSchemaDetail = {
  domain: "config",
  title: "기본환경설정",
  legacy_form: "config_form",
  generated_at: "2026-07-27T00:00:00Z",
  field_count: 2,
  section_count: 1,
  layout: { desktop: "tabs", mobile: "accordion", single_open: true },
  sections: [{
    key: "basic",
    label: "기본",
    order: 1,
    description: "사이트 기본 정보",
    fields: [titleField, sentinelField],
  }],
  fields_by_name: { cf_title: titleField, cf_10: sentinelField },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/config"]}>
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
            path="/sites/:siteId/admin/config"
            element={<AdminConfigWorkspacePage />}
          />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminDashboard.mockResolvedValue({
    limit: 5,
    summary: {
      members: { total_members: 12 },
      posts: { total_rows: 34 },
      points: { total_rows: 56 },
      visits: { total_visits: 78 },
    },
    recent_members: [],
    recent_posts: [],
    recent_points: [],
  });
  api.getAdminConfig.mockResolvedValue({
    cf_title: "Test Site",
    cf_10: "baseline",
  });
  api.listAdminFieldSchemas.mockResolvedValue({
    items: [{
      domain: "config",
      title: "기본환경설정",
      legacy_form: "config_form",
      field_count: 2,
      section_count: 1,
      generated_at: "2026-07-27T00:00:00Z",
    }],
    total: 1,
  });
  api.getAdminFieldSchema.mockResolvedValue(configSchema);
  api.updateAdminConfig.mockResolvedValue({
    cf_title: "Fleet Updated",
    cf_10: "baseline",
  });
});

describe("AdminConfigWorkspacePage", () => {
  it("consumes dashboard, config, schema catalog and detail with an explicit site_id", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("Test Site")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("34")).toBeVisible();
    expect(screen.getByText("계약 필드")).toBeVisible();
    expect(api.getAdminDashboard).toHaveBeenCalledWith("site-a", 5);
    expect(api.getAdminConfig).toHaveBeenCalledWith("site-a");
    expect(api.listAdminFieldSchemas).toHaveBeenCalledWith("site-a");
    expect(api.getAdminFieldSchema).toHaveBeenCalledWith("site-a", "config");
    expect(screen.getByRole("button", { name: "설정 저장" })).toBeDisabled();
  });

  it("sends changed fields only and verifies the saved value by readback", async () => {
    api.getAdminConfig
      .mockResolvedValueOnce({ cf_title: "Test Site", cf_10: "baseline" })
      .mockResolvedValueOnce({ cf_title: "Fleet Updated", cf_10: "baseline" });
    renderPage();
    const title = await screen.findByLabelText(/사이트 제목/);
    fireEvent.change(title, { target: { value: "Fleet Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));

    await waitFor(() =>
      expect(api.updateAdminConfig).toHaveBeenCalledWith(
        "site-a",
        { cf_title: "Fleet Updated" },
        "csrf-1",
      )
    );
    expect(await screen.findByText("1개 설정을 저장하고 재조회했습니다.")).toBeVisible();
    expect(api.getAdminConfig).toHaveBeenCalledTimes(2);
  });

  it("blocks invalid required values and exposes the field error", async () => {
    renderPage();
    const title = await screen.findByLabelText(/사이트 제목/);
    fireEvent.change(title, { target: { value: "" } });
    fireEvent.submit(title.closest("form")!);
    expect(await screen.findByText("사이트 제목 항목은 필수입니다.")).toBeVisible();
    expect(api.updateAdminConfig).not.toHaveBeenCalled();
  });
});
