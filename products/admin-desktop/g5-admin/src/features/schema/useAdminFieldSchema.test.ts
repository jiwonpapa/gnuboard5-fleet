import { describe, expect, it } from "vitest";
import {
  getFieldDefaultValue,
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
  getFieldOptionSource,
  getFieldSchema,
  getSchemaLayout,
  getSchemaSections,
  validateAdminFieldSchema,
} from "./useAdminFieldSchema";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";

describe("useAdminFieldSchema helpers", () => {
  const schema = buildSchema();

  it("returns the requested field metadata", () => {
    expect(getFieldSchema(schema, "bo_device")?.name).toBe("bo_device");
    expect(getFieldSchema(schema, "missing")).toBeNull();
  });

  it("reads label, description, options, and default_value from schema fields", () => {
    expect(getFieldLabel(schema, "bo_device", "fallback")).toBe("접속 기기");
    expect(getFieldDescription(schema, "bo_device")).toBe("생성 시 기본 접속 기기를 선택합니다.");
    expect(getFieldOptions(schema, "bo_device")).toEqual([
      { label: "모두", value: "both" },
      { label: "PC", value: "pc" },
    ]);
    expect(getFieldDefaultValue(schema, "bo_device")).toBe("both");
    expect(getFieldDefaultValue(schema, "bo_count_write")).toBe(0);
    expect(getFieldDefaultValue(schema, "bo_use_category")).toBe(false);
    expect(getFieldDefaultValue(schema, "bo_notice")).toBeNull();
    expect(getFieldDefaultValue(null, "bo_device")).toBeUndefined();
    expect(getFieldOptionSource(schema, "bo_device")).toEqual({
      endpoint: "/admin/groups",
      kind: "endpoint",
      label_field: "gr_subject",
      name: "admin.groups",
      value_field: "gr_id",
    });
  });

  it("fails closed on domain, count, field-index, and metadata drift", () => {
    expect(validateAdminFieldSchema("boards", schema)).toBe(schema);
    expect(() => validateAdminFieldSchema("config", schema)).toThrow(/도메인/);
    expect(() =>
      validateAdminFieldSchema("boards", { ...schema, field_count: 99 }),
    ).toThrow(/필드 개수/);
    expect(() =>
      validateAdminFieldSchema("boards", {
        ...schema,
        fields_by_name: { ...schema.fields_by_name, bo_device: schema.fields_by_name.bo_notice },
      }),
    ).toThrow(/필드 인덱스/);
    expect(() =>
      validateAdminFieldSchema("boards", {
        ...schema,
        sections: [
          {
            ...schema.sections[0],
            fields: [
              { ...schema.sections[0].fields[0], input_type: "unsupported" },
              ...schema.sections[0].fields.slice(1),
            ],
          },
        ],
      }),
    ).toThrow(/입력 종류/);
  });

  it("returns schema layout and sections", () => {
    expect(getSchemaLayout(schema)).toEqual({
      desktop: "tabs",
      mobile: "accordion",
      single_open: true,
    });
    expect(getSchemaSections(schema).map((section) => section.key)).toEqual(["basic"]);
    expect(getSchemaLayout(null)).toBeNull();
    expect(getSchemaSections(null)).toEqual([]);
  });
});

function buildSchema(): AdminSchemaDetail {
  const boDevice = {
    name: "bo_device",
    label: "접속 기기",
    input_type: "select",
    data_type: "string",
    required: false,
    create_only: false,
    readonly_on_update: false,
    description: "생성 시 기본 접속 기기를 선택합니다.",
    default_value: "both",
    options: [
      { label: "모두", value: "both" },
      { label: "PC", value: "pc" },
    ],
    option_source: {
      kind: "endpoint",
      name: "admin.groups",
      endpoint: "/admin/groups",
      value_field: "gr_id",
      label_field: "gr_subject",
    },
  };
  const boCountWrite = {
    name: "bo_count_write",
    label: "본문 글수",
    input_type: "number",
    data_type: "integer",
    required: false,
    create_only: false,
    readonly_on_update: false,
    description: null,
    default_value: 0,
    options: [],
  };
  const boUseCategory = {
    name: "bo_use_category",
    label: "카테고리 사용",
    input_type: "checkbox",
    data_type: "boolean",
    required: false,
    create_only: false,
    readonly_on_update: false,
    description: null,
    default_value: false,
    options: [],
  };
  const boNotice = {
    name: "bo_notice",
    label: "공지",
    input_type: "text",
    data_type: "string",
    required: false,
    create_only: false,
    readonly_on_update: false,
    description: null,
    default_value: null,
    options: [],
  };

  return {
    domain: "boards",
    title: "게시판",
    legacy_form: "adm/board_form.php",
    field_count: 4,
    section_count: 1,
    generated_at: "2026-03-13T00:00:00Z",
    layout: {
      desktop: "tabs",
      mobile: "accordion",
      single_open: true,
    },
    sections: [
      {
        key: "basic",
        label: "기본",
        order: 0,
        description: null,
        fields: [boDevice, boCountWrite, boUseCategory, boNotice],
      },
    ],
    fields_by_name: {
      bo_device: boDevice,
      bo_count_write: boCountWrite,
      bo_use_category: boUseCategory,
      bo_notice: boNotice,
    },
  };
}
