import { useQuery } from "@tanstack/react-query";
import {
  getAdminFieldSchema,
  type CommandError,
} from "../../api/client";
import type { AdminFieldOption } from "../../types/AdminFieldOption";
import type { AdminFieldOptionSource } from "../../types/AdminFieldOptionSource";
import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminSchemaDetailResponse } from "../../types/AdminSchemaDetailResponse";
import type { AdminSchemaLayout } from "../../types/AdminSchemaLayout";
import type { AdminSchemaSection } from "../../types/AdminSchemaSection";

export type AdminFieldSchemaDomain =
  | "boards"
  | "config"
  | "contents"
  | "faqs"
  | "faq-masters"
  | "groups"
  | "mails"
  | "members"
  | "menus"
  | "polls"
  | "points"
  | "popups"
  | "sms-contacts"
  | "sms-messages"
  | "sms-templates"
  | "system"
  | "theme";

export function useAdminFieldSchema(domain: AdminFieldSchemaDomain) {
  return useQuery<AdminSchemaDetailResponse, CommandError>({
    queryKey: ["admin", "field-schema", domain],
    queryFn: () => getAdminFieldSchema(domain),
    retry: false,
    select: (response) => ({
      ...response,
      schema: validateAdminFieldSchema(domain, response.schema),
    }),
    staleTime: 5 * 60 * 1000,
  });
}

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
  domain: AdminFieldSchemaDomain,
  schema: AdminSchemaDetail,
): AdminSchemaDetail {
  if (schema.domain !== domain) {
    throw new Error(`관리자 필드 스키마 도메인이 다릅니다: ${schema.domain} != ${domain}`);
  }

  const sectionFields = schema.sections.flatMap((section) => section.fields);
  const names = new Set<string>();
  for (const field of sectionFields) {
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
      `관리자 필드 개수가 다릅니다: sections=${names.size} declared=${schema.field_count} indexed=${Object.keys(schema.fields_by_name).length}`,
    );
  }
  if (schema.sections.length !== schema.section_count) {
    throw new Error(
      `관리자 섹션 개수가 다릅니다: actual=${schema.sections.length} declared=${schema.section_count}`,
    );
  }

  return schema;
}

export function getFieldSchema(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
): AdminFieldSchema | null {
  return schema?.fields_by_name?.[name] ?? null;
}

export function getSchemaLayout(
  schema: AdminSchemaDetail | null | undefined,
): AdminSchemaLayout | null {
  return schema?.layout ?? null;
}

export function getSchemaSections(
  schema: AdminSchemaDetail | null | undefined,
): AdminSchemaSection[] {
  return schema?.sections ?? [];
}

export function getFieldLabel(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
  fallback: string,
): string {
  return getFieldSchema(schema, name)?.label ?? fallback;
}

export function getFieldDescription(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
): string | undefined {
  return getFieldSchema(schema, name)?.description ?? undefined;
}

export function getFieldOptions(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
): AdminFieldOption[] {
  return getFieldSchema(schema, name)?.options ?? [];
}

export function getFieldOptionSource(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
): AdminFieldOptionSource | undefined {
  return getFieldSchema(schema, name)?.option_source ?? undefined;
}

export function getFieldDefaultValue(
  schema: AdminSchemaDetail | null | undefined,
  name: string,
): AdminFieldSchema["default_value"] | undefined {
  const field = getFieldSchema(schema, name);
  return field ? field.default_value : undefined;
}
