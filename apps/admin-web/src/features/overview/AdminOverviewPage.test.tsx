import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AdminOverviewPage } from "./AdminOverviewPage";

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  getDashboard: vi.fn(async () => ({
    site_count: 2,
    attention_count: 1,
    active_job_count: 3,
    recent_activity: [{
      audit_id: 1,
      request_id: "request-1",
      principal_id: "principal-1",
      site_id: "site-a",
      action: "http.put",
      outcome: "success",
      details: {},
      created_at: "2026-07-27T12:00:00Z",
    }],
  })),
}));

describe("AdminOverviewPage", () => {
  it("consumes the dashboard and recent activity API", async () => {
    render(<MemoryRouter><AdminOverviewPage /></MemoryRouter>);
    expect(await screen.findByText("http.put")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
  });
});
