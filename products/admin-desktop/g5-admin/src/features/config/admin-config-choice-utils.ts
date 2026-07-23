export function buildSelectOptions(
  options: Array<{ label: string; value: string }> | undefined,
  currentValue: string,
) {
  if (options && options.length > 0) {
    if (currentValue.trim().length === 0 || options.some((option) => option.value === currentValue)) {
      return options;
    }

    return [...options, { value: currentValue, label: currentValue }];
  }

  if (currentValue.trim().length > 0) {
    return [{ value: currentValue, label: currentValue }];
  }

  return [{ value: "", label: "선택" }];
}

export function isChoiceField(inputType?: string) {
  return inputType === "radio" || inputType === "select" || inputType === "checkbox";
}

export function resolveInputTypeForTextControl(inputType?: string) {
  return isChoiceField(inputType) ? undefined : inputType;
}
