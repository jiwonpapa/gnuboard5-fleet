import type {
  ChangeEventHandler,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

function FieldShell(props: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <label className="admin-field">
      <span>{props.label}</span>
      {props.children}
      {props.description ? <small>{props.description}</small> : null}
    </label>
  );
}

export function TextInputField(props: {
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <FieldShell description={props.description} label={props.label}>
      <input
        disabled={props.disabled}
        onChange={props.onChange}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value}
      />
    </FieldShell>
  );
}

export function TextAreaInputField(props: {
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  rows?: number;
  value: string;
}) {
  return (
    <FieldShell description={props.description} label={props.label}>
      <textarea
        disabled={props.disabled}
        onChange={props.onChange}
        rows={props.rows ?? 4}
        value={props.value}
      />
    </FieldShell>
  );
}

export function SelectInputField(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    description?: string;
    label: string;
  },
) {
  const { description, label, ...selectProps } = props;
  return (
    <FieldShell description={description} label={label}>
      <select {...selectProps} />
    </FieldShell>
  );
}

export function ToggleField(props: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <FieldShell description={props.description} label={props.label}>
      <input
        checked={props.checked}
        onChange={props.onChange}
        type="checkbox"
      />
    </FieldShell>
  );
}
