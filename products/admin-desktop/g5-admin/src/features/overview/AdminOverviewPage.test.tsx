import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { AdminOverviewPage } from "./AdminOverviewPage";

const siteCatalogState = {
  catalog: {
    active_site_id: "site-alpha",
    correlation_id: "corr-site",
    needs_onboarding: false,
    request_id: "req-site",
    server_request_id: null,
    sites: [
      {
        site: {
          api_base_url: "https://alpha.example.com/api/v1",
          created_at: "2026-03-09T00:00:00Z",
          id: "site-alpha",
          is_default: true,
          name: "알파몰",
          updated_at: "2026-03-09T00:00:00Z",
        },
        status: "authenticated",
      },
      {
        site: {
          api_base_url: "https://beta.example.com/api/v1",
          created_at: "2026-03-09T00:00:00Z",
          id: "site-beta",
          is_default: false,
          name: "베타커뮤니티",
          updated_at: "2026-03-09T00:00:00Z",
        },
        status: "signed_out",
      },
    ],
  },
  isLoading: false,
};

const siteActivityState = {
  data: {
    activities: [
      {
        action: "site.switch",
        created_at: "2026-03-09 18:00:00",
        detail: "switched active site to 알파몰",
        id: 1n,
        site_id: "site-alpha",
      },
    ],
  },
  isLoading: false,
};

const adminDashboardState = {
  data: {
    data: {
      limit: 5,
      summary: {
        members: {
          blocked_members: 4,
          leave_members: 3,
          total_members: 120,
        },
        points: {
          total_rows: 809,
        },
        posts: {
          total_rows: 456,
        },
        visits: {
          active_days: 30,
          first_date: "2026-02-10",
          last_date: "2026-03-13",
          total_visits: 1902,
          unique_ips: 412,
          visit_rows: 1950,
        },
      },
      recent_members: [
        {
          mb_datetime: "2026-03-13 09:00:00",
          mb_id: "alpha01",
          mb_level: 3,
          mb_name: "알파회원",
          mb_nick: "alpha",
          mb_point: 1200,
        },
      ],
      recent_points: [
        {
          mb_id: "alpha01",
          mb_name: "알파회원",
          po_content: "가입 축하 포인트",
          po_datetime: "2026-03-13 10:00:00",
          po_mb_point: 1200,
          po_point: 100,
        },
      ],
      recent_posts: [
        {
          bo_subject: "공지사항",
          view_type: "w",
          wr_datetime: "2026-03-13 11:00:00",
          wr_name: "관리자",
          wr_subject: "3월 점검 안내",
        },
      ],
    },
    meta: {
      correlation_id: "corr-dashboard",
      request_id: "req-dashboard",
      server_request_id: "srv-dashboard",
    },
  },
  error: null,
  isLoading: false,
};

vi.mock("../sites/site-routing", () => ({
  useCurrentSiteId: () => "site-alpha",
}));

vi.mock("../sites/use-site-catalog", () => ({
  useSiteCatalog: () => siteCatalogState,
}));

vi.mock("../sites/use-site-activity", () => ({
  useSiteActivity: () => siteActivityState,
}));

vi.mock("./use-admin-dashboard", () => ({
  useAdminDashboard: () => adminDashboardState,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });
}

describe("AdminOverviewPage", () => {
  beforeEach(() => {
    siteCatalogState.catalog.sites[0]!.status = "authenticated";
    adminDashboardState.error = null;
    adminDashboardState.isLoading = false;
  });

  it("renders the active site summary, remote dashboard, and recent activity", () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/site-alpha/overview"]}>
            <AdminOverviewPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText("알파몰 운영 요약")).toBeInTheDocument();
    expect(screen.getByText("원격 관리자 대시보드")).toBeInTheDocument();
    expect(screen.getByText("120명")).toBeInTheDocument();
    expect(screen.getByText("3월 점검 안내")).toBeInTheDocument();
    expect(screen.getByText("가입 축하 포인트")).toBeInTheDocument();
    expect(screen.getByText("최근 작업")).toBeInTheDocument();
    expect(screen.getByText("빠른 링크")).toBeInTheDocument();
    expect(screen.getByText("SITE · switch")).toBeInTheDocument();
    expect(screen.getByText("switched active site to 알파몰")).toBeInTheDocument();
  });

  it("shows a login notice for the remote dashboard when the site is signed out", () => {
    siteCatalogState.catalog.sites[0]!.status = "signed_out";

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/site-alpha/overview"]}>
            <AdminOverviewPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      screen.getByText("활성 사이트에 로그인하면 원격 관리자 대시보드가 표시됩니다."),
    ).toBeInTheDocument();
  });

  it("builds quick links inside the active site scope", () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/site-alpha/overview"]}>
            <AdminOverviewPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const matchingLinks = screen.getAllByRole("link", { name: /기본환경설정/ });

    expect(matchingLinks.length).toBeGreaterThan(0);
    expect(
      matchingLinks.every(
        (link) =>
          link.getAttribute("href") === "/sites/site-alpha/environment/basic-config",
      ),
    ).toBe(true);
  });
});
