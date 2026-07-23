import type { UseFormReturn } from "react-hook-form";
import type {
  AdminConfigFieldAccessors,
  AdminConfigRenderableField,
  AdminConfigRenderableTab,
} from "./admin-config-renderable";
import type { AdminConfigFormValues } from "./admin-config-form";
import {
  BooleanField,
  ExtraBooleanField,
  ExtraTextField,
  TextField,
} from "./admin-config-field-controls";

export function AdminConfigEditorTabContent(props: {
  fieldAccessors: AdminConfigFieldAccessors;
  form: UseFormReturn<AdminConfigFormValues>;
  tab: AdminConfigRenderableTab;
}) {
  return (
    <div className="config-editor-tab-stack space-y-4">
      {props.tab.sections.map((section) => (
        <section
          key={section.id}
          className="config-editor-section-card space-y-4 rounded-sm border border-border bg-card px-4 py-4"
        >
          {props.tab.sections.length > 1 || section.description ? (
            <div className="space-y-1">
              {props.tab.sections.length > 1 ? (
                <h3 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h3>
              ) : null}
              {section.description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
            </div>
          ) : null}

          {section.id === "anc_cf_extra" ? (
            <div className="config-extra-field-list space-y-3">
              {buildExtraFieldPairs(section.fields).map((pair) => (
                <div
                  key={`extra-${pair.index}`}
                  className="config-extra-field-row grid gap-4 rounded-sm border border-border/70 bg-background/60 px-4 py-4 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div className="flex items-center text-sm font-medium text-foreground">
                    {`여분필드${pair.index}`}
                  </div>
                  {pair.titleField ? (
                    <ExtraTextField
                      compact={props.fieldAccessors.compact(pair.titleField.name)}
                      control={props.form}
                      description={props.fieldAccessors.description(pair.titleField.name)}
                      error={props.form.formState.errors.extraTexts?.[pair.titleField.name]?.message}
                      inputType={props.fieldAccessors.inputType(pair.titleField.name)}
                      key={`${pair.titleField.name}-title`}
                      label={`여분필드${pair.index} 제목`}
                      name={`extraTexts.${pair.titleField.name}` as const}
                      options={props.fieldAccessors.options(pair.titleField.name)}
                      readOnly={props.fieldAccessors.readonly(pair.titleField.name)}
                      renderAs={props.fieldAccessors.renderAsExtraText(pair.titleField.name)}
                      required={props.fieldAccessors.required(pair.titleField.name)}
                      suffix={props.fieldAccessors.suffix(pair.titleField.name)}
                    />
                  ) : null}
                  {pair.valueField ? (
                    <ExtraTextField
                      compact={props.fieldAccessors.compact(pair.valueField.name)}
                      control={props.form}
                      description={props.fieldAccessors.description(pair.valueField.name)}
                      error={props.form.formState.errors.extraTexts?.[pair.valueField.name]?.message}
                      inputType={props.fieldAccessors.inputType(pair.valueField.name)}
                      key={`${pair.valueField.name}-value`}
                      label={`여분필드${pair.index} 값`}
                      name={`extraTexts.${pair.valueField.name}` as const}
                      options={props.fieldAccessors.options(pair.valueField.name)}
                      readOnly={props.fieldAccessors.readonly(pair.valueField.name)}
                      renderAs={props.fieldAccessors.renderAsExtraText(pair.valueField.name)}
                      required={props.fieldAccessors.required(pair.valueField.name)}
                      suffix={props.fieldAccessors.suffix(pair.valueField.name)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="config-editor-section-grid grid gap-6 xl:grid-cols-2">
              {section.fields.map((field) =>
                renderConfigField(field, props.form, props.fieldAccessors),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function buildExtraFieldPairs(fields: ReadonlyArray<AdminConfigRenderableField>) {
  const pairs = new Map<
    number,
    {
      index: number;
      titleField?: Extract<AdminConfigRenderableField, { kind: "extra-text" }>;
      valueField?: Extract<AdminConfigRenderableField, { kind: "extra-text" }>;
    }
  >();

  for (const field of fields) {
    if (field.kind !== "extra-text") {
      continue;
    }

    const match = /^cf_(\d+)(?:(_subj))?$/.exec(field.name);
    if (!match) {
      continue;
    }

    const index = Number(match[1]);
    const current = pairs.get(index) ?? { index };
    if (match[2] === "_subj") {
      current.titleField = field;
    } else {
      current.valueField = field;
    }
    pairs.set(index, current);
  }

  return Array.from(pairs.values()).sort((left, right) => left.index - right.index);
}

function renderConfigField(
  field: AdminConfigRenderableField,
  form: UseFormReturn<AdminConfigFormValues>,
  fieldAccessors: AdminConfigFieldAccessors,
) {
  switch (field.kind) {
    case "text":
      return (
        <TextField
          compact={fieldAccessors.compact(field.name)}
          key={field.name}
          control={form}
          description={fieldAccessors.description(field.name)}
          error={form.formState.errors[field.name]?.message as string | undefined}
          inputType={fieldAccessors.inputType(field.name)}
          label={fieldAccessors.label(field.name, field.fallbackLabel)}
          name={field.name}
          options={fieldAccessors.options(field.name)}
          placeholder={field.placeholder}
          readOnly={fieldAccessors.readonly(field.name)}
          required={fieldAccessors.required(field.name)}
          suffix={fieldAccessors.suffix(field.name)}
        />
      );
    case "boolean":
      return (
        <BooleanField
          key={field.name}
          control={form}
          description={fieldAccessors.description(field.name)}
          error={form.formState.errors[field.name]?.message as string | undefined}
          name={field.name}
          readOnly={fieldAccessors.readonly(field.name)}
          required={fieldAccessors.required(field.name)}
          title={fieldAccessors.label(field.name, field.fallbackLabel)}
        />
      );
    case "extra-text":
      return (
        <ExtraTextField
          compact={fieldAccessors.compact(field.name)}
          key={field.name}
          control={form}
          description={fieldAccessors.description(field.name)}
          error={form.formState.errors.extraTexts?.[field.name]?.message}
          inputType={fieldAccessors.inputType(field.name)}
          label={fieldAccessors.label(field.name, field.fallbackLabel)}
          name={`extraTexts.${field.name}` as const}
          options={fieldAccessors.options(field.name)}
          readOnly={fieldAccessors.readonly(field.name)}
          renderAs={fieldAccessors.renderAsExtraText(field.name)}
          required={fieldAccessors.required(field.name)}
          suffix={fieldAccessors.suffix(field.name)}
        />
      );
    case "extra-boolean":
      return (
        <ExtraBooleanField
          key={field.name}
          control={form}
          description={fieldAccessors.description(field.name)}
          name={`extraFlags.${field.name}` as const}
          readOnly={fieldAccessors.readonly(field.name)}
          required={fieldAccessors.required(field.name)}
          title={fieldAccessors.label(field.name, field.fallbackLabel)}
        />
      );
  }
}
