import { describe, expect, it } from "vitest";
import {
  adminMailTestFormSchema,
  buildAdminMailTestInput,
} from "./admin-mail-test-form";

describe("admin-mail-test-form", () => {
  it("builds test mail payload", () => {
    expect(
      buildAdminMailTestInput({
        content: "테스트 본문",
        subject: "테스트 메일",
        to: "tester@example.com",
      }),
    ).toEqual({
      content: "테스트 본문",
      subject: "테스트 메일",
      to: "tester@example.com",
    });
  });

  it("rejects invalid email through zod", () => {
    expect(
      adminMailTestFormSchema.safeParse({
        content: "본문",
        subject: "제목",
        to: "not-an-email",
      }).success,
    ).toBe(false);
  });
});
