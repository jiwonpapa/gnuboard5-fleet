import { describe, expect, it } from "vitest";

import { buildAdminPointChange, buildAdminPointExpire } from "./adminPointForm";

describe("admin point form", () => {
  it("builds a positive integer point change", () => {
    expect(buildAdminPointChange({
      mb_id: " fleetcert ",
      point: "120",
      po_content: " browser certification ",
    })).toEqual({
      mb_id: "fleetcert",
      point: 120,
      po_content: "browser certification",
    });
  });

  it("fails closed on invalid amounts and dates", () => {
    expect(buildAdminPointChange({ mb_id: "fleetcert", point: "-1", po_content: "" })).toBeNull();
    expect(buildAdminPointChange({ mb_id: "", point: "10", po_content: "" })).toBeNull();
    expect(buildAdminPointExpire("")).toEqual({});
    expect(buildAdminPointExpire("2026-08-18")).toEqual({ base_date: "2026-08-18" });
    expect(buildAdminPointExpire("18-08-2026")).toBeNull();
  });
});
