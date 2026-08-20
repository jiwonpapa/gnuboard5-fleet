import { describe, expect, it } from "vitest";

import { buildAdminPopularQueries } from "./adminPopularForm";

describe("adminPopularForm", () => {
  it("reuses list, rank and reset date-range semantics", () => {
    expect(buildAdminPopularQueries({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-20",
      rankLimit: "10",
    }, 2, 50)).toEqual({
      list: { page: 2, per_page: 50, date_from: "2026-08-01", date_to: "2026-08-20" },
      rank: { limit: 10, date_from: "2026-08-01", date_to: "2026-08-20" },
      reset: { date_from: "2026-08-01", date_to: "2026-08-20" },
    });
  });

  it("omits blank dates and rejects unsafe ranges", () => {
    expect(buildAdminPopularQueries({ dateFrom: "", dateTo: "", rankLimit: "20" }, 1)).toEqual({
      list: { page: 1, per_page: 20 }, rank: { limit: 20 }, reset: {},
    });
    expect(buildAdminPopularQueries({ dateFrom: "2026-08-20", dateTo: "2026-08-01", rankLimit: "20" }, 1)).toBeNull();
    expect(buildAdminPopularQueries({ dateFrom: "", dateTo: "", rankLimit: "101" }, 1)).toBeNull();
  });
});
