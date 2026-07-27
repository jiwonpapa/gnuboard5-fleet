import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiagnosticsPage } from "./DiagnosticsPage";

vi.mock("../../api/fleet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/fleet")>(),
  getRuntimeDiagnostics: vi.fn(async () => ({
    service: "g5-fleet-admin-server",
    server_version: "0.1.0",
    build_revision: "test-sha",
    image_version: "0.1.0",
    database_engine: "sqlite",
    database_status: "ok",
    uptime_seconds: 12,
    dev_bootstrap_available: false,
    native_devtools_available: false,
    log_tail_available: false,
  })),
}));

describe("DiagnosticsPage", () => {
  it("shows safe server diagnostics without native devtools or bootstrap", async () => {
    render(<DiagnosticsPage />);
    expect(await screen.findByText("g5-fleet-admin-server")).toBeVisible();
    expect(screen.getByText("sqlite / ok")).toBeVisible();
    expect(screen.getByText("서버 제품에서 제거됨")).toBeVisible();
    expect(screen.getByText("사용 안 함")).toBeVisible();
  });
});
