import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { SiteDashboardPage } from "./SiteDashboardPage";

const saveMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: (...args: unknown[]) => saveMock(...args),
}));

vi.mock("../../api/client", () => ({
  exportSiteBackup: vi.fn(),
  healthCheckSite: vi.fn(async () => ({
    correlation_id: "corr-health",
    message: "reachable",
    reachable: true,
    request_id: "req-health",
    resolved_url: "https://alpha.example.com/api/v1",
    server_request_id: null,
  })),
  importSiteBackup: vi.fn(),
}));

vi.mock("../master/use-master-lock", () => ({
  useMasterLock: () => ({
    isLoading: false,
    refetchStatus: vi.fn(),
    setup: vi.fn(),
    setupError: null,
    setupPending: false,
    status: {
      correlation_id: "corr-master",
      is_configured: true,
      is_unlocked: true,
      passkey_enabled: false,
      requires_totp: false,
      request_id: "req-master",
      server_request_id: null,
      totp_enabled: false,
    },
    statusError: null,
    unlock: vi.fn(),
    unlockError: null,
    unlockPending: false,
    verifyTotp: vi.fn(),
    verifyTotpError: null,
    verifyTotpPending: false,
  }),
}));

vi.mock("./use-site-catalog", () => ({
  useSiteCatalog: () => ({
    addSite: vi.fn(),
    addSiteError: null,
    addSitePending: false,
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
            created_at: "2026-03-10T00:00:00Z",
            id: "site-alpha",
            is_default: true,
            name: "알파몰",
            updated_at: "2026-03-10T00:00:00Z",
          },
          status: "authenticated",
        },
        {
          site: {
            api_base_url: "https://beta.example.com/api/v1",
            created_at: "2026-03-10T00:00:00Z",
            id: "site-beta",
            is_default: false,
            name: "베타커뮤니티",
            updated_at: "2026-03-10T00:00:00Z",
          },
          status: "signed_out",
        },
      ],
    },
    deleteSite: vi.fn(),
    deleteSitePending: false,
    healthCheckSite: vi.fn(),
    healthCheckSitePending: false,
    isLoading: false,
    switchSite: vi.fn(),
  }),
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

function LocationProbe() {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}</div>;
}

describe("SiteDashboardPage", () => {
  beforeEach(() => {
    saveMock.mockReset();
  });

  it("renders the site list dashboard with site actions", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/dashboard"]}>
            <SiteDashboardPage />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("사이트 목록")).toBeInTheDocument();
    expect(screen.getByText("알파몰")).toBeInTheDocument();
    expect(screen.getByText("베타커뮤니티")).toBeInTheDocument();
    expect(screen.getByText("등록 2개")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /접속$/ })).toHaveLength(2);
  });

  it("activates the selected site only from the explicit connect action", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/dashboard"]}>
            <SiteDashboardPage />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "알파몰 접속" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/activate",
    );
  });

  it("requires a dedicated backup password for portable backup export", async () => {
    saveMock.mockResolvedValue("/tmp/g5-admin-backup.g5bak");
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={["/sites/dashboard"]}>
            <SiteDashboardPage />
            <LocationProbe />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );

    await user.click(
      screen.getByRole("button", { name: "휴대용 백업 내보내기" })
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("새 백업 암호")).toBeInTheDocument();
    expect(screen.getByLabelText("백업 암호 확인")).toBeInTheDocument();
    expect(
      screen.getByText(
        "이 암호는 휴대용 백업 파일을 새 장치에서 복원할 때 다시 필요합니다. 마스터 비밀번호와 별개로 관리하십시오."
      )
    ).toBeInTheDocument();
  });
});
