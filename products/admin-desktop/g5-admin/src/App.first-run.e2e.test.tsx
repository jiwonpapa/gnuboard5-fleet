import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSessionState } from "./types/AuthSessionState";
import type { MasterLockStatus } from "./types/MasterLockStatus";
import type { SiteCatalog } from "./types/SiteCatalog";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

vi.mock("./features/layout/AppShell", async () => {
  const { Outlet } = await import("react-router-dom");

  return {
    AppShell: () => (
      <div>
        <nav aria-label="상단 작업 탭">상단 작업 탭</nav>
        <Outlet />
      </div>
    ),
  };
});

import { invoke } from "@tauri-apps/api/core";

type RuntimeState = {
  auth: AuthSessionState;
  master: MasterLockStatus;
  siteCatalog: SiteCatalog;
};

function createTrace(seed: string) {
  return {
    correlation_id: `${seed}-corr`,
    request_id: `${seed}-req`,
    server_request_id: null,
  };
}

function createMasterStatus(
  isConfigured: boolean,
  isUnlocked: boolean,
): MasterLockStatus {
  return {
    ...createTrace(`master-${Number(isConfigured)}-${Number(isUnlocked)}`),
    is_configured: isConfigured,
    is_unlocked: isUnlocked,
    passkey_enabled: false,
    requires_totp: false,
    totp_enabled: false,
    unlock_locked_until_epoch: null,
    unlock_retry_after_seconds: null,
  };
}

function createSiteCatalog(
  status: "authenticated" | "signed_out",
): SiteCatalog {
  return {
    ...createTrace(`site-${status}`),
    active_site_id: "site-alpha",
    needs_onboarding: false,
    sites: [
      {
        site: {
          api_base_url: "https://example.com/api/v1",
          created_at: "2026-03-11T00:00:00Z",
          id: "site-alpha",
          is_default: true,
          name: "운영 쇼핑몰",
          updated_at: "2026-03-11T00:00:00Z",
        },
        status,
      },
    ],
  };
}

function createOnboardingCatalog(): SiteCatalog {
  return {
    ...createTrace("site-onboarding"),
    active_site_id: null,
    needs_onboarding: true,
    sites: [],
  };
}

function createSignedOutAuth(): AuthSessionState {
  return {
    ...createTrace("auth-signed-out"),
    authenticated: false,
    member: null,
  };
}

function createAuthenticatedAuth(): AuthSessionState {
  return {
    ...createTrace("auth-signed-in"),
    authenticated: true,
    member: {
      mb_email: "admin@example.com",
      mb_id: "admin",
      mb_level: 10,
      mb_name: "관리자",
      mb_nick: "관리자",
      mb_point: 0,
    },
  };
}

function createDashboardResponse() {
  return {
    data: {
      limit: 5,
      recent_members: [],
      recent_points: [],
      recent_posts: [],
      summary: {
        members: {
          blocked_members: 0,
          leave_members: 0,
          total_members: 1,
        },
        points: {
          total_rows: 0,
        },
        posts: {
          total_rows: 0,
        },
        visits: {
          active_days: 1,
          first_date: "2026-03-13",
          last_date: "2026-03-13",
          total_visits: 1,
          unique_ips: 1,
          visit_rows: 1,
        },
      },
    },
    meta: createTrace("dashboard"),
  };
}

function createRuntimeState(): RuntimeState {
  return {
    auth: createSignedOutAuth(),
    master: createMasterStatus(false, false),
    siteCatalog: createOnboardingCatalog(),
  };
}

