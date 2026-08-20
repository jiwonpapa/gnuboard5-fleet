import { describe, expect, it } from "vitest";

import { buildReportListQuery, buildReportUpdate, reportStatusLabel } from "./adminReportForm";

describe("adminReportForm", () => {
  it("preserves status and target filters with bounded pagination", () => {
    expect(buildReportListQuery({ status: "pending", targetType: "post" }, 2)).toEqual({
      status: "pending",
      target_type: "post",
      page: 2,
      per_page: 20,
    });
    expect(buildReportListQuery({ status: "", targetType: "" }, 0)).toBeNull();
  });

  it("normalizes memo and rejects an oversized update", () => {
    expect(buildReportUpdate({ status: "approved", adminMemo: "  검토 완료  " })).toEqual({
      status: "approved",
      admin_memo: "검토 완료",
    });
    expect(buildReportUpdate({ status: "hold", adminMemo: "x".repeat(65_536) })).toBeNull();
    expect(reportStatusLabel("rejected")).toBe("반려");
  });
});
