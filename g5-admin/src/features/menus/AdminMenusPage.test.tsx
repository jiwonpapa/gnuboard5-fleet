import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminMenusPage } from "./AdminMenusPage";

const apiMocks = vi.hoisted(() => ({
  createAdminMenu: vi.fn(),
  deleteAdminMenu: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminMenu: vi.fn(),
  getAdminMenuList: vi.fn(),
  reorderAdminMenus: vi.fn(),
  updateAdminMenu: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createAdminMenu: apiMocks.createAdminMenu,
  deleteAdminMenu: apiMocks.deleteAdminMenu,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminMenu: apiMocks.getAdminMenu,
  getAdminMenuList: apiMocks.getAdminMenuList,
  reorderAdminMenus: apiMocks.reorderAdminMenus,
  updateAdminMenu: apiMocks.updateAdminMenu,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createSchemaResponse(fields: string[]) {
  const labels: Record<string, string> = {
    me_code: "메뉴 코드",
    me_name: "메뉴 이름",
    me_link: "메뉴 링크",
    me_target: "링크 target",
    me_order: "정렬 순서",
    me_use: "PC 노출",
    me_mobile_use: "모바일 노출",
  };

  return completeAdminSchemaResponseForTest("menus", {
    schema: {
      domain: "menus",
      title: "menus",
      legacy_form: "menu.php",
      field_count: fields.length,
      section_count: 1,
      generated_at: "2026-03-13T00:00:00Z",
      sections: [],
      fields_by_name: Object.fromEntries(
        fields.map((field) => [
          field,
          {
            name: field,
            label: labels[field] ?? field,
            input_type: "text",
            data_type: "string",
            required: false,
            create_only: false,
            readonly_on_update: false,
            description: null,
            options: [],
          },
        ]),
      ),
    },
    request_id: "req-menu-schema",
    correlation_id: "corr-menu-schema",
    server_request_id: null,
  });
}

describe("AdminMenusPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(
      createSchemaResponse([
        "me_code",
        "me_name",
        "me_link",
        "me_target",
        "me_order",
        "me_use",
        "me_mobile_use",
      ]),
    );
    apiMocks.getAdminMenuList.mockResolvedValue({
      menus: [
        {
          me_id: 1,
          me_code: "menu001",
          me_name: "메뉴 설정",
          me_link: "/adm/menu.php",
          me_target: "_self",
          me_order: 1,
          me_use: 1,
          me_mobile_use: 1,
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
      request_id: "req-menu-list",
      correlation_id: "corr-menu-list",
      server_request_id: null,
    });
    apiMocks.getAdminMenu.mockResolvedValue({
      menu: {
        me_id: 1,
        me_code: "menu001",
        me_name: "메뉴 설정",
        me_link: "/adm/menu.php",
        me_target: "_self",
        me_order: 1,
        me_use: 1,
        me_mobile_use: 1,
      },
      request_id: "req-menu-detail",
      correlation_id: "corr-menu-detail",
      server_request_id: null,
    });
    apiMocks.createAdminMenu.mockResolvedValue({
      menu: {
        me_id: 2,
        me_code: "menu002",
        me_name: "게시판 관리",
        me_link: "/adm/board_list.php",
        me_target: "_self",
        me_order: 2,
        me_use: 1,
        me_mobile_use: 1,
      },
      request_id: "req-menu-create",
      correlation_id: "corr-menu-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders route-native menu workspace smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminMenusPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("메뉴설정")).toBeInTheDocument();
    expect(screen.getByText("메뉴 목록")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("menus");
      expect(apiMocks.getAdminMenu).toHaveBeenCalledWith(1);
    });

    expect(screen.getAllByText("메뉴 생성").length).toBeGreaterThan(0);
    expect(screen.getByText("선택 메뉴 편집")).toBeInTheDocument();
    expect(screen.getAllByText("menu001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("메뉴 설정").length).toBeGreaterThan(0);
  });

  it("keeps menu create disabled while required values are empty", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminMenusPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("menus");
    });

    await waitFor(() => {
      const createButton = screen.getByRole("button", { name: "메뉴 생성" });
      expect(createButton).toBeDisabled();
    });
  });

  it("creates a menu from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminMenusPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(1);
      expect(apiMocks.getAdminFieldSchema).toHaveBeenCalledWith("menus");
      expect(apiMocks.getAdminMenu).toHaveBeenCalledWith(1);
    });

    const createButton = screen.getByRole("button", { name: "메뉴 생성" });
    const createForm = createButton.closest("form");
    expect(createForm).not.toBeNull();
    const createEditor = within(createForm!);

    fireEvent.change(createEditor.getByLabelText("메뉴 코드"), {
      target: { value: "  menu002  " },
    });
    fireEvent.change(createEditor.getByLabelText("메뉴 이름"), {
      target: { value: "  게시판 관리  " },
    });
    fireEvent.change(createEditor.getByLabelText("메뉴 링크"), {
      target: { value: "  /adm/board_list.php  " },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiMocks.createAdminMenu).toHaveBeenCalledWith({
        me_code: "menu002",
        me_link: "/adm/board_list.php",
        me_mobile_use: 1,
        me_name: "게시판 관리",
        me_order: 0,
        me_target: "_self",
        me_use: 1,
      });
    });
  });

  it("shows the menu error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminMenuList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-menu-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "메뉴 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-menu-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/menus",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminMenusPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("메뉴 API를 찾을 수 없습니다.")).toBeInTheDocument();
  });
});
