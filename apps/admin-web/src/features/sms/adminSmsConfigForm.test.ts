import { describe, expect, it } from "vitest";

import type { AdminSmsConfig } from "../../api/fleet";
import {
  buildAdminSmsConfigUpdate,
  smsConfigToDraft,
  validateAdminSmsConfigDraft,
  validCallbackPhone,
} from "./adminSmsConfigForm";

const baseline: AdminSmsConfig = {
  cf_title: "그누보드",
  cf_sms_use: "icode",
  cf_sms_type: "LMS",
  cf_icode_id: "icode-user",
  cf_icode_pw: null,
  cf_icode_server_ip: "121.78.96.124",
  cf_icode_server_port: "7295",
  cf_icode_token_key: null,
  cf_phone: "02-1234-5678",
  cf_datetime: "2026-08-21 12:00:00",
  provider_ready: true,
  uses_token_key: true,
  uses_legacy_credentials: false,
  storage_ready: true,
  missing_tables: [],
};

describe("adminSmsConfigForm", () => {
  it("hydrates browser-safe values without provider secrets", () => {
    expect(smsConfigToDraft(baseline)).toMatchObject({
      cf_sms_use: "icode",
      cf_sms_type: "LMS",
      cf_icode_pw: "",
      cf_icode_token_key: "",
    });
  });

  it("builds a diff-only update and treats secrets as rotation-only", () => {
    const draft = smsConfigToDraft(baseline);
    draft.cf_sms_type = "";
    draft.cf_icode_token_key = " rotated-token ";
    expect(buildAdminSmsConfigUpdate(baseline, draft)).toEqual({
      cf_sms_type: "",
      cf_icode_token_key: "rotated-token",
    });
  });

  it("validates ports and callback numbers before submit", () => {
    const draft = smsConfigToDraft(baseline);
    draft.cf_icode_server_port = "70000";
    expect(validateAdminSmsConfigDraft(draft)).toContain("1~65535");
    expect(validCallbackPhone("02-1234-5678")).toBe(true);
    expect(validCallbackPhone("010-0000-1234")).toBe(false);
  });
});
