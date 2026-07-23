import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminBoardsPage } from "./AdminBoardsPage";

const apiMocks = vi.hoisted(() => ({
  getAdminBoardList: vi.fn(),
  getAdminBoard: vi.fn(),
  createAdminBoard: vi.fn(),
  updateAdminBoard: vi.fn(),
  deleteAdminBoard: vi.fn(),
  copyAdminBoard: vi.fn(),
  deleteAdminBoardNewPosts: vi.fn(),
  getAdminFieldSchema: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminBoardList: apiMocks.getAdminBoardList,
  getAdminBoard: apiMocks.getAdminBoard,
  createAdminBoard: apiMocks.createAdminBoard,
  updateAdminBoard: apiMocks.updateAdminBoard,
  deleteAdminBoard: apiMocks.deleteAdminBoard,
  copyAdminBoard: apiMocks.copyAdminBoard,
  deleteAdminBoardNewPosts: apiMocks.deleteAdminBoardNewPosts,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createBoard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    bo_table: "free",
    bo_subject: "자유게시판",
    gr_id: "community",
    bo_read_level: 1,
    bo_write_level: 2,
    bo_comment_level: 2,
    bo_download_level: 3,
    bo_use_category: 1,
    bo_count_write: 12,
    bo_count_comment: 3,
    bo_use_secret: 0,
    bo_upload_count: 2,
    bo_upload_size: 1024,
    extra: {
      bo_admin: "neo",
      bo_sort_field: "wr_datetime desc",
    },
    ...overrides,
  };
}

describe("AdminBoardsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("boards", {
      schema: {
        fields_by_name: {
          bo_table: { label: "게시판 코드" },
          bo_subject: { label: "게시판 제목" },
          gr_id: { label: "그룹" },
          bo_category_list: { label: "분류" },
          bo_read_level: { label: "글읽기 권한" },
          bo_write_level: { label: "글쓰기 권한" },
          bo_comment_level: { label: "댓글쓰기 권한" },
          bo_download_level: { label: "다운로드 권한" },
          bo_use_category: { label: "분류 사용" },
          bo_use_secret: { label: "비밀글 사용" },
          bo_upload_count: { label: "파일 업로드 개수" },
          bo_upload_size: { label: "파일 업로드 용량" },
          bo_admin: { label: "게시판 관리자", input_type: "text", data_type: "string" },
          bo_sort_field: {
            label: "리스트 정렬 필드",
            input_type: "select",
            data_type: "string",
            options: [{ label: "기본", value: "" }],
          },
        },
        sections: [
          {
            key: "anc_bo_auth",
            label: "게시판 권한 설정",
            fields: [
              {
                name: "bo_admin",
                label: "게시판 관리자",
                input_type: "text",
                data_type: "string",
                required: false,
                create_only: false,
                readonly_on_update: false,
                description: null,
                options: [],
              },
            ],
          },
          {
            key: "anc_bo_function",
            label: "게시판 기능 설정",
            fields: [
              {
                name: "bo_sort_field",
                label: "리스트 정렬 필드",
                input_type: "select",
                data_type: "string",
                required: false,
                create_only: false,
                readonly_on_update: false,
                description: null,
                options: [{ label: "기본", value: "" }],
              },
            ],
          },
        ],
      },
    }));
    apiMocks.getAdminBoardList.mockResolvedValue({
      boards: [createBoard()],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
    });
    apiMocks.getAdminBoard.mockImplementation(async (boTable: string) => ({
      board: createBoard({
        bo_table: boTable,
        bo_subject: boTable === "notice" ? "공지사항" : "자유게시판",
      }),
    }));
    apiMocks.createAdminBoard.mockResolvedValue({
      board: createBoard({
        bo_table: "notice",
        bo_subject: "공지사항",
        gr_id: "service",
        bo_read_level: 1,
        bo_write_level: 1,
        bo_comment_level: 1,
        bo_download_level: 1,
        bo_upload_count: 0,
        bo_upload_size: 0,
        extra: {
          bo_admin: "",
          bo_sort_field: "",
        },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders board labels from schema metadata instead of raw field keys", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText("게시판 제목").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByLabelText("게시판 코드").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("리스트 정렬 필드").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^bo_subject$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^bo_sort_field$/)).not.toBeInTheDocument();
  });

  it("creates a board from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText("게시판 제목").length).toBeGreaterThan(0);
    });

    const createButton = screen.getByRole("button", { name: "게시판 생성" });
    const createForm = createButton.closest("form");
    expect(createForm).not.toBeNull();
    const createEditor = within(createForm!);

    fireEvent.change(createEditor.getByLabelText("게시판 코드"), {
      target: { value: "notice" },
    });
    fireEvent.change(createEditor.getByLabelText("게시판 제목"), {
      target: { value: "공지사항" },
    });
    fireEvent.change(createEditor.getByLabelText("그룹"), {
      target: { value: "service" },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiMocks.createAdminBoard).toHaveBeenCalled();
      expect(apiMocks.createAdminBoard.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          bo_table: "notice",
          bo_subject: "공지사항",
          gr_id: "service",
        }),
      );
      expect(apiMocks.getAdminBoard).toHaveBeenCalledWith("notice");
    });
  });

  it("shows the board error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminBoardList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-board-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "게시판 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-board-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/boards",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("게시판 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("shows schema error and hides raw-key board forms when schema loading fails", async () => {
    apiMocks.getAdminFieldSchema.mockRejectedValue({
      area: "tauri",
      command: "cmd_admin_schema_get",
      code: "schema_failure",
      correlation_id: "corr-schema",
      detail: "schema endpoint failure",
      error_category: "remote",
      fault_domain: "php",
      message: "게시판 스키마를 불러오지 못했습니다.",
      occurred_at: "2026-03-09T00:00:00Z",
      operation: "getAdminFieldSchema",
      owner: "php",
      request_id: "req-schema",
      retryable: false,
      server_request_id: "server-schema",
      status: 500,
      target: "/admin/schema/boards",
      user_actionable: true,
    });
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminBoardsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await screen.findAllByText("게시판 스키마를 불러오지 못했습니다.");
    expect(screen.getAllByText("게시판 필드 메타데이터를 불러오지 못해 폼을 숨겼습니다. 스키마 응답이 정상화되면 생성/수정 폼이 다시 표시됩니다.").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("bo_subject")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("bo_table")).not.toBeInTheDocument();
  });
});
