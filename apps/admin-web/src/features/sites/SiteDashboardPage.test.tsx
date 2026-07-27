import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import { SiteDashboardPage } from "./SiteDashboardPage";

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  listSites: vi.fn(async () => [{
    site_id: "site-a",
    owner_user_id: "principal-1",
    display_name: "Site A",
    base_url: "https://example.com",
    status: "pending",
  }]),
}));

describe("SiteDashboardPage", () => {
  it("renders the owned site catalog with explicit site routes", async () => {
    render(
      <MemoryRouter initialEntries={["/sites"]}>
        <AuthSessionProvider value={{
          idleTimeoutMinutes: 30,
          logout: async () => {},
          session: {
            principal_id: "principal-1",
            web_session_id: "session-1",
            expires_at_unix: 1,
            step_up_active: true,
            csrf_token: "csrf-1",
          },
          updateIdleTimeout: () => {},
          updateSession: () => {},
        }}>
          <Routes><Route path="/sites" element={<SiteDashboardPage />} /></Routes>
        </AuthSessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Site A")).toBeVisible();
    expect(screen.getByRole("link", { name: "관리" })).toHaveAttribute("href", "/sites/site-a");
    expect(screen.getByText(/전역 활성 사이트 없이/)).toBeVisible();
  });
});
