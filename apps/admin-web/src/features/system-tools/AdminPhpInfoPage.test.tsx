import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPhpInfoPage } from "./AdminPhpInfoPage";

const api = vi.hoisted(() => ({ getAdminSystemPhpInfo: vi.fn() }));
vi.mock("../../api/fleet", async (importOriginal) => ({ ...await importOriginal<typeof import("../../api/fleet")>(), ...api }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdminSystemPhpInfo.mockResolvedValue({
    php_version: "8.3.0", sapi: "fpm-fcgi", extension_count: 42,
    loaded_ini_configured: true, scanned_ini_configured: false,
    raw_html_withheld: true,
  });
});

describe("AdminPhpInfoPage", () => {
  it("renders only the browser-safe summary returned by the Rust server", async () => {
    render(<MemoryRouter initialEntries={["/sites/site-a/admin/system-tools"]}><Routes><Route path="/sites/:siteId/admin/system-tools" element={<AdminPhpInfoPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("8.3.0")).toBeVisible());
    expect(screen.getByText("차단됨")).toBeVisible();
    expect(screen.queryByText(/AWS_SECRET/)).not.toBeInTheDocument();
    expect(api.getAdminSystemPhpInfo).toHaveBeenCalledWith("site-a");
  });
});
