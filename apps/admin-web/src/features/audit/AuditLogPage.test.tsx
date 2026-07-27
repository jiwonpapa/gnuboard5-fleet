import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuditLogPage } from "./AuditLogPage";

vi.mock("../../api/fleet", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../api/fleet")>();
  return {
    ...original,
    listAuditEntries: vi.fn(async () => [{
      audit_id: 7,
      request_id: "request-7",
      principal_id: "principal-1",
      site_id: "site-a",
      action: "PUT /api/v1/security/idle-timeout",
      outcome: "success",
      details: {},
      created_at: "2026-07-27T12:00:00Z",
    }]),
  };
});

describe("AuditLogPage", () => {
  it("renders principal-scoped append-only audit results", async () => {
    render(<AuditLogPage />);
    expect(
      await screen.findByText("PUT /api/v1/security/idle-timeout"),
    ).toBeVisible();
    expect(screen.getByText("request-7")).toBeVisible();
    expect(screen.getByText("site-a")).toBeVisible();
  });
});
