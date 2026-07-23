import { Save, Undo2 } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type {
  AdminConfigExtraFlagFieldName,
  AdminConfigExtraTextFieldName,
} from "./config-field-meta";
import type { AdminConfigFormValues } from "./admin-config-form";
import {
  ConfigTextFieldSurface,
  ConfigToggleFieldSurface,
} from "./admin-config-field-control-surfaces";

type TextFieldName = Extract<
  keyof Omit<AdminConfigFormValues, "extraFlags" | "extraTexts">,
  string
>;

export function TextField(props: {
  compact?: boolean;
  control: UseFormReturn<AdminConfigFormValues>;
  description?: string;
  error?: string;
  inputType?: string;
  label: string;
  name: TextFieldName;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  suffix?: string;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => <ConfigTextFieldSurface {...props} field={field} />}
    />
  );
}

export function BooleanField(props: {
  control: UseFormReturn<AdminConfigFormValues>;
  description?: string;
  error?: string;
  name: TextFieldName;
  readOnly?: boolean;
  required?: boolean;
  title: string;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => (
        <ConfigToggleFieldSurface
          checked={Boolean(field.value)}
          description={props.description}
          error={props.error}
          fieldName={field.name}
          label={props.title}
          readOnly={props.readOnly}
          required={props.required}
          onCheckedChange={field.onChange}
        />
      )}
    />
  );
}

export function ExtraTextField(props: {
  compact?: boolean;
  control: UseFormReturn<AdminConfigFormValues>;
  description?: string;
  error?: string;
  inputType?: string;
  label: string;
  name: `extraTexts.${AdminConfigExtraTextFieldName}`;
  options?: Array<{ label: string; value: string }>;
  readOnly?: boolean;
  renderAs?: "input" | "textarea";
  required?: boolean;
  suffix?: string;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => <ConfigTextFieldSurface {...props} field={field} />}
    />
  );
}

export function ExtraBooleanField(props: {
  control: UseFormReturn<AdminConfigFormValues>;
  description?: string;
  name: `extraFlags.${AdminConfigExtraFlagFieldName}`;
  readOnly?: boolean;
  required?: boolean;
  title: string;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => (
        <ConfigToggleFieldSurface
          checked={Boolean(field.value)}
          description={props.description}
          fieldName={field.name}
          label={props.title}
          readOnly={props.readOnly}
          required={props.required}
          onCheckedChange={field.onChange}
        />
      )}
    />
  );
}

export function ActionBar(props: {
  isBusy: boolean;
  onReset: () => void;
  saveDisabled: boolean;
  saveLabel: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 rounded-sm border border-border bg-card px-3 py-3",
        props.sticky && "xl:sticky xl:top-[6.45rem] xl:z-20",
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={props.onReset}
        disabled={props.isBusy}
      >
        <Undo2 className="h-4 w-4" />
        서버 값으로 되돌리기
      </Button>
      <Button type="submit" disabled={props.isBusy || props.saveDisabled}>
        <Save className="h-4 w-4" />
        {props.saveLabel}
      </Button>
    </div>
  );
}
