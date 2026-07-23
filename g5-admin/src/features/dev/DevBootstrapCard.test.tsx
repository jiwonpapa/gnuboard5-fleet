import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, devModeStorageKey } from "../layout/theme";
import { DevBootstrapCard } from "./DevBootstrapCard";

const apiMocks = vi.hoisted(() => ({
  applyDebugDevBootstrap: vi.fn(),
  getDebugDevBootstrapStatus: vi.fn(),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    applyDebugDevBootstrap: apiMocks.applyDebugDevBootstrap,
    getDebugDevBootstrapStatus: apiMocks.getDebugDevBootstrapStatus,
  };
});

function renderCard(onApplied?: () => void | Promise<void>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DevBootstrapCard onApplied={onApplied} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("DevBootstrapCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(devModeStorageKey, "enabled");
    apiMocks.getDebugDevBootstrapStatus.mockResolvedValue({
      available: true,
      correlation_id: "corr-debug-bootstrap",
      debug_overlay: true,
      has_master_password: true,
      has_site: true,
      has_site_auth: true,
      request_id: "req-debug-bootstrap",
      server_request_id: null,
      site_name: "개발 사이트",
      ssh_profile_count: 1,
    });
    apiMocks.applyDebugDevBootstrap.mockResolvedValue({
      correlation_id: "corr-debug-bootstrap",
      created_ssh_profile_count: 1,
      master_lock_configured: true,
      master_lock_unlocked: true,
      request_id: "req-debug-bootstrap",
      server_request_id: null,
      site_id: "site-dev",
      site_login_authenticated: true,
      site_login_mb_id: "dev_admin",
      site_name: "개발 사이트",
      updated_ssh_profile_count: 0,
    });
  });

  it("applies the configured dev bootstrap and calls the completion callback", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();

    renderCard(onApplied);

    await user.click(
      await screen.findByRole("button", { name: "개발 기본값 채우기" }),
    );

    await waitFor(() => {
      expect(apiMocks.applyDebugDevBootstrap).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText(
        "마스터 잠금 준비 · 사이트: 개발 사이트 · 로그인: dev_admin · SSH 1개 추가",
      ),
    ).toBeInTheDocument();
  });

  it("shows the missing-config hint when dev bootstrap is unavailable", async () => {
    apiMocks.getDebugDevBootstrapStatus.mockResolvedValue({
      available: false,
      correlation_id: "corr-debug-bootstrap",
      debug_overlay: true,
      has_master_password: false,
      has_site: false,
      has_site_auth: false,
      request_id: "req-debug-bootstrap",
      server_request_id: null,
      site_name: null,
      ssh_profile_count: 0,
    });

    renderCard();

    expect(
      await screen.findByText(/app-config\.json.*devBootstrap/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "개발 기본값 채우기" })).toBeDisabled();
  });
});
