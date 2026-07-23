import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminContentsPage } from "./AdminContentsPage";

const apiMocks = vi.hoisted(() => ({
  getAdminContentList: vi.fn(),
  getAdminContent: vi.fn(),
  createAdminContent: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  updateAdminContent: vi.fn(),
  deleteAdminContent: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminContentList: apiMocks.getAdminContentList,
  getAdminContent: apiMocks.getAdminContent,
  createAdminContent: apiMocks.createAdminContent,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  updateAdminContent: apiMocks.updateAdminContent,
  deleteAdminContent: apiMocks.deleteAdminContent,
}));

function createPagination(total = 1) {
  return {
    total,
    page: 1,
    per_page: 20,
    last_page: 1,
    has_next: false,
    has_prev: false,
  };
}

function createContent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    co_id: "about_us",
    co_subject: "회사 소개",
    co_html: 1,
    co_content: "<p>hello</p>",
    co_mobile_content: "mobile",
    co_include_head: "./head.php",
    co_include_tail: "./tail.php",
    co_tag_filter_use: 1,
    co_skin: "basic",
    co_mobile_skin: "mobile",
    ...overrides,
  };
}

describe("AdminContentsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("contents", {
      schema: {
        fields_by_name: {
          co_id: { label: "내용 ID" },
          co_subject: { label: "제목" },
          co_html: { label: "HTML 사용" },
          co_content: { label: "공통 본문" },
          co_mobile_content: { label: "모바일 본문" },
          co_include_head: { label: "상단 파일 경로" },
          co_include_tail: { label: "하단 파일 경로" },
          co_skin: { label: "PC 스킨" },
          co_mobile_skin: { label: "모바일 스킨" },
          co_tag_filter_use: { label: "태그 필터 사용" },
        },
        sections: [],
      },
    }));
    apiMocks.getAdminContentList.mockResolvedValue({
      contents: [createContent()],
      pagination: createPagination(),
    });
    apiMocks.getAdminContent.mockImplementation(async (coId: string) => ({
      content: createContent({
        co_id: coId,
        co_subject: coId === "company" ? "회사 안내" : "회사 소개",
        co_content: coId === "company" ? "<p>company</p>" : "<p>hello</p>",
      }),
    }));
    apiMocks.createAdminContent.mockResolvedValue({
      content: createContent({
        co_id: "company",
        co_subject: "회사 안내",
        co_content: "<p>company</p>",
        co_mobile_content: "",
        co_include_head: null,
        co_include_tail: null,
        co_skin: null,
        co_mobile_skin: null,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates include path and skin parity fields from detail data", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AdminContentsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByText("회사 소개"));

    await waitFor(() => {
      expect(screen.getByLabelText("상단 파일 경로")).toHaveValue("./head.php");
    });

    expect(screen.getByLabelText("하단 파일 경로")).toHaveValue("./tail.php");
    expect(screen.getByLabelText("PC 스킨")).toHaveValue("basic");
    expect(screen.getByLabelText("모바일 스킨")).toHaveValue("mobile");
  });

  it("shows validation when required content fields are empty", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AdminContentsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("회사 소개")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "내용 생성" }));

    expect(
      await screen.findByText("co_id는 영문/숫자/_ 20자 이하여야 합니다.")
    ).toBeInTheDocument();
    expect(screen.getByText("제목을 입력해 주십시오.")).toBeInTheDocument();
    expect(screen.getByText("본문을 입력해 주십시오.")).toBeInTheDocument();
  });

  it("creates content from the page form", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AdminContentsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("회사 소개")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("내용 ID"), {
      target: { value: " company " },
    });
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: " 회사 안내 " },
    });
    fireEvent.change(screen.getByLabelText("공통 본문"), {
      target: { value: " <p>company</p> " },
    });
    fireEvent.click(screen.getByRole("button", { name: "내용 생성" }));

    await waitFor(() => {
      expect(apiMocks.createAdminContent).toHaveBeenCalledWith({
        co_id: "company",
        co_subject: "회사 안내",
        co_html: 0,
        co_content: "<p>company</p>",
        co_mobile_content: null,
        co_include_head: null,
        co_include_tail: null,
        co_tag_filter_use: 1,
        co_skin: null,
        co_mobile_skin: null,
      });
      expect(apiMocks.getAdminContent).toHaveBeenCalledWith("company");
    });
  });

  it("shows the content error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminContentList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-content-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "내용 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-content-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/contents",
      user_actionable: true,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AdminContentsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("내용 관리 API를 찾을 수 없습니다.")
    ).toBeInTheDocument();
  });
});
