import { cn } from "../../lib/utils";

export function ChoiceCheckboxGroup(props: {
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const selectedValues = new Set(splitChoiceValues(props.value));

  return (
    <div className="space-y-2 rounded-sm border border-border bg-card px-3 py-3">
      {props.options.map((option) => {
        const checkboxId = `${props.id}-${option.value || "empty"}`;
        const checked = selectedValues.has(option.value);

        return (
          <label
            key={checkboxId}
            className={cn(
              "flex items-center gap-2 text-sm text-foreground",
              props.disabled && "cursor-not-allowed opacity-70",
            )}
            htmlFor={checkboxId}
          >
            <input
              checked={checked}
              className="h-4 w-4 rounded border border-input text-primary"
              disabled={props.disabled}
              id={checkboxId}
              onChange={(event) =>
                props.onChange(
                  mergeChoiceValues(props.value, option.value, event.target.checked),
                )
              }
              type="checkbox"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ChoiceRadioGroup(props: {
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border bg-card px-3 py-3">
      {props.options.map((option) => {
        const radioId = `${props.id}-${option.value || "empty"}`;
        const checked = props.value === option.value;

        return (
          <label
            key={radioId}
            className={cn(
              "flex items-center gap-2 text-sm text-foreground",
              props.disabled && "cursor-not-allowed opacity-70",
            )}
            htmlFor={radioId}
          >
            <input
              checked={checked}
              className="h-4 w-4 border border-input text-primary"
              disabled={props.disabled}
              id={radioId}
              name={props.id}
              onChange={() => props.onChange(option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function splitChoiceValues(value: string) {
  if (value.trim().length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function mergeChoiceValues(currentValue: string, nextValue: string, checked: boolean) {
  const selectedValues = splitChoiceValues(currentValue);

  if (checked) {
    if (!selectedValues.includes(nextValue)) {
      selectedValues.push(nextValue);
    }
    return selectedValues.join(",");
  }

  return selectedValues.filter((value) => value !== nextValue).join(",");
}
