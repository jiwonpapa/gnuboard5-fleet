import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, devModeStorageKey } from "../layout/theme";
import { SiteOnboardingPage } from "./SiteOnboardingPage";

const apiMocks = vi.hoisted(() => ({
  applyDebugDevBootstrap: vi.fn(),
  getDebugDevBootstrapStatus: vi.fn(),
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

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    applyDebugDevBootstrap: apiMocks.applyDebugDevBootstrap,
    getDebugDevBootstrapStatus: apiMocks.getDebugDevBootstrapStatus,
  };
});

vi.mock("../sites/use-site-catalog", () => ({
  useSiteCatalog: () => ({
    addSite: vi.fn(),
    addSiteError: null,
    addSitePending: false,
    catalog: {
      active_site_id: null,
      correlation_id: "corr-site",
      needs_onboarding: true,
      request_id: "req-site",
      server_request_id: null,
      sites: [],
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

vi.mock("../sites/SiteRegistrationForm", () => ({
  SiteRegistrationForm: (props: { onRegistered?: (catalog: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        props.onRegistered?.({
          active_site_id: "site-alpha",
          correlation_id: "corr-site",
          needs_onboarding: false,
          request_id: "req-site",
          server_request_id: null,
          sites: [
            {
              site: {
                api_base_url: "https://example.com/api/v1",
                created_at: "2026-03-11T00:00:00Z",
                id: "site-alpha",
                is_default: true,
                name: "기본 사이트",
                updated_at: "2026-03-11T00:00:00Z",
              },
              status: "signed_out",
            },
          ],
        })
      }
    >
      register site
    </button>
  ),
}));

describe("SiteOnboardingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(devModeStorageKey, "enabled");
    apiMocks.getDebugDevBootstrapStatus.mockResolvedValue({
      available: true,
      correlation_id: "corr-bootstrap",
      debug_overlay: true,
      has_master_password: true,
      has_site: true,
      has_site_auth: true,
      request_id: "req-bootstrap",
      server_request_id: null,
      site_name: "개발 사이트",
      ssh_profile_count: 1,
    });
    apiMocks.applyDebugDevBootstrap.mockResolvedValue({
      correlation_id: "corr-bootstrap",
      created_ssh_profile_count: 1,
      master_lock_configured: true,
      master_lock_unlocked: true,
      request_id: "req-bootstrap",
      server_request_id: null,
      site_id: "site-alpha",
      site_login_authenticated: true,
      site_login_mb_id: "dev_admin",
      site_name: "개발 사이트",
      updated_ssh_profile_count: 0,
    });
  });

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

    return render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/sites/onboarding"]}>
            <Routes>
              <Route path="/sites/onboarding" element={<SiteOnboardingPage />} />
              <Route path="/sites/:siteId/activate" element={<div>activation screen</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );
  }

  it("shows the dev bootstrap shortcut in dev mode when config is available", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: "개발 기본값 채우기" }),
    ).toBeInTheDocument();
  });

  it("shows the dev bootstrap shortcut in packaged mode when config is available", async () => {
    window.localStorage.removeItem(devModeStorageKey);

    renderPage();

    expect(
      await screen.findByRole("button", { name: "개발 기본값 채우기" }),
    ).toBeInTheDocument();
  });

  it("navigates to site activation after the first registration completes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "register site" }));

    expect(await screen.findByText("activation screen")).toBeInTheDocument();
  });
});
