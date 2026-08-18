import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { AdminThemePage } from "./AdminThemePage";

const api = vi.hoisted(() => ({
  getAdminTheme: vi.fn(),
  getAdminThemeConfig: vi.fn(),
  listAdminThemes: vi.fn(),
  updateAdminThemeConfig: vi.fn(),
}));

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  ...api,
}));

function theme(id: string, active = false, mobile = false) {
  return {
    id,
    path: `/theme/${id}`,
    theme_name: id === "basic" ? "Basic" : "Modern",
    theme_uri: "https://example.test/theme",
    maker: "G5 Fleet",
    maker_uri: "https://example.test",
    version: "1.0.0",
    detail: `${id} theme`,
    license: "MIT",
    license_uri: "https://opensource.org/license/mit",
    readme_path: null,
    theme_config_path: `/theme/${id}/theme.config.php`,
    screenshot_path: null,
    set_default_skin: true,
    preview_board_skin: "basic",
    preview_mobile_board_skin: "basic",
    is_active: active,
    is_mobile_active: mobile,
    theme_config: {},
  };
}

const config = {
  cf_theme: "basic",
  cf_mobile_theme: "basic",
  cf_theme_installed: true,
  cf_mobile_theme_installed: true,
  installed_count: 2,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sites/site-a/admin/theme"]}>
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
          <Route path="/sites/:siteId/admin/theme" element={<AdminThemePage />} />
        </Routes>
      </AuthSessionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminThemeConfig.mockResolvedValue(config);
  api.listAdminThemes.mockResolvedValue({
    items: [theme("basic", true, true), theme("modern")],
    total: 2,
  });
  api.getAdminTheme.mockImplementation(async (_siteId: string, id: string) =>
    theme(id, id === "basic", id === "basic"));
  api.updateAdminThemeConfig.mockResolvedValue(config);
});

describe("AdminThemePage", () => {
  it("loads config, list and detail in explicit site scope", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Basic" })).toBeVisible();
    expect(api.getAdminThemeConfig).toHaveBeenCalledWith("site-a");
    expect(api.listAdminThemes).toHaveBeenCalledWith("site-a");
    expect(api.getAdminTheme).toHaveBeenCalledWith("site-a", "basic");
    expect(screen.getByLabelText("PC 기본 테마")).toHaveValue("basic");
  });

  it("saves changed config and verifies config, list and detail readback", async () => {
    api.getAdminThemeConfig
      .mockResolvedValueOnce(config)
      .mockResolvedValue({ ...config, cf_theme: "modern" });
    renderPage();
    await screen.findByRole("heading", { name: "Basic" });
    fireEvent.change(screen.getByLabelText("PC 기본 테마"), {
      target: { value: "modern" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장·재조회" }));
    await waitFor(() => expect(api.updateAdminThemeConfig).toHaveBeenCalledWith(
      "site-a", { cf_theme: "modern" }, "csrf-1",
    ));
    expect(await screen.findByText("테마 설정을 저장하고 설정·목록·상세를 재조회했습니다.")).toBeVisible();
    expect(api.getAdminThemeConfig).toHaveBeenCalledTimes(2);
    expect(api.listAdminThemes).toHaveBeenCalledTimes(2);
  });

  it("applies selected theme to both targets with typed update", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Basic" });
    fireEvent.click(screen.getAllByText("Modern")[0]!);
    await waitFor(() => expect(api.getAdminTheme).toHaveBeenCalledWith("site-a", "modern"));
    fireEvent.click(screen.getByRole("button", { name: "둘 다 적용" }));
    await waitFor(() => expect(api.updateAdminThemeConfig).toHaveBeenCalledWith(
      "site-a",
      { cf_theme: "modern", cf_mobile_theme: "modern" },
      "csrf-1",
    ));
  });
});
