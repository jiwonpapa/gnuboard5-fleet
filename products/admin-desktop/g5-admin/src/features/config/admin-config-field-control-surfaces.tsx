import { Info } from "lucide-react";
import type { FieldPath } from "react-hook-form";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";
import type { AdminConfigFormValues } from "./admin-config-form";
import {
  ChoiceCheckboxGroup,
  ChoiceRadioGroup,
} from "./admin-config-choice-controls";
import {
  buildSelectOptions,
  isChoiceField,
  resolveInputTypeForTextControl,
} from "./admin-config-choice-utils";

type ControlledField = {
  name: FieldPath<AdminConfigFormValues>;
  onBlur: () => void;
  onChange: (...event: unknown[]) => void;
  ref: (...args: unknown[]) => void;
  value: unknown;
};

export function ConfigTextFieldSurface(props: {
  compact?: boolean;
  description?: string;
  error?: string;
  field: ControlledField;
  inputType?: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  readOnly?: boolean;
  renderAs?: "input" | "textarea";
  required?: boolean;
  suffix?: string;
}) {
  return renderConfigTextFieldSurface(props);
}

export function ConfigToggleFieldSurface(props: {
  checked: boolean;
  description?: string;
  error?: string;
  fieldName: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  readOnly?: boolean;
  required?: boolean;
}) {
  return renderConfigToggleFieldSurface(props);
}

function renderConfigTextFieldSurface(params: {
  compact?: boolean;
  description?: string;
  error?: string;
  field: ControlledField;
  inputType?: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  readOnly?: boolean;
  renderAs?: "input" | "textarea";
  required?: boolean;
  suffix?: string;
}) {
  const selectOptions = buildSelectOptions(
    params.options,
    typeof params.field.value === "string" ? params.field.value : "",
  );
  const controlClassName = params.compact ? "w-28 sm:w-32" : undefined;

  return (
    <div className="space-y-2">
      <FieldLabelText
        htmlFor={params.field.name}
        label={params.label}
        readOnly={params.readOnly}
        required={params.required}
      />
      {params.renderAs === "textarea" ? (
        <Textarea
          aria-invalid={params.error ? true : undefined}
          disabled={params.readOnly}
          id={params.field.name}
          required={params.required}
          value={typeof params.field.value === "string" ? params.field.value : ""}
          onBlur={params.field.onBlur}
          onChange={params.field.onChange}
          ref={params.field.ref}
          rows={5}
        />
      ) : params.inputType === "checkbox" && params.options && params.options.length > 0 ? (
        <ChoiceCheckboxGroup
          disabled={params.readOnly}
          id={params.field.name}
          onChange={params.field.onChange}
          options={params.options}
          value={typeof params.field.value === "string" ? params.field.value : ""}
        />
      ) : params.inputType === "radio" && params.options && params.options.length > 0 ? (
        <ChoiceRadioGroup
          disabled={params.readOnly}
          id={params.field.name}
          onChange={params.field.onChange}
          options={params.options}
          value={typeof params.field.value === "string" ? params.field.value : ""}
        />
      ) : params.inputType === "select" ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-invalid={params.error ? true : undefined}
            className={cn("ui-select-base", controlClassName)}
            disabled={params.readOnly}
            id={params.field.name}
            required={params.required}
            value={typeof params.field.value === "string" ? params.field.value : ""}
            onBlur={params.field.onBlur}
            onChange={params.field.onChange}
            ref={params.field.ref}
          >
            {selectOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldSuffix suffix={params.suffix} />
        </div>
      ) : params.readOnly
        && isChoiceField(params.inputType)
        && typeof params.field.value === "string" ? (
        <ReadOnlyValueSurface
          emptyLabel="현재 값 비노출 또는 선택지 메타 대기 중"
          value={params.field.value}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-invalid={params.error ? true : undefined}
            className={controlClassName}
            disabled={params.readOnly}
            id={params.field.name}
            placeholder={params.placeholder}
            required={params.required}
            type={resolveInputTypeForTextControl(params.inputType)}
            value={typeof params.field.value === "string" ? params.field.value : ""}
            onBlur={params.field.onBlur}
            onChange={params.field.onChange}
            ref={params.field.ref}
          />
          <FieldSuffix suffix={params.suffix} />
        </div>
      )}
      <FieldHint description={params.description} />
      {params.error ? <p className="text-xs text-destructive">{params.error}</p> : null}
    </div>
  );
}

function renderConfigToggleFieldSurface(params: {
  checked: boolean;
  description?: string;
  error?: string;
  fieldName: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div
      className={cn(
        "config-toggle-field",
        params.description ? "items-start" : "items-center py-2.5",
      )}
    >
      <div className="min-w-0">
        <FieldLabelText
          htmlFor={params.fieldName}
          label={params.label}
          readOnly={params.readOnly}
          required={params.required}
        />
        <FieldHint className="mt-2" description={params.description} />
        {params.error ? <p className="mt-2 text-xs text-destructive">{params.error}</p> : null}
      </div>
      <Switch
        checked={params.checked}
        disabled={params.readOnly}
        id={params.fieldName}
        onCheckedChange={params.onCheckedChange}
      />
    </div>
  );
}

function FieldLabelText(props: {
  htmlFor: string;
  label: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      {props.readOnly ? (
        <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
          읽기 전용
        </span>
      ) : null}
      {props.required ? (
        <span className="rounded-sm border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 text-[0.72rem] font-medium text-destructive">
          필수
        </span>
      ) : null}
    </div>
  );
}

function FieldHint(props: { className?: string; description?: string }) {
  if (!props.description) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-sm border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[0.8rem] leading-5 text-muted-foreground",
        props.className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="break-words">{props.description}</span>
    </div>
  );
}

function FieldSuffix(props: { suffix?: string }) {
  return props.suffix ? (
    <span className="text-sm text-muted-foreground">{props.suffix}</span>
  ) : null;
}

function ReadOnlyValueSurface(props: { emptyLabel: string; value: string }) {
  return (
    <div className="rounded-sm border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
      {props.value.trim().length > 0 ? props.value : props.emptyLabel}
    </div>
  );
}
