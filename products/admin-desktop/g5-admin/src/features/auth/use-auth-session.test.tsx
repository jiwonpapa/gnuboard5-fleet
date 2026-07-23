import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSessionState } from "../../types/AuthSessionState";
import type { SiteCatalog } from "../../types/SiteCatalog";
import { buildAuthStatusKey, useAuthSession } from "./use-auth-session";
import { siteCatalogKey } from "../sites/use-site-catalog";

const authLoginMock = vi.fn();
const authLogoutMock = vi.fn();
const authStatusMock = vi.fn();

vi.mock("../../api/client", () => ({
  authLogin: (...args: unknown[]) => authLoginMock(...args),
  authLogout: (...args: unknown[]) => authLogoutMock(...args),
  authStatus: (...args: unknown[]) => authStatusMock(...args),
}));

function createCatalog(status: "authenticated" | "signed_out" = "signed_out"): SiteCatalog {
  return {
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
        status,
      },
    ],
  };
}

function createSession(authenticated: boolean): AuthSessionState {
  return {
    authenticated,
    correlation_id: "corr-auth",
    member: authenticated
      ? {
          mb_id: "admin",
          mb_name: "관리자",
          mb_nick: "관리자",
          mb_email: null,
          mb_level: 10,
          mb_point: null,
        }
      : null,
    request_id: "req-auth",
    server_request_id: null,
  };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/sites/site-alpha/login"]}>
          <Routes>
            <Route path="/sites/:siteId/login" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useAuthSession", () => {
  beforeEach(() => {
    authLoginMock.mockReset();
    authLogoutMock.mockReset();
    authStatusMock.mockReset();
  });

  it("marks the current site catalog entry as authenticated after login succeeds", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(siteCatalogKey, createCatalog("signed_out"));
    authLoginMock.mockResolvedValue(createSession(true));

    const { result } = renderHook(() => useAuthSession({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.login({
        mb_id: "admin",
        mb_password: "secret",
      });
    });

    expect(queryClient.getQueryData(buildAuthStatusKey("site-alpha"))).toEqual(
      createSession(true),
    );
    expect((queryClient.getQueryData(siteCatalogKey) as SiteCatalog).sites[0]?.status).toBe(
      "authenticated",
    );
  });

  it("marks the current site catalog entry as signed out after logout succeeds", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(siteCatalogKey, createCatalog("authenticated"));
    queryClient.setQueryData(buildAuthStatusKey("site-alpha"), createSession(true));
    authLogoutMock.mockResolvedValue(createSession(false));

    const { result } = renderHook(() => useAuthSession({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.logout();
    });

    expect((queryClient.getQueryData(siteCatalogKey) as SiteCatalog).sites[0]?.status).toBe(
      "signed_out",
    );
  });

  it("synchronizes the site catalog when auth status confirms an authenticated session", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(siteCatalogKey, createCatalog("signed_out"));
    authStatusMock.mockResolvedValue(createSession(true));

    renderHook(() => useAuthSession({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect((queryClient.getQueryData(siteCatalogKey) as SiteCatalog).sites[0]?.status).toBe(
        "authenticated",
      );
    });
  });
});
