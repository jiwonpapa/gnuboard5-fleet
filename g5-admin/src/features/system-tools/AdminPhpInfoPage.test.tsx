import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { AdminPhpInfoPage } from "./AdminPhpInfoPage";

const apiMocks = vi.hoisted(() => ({
  getAdminPhpInfo: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminPhpInfo: apiMocks.getAdminPhpInfo,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("AdminPhpInfoPage", () => {
  beforeEach(() => {
    apiMocks.getAdminPhpInfo.mockResolvedValue({
      info: {
        php_version: "8.3.4",
        sapi: "fpm-fcgi",
        extension_count: 64,
        loaded_ini: "/etc/php.ini",
        scanned_ini: "/etc/php.d",
        html: "<!doctype html><html><body><h1>phpinfo</h1></body></html>",
      },
      request_id: "req-phpinfo",
      correlation_id: "corr-phpinfo",
      server_request_id: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders phpinfo page smoke", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <AdminPhpInfoPage />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("phpinfo()")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getAdminPhpInfo).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("런타임 요약")).toBeInTheDocument();
    expect(screen.getByText("phpinfo HTML 원문")).toBeInTheDocument();
    expect(screen.getAllByText("8.3.4").length).toBeGreaterThan(0);
    expect(screen.getByTitle("phpinfo")).toBeInTheDocument();
  });
});
