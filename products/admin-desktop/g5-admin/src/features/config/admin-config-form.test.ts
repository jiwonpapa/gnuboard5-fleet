import { describe, expect, it } from "vitest";
import {
  buildAdminConfigUpdateInput,
  hasAdminConfigUpdateChanges,
  isEnabled,
  toAdminConfigFormValues,
} from "./admin-config-form";
import type { AdminConfig } from "../../types/AdminConfig";

const baseline: AdminConfig = {
  cf_title: "그누보드",
  cf_admin: "admin",
  cf_admin_email: "admin@example.com",
  cf_admin_email_name: "운영자",
  cf_register_level: "2",
  cf_register_point: "100",
  cf_login_point: "5",
  cf_use_point: "1",
  cf_write_point: "10",
  cf_comment_point: "2",
  cf_download_point: "-10",
  cf_read_point: "0",
  cf_memo_send_point: "0",
  cf_use_email_certify: "1",
  cf_use_homepage: "0",
  cf_req_homepage: "0",
  cf_use_tel: "1",
  cf_req_tel: "0",
  cf_use_hp: "1",
  cf_req_hp: "0",
  cf_use_addr: "1",
  cf_req_addr: "1",
  cf_new_skin: "basic",
  cf_search_skin: "basic",
  cf_connect_skin: "basic",
  cf_faq_skin: "basic",
  cf_editor: "smarteditor2",
  cf_member_skin: "basic",
  cf_mobile_member_skin: "basic",
  cf_captcha: "kcaptcha",
  cf_social_login_use: "0",
  extra: {
    cf_bbs_rewrite: "2",
    cf_cert_use: "1",
    cf_email_use: "1",
    cf_email_mb_member: "0",
    cf_login_minutes: "30",
    cf_social_servicelist: "naver,kakao",
    cf_kakao_rest_key: "kakao-key",
  },
};

describe("admin-config-form", () => {
  it("hydrates boolean-like string flags into form booleans", () => {
    const values = toAdminConfigFormValues(baseline);

    expect(values.cf_use_point).toBe(true);
    expect(values.cf_use_homepage).toBe(false);
    expect(values.cf_req_addr).toBe(true);
    expect(values.cf_title).toBe("그누보드");
    expect(values.cf_admin).toBe("admin");
    expect(values.extraTexts.cf_cert_use).toBe("1");
    expect(values.extraFlags.cf_email_use).toBe(true);
    expect(values.extraFlags.cf_email_mb_member).toBe(false);
    expect(values.extraTexts.cf_bbs_rewrite).toBe("2");
    expect(values.extraTexts.cf_login_minutes).toBe("30");
    expect(values.extraTexts.cf_social_servicelist).toBe("naver,kakao");
  });

  it("builds a diff-only payload for changed fields", () => {
    const values = toAdminConfigFormValues(baseline);
    values.cf_title = "새 사이트";
    values.cf_admin = "admin2";
    values.extraTexts.cf_cert_use = "2";
    values.extraFlags.cf_email_use = false;
    values.extraTexts.cf_social_servicelist = "kakao,payco";
    values.extraTexts.cf_kakao_rest_key = "new-kakao-key";

    const payload = buildAdminConfigUpdateInput(values, baseline);

    expect(payload).toEqual({
      cf_title: "새 사이트",
      cf_admin: "admin2",
      extra: {
        cf_cert_use: "2",
        cf_email_use: "0",
        cf_social_servicelist: "kakao,payco",
        cf_kakao_rest_key: "new-kakao-key",
      },
    });
  });

  it("keeps extra present but treats an empty extra diff as no-op", () => {
    const values = toAdminConfigFormValues(baseline);

    const payload = buildAdminConfigUpdateInput(values, baseline);

    expect(payload).toEqual({
      extra: {},
    });
    expect(hasAdminConfigUpdateChanges(payload)).toBe(false);
  });

  it("detects enabled truthy strings consistently", () => {
    expect(isEnabled("1")).toBe(true);
    expect(isEnabled("TRUE")).toBe(true);
    expect(isEnabled("off")).toBe(false);
    expect(isEnabled(null)).toBe(false);
  });
});
