import { describe, expect, it } from "vitest";

import type { AdminSchemaDetail } from "../../api/fleet";
import {
  buildAdminConfigUpdate,
  hydrateAdminConfig,
  validateAdminConfigValues,
  validateAdminFieldSchema,
} from "./adminConfigForm";

const titleField = {
  name: "cf_title",
  label: "사이트 제목",
  input_type: "text" as const,
  data_type: "string" as const,
  required: true,
  create_only: false,
  readonly_on_update: false,
  description: "브라우저 제목",
  default_value: "",
  options: [],
  option_source: null,
};

function schema(): AdminSchemaDetail {
  return {
    domain: "config",
    title: "기본환경설정",
    legacy_form: "config_form",
    generated_at: "2026-07-27T00:00:00Z",
    field_count: 1,
    section_count: 1,
    layout: { desktop: "tabs", mobile: "accordion", single_open: true },
    sections: [{
      key: "basic",
      label: "기본",
      order: 1,
      description: "기본 정보",
      fields: [titleField],
    }],
    fields_by_name: { cf_title: titleField },
  };
}

describe("adminConfigForm", () => {
  it("hydrates schema defaults and submits changed fields only", () => {
    const hydrated = hydrateAdminConfig({}, schema());
    expect(hydrated).toEqual({ cf_title: "" });
    expect(buildAdminConfigUpdate({ ...hydrated, cf_title: "Fleet" }, hydrated))
      .toEqual({ cf_title: "Fleet" });
  });

  it("normalizes an empty required select to its declared default", () => {
    const selectField = {
      ...titleField,
      name: "cf_captcha",
      label: "캡챠 선택",
      input_type: "select" as const,
      default_value: "kcaptcha",
      options: [
        { value: "kcaptcha", label: "Kcaptcha" },
        { value: "recaptcha", label: "reCAPTCHA V2" },
      ],
    };
    const selectSchema = schema();
    selectSchema.sections[0].fields = [selectField];
    selectSchema.fields_by_name = { cf_captcha: selectField };
    expect(hydrateAdminConfig({ cf_captcha: "" }, selectSchema))
      .toEqual({ cf_captcha: "kcaptcha" });
  });

  it("reuses the legacy schema integrity and required-field guards", () => {
    expect(validateAdminFieldSchema("config", schema())).toEqual(schema());
    expect(validateAdminConfigValues({ cf_title: "" }, schema()))
      .toEqual({ cf_title: "사이트 제목 항목은 필수입니다." });

    const invalid = schema();
    invalid.field_count = 2;
    expect(() => validateAdminFieldSchema("config", invalid))
      .toThrow("관리자 필드 개수가 다릅니다");
  });
});
