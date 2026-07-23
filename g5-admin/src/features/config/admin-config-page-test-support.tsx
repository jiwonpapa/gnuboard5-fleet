import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { buildAuthStatusKey } from "../auth/use-auth-session";
import { ThemeProvider } from "../layout/theme";
import { AdminConfigPage } from "./AdminConfigPage";
import {
  createConfigResponse,
  createSchemaResponse,
} from "./admin-config-page-test-fixtures";

export function stubMatchMedia(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("min-width: 768px") ? desktop : false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

export function renderAdminConfigPage(params: {
  apiMocks: {
    getAdminConfig: { mockResolvedValue: (value: unknown) => unknown };
    getAdminFieldSchema: { mockResolvedValue: (value: unknown) => unknown };
  };
  configResponse?: ReturnType<typeof createConfigResponse>;
  currentMemberId?: string;
  schemaResponse?: ReturnType<typeof createSchemaResponse>;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const currentMemberId = params.currentMemberId ?? "admin";
  queryClient.setQueryData(buildAuthStatusKey("site-1"), {
    authenticated: true,
    correlation_id: "corr-auth",
    member: {
      mb_email: "admin@example.com",
      mb_id: currentMemberId,
      mb_level: 10,
      mb_name: "운영자",
      mb_nick: "운영자",
      mb_point: 0,
    },
    request_id: "req-auth",
    server_request_id: null,
  });
  if (params.configResponse) {
    params.apiMocks.getAdminConfig.mockResolvedValue(params.configResponse);
  }
  if (params.schemaResponse) {
    params.apiMocks.getAdminFieldSchema.mockResolvedValue(params.schemaResponse);
  }

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AdminConfigPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

export function getPrimarySaveButton() {
  return screen.getAllByRole("button", { name: "기본환경설정 저장" })[0];
}
