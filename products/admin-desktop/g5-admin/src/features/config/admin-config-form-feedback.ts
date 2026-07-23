import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors, FieldPath, UseFormReturn } from "react-hook-form";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminFieldSchema } from "../../types/AdminFieldSchema";
import type { AdminConfigRenderableTab } from "./admin-config-renderable";
import {
  emptyAdminConfigFormValues,
  type AdminConfigFormValues,
} from "./admin-config-form";
import {
  isAdminConfigExtraFlagFieldName,
  isAdminConfigExtraTextFieldName,
  type AdminConfigExtraFlagFieldName,
  type AdminConfigExtraTextFieldName,
} from "./config-field-meta";

export function useAdminConfigFieldNavigation(params: {
  form: UseFormReturn<AdminConfigFormValues>;
  tabs: ReadonlyArray<AdminConfigRenderableTab>;
}) {
  const [selectedTabId, setSelectedTabId] = useState(params.tabs[0]?.id ?? "");
  const pendingFocusPathRef = useRef<FieldPath<AdminConfigFormValues> | null>(null);
  const activeTabId = useMemo(() => {
    if (
      selectedTabId.length > 0
      && params.tabs.some((tab) => tab.id === selectedTabId)
    ) {
      return selectedTabId;
    }

    return params.tabs[0]?.id ?? "";
  }, [params.tabs, selectedTabId]);
  const fieldTabIdByName = useMemo(
    () => buildFieldTabIdMap(params.tabs),
    [params.tabs],
  );

  useEffect(() => {
    if (!pendingFocusPathRef.current) {
      return;
    }

    const fieldPath = pendingFocusPathRef.current;
    const focusField = () => {
      params.form.setFocus(fieldPath);
      const target = document.querySelector<HTMLElement>(
        `[name="${String(fieldPath)}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const frameId = window.requestAnimationFrame(focusField);
    pendingFocusPathRef.current = null;
    return () => window.cancelAnimationFrame(frameId);
  }, [activeTabId, params.form]);

  const focusInvalidField = (fieldName: string) => {
    const tabId = fieldTabIdByName.get(fieldName);
    if (tabId) {
      setSelectedTabId(tabId);
    }

    const fieldPath = resolveConfigFieldPath(fieldName);
    if (!fieldPath) {
      return;
    }

    pendingFocusPathRef.current = fieldPath;
  };

  const handleInvalidSubmit = (errors: FieldErrors<AdminConfigFormValues>) => {
    const firstInvalidPath = findFirstInvalidFieldPath(errors);
    if (!firstInvalidPath) {
      return;
    }

    const fieldName = resolveConfigFieldNameFromPath(firstInvalidPath);
    if (!fieldName) {
      return;
    }

    focusInvalidField(fieldName);
  };

  return {
    activeTabId,
    focusInvalidField,
    handleInvalidSubmit,
    setActiveTabId: setSelectedTabId,
  };
}

export function validateAdminConfigSubmission(
  form: UseFormReturn<AdminConfigFormValues>,
  schema: AdminSchemaDetail | null,
  values: AdminConfigFormValues,
) {
  if (!schema) {
    return { isValid: true as const, firstInvalidFieldName: null };
  }

  form.clearErrors();

  let isValid = true;
  let firstInvalidFieldName: string | null = null;
  for (const field of Object.values(schema.fields_by_name)) {
    const path = resolveConfigFieldPath(field.name);
    if (!path) {
      continue;
    }

    const rawValue = readConfigFieldValue(values, field.name);
    if (field.required && requiresNonEmptyValue(field) && isBlankValue(rawValue)) {
      form.setError(path, {
        type: "required",
        message: `${field.label} 항목은 비워둘 수 없습니다.`,
      });
      isValid = false;
      firstInvalidFieldName ??= field.name;
      continue;
    }

    if (
      field.data_type === "integer"
      && typeof rawValue === "string"
      && rawValue.trim().length > 0
      && !/^-?\d+$/.test(rawValue.trim())
    ) {
      form.setError(path, {
        type: "validate",
        message: `${field.label} 항목은 숫자만 입력할 수 있습니다.`,
      });
      isValid = false;
      firstInvalidFieldName ??= field.name;
    }
  }

  return { isValid, firstInvalidFieldName };
}

function buildFieldTabIdMap(tabs: ReadonlyArray<AdminConfigRenderableTab>) {
  const fieldTabIdByName = new Map<string, string>();

  for (const tab of tabs) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        fieldTabIdByName.set(field.name, tab.id);
      }
    }
  }

  return fieldTabIdByName;
}

function findFirstInvalidFieldPath(
  errors: FieldErrors<AdminConfigFormValues>,
): string | null {
  const queue = Object.entries(errors).map(([path, value]) => ({
    path,
    value,
  }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !current.value) {
      continue;
    }

    if (typeof current.value === "object" && "message" in current.value) {
      return current.path;
    }

    if (typeof current.value === "object") {
      queue.unshift(
        ...Object.entries(current.value).map(([path, value]) => ({
          path: `${current.path}.${path}`,
          value,
        })),
      );
    }
  }

  return null;
}

function resolveConfigFieldNameFromPath(path: string): string | null {
  if (path.startsWith("extraTexts.")) {
    return path.slice("extraTexts.".length);
  }

  if (path.startsWith("extraFlags.")) {
    return path.slice("extraFlags.".length);
  }

  return path.length > 0 ? path : null;
}

function resolveConfigFieldPath(name: string): FieldPath<AdminConfigFormValues> | null {
  if (isAdminConfigExtraTextFieldName(name as AdminConfigExtraTextFieldName)) {
    return `extraTexts.${name}` as FieldPath<AdminConfigFormValues>;
  }

  if (isAdminConfigExtraFlagFieldName(name as AdminConfigExtraFlagFieldName)) {
    return `extraFlags.${name}` as FieldPath<AdminConfigFormValues>;
  }

  return Object.prototype.hasOwnProperty.call(emptyAdminConfigFormValues, name)
    ? (name as FieldPath<AdminConfigFormValues>)
    : null;
}

function readConfigFieldValue(values: AdminConfigFormValues, name: string) {
  if (isAdminConfigExtraTextFieldName(name as AdminConfigExtraTextFieldName)) {
    return values.extraTexts[name as AdminConfigExtraTextFieldName];
  }

  if (isAdminConfigExtraFlagFieldName(name as AdminConfigExtraFlagFieldName)) {
    return values.extraFlags[name as AdminConfigExtraFlagFieldName];
  }

  if (!(name in values)) {
    return undefined;
  }

  return values[name as keyof AdminConfigFormValues];
}

function requiresNonEmptyValue(field: AdminFieldSchema) {
  return field.data_type !== "boolean";
}

function isBlankValue(value: unknown) {
  return typeof value === "string" && value.trim().length === 0;
}
