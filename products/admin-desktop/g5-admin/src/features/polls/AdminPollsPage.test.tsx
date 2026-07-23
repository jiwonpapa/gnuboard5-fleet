import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { completeAdminSchemaResponseForTest } from "../schema/admin-schema-test-fixture";
import { AdminPollsPage } from "./AdminPollsPage";

const apiMocks = vi.hoisted(() => ({
  createAdminPoll: vi.fn(),
  deleteAdminPoll: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  getAdminPoll: vi.fn(),
  getAdminPollList: vi.fn(),
  updateAdminPoll: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createAdminPoll: apiMocks.createAdminPoll,
  deleteAdminPoll: apiMocks.deleteAdminPoll,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  getAdminPoll: apiMocks.getAdminPoll,
  getAdminPollList: apiMocks.getAdminPollList,
  updateAdminPoll: apiMocks.updateAdminPoll,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function createPoll(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    mb_ids: null,
    po_cnt1: 10,
    po_cnt2: 5,
    po_cnt3: 0,
    po_cnt4: 0,
    po_cnt5: 0,
    po_cnt6: 0,
    po_cnt7: 0,
    po_cnt8: 0,
    po_cnt9: 0,
    po_date: "2026-03-07",
    po_etc: "기타",
    po_id: 3,
    po_ips: null,
    po_level: 1,
    po_point: 0,
    po_poll1: "예",
    po_poll2: "아니오",
    po_poll3: null,
    po_poll4: null,
    po_poll5: null,
    po_poll6: null,
    po_poll7: null,
    po_poll8: null,
    po_poll9: null,
    po_subject: "투표 제목",
    po_use: 1,
    ...overrides,
  };
}

function getCreatePollForm() {
  const heading = screen.getByRole("heading", { name: "투표 생성" });
  return heading.parentElement?.nextElementSibling?.querySelector("form") as HTMLFormElement | null;
}

describe("AdminPollsPage", () => {
  beforeEach(() => {
    apiMocks.getAdminFieldSchema.mockResolvedValue(completeAdminSchemaResponseForTest("polls", {
      schema: {
        fields_by_name: {
          po_subject: { label: "투표 제목" },
          po_poll1: { label: "항목 1" },
          po_poll2: { label: "항목 2" },
          po_poll3: { label: "항목 3" },
          po_poll4: { label: "항목 4" },
          po_poll5: { label: "항목 5" },
          po_poll6: { label: "항목 6" },
          po_poll7: { label: "항목 7" },
          po_poll8: { label: "항목 8" },
          po_poll9: { label: "항목 9" },
          po_etc: { label: "기타의견" },
          po_level: { label: "참여 레벨" },
          po_point: { label: "포인트" },
          po_use: { label: "사용 여부" },
        },
        sections: [],
      },
    }));
    apiMocks.getAdminPollList.mockResolvedValue({
      polls: [createPoll()],
      pagination: {
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
        has_next: false,
        has_prev: false,
      },
    });
    apiMocks.getAdminPoll.mockImplementation(async (poId: number) => ({
      poll: createPoll({
        po_id: poId,
        po_subject: poId === 9 ? "신규 투표" : "투표 제목",
      }),
    }));
    apiMocks.createAdminPoll.mockResolvedValue({
      poll: createPoll({
        po_id: 9,
        po_subject: "신규 투표",
        po_poll1: "찬성",
        po_poll2: "반대",
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders route-native poll workspace smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPollsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("투표 관리")).toBeInTheDocument();
    expect(screen.getByText("투표 목록")).toBeInTheDocument();
    expect(screen.getByText("선택 투표 편집")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByLabelText("투표 제목").length).toBeGreaterThan(0);
    });
  });

  it("shows validation when poll create is submitted without required values", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPollsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getCreatePollForm()).not.toBeNull();
    });

    const createForm = getCreatePollForm();
    expect(createForm).not.toBeNull();
    fireEvent.submit(createForm!);

    expect(await screen.findByText("투표 제목을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("항목 1은 필수입니다.")).toBeInTheDocument();
    expect(screen.getByText("항목 2는 필수입니다.")).toBeInTheDocument();
  });

  it("creates a poll from the page form", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPollsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getCreatePollForm()).not.toBeNull();
    });

    const createForm = getCreatePollForm();
    expect(createForm).not.toBeNull();
    const createEditor = within(createForm!);

    fireEvent.change(createEditor.getByLabelText("투표 제목"), {
      target: { value: " 신규 투표 " },
    });
    fireEvent.change(createEditor.getByLabelText("항목 1"), {
      target: { value: " 찬성 " },
    });
    fireEvent.change(createEditor.getByLabelText("항목 2"), {
      target: { value: " 반대 " },
    });
    fireEvent.submit(createForm!);

    await waitFor(() => {
      expect(apiMocks.createAdminPoll).toHaveBeenCalledWith({
        po_date: null,
        po_etc: null,
        po_level: 1,
        po_point: 0,
        po_poll1: "찬성",
        po_poll2: "반대",
        po_poll3: null,
        po_poll4: null,
        po_poll5: null,
        po_poll6: null,
        po_poll7: null,
        po_poll8: null,
        po_poll9: null,
        po_subject: "신규 투표",
        po_use: 1,
      });
    });
  });

  it("shows the poll error when the backend returns resource.not_found", async () => {
    apiMocks.getAdminPollList.mockRejectedValue({
      code: "resource.not_found",
      correlation_id: "corr-poll-404",
      detail: null,
      error_category: "contract",
      fault_domain: "contract",
      guide: null,
      message: "투표 관리 API를 찾을 수 없습니다.",
      owner: "rust_ui",
      request_id: "req-poll-404",
      retryable: false,
      server_request_id: null,
      status: 404,
      target: "/admin/system/polls",
      user_actionable: true,
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPollsPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByText("투표 관리 API를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
