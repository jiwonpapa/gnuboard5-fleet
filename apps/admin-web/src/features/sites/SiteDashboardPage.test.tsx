import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "../auth/AuthSessionContext";
import * as fleetApi from "../../api/fleet";
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
  getSite: vi.fn(async () => ({
    site_id: "site-a",
    owner_user_id: "principal-1",
    display_name: "Site A",
    base_url: "https://example.com",
    status: "pending",
  })),
  connectorLogin: vi.fn(async () => ({ connected: true, expires_in: 3600 })),
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

  it("stores G5 connector credentials through the explicit site server route", async () => {
    render(
      <MemoryRouter initialEntries={["/sites/site-a"]}>
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
          <Routes><Route path="/sites/:siteId" element={<SiteDashboardPage />} /></Routes>
        </AuthSessionProvider>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("G5 관리자 아이디"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("G5 관리자 비밀번호"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connector 로그인" }));

    expect(fleetApi.connectorLogin).toHaveBeenCalledWith(
      "site-a",
      { mb_id: "admin", mb_password: "secret" },
      "csrf-1",
    );
    expect(await screen.findByText(/서버에 안전하게 저장/)).toBeVisible();
    expect(screen.getByLabelText("G5 관리자 비밀번호")).toHaveValue("");
    expect(screen.getByRole("link", { name: "FAQ 관리" })).toHaveAttribute(
      "href",
      "/sites/site-a/admin/faqs",
    );
  });
});
