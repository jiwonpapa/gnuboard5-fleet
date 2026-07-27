import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SiteOnboardingPage } from "./SiteOnboardingPage";
import { AuthSessionProvider } from "../auth/AuthSessionContext";

const { createSite } = vi.hoisted(() => ({ createSite: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  createSite,
}));

describe("SiteOnboardingPage", () => {
  it("registers the first site through the same-origin server API", async () => {
    render(
      <MemoryRouter initialEntries={["/sites/new"]}>
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
          <Routes>
            <Route path="/sites/new" element={<SiteOnboardingPage />} />
            <Route path="/sites/:siteId" element={<div>사이트 상세</div>} />
          </Routes>
        </AuthSessionProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("사이트 식별자"), { target: { value: "site-a" } });
    fireEvent.change(screen.getByLabelText("표시 이름"), { target: { value: "Site A" } });
    fireEvent.change(screen.getByLabelText("기준 주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "사이트 등록" }));
    await waitFor(() => expect(createSite).toHaveBeenCalledWith({
      site_id: "site-a",
      display_name: "Site A",
      base_url: "https://example.com",
    }, "csrf-1"));
    expect(await screen.findByText("사이트 상세")).toBeVisible();
  });
});
