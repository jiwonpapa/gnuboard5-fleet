import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminBoardGroupsPage } from "./AdminBoardGroupsPage";

const apiMocks = vi.hoisted(() => ({
  getAdminBoardGroupList: vi.fn(),
  getAdminBoardGroup: vi.fn(),
  getAdminBoardGroupMembers: vi.fn(),
  createAdminBoardGroup: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  updateAdminBoardGroup: vi.fn(),
  deleteAdminBoardGroup: vi.fn(),
  addAdminBoardGroupMember: vi.fn(),
  deleteAdminBoardGroupMember: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminBoardGroupList: apiMocks.getAdminBoardGroupList,
  getAdminBoardGroup: apiMocks.getAdminBoardGroup,
  getAdminBoardGroupMembers: apiMocks.getAdminBoardGroupMembers,
  createAdminBoardGroup: apiMocks.createAdminBoardGroup,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  updateAdminBoardGroup: apiMocks.updateAdminBoardGroup,
  deleteAdminBoardGroup: apiMocks.deleteAdminBoardGroup,
  addAdminBoardGroupMember: apiMocks.addAdminBoardGroupMember,
  deleteAdminBoardGroupMember: apiMocks.deleteAdminBoardGroupMember,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createGroup(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    gr_id: "group1",
    gr_subject: "커뮤니티",
    gr_admin: "neo",
    gr_device: "mobile",
    gr_use_access: 1,
    ...overrides,
  };
}

describe("AdminBoardGroupsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("groups", {
      schema: {
        fields_by_name: {
          gr_id: { label: "그룹 ID" },
          gr_subject: { label: "그룹 제목" },
          gr_admin: { label: "그룹 관리자" },
          gr_device: {
            label: "접속기기",
            options: [
              { label: "PC/모바일 공통", value: "both" },
              { label: "PC 전용", value: "pc" },
              { label: "모바일 전용", value: "mobile" },
            ],
          },
          gr_use_access: { label: "접근회원사용" },
        },
        sections: [],
      },
    }));
    apiMocks.getAdminBoardGroupList.mockResolvedValue({
      groups: [createGroup()],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
      request_id: "req-1",
      correlation_id: "corr-1",
      server_request_id: null,
    });
    apiMocks.getAdminBoardGroup.mockImplementation(async (grId: string) => ({
      group: createGroup({
        gr_id: grId,
        gr_subject: grId === "staff" ? "운영팀" : "커뮤니티",
        gr_admin: grId === "staff" ? null : "neo",
        gr_device: grId === "staff" ? "both" : "mobile",
        gr_use_access: grId === "staff" ? 0 : 1,
      }),
      request_id: "req-2",
      correlation_id: "corr-2",
      server_request_id: null,
    }));
    apiMocks.getAdminBoardGroupMembers.mockResolvedValue({
      members: [],
      pagination: {
        total: 0,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
      request_id: "req-3",
      correlation_id: "corr-3",
      server_request_id: null,
    });
    apiMocks.createAdminBoardGroup.mockResolvedValue({
      group: createGroup({
        gr_id: "staff",
        gr_subject: "운영팀",
        gr_admin: null,
        gr_device: "both",
        gr_use_access: 0,
      }),
      request_id: "req-create",
      correlation_id: "corr-create",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates legacy parity fields for the selected group", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardGroupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const groupCell = await screen.findByText("커뮤니티");
    fireEvent.click(groupCell);

    await waitFor(() => {
      expect(screen.getByLabelText("그룹 관리자")).toHaveValue("neo");
    });

    expect(screen.getByLabelText("접속기기")).toHaveValue("mobile");
    expect(screen.getAllByText("접근회원사용").length).toBeGreaterThan(0);
    expect(screen.getByText("사용")).toBeInTheDocument();
  });

  it("shows validation when group create is submitted without required values", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardGroupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("커뮤니티")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "그룹 생성" }));

    expect(
      await screen.findByText("gr_id는 영문/숫자/_ 10자 이하여야 합니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("그룹 제목을 입력해 주십시오.")).toBeInTheDocument();
  });

  it("creates a board group from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardGroupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("커뮤니티")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("그룹 ID"), {
      target: { value: " staff " },
    });
    fireEvent.change(screen.getByLabelText("그룹 제목"), {
      target: { value: " 운영팀 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "그룹 생성" }));

    await waitFor(() => {
      expect(apiMocks.createAdminBoardGroup).toHaveBeenCalledWith({
        gr_id: "staff",
        gr_subject: "운영팀",
        gr_admin: null,
        gr_device: "both",
        gr_use_access: 0,
      });
      expect(apiMocks.getAdminBoardGroup).toHaveBeenCalledWith("staff");
    });
  });

  it("shows the board group error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminBoardGroupList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-group-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "게시판 그룹 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-group-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/board-groups",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardGroupsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("게시판 그룹 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
