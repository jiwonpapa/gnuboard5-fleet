import { describe, expect, it } from "vitest";
import {
  buildAdminPopularListQuery,
  buildAdminPopularRankQuery,
  buildAdminPopularResetInput,
} from "./admin-popular-form";

describe("admin-popular-form", () => {
  it("builds list query", () => {
    expect(
      buildAdminPopularListQuery(
        {
          date_from: "2026-03-01",
          date_to: "2026-03-08",
          rank_limit: "10",
        },
        2,
        50,
      ),
    ).toEqual({
      date_from: "2026-03-01",
      date_to: "2026-03-08",
      page: 2,
      per_page: 50,
    });
  });

  it("builds rank query with default limit fallback", () => {
    expect(
      buildAdminPopularRankQuery({
        date_from: "",
        date_to: "",
        rank_limit: "",
      }),
    ).toEqual({
      date_from: null,
      date_to: null,
      limit: 20,
    });
  });

  it("builds reset payload", () => {
    expect(
      buildAdminPopularResetInput({
        date_from: "2026-03-01",
        date_to: "",
        rank_limit: "20",
      }),
    ).toEqual({
      date_from: "2026-03-01",
      date_to: null,
    });
  });
});
