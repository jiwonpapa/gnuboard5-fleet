import { Controller } from "react-hook-form";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { MemberForm } from "./member-detail-shared";

export function TextControl(props: {
  control: MemberForm;
  description?: string | null;
  disabled: boolean;
  label: string;
  name:
    | "mb_1"
    | "mb_2"
    | "mb_3"
    | "mb_4"
    | "mb_5"
    | "mb_6"
    | "mb_7"
    | "mb_8"
    | "mb_9"
    | "mb_10"
    | "mb_name"
    | "mb_nick"
    | "mb_email"
    | "mb_homepage"
    | "mb_hp"
    | "mb_tel"
    | "mb_zip"
    | "mb_addr1"
    | "mb_addr2"
    | "mb_addr3"
    | "mb_addr_jibeon"
    | "mb_password"
    | "mb_leave_date"
    | "mb_intercept_date";
  placeholder: string;
}) {
  const error = props.control.formState.errors[props.name]?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={props.name}>{props.label}</Label>
      <Input
        id={props.name}
        placeholder={props.placeholder}
        disabled={props.disabled}
        {...props.control.register(props.name)}
      />
      {props.description ? <p className="text-xs text-muted-foreground">{props.description}</p> : null}
      {typeof error === "string" ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function TextAreaControl(props: {
  control: MemberForm;
  description?: string | null;
  disabled: boolean;
  label: string;
  name: "mb_memo" | "mb_profile" | "mb_signature";
  placeholder: string;
}) {
  const error = props.control.formState.errors[props.name]?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={props.name}>{props.label}</Label>
      <Textarea
        id={props.name}
        rows={5}
        placeholder={props.placeholder}
        disabled={props.disabled}
        {...props.control.register(props.name)}
      />
      {props.description ? <p className="text-xs text-muted-foreground">{props.description}</p> : null}
      {typeof error === "string" ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ChoiceControl(props: {
  control: MemberForm;
  description?: string | null;
  disabled: boolean;
  label: string;
  name: "mb_certify";
  options: Array<{ label: string; value: string }>;
  presentation?: "radio" | "select";
}) {
  const error = props.control.formState.errors[props.name]?.message;
  const presentation = props.presentation ?? "select";

  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => {
        const normalizedValue =
          typeof field.value === "string" ? field.value : String(field.value ?? "");
        const options = props.options.some((option) => option.value === normalizedValue)
          ? props.options
          : normalizedValue === "admin"
            ? [{ label: "관리자 수정", value: "admin" }, ...props.options]
            : props.options;

        if (presentation === "radio") {
          return (
            <fieldset className="space-y-3 rounded-xl border border-border bg-background px-4 py-3">
              <legend className="block break-words text-sm text-foreground">{props.label}</legend>
              {props.description ? (
                <p className="text-xs text-muted-foreground">{props.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-4">
                {options.map((option) => {
                  const radioId = `${props.name}-${option.value || "empty"}`;
                  return (
                    <label
                      key={radioId}
                      className="flex items-center gap-2 text-sm text-foreground"
                      htmlFor={radioId}
                    >
                      <input
                        checked={normalizedValue === option.value}
                        className="h-4 w-4 border border-input text-primary"
                        disabled={props.disabled}
                        id={radioId}
                        name={props.name}
                        onChange={() => field.onChange(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {typeof error === "string" ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </fieldset>
          );
        }

        return (
          <div className="space-y-2">
            <Label htmlFor={props.name}>{props.label}</Label>
            <select
              id={props.name}
              disabled={props.disabled}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={normalizedValue}
              onChange={(event) => field.onChange(event.currentTarget.value)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {props.description ? (
              <p className="text-xs text-muted-foreground">{props.description}</p>
            ) : null}
            {typeof error === "string" ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}

export function BooleanChoiceControl(props: {
  control: MemberForm;
  description?: string | null;
  disabled: boolean;
  label: string;
  name:
    | "mb_mailling"
    | "mb_sms"
    | "mb_marketing_agree"
    | "mb_thirdparty_agree"
    | "mb_adult"
    | "mb_open";
  options?: Array<{ label: string; value: string }>;
}) {
  return (
    <Controller
      control={props.control.control}
      name={props.name}
      render={({ field }) => (
        <fieldset className="space-y-3 rounded-xl border border-border bg-background px-4 py-3">
          <legend className="block break-words text-sm text-foreground">{props.label}</legend>
          {props.description ? (
            <p className="text-xs text-muted-foreground">{props.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            {(props.options && props.options.length > 0
              ? props.options
              : [
                  { label: "예", value: "1" },
                  { label: "아니오", value: "0" },
                ]
            ).map((option) => {
              const checkedValue = field.value ? "1" : "0";
              const radioId = `${props.name}-${option.value || "empty"}`;
              return (
                <label
                  key={radioId}
                  className="flex items-center gap-2 text-sm text-foreground"
                  htmlFor={radioId}
                >
                  <input
                    checked={checkedValue === option.value}
                    className="h-4 w-4 border border-input text-primary"
                    disabled={props.disabled}
                    id={radioId}
                    name={props.name}
                    onChange={() => field.onChange(option.value === "1")}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    />
  );
}
