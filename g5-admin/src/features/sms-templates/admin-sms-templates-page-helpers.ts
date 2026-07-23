import type { QueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import {
  emptyAdminSmsTemplateFormValues,
  type AdminSmsTemplateFormValues,
} from "./admin-sms-templates-form";

export async function invalidateSmsTemplateQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "template-groups"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "templates"] }),
  ]);
}

export function normalizeSmsTemplateTarget(value: string): string {
  return value.trim() === "" ? "0" : value.trim();
}

export function buildSmsTemplateFormDefaults(
  activeGroupId: number | null,
): AdminSmsTemplateFormValues {
  return {
    ...emptyAdminSmsTemplateFormValues,
    fg_no: activeGroupId === null ? "0" : String(activeGroupId),
  };
}

export function setSmsTemplateFormGroup(
  fgNo: number,
  form: UseFormReturn<AdminSmsTemplateFormValues>,
) {
  form.setValue("fg_no", String(fgNo));
}

export function toggleSmsTemplateSelection(
  current: number[],
  templateId: number,
  checked: boolean,
) {
  return checked
    ? Array.from(new Set([...current, templateId])).sort((left, right) => left - right)
    : current.filter((value) => value !== templateId);
}
