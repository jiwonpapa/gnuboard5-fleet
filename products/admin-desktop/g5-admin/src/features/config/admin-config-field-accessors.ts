import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import { getFieldSchema } from "../schema/useAdminFieldSchema";
import type { AdminConfigFieldAccessors } from "./admin-config-renderable";
import { getAdminConfigLegacyFieldOverride } from "./config-legacy-overrides";

const legacyWritableConfigFieldNames = new Set([
  "cf_admin",
  "cf_bbs_rewrite",
  "cf_cert_use",
  "cf_1_subj",
  "cf_2_subj",
  "cf_3_subj",
  "cf_4_subj",
  "cf_5_subj",
  "cf_6_subj",
  "cf_7_subj",
  "cf_8_subj",
  "cf_9_subj",
  "cf_10_subj",
  "cf_1",
  "cf_2",
  "cf_3",
  "cf_4",
  "cf_5",
  "cf_6",
  "cf_7",
  "cf_8",
  "cf_9",
  "cf_10",
  "cf_icon_level",
  "cf_social_login_use",
  "cf_use_member_icon",
]);

export function createAdminConfigFieldAccessors(props: {
  fieldDescription: (name: string) => string | undefined;
  fieldLabel: (name: string, fallback: string) => string;
  fieldOptions: (name: string) => Array<{ label: string; value: string }> | undefined;
  fieldRequired: (name: string) => boolean;
  fieldSchema: AdminSchemaDetail | null;
}): AdminConfigFieldAccessors {
  return {
    description: props.fieldDescription,
    compact: (name) =>
      getAdminConfigLegacyFieldOverride(name)?.compact
      ?? normalizeAdminConfigFieldInputType(getFieldSchema(props.fieldSchema, name), name)
        === "number",
    inputType: (name) =>
      normalizeAdminConfigFieldInputType(getFieldSchema(props.fieldSchema, name), name),
    label: props.fieldLabel,
    options: props.fieldOptions,
    renderAsExtraText: (field) =>
      getFieldSchema(props.fieldSchema, field)?.input_type === "textarea"
        ? "textarea"
        : "input",
    readonly: (name) =>
      legacyWritableConfigFieldNames.has(name)
      || getAdminConfigLegacyFieldOverride(name)?.forceWritable === true
        ? false
        : getFieldSchema(props.fieldSchema, name)?.readonly_on_update === true,
    required: props.fieldRequired,
    suffix: (name) => getAdminConfigLegacyFieldOverride(name)?.suffix,
  };
}

function normalizeAdminConfigFieldInputType(
  fieldSchema: AdminFieldSchema | null,
  name: string,
) {
  const inputType = getAdminConfigLegacyFieldOverride(name)?.inputType ?? fieldSchema?.input_type;
  switch (inputType) {
    case "checkbox":
    case "radio":
    case "select":
    case "number":
    case "password":
    case "date":
    case "datetime-local":
      return inputType;
    default:
      return fieldSchema?.data_type === "integer" ? "number" : undefined;
  }
}
