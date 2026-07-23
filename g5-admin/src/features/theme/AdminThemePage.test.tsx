import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminThemePage } from "./AdminThemePage";

const apiMocks = vi.hoisted(() => ({
  getAdminFieldSchema: vi.fn(),
  getAdminTheme: vi.fn(),
  getAdminThemeConfig: vi.fn(),
  getAdminThemeList: vi.fn(),
  updateAdminThemeConfig: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminTheme: apiMocks.getAdminTheme,
  getAdminThemeConfig: apiMocks.getAdminThemeConfig,
  getAdminThemeList: apiMocks.getAdminThemeList,
  updateAdminThemeConfig: apiMocks.updateAdminThemeConfig,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createTheme(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    theme_name: id,
    maker: "gnuboard",
    version: "1.0.0",
    detail: `${id} 설명`,
    is_active: false,
    is_mobile_active: false,
    set_default_skin: false,
    theme_uri: "https://example.com/theme",
    maker_uri: "https://example.com/maker",
    license: "MIT",
    license_uri: "https://example.com/license",
    preview_board_skin: "basic",
    preview_mobile_board_skin: "mobile",
    path: `/themes/${id}`,
    readme_path: `/themes/${id}/README.md`,
    theme_config_path: `/themes/${id}/config.php`,
    screenshot_path: `/themes/${id}/preview.png`,
    ...overrides,
  };
}

describe("AdminThemePage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("theme", {
      schema: {
        fields_by_name: {
          cf_theme: {
            name: "cf_theme",
            label: "테마",
            description: "설치된 테마 목록은 /admin/system/themes에서 조회합니다.",
            options: [],
          },
          cf_mobile_theme: {
            name: "cf_mobile_theme",
            label: "모바일 테마",
            description: "설치된 테마 목록은 /admin/system/themes에서 조회합니다.",
            options: [],
          },
        },
      },
      request_id: "req-theme-schema",
      correlation_id: "corr-theme-schema",
      server_request_id: null,
    }));
    apiMocks.getAdminThemeConfig.mockResolvedValue({
      config: {
        cf_theme: "basic",
        cf_mobile_theme: "mobile",
        installed_count: 2,
      },
      request_id: "req-theme-config",
      correlation_id: "corr-theme-config",
      server_request_id: null,
    });
    apiMocks.getAdminThemeList.mockResolvedValue({
      total: 2,
      themes: [
        createTheme("basic", {
          theme_name: "Basic Theme",
          is_active: true,
        }),
        createTheme("mobile", {
          theme_name: "Mobile Theme",
          is_mobile_active: true,
        }),
      ],
      request_id: "req-theme-list",
      correlation_id: "corr-theme-list",
      server_request_id: null,
    });
    apiMocks.getAdminTheme.mockResolvedValue({
      theme: createTheme("basic", {
        theme_name: "Basic Theme",
        is_active: true,
      }),
      request_id: "req-theme-detail",
      correlation_id: "corr-theme-detail",
      server_request_id: null,
    });
    apiMocks.getAdminTheme.mockImplementation(async (themeId: string) => ({
      theme: createTheme(themeId, {
        theme_name: themeId === "mobile" ? "Mobile Theme" : "Basic Theme",
        is_active: themeId === "basic",
        is_mobile_active: themeId === "mobile",
      }),
      request_id: `req-theme-detail-${themeId}`,
      correlation_id: `corr-theme-detail-${themeId}`,
      server_request_id: null,
    }));
    apiMocks.updateAdminThemeConfig.mockResolvedValue({
      config: {
        cf_theme: "mobile",
        cf_mobile_theme: "mobile",
        installed_count: 2,
      },
      request_id: "req-theme-save",
      correlation_id: "corr-theme-save",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders theme selection workspace smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminThemePage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("테마 설정")).toBeInTheDocument();
    expect(screen.getByText("설치된 테마 목록")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("theme");
      expect(apiMocks.getAdminThemeConfig).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminThemeList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminTheme).toHaveBeenCalledWith("basic");
    });

    expect(screen.getByText("현재 적용 테마")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^테마 / })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /^모바일 테마 / }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Basic Theme").length).toBeGreaterThan(0);
    expect(screen.getByText("둘 다 적용")).toBeInTheDocument();
  });

  it("applies a selected theme to desktop from the page", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminThemePage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(apiMocks.getAdminTheme).toHaveBeenCalledWith("basic");
    });

    fireEvent.click(screen.getAllByText("Mobile Theme")[0]!);

    const applyDesktopButton = screen.getByRole("button", { name: "PC 적용" });
    const applyMobileButton = screen.getByRole("button", { name: "모바일 적용" });

    await waitFor(() => {
      expect(apiMocks.getAdminTheme).toHaveBeenCalledWith("mobile");
      expect(applyDesktopButton).toBeEnabled();
      expect(applyMobileButton).toBeDisabled();
    });

    fireEvent.click(applyDesktopButton);

    await waitFor(() => {
      expect(apiMocks.updateAdminThemeConfig).toHaveBeenCalled();
      expect(apiMocks.updateAdminThemeConfig.mock.calls[0]?.[0]).toEqual({
        cf_theme: "mobile",
      });
    });
  });

  it("shows the theme error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminThemeConfig.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-theme-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "테마 설정 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-theme-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/system/theme",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminThemePage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("테마 설정 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
