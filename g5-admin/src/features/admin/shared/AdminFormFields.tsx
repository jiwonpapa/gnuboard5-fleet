import type { ChangeEventHandler } from "react";
import { type LucideIcon } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "../../../components/ui/input-group";
import {
  FieldShell,
  InfoField,
  ReadOnlyField,
  SelectInputControlField,
  SelectInputField,
  ToggleControlField,
  ToggleField,
} from "./AdminFormFieldSupport";

export {
  InfoField,
  ReadOnlyField,
  SelectInputControlField,
  SelectInputField,
  ToggleControlField,
  ToggleField,
};

export function TextInputField(props: {
  className?: string;
  description?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <FieldShell
      className={props.className}
      description={props.description}
      label={props.label}
    >
      <InputGroup>
        {Icon ? (
          <InputGroupAddon>
            <InputGroupText>
              <Icon className="h-4 w-4" />
            </InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          type={props.type ?? "text"}
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          placeholder={props.placeholder}
        />
      </InputGroup>
    </FieldShell>
  );
}

export function TextAreaInputField(props: {
  className?: string;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <FieldShell
      className={props.className}
      description={props.description}
      label={props.label}
    >
      <InputGroup>
        <InputGroupTextarea
          value={props.value}
          onChange={props.onChange}
          disabled={props.disabled}
          placeholder={props.placeholder}
          rows={props.rows ?? 5}
        />
      </InputGroup>
    </FieldShell>
  );
}

export function TextInputControlField<TFieldValues extends FieldValues>(props: {
  className?: string;
  control: Control<TFieldValues, unknown>;
  description?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
  type?: string;
}) {
  const Icon = props.icon;

  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <FieldShell
          className={props.className}
          description={props.description}
          error={fieldState.error?.message}
          label={props.label}
        >
          <InputGroup>
            {Icon ? (
              <InputGroupAddon>
                <InputGroupText>
                  <Icon className="h-4 w-4" />
                </InputGroupText>
              </InputGroupAddon>
            ) : null}
            <InputGroupInput
              aria-invalid={fieldState.error ? true : undefined}
              type={props.type ?? "text"}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(event) => field.onChange(event.currentTarget.value)}
              onBlur={field.onBlur}
              disabled={props.disabled}
              name={field.name}
              ref={field.ref}
              placeholder={props.placeholder}
            />
          </InputGroup>
        </FieldShell>
      )}
    />
  );
}

export function TextAreaInputControlField<TFieldValues extends FieldValues>(props: {
  className?: string;
  control: Control<TFieldValues, unknown>;
  description?: string;
  disabled?: boolean;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <FieldShell
          className={props.className}
          description={props.description}
          error={fieldState.error?.message}
          label={props.label}
        >
          <InputGroup>
            <InputGroupTextarea
              aria-invalid={fieldState.error ? true : undefined}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(event) => field.onChange(event.currentTarget.value)}
              onBlur={field.onBlur}
              disabled={props.disabled}
              name={field.name}
              ref={field.ref}
              placeholder={props.placeholder}
              rows={props.rows ?? 5}
            />
          </InputGroup>
        </FieldShell>
      )}
    />
  );
}
