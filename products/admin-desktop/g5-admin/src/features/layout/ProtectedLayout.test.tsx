import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./theme";
import { ProtectedLayout } from "./ProtectedLayout";

const useAuthSessionMock = vi.fn();
let mockSiteStatus: "authenticated" | "signed_out" = "signed_out";

vi.mock("./AppShell", () => ({
  AppShell: () => <div>app shell</div>,
}));

vi.mock("../master/use-master-lock", () => ({
  useMasterLock: () => ({
    isLoading: false,
    lock: vi.fn(),
    lockError: null,
    lockPending: false,
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

vi.mock("../sites/use-site-catalog", () => ({
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
            api_base_url: "https://example.com/api/v1",
            created_at: "2026-03-09T00:00:00Z",
            id: "site-alpha",
            is_default: true,
            name: "기본 사이트",
            updated_at: "2026-03-09T00:00:00Z",
          },
          status: mockSiteStatus,
        },
      ],
    },
    catalogError: null,
    deleteSite: vi.fn(),
    deleteSiteError: null,
    deleteSitePending: false,
    healthCheckSite: vi.fn(),
    healthCheckSiteError: null,
    healthCheckSitePending: false,
    healthCheckSiteResult: null,
    isLoading: false,
    refetchCatalog: vi.fn(),
    switchSite: vi.fn(),
    switchSiteError: null,
    switchSitePending: false,
    updateSite: vi.fn(),
    updateSiteError: null,
    updateSitePending: false,
  }),
}));

vi.mock("../auth/use-auth-session", () => ({
  useAuthSession: (options?: { enabled?: boolean }) => useAuthSessionMock(options),
}));

function renderProtectedLayout(initialEntry = "/sites/site-alpha/admin/overview") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/sites/:siteId/login" element={<div>login screen</div>} />
          <Route path="/sites/:siteId/*" element={<ProtectedLayout />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("ProtectedLayout", () => {
  beforeEach(() => {
    mockSiteStatus = "signed_out";
    useAuthSessionMock.mockReset();
    useAuthSessionMock.mockImplementation(() => ({
      authenticated: false,
      currentMember: null,
      isLoading: false,
      login: vi.fn(),
      loginError: null,
      loginPending: false,
      logout: vi.fn(),
      logoutError: null,
      logoutPending: false,
      refetchSession: vi.fn(),
      session: null,
      sessionError: null,
    }));
  });

  it("redirects signed-out sites to login without enabling auth session lookup", async () => {
    renderProtectedLayout();

    expect(useAuthSessionMock).toHaveBeenCalledWith({ enabled: false });
    expect(await screen.findByText("login screen")).toBeInTheDocument();
  });

  it("enables auth session lookup when the site catalog marks the site as authenticated", async () => {
    mockSiteStatus = "authenticated";
    useAuthSessionMock.mockImplementation(() => ({
      authenticated: true,
      currentMember: null,
      isLoading: false,
      login: vi.fn(),
      loginError: null,
      loginPending: false,
      logout: vi.fn(),
      logoutError: null,
      logoutPending: false,
      refetchSession: vi.fn(),
      session: {
        authenticated: true,
        correlation_id: "corr-auth",
        member: null,
        request_id: "req-auth",
        server_request_id: null,
      },
      sessionError: null,
    }));

    renderProtectedLayout();

    expect(useAuthSessionMock).toHaveBeenCalledWith({ enabled: true });
    expect(await screen.findByText("app shell")).toBeInTheDocument();
  });
});
