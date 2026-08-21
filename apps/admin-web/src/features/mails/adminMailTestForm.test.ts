import { describe, expect, it } from "vitest";

import { buildAdminMailTest, buildAdminSystemMailTest } from "./adminMailTestForm";

describe("adminMailTestForm", () => {
  it("requires a valid address and either a template or direct content", () => {
    expect(buildAdminMailTest({ templateId: "7", to: " admin@example.test ", subject: "", content: "" })).toEqual({ ma_id: 7, to: "admin@example.test" });
    expect(buildAdminMailTest({ templateId: "", to: "bad", subject: "제목", content: "본문" })).toBeNull();
    expect(buildAdminMailTest({ templateId: "", to: "admin@example.test", subject: " 제목 ", content: " 본문 " })).toEqual({ to: "admin@example.test", subject: "제목", content: "본문" });
  });

  it("keeps the system log test independent from a saved template", () => {
    expect(buildAdminSystemMailTest({ templateId: "7", to: "admin@example.test", subject: " 시스템 ", content: " 로그 " })).toEqual({ to: "admin@example.test", subject: "시스템", content: "로그" });
    expect(buildAdminSystemMailTest({ templateId: "7", to: "admin@example.test", subject: "", content: "로그" })).toBeNull();
  });
});
