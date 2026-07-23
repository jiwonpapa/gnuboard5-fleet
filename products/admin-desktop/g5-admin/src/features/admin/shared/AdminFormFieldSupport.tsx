import type { ChangeEventHandler, ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Badge } from "../../../components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../../components/ui/input-group";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { cn } from "../../../lib/utils";
import { useTheme } from "../../layout/theme";

const fieldSelectClass =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80";

const fieldSelectInvalidClass =
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

type SelectOption = { label: string; value: string };

export function SelectInputField(props: {
  className?: string;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  options: SelectOption[];
  value: string;
}) {
  return (
    <FieldShell
      className={props.className}
      description={props.description}
      label={props.label}
    >
      <select
        disabled={props.disabled}
        value={props.value}
        onChange={props.onChange}
        className={fieldSelectClass}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SelectInputControlField<TFieldValues extends FieldValues>(props: {
  className?: string;
  control: Control<TFieldValues, unknown>;
  description?: string;
  disabled?: boolean;
  label: string;
  name: FieldPath<TFieldValues>;
  options: SelectOption[];
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
          <select
            aria-invalid={fieldState.error ? true : undefined}
            disabled={props.disabled}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.currentTarget.value)}
            className={cn(
              fieldSelectClass,
              fieldState.error ? fieldSelectInvalidClass : undefined,
            )}
          >
            {props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
      )}
    />
  );
}

export function ToggleField(props: {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card/96 px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-foreground">{props.label}</Label>
        <FieldMessage className="mt-1" description={props.description} />
      </div>
      <Switch
        checked={props.checked}
        disabled={props.disabled}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  );
}

export function ToggleControlField<TFieldValues extends FieldValues>(props: {
  control: Control<TFieldValues, unknown>;
  description?: string;
  disabled?: boolean;
  label: string;
  name: FieldPath<TFieldValues>;
}) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card/96 px-4 py-3">
          <div className="min-w-0">
            <Label className="text-sm font-medium text-foreground">{props.label}</Label>
            <FieldMessage
              className="mt-1"
              description={props.description}
              error={fieldState.error?.message}
            />
          </div>
          <Switch
            checked={Boolean(field.value)}
            disabled={props.disabled}
            onCheckedChange={field.onChange}
          />
        </div>
      )}
    />
  );
}

export function InfoField(props: {
  className?: string;
  label: string;
  value: string | number | null | undefined;
}) {
  const { devMode } = useTheme();

  if (!devMode && isDebugInfoLabel(props.label)) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/96 px-4 py-3",
        props.className,
      )}
    >
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-2 text-sm leading-6 break-words text-foreground">
        {props.value !== null &&
        props.value !== undefined &&
        String(props.value).length > 0
          ? String(props.value)
          : "-"}
      </p>
    </div>
  );
}

export function ReadOnlyField(props: {
  className?: string;
  description?: string;
  label: string;
  value: string | number | null | undefined;
}) {
  const resolvedValue =
    props.value !== null && props.value !== undefined && String(props.value).length > 0
      ? String(props.value)
      : "-";

  return (
    <FieldShell
      className={props.className}
      description={props.description}
      label={props.label}
      readOnly
    >
      <InputGroup className="border-dashed bg-muted/20">
        <InputGroupAddon>
          <InputGroupText>
            <LockKeyhole className="h-4 w-4" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          readOnly
          aria-readonly="true"
          className="font-medium text-foreground"
          value={resolvedValue}
        />
      </InputGroup>
    </FieldShell>
  );
}

function isDebugInfoLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return (
    normalizedLabel === "request_id" ||
    normalizedLabel === "correlation_id" ||
    normalizedLabel === "server_request_id" ||
    normalizedLabel.endsWith("request_id") ||
    normalizedLabel.endsWith("correlation_id") ||
    normalizedLabel.endsWith("server_request_id")
  );
}

export function FieldShell(props: {
  children: ReactNode;
  className?: string;
  description?: string;
  error?: string;
  label: string;
  readOnly?: boolean;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm", props.className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-medium tracking-tight text-foreground">{props.label}</span>
        {props.readOnly ? (
          <Badge variant="outline" className="h-5 rounded-md px-2 text-[0.68rem]">
            읽기 전용
          </Badge>
        ) : null}
      </div>
      {props.children}
      <FieldMessage description={props.description} error={props.error} />
    </label>
  );
}

function FieldMessage(props: {
  className?: string;
  description?: string;
  error?: string;
}) {
  if (!props.description && !props.error) {
    return null;
  }

  return (
    <div className={cn("grid gap-1", props.className)}>
      {props.description ? (
        <span className="text-xs leading-5 break-words text-muted-foreground">
          {props.description}
        </span>
      ) : null}
      {props.error ? (
        <span className="text-xs font-medium leading-5 break-words text-destructive">
          {props.error}
        </span>
      ) : null}
    </div>
  );
}
