import { describe, expect, it } from "vitest";
import type { AdminSmsConfig } from "../../types/AdminSmsConfig";
import {
  buildAdminSmsConfigUpdateInput,
  isValidSmsCallbackPhone,
  isValidSmsServerPort,
  toAdminSmsConfigFormValues,
  validateAdminSmsConfigUpdateInput,
} from "./admin-sms-config-form";

const baseline: AdminSmsConfig = {
  cf_title: "그누보드",
  cf_sms_use: "icode",
  cf_sms_type: "LMS",
  cf_icode_id: "icode-user",
  cf_icode_pw: "secret",
  cf_icode_server_ip: "121.78.96.124",
  cf_icode_server_port: "7295",
  cf_icode_token_key: "token-key",
  cf_phone: "0212345678",
  cf_datetime: "2026-03-07 01:02:03",
  provider_ready: true,
  uses_token_key: true,
  uses_legacy_credentials: false,
  storage_ready: true,
  missing_tables: [],
};

describe("admin-sms-config-form", () => {
  it("hydrates sms config values into the form shape", () => {
    const values = toAdminSmsConfigFormValues(baseline);

    expect(values.cf_sms_use).toBe("icode");
    expect(values.cf_sms_type).toBe("LMS");
    expect(values.cf_icode_server_port).toBe("7295");
    expect(values.cf_phone).toBe("0212345678");
  });

  it("builds a diff-only payload for changed sms fields", () => {
    const values = toAdminSmsConfigFormValues(baseline);
    values.cf_sms_type = "";
    values.cf_phone = "0299998888";

    const payload = buildAdminSmsConfigUpdateInput(values, baseline);

    expect(payload).toEqual({
      cf_sms_type: "",
      cf_phone: "0299998888",
    });
  });

  it("validates callback phone with the backend callback rules", () => {
    expect(isValidSmsCallbackPhone("02-1234-5678")).toBe(true);
    expect(isValidSmsCallbackPhone("123")).toBe(false);
    expect(isValidSmsCallbackPhone("010-0000-1234")).toBe(false);
  });

  it("rejects empty or non-numeric changed server ports before submit", () => {
    expect(isValidSmsServerPort("7295")).toBe(true);
    expect(isValidSmsServerPort("")).toBe(false);

    expect(
      validateAdminSmsConfigUpdateInput({
        cf_icode_server_port: "",
        cf_phone: "123",
      }),
    ).toEqual({
      cf_icode_server_port: "포트는 숫자만 입력해야 합니다.",
      cf_phone: "회신번호 형식이 올바르지 않습니다.",
    });
  });
});
