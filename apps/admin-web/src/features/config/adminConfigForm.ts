import type {
  AdminConfig,
  AdminConfigUpdate,
  AdminFieldSchema,
  AdminSchemaDetail,
} from "../../api/fleet";

const supportedInputTypes = new Set([
  "text",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "password",
  "file",
  "number",
  "date",
  "datetime-local",
  "hidden",
]);
const supportedDataTypes = new Set(["string", "integer", "boolean", "file"]);
const supportedOptionSourceKinds = new Set(["endpoint", "directory"]);

export function validateAdminFieldSchema(
  domain: string,
  schema: AdminSchemaDetail,
): AdminSchemaDetail {
  if (schema.domain !== domain) {
    throw new Error(`관리자 필드 스키마 도메인이 다릅니다: ${schema.domain} != ${domain}`);
  }

  const fields = schema.sections.flatMap((section) => section.fields);
  const names = new Set<string>();
  for (const field of fields) {
    if (names.has(field.name)) {
      throw new Error(`관리자 필드 스키마에 중복 필드가 있습니다: ${field.name}`);
    }
    names.add(field.name);
    if (!supportedInputTypes.has(field.input_type)) {
      throw new Error(`지원하지 않는 관리자 입력 종류입니다: ${field.name}/${field.input_type}`);
    }
    if (!supportedDataTypes.has(field.data_type)) {
      throw new Error(`지원하지 않는 관리자 데이터 종류입니다: ${field.name}/${field.data_type}`);
    }
    if (
      typeof field.required !== "boolean" ||
      typeof field.create_only !== "boolean" ||
      typeof field.readonly_on_update !== "boolean"
    ) {
      throw new Error(`관리자 필드 상태 플래그가 boolean이 아닙니다: ${field.name}`);
    }
    if (
      field.option_source &&
      !supportedOptionSourceKinds.has(field.option_source.kind)
    ) {
      throw new Error(
        `지원하지 않는 관리자 옵션 소스입니다: ${field.name}/${field.option_source.kind}`,
      );
    }
    const indexed = schema.fields_by_name[field.name];
    if (!indexed || JSON.stringify(indexed) !== JSON.stringify(field)) {
      throw new Error(`관리자 필드 인덱스가 section 계약과 다릅니다: ${field.name}`);
    }
  }

  if (names.size !== schema.field_count || names.size !== Object.keys(schema.fields_by_name).length) {
    throw new Error(
      `관리자 필드 개수가 다릅니다: sections=${names.size} declared=${
        schema.field_count
      } indexed=${Object.keys(schema.fields_by_name).length}`,
    );
  }
  if (schema.sections.length !== schema.section_count) {
    throw new Error(
      `관리자 섹션 개수가 다릅니다: actual=${schema.sections.length} declared=${
        schema.section_count
      }`,
    );
  }
  return schema;
}

export function hydrateAdminConfig(
  config: AdminConfig,
  schema: AdminSchemaDetail,
): AdminConfig {
  const values: AdminConfig = { ...config };
  for (const field of schema.sections.flatMap((section) => section.fields)) {
    if (values[field.name] === undefined) {
      values[field.name] = normalizeDefault(field);
    }
  }
  return values;
}

export function buildAdminConfigUpdate(
  values: AdminConfig,
  baseline: AdminConfig,
): AdminConfigUpdate {
  const update: AdminConfigUpdate = {};
  for (const [name, value] of Object.entries(values)) {
    if (value !== (baseline[name] ?? "")) {
      update[name] = value;
    }
  }
  return update;
}

export function validateAdminConfigValues(
  values: AdminConfig,
  schema: AdminSchemaDetail,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of schema.sections.flatMap((section) => section.fields)) {
    if (field.input_type === "hidden" || field.readonly_on_update) continue;
    const value = values[field.name] ?? "";
    if (field.required && value.trim() === "") {
      errors[field.name] = `${field.label} 항목은 필수입니다.`;
      continue;
    }
    if (value && field.data_type === "integer" && !/^-?[0-9]+$/.test(value)) {
      errors[field.name] = `${field.label} 항목은 정수여야 합니다.`;
    }
  }
  return errors;
}

export function checkedConfigValue(value: string | undefined): boolean {
  return ["1", "true", "on", "yes", "y"].includes((value ?? "").toLowerCase());
}

function normalizeDefault(field: AdminFieldSchema): string {
  if (field.default_value === null) return "";
  if (typeof field.default_value === "boolean") return field.default_value ? "1" : "0";
  return String(field.default_value);
}
