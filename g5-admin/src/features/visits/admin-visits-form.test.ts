import { describe, expect, it } from "vitest";
import {
  adminVisitDeleteFormSchema,
  buildAdminVisitDeleteInput,
  buildAdminVisitSearchQuery,
  buildAdminVisitStatsQuery,
} from "./admin-visits-form";

describe("admin-visits-form", () => {
  it("builds visit stats query", () => {
    expect(
      buildAdminVisitStatsQuery({
        date_from: "2026-03-01",
        date_to: "2026-03-08",
        limit: "50",
        type: "browser",
      }),
    ).toEqual({
      date_from: "2026-03-01",
      date_to: "2026-03-08",
      limit: 50,
      type: "browser",
    });
  });

  it("builds visit search query with page", () => {
    expect(
      buildAdminVisitSearchQuery(
        {
          agent: "Chrome",
          date_from: "",
          date_to: "",
          ip: "127.0.0.1",
          referer: "",
        },
        3,
      ),
    ).toEqual({
      agent: "Chrome",
      date_from: null,
      date_to: null,
      ip: "127.0.0.1",
      page: 3,
      per_page: 50,
      referer: null,
    });
  });

  it("rejects empty visit delete payload", () => {
    expect(
      adminVisitDeleteFormSchema.safeParse({
        before: "",
        date_from: "",
        date_to: "",
        ip: "",
      }).success,
    ).toBe(false);
    expect(
      buildAdminVisitDeleteInput({
        before: "",
        date_from: "",
        date_to: "",
        ip: "",
      }),
    ).toBeNull();
  });
});
