import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();
const useAuthSessionMock = vi.fn();
let mockSiteStatus: "authenticated" | "signed_out" = "signed_out";

vi.mock("./use-auth-session", () => ({
  useAuthSession: (options?: { enabled?: boolean }) =>
    useAuthSessionMock(options),
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

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    mockSiteStatus = "signed_out";
    useAuthSessionMock.mockReset();
    useAuthSessionMock.mockImplementation(() => ({
      authenticated: false,
      currentMember: null,
      isLoading: false,
      login: loginMock,
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the submit button disabled until both credentials are entered", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const submitButton = screen.getByRole("button", { name: "로그인" });

    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("관리자 아이디"), "admin");
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("관리자 비밀번호"), "secret");
    expect(submitButton).toBeEnabled();
  });

  it("submits entered credentials through the auth hook", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(screen.getByLabelText("관리자 아이디"), "admin");
    await user.type(screen.getByLabelText("관리자 비밀번호"), "secret");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(loginMock).toHaveBeenCalledWith({
      mb_id: "admin",
      mb_password: "secret",
    });
  });

  it("reads current form values on submit even when the DOM changed before react state synced", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const idInput = screen.getByLabelText("관리자 아이디") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "관리자 비밀번호",
    ) as HTMLInputElement;
    const form = idInput.closest("form");

    if (!form) {
      throw new Error("login form not found");
    }

    fireEvent.change(idInput, { target: { value: "neojin" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });

    idInput.value = "neojins";
    passwordInput.value = "secret!";

    fireEvent.submit(form);

    expect(loginMock).toHaveBeenCalledWith({
      mb_id: "neojins",
      mb_password: "secret!",
    });
  });

  it("does not probe auth session when the site catalog marks the site as signed out", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(useAuthSessionMock).toHaveBeenCalledWith({ enabled: false });
  });

  it("probes auth session only when the site catalog marks the site as authenticated", () => {
    mockSiteStatus = "authenticated";

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(useAuthSessionMock).toHaveBeenCalledWith({ enabled: true });
  });

  it("redirects authenticated sessions straight into the site overview", async () => {
    mockSiteStatus = "authenticated";
    useAuthSessionMock.mockImplementation(() => ({
      authenticated: true,
      currentMember: null,
      isLoading: false,
      login: loginMock,
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

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <Routes>
            <Route path="/sites/:siteId/login" element={<LoginPage />} />
            <Route
              path="/sites/:siteId/overview"
              element={<div>overview screen</div>}
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(await screen.findByText("overview screen")).toBeInTheDocument();
  });
});
