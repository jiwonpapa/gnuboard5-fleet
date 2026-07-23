import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import type { AdminSchemaDetailResponse } from "../../types/AdminSchemaDetailResponse";

type PartialSection = {
  key?: string;
  label?: string;
  order?: number;
  description?: string | null;
  fields?: Array<Partial<AdminFieldSchema> & { name: string }>;
};

type PartialSchemaResponse = {
  schema: {
    domain?: string;
    title?: string;
    legacy_form?: string;
    field_count?: number;
    section_count?: number;
    generated_at?: string;
    layout?: AdminSchemaDetailResponse["schema"]["layout"];
    sections?: PartialSection[];
    fields_by_name: Record<string, Partial<AdminFieldSchema>>;
  };
  request_id?: string;
  correlation_id?: string;
  server_request_id?: string | null;
};

function completeField(name: string, field: Partial<AdminFieldSchema>): AdminFieldSchema {
  return {
    name,
    label: field.label ?? name,
    input_type: field.input_type ?? "text",
    data_type: field.data_type ?? "string",
    required: field.required ?? false,
    create_only: field.create_only ?? false,
    readonly_on_update: field.readonly_on_update ?? false,
    description: field.description ?? null,
    default_value: field.default_value ?? null,
    options: field.options ?? [],
    ...(field.option_source === undefined
      ? {}
      : { option_source: field.option_source }),
  };
}

/**
 * Page tests may focus on only a few schema fields, but the production query
 * rejects incomplete provider DTOs. Complete those focused fixtures without
 * bypassing the same fail-closed validator used by the application.
 */
export function completeAdminSchemaResponseForTest(
  domain: string,
  response: PartialSchemaResponse,
): AdminSchemaDetailResponse {
  const rawFields = new Map<string, Partial<AdminFieldSchema>>(
    Object.entries(response.schema.fields_by_name),
  );
  for (const section of response.schema.sections ?? []) {
    for (const field of section.fields ?? []) {
      rawFields.set(field.name, { ...rawFields.get(field.name), ...field });
    }
  }

  const fieldsByName = Object.fromEntries(
    [...rawFields.entries()].map(([name, field]) => [name, completeField(name, field)]),
  );
  const assigned = new Set<string>();
  const sections = (response.schema.sections ?? []).map((section, index) => {
    const fields = (section.fields ?? [])
      .filter((field) => !assigned.has(field.name))
      .map((field) => {
        assigned.add(field.name);
        return fieldsByName[field.name];
      });
    return {
      key: section.key ?? `test-${index + 1}`,
      label: section.label ?? `test-${index + 1}`,
      order: section.order ?? index + 1,
      description: section.description ?? null,
      fields,
    };
  });
  const unassigned = Object.keys(fieldsByName)
    .filter((name) => !assigned.has(name))
    .map((name) => fieldsByName[name]);
  if (sections.length === 0) {
    sections.push({
      key: "test",
      label: "test",
      order: 1,
      description: null,
      fields: unassigned,
    });
  } else {
    sections[0].fields.push(...unassigned);
  }

  return {
    schema: {
      domain,
      title: response.schema.title ?? domain,
      legacy_form: response.schema.legacy_form ?? `${domain}.php`,
      field_count: Object.keys(fieldsByName).length,
      section_count: sections.length,
      generated_at: response.schema.generated_at ?? "2026-07-15T00:00:00Z",
      layout: response.schema.layout ?? null,
      sections,
      fields_by_name: fieldsByName,
    },
    request_id: response.request_id ?? `req-${domain}-schema`,
    correlation_id: response.correlation_id ?? `corr-${domain}-schema`,
    server_request_id: response.server_request_id ?? null,
  };
}