describe("App first-run flow", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/#/");
    window.sessionStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("walks through secure storage gate, master setup, site onboarding, login, and overview", async () => {
    const state = createRuntimeState();
    const invokeMock = vi.mocked(invoke);
    invokeMock.mockImplementation(async (command, payload) => {
      switch (command) {
        case "cmd_master_lock_status":
          return state.master;
        case "cmd_debug_dev_bootstrap_status":
          return {
            ...createTrace("debug-bootstrap"),
            available: false,
            debug_overlay: true,
            has_master_password: false,
            has_site: false,
            has_site_auth: false,
            site_name: null,
            ssh_profile_count: 0,
          };
        case "cmd_master_lock_setup":
          state.master = createMasterStatus(true, true);
          return state.master;
        case "cmd_site_catalog_get":
          return state.siteCatalog;
        case "cmd_site_health_check":
          return {
            ...createTrace("site-health"),
            message: "사이트 API 연결이 확인되었습니다.",
            reachable: true,
            resolved_url:
              (payload as { input?: { api_base_url?: string } })?.input
                ?.api_base_url ?? "https://example.com/api/v1",
          };
        case "cmd_site_add":
          state.siteCatalog = {
            ...createSiteCatalog("signed_out"),
            active_site_id: null,
          };
          return state.siteCatalog;
        case "cmd_site_switch":
          state.siteCatalog = {
            ...state.siteCatalog,
            active_site_id:
              (payload as { input?: { site_id?: string } })?.input?.site_id ??
              "site-alpha",
          };
          return state.siteCatalog;
        case "cmd_auth_login":
          state.auth = createAuthenticatedAuth();
          state.siteCatalog = createSiteCatalog("authenticated");
          return state.auth;
        case "cmd_auth_status":
          return state.auth;
        case "cmd_site_activity_list":
          return {
            ...createTrace("site-activity"),
            activities: [],
          };
        case "cmd_admin_dashboard_get":
          return createDashboardResponse();
        case "cmd_security_settings_get":
          return {
            ...createTrace("security-settings"),
            fast_unlock_available: true,
            fast_unlock_enabled: false,
            idle_timeout_minutes: 15,
            totp_enabled: false,
          };
        default:
          throw new Error(`unexpected command: ${String(command)}`);
      }
    });

    const [{ default: App }, { ThemeProvider }] = await Promise.all([
      import("./App"),
      import("./features/layout/theme"),
    ]);
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, refetchOnWindowFocus: false },
      },
    });
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: /여러 그누보드 사이트를.*운영하십시오\./,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("자동 테마")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "계속하기" }));

    expect(await screen.findByText("마스터 잠금 설정")).toBeInTheDocument();
    expect(screen.queryByLabelText("자동 테마")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("마스터 비밀번호"), "master-secret");
    await user.type(screen.getByLabelText("비밀번호 확인"), "master-secret");
    await user.click(screen.getByRole("button", { name: "잠금 생성" }));

    expect(
      await screen.findByText("첫 사이트를 등록해 주십시오."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("사이트 이름"), "운영 쇼핑몰");
    await user.type(
      screen.getByLabelText("API 주소"),
      "https://example.com/api/v1",
    );
    await user.click(
      screen.getByRole("button", { name: "첫 사이트 등록" }),
    );

    expect(await screen.findByText("사이트 관리자 로그인")).toBeInTheDocument();
    expect(screen.queryByLabelText("자동 테마")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("관리자 아이디"), "admin");
    await user.type(screen.getByLabelText("관리자 비밀번호"), "password");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("상단 작업 탭")).toBeInTheDocument();
    expect(
      await screen.findByText("운영 쇼핑몰 운영 요약"),
    ).toBeInTheDocument();
    expect(await screen.findByText("빠른 링크")).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.hash).toContain("/sites/site-alpha/overview");
    });
  }, 15_000);

  it("skips the secure storage gate on same-session reload once accepted", async () => {
    const state = createRuntimeState();
    state.master = createMasterStatus(true, true);
    state.siteCatalog = createSiteCatalog("authenticated");
    state.auth = createAuthenticatedAuth();
    window.sessionStorage.setItem("g5-admin-secure-storage-gate", "accepted");

    const invokeMock = vi.mocked(invoke);
    invokeMock.mockImplementation(async (command) => {
      switch (command) {
        case "cmd_debug_dev_bootstrap_status":
          return {
            ...createTrace("debug-bootstrap"),
            available: false,
            debug_overlay: true,
            has_master_password: false,
            has_site: false,
            has_site_auth: false,
            site_name: null,
            ssh_profile_count: 0,
          };
        case "cmd_master_lock_status":
          return state.master;
        case "cmd_site_catalog_get":
          return state.siteCatalog;
        case "cmd_auth_status":
          return state.auth;
        case "cmd_site_activity_list":
          return {
            ...createTrace("site-activity"),
            activities: [],
          };
        case "cmd_admin_dashboard_get":
          return createDashboardResponse();
        case "cmd_security_settings_get":
          return {
            ...createTrace("security-settings"),
            fast_unlock_available: false,
            fast_unlock_enabled: false,
            idle_timeout_minutes: 15,
            totp_enabled: false,
          };
        default:
          throw new Error(`unexpected command: ${String(command)}`);
      }
    });

    const [{ default: App }, { ThemeProvider }] = await Promise.all([
      import("./App"),
      import("./features/layout/theme"),
    ]);
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, refetchOnWindowFocus: false },
      },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("시작할 준비가 되었습니다")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("상단 작업 탭")).toBeInTheDocument();
    expect(await screen.findByText("운영 쇼핑몰 운영 요약")).toBeInTheDocument();
  });
});
