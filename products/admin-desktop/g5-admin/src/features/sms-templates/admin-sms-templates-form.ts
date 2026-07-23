import { z } from "zod";
import type { AdminSmsTemplateBatchInput } from "../../types/AdminSmsTemplateBatchInput";
import type { AdminSmsTemplateCreateInput } from "../../types/AdminSmsTemplateCreateInput";
import type { AdminSmsTemplateGroupCreateInput } from "../../types/AdminSmsTemplateGroupCreateInput";
import type { AdminSmsTemplateGroupMoveInput } from "../../types/AdminSmsTemplateGroupMoveInput";
import type { AdminSmsTemplateGroupUpdateInput } from "../../types/AdminSmsTemplateGroupUpdateInput";
import type { AdminSmsTemplateListQuery } from "../../types/AdminSmsTemplateListQuery";
import type { AdminSmsTemplateUpdateInput } from "../../types/AdminSmsTemplateUpdateInput";

export const adminSmsTemplateSearchFieldOptions = [
  { label: "전체", value: "all" },
  { label: "이름", value: "name" },
  { label: "내용", value: "content" },
] as const;

export const adminSmsTemplateGroupFormSchema = z.object({
  fg_no: z.number().int().nonnegative().nullable(),
  fg_name: z.string().trim().min(1, "그룹명을 입력해 주십시오."),
  fg_member: z.boolean(),
});

export type AdminSmsTemplateGroupFormValues = z.infer<
  typeof adminSmsTemplateGroupFormSchema
>;

export const emptyAdminSmsTemplateGroupFormValues: AdminSmsTemplateGroupFormValues = {
  fg_no: null,
  fg_name: "",
  fg_member: false,
};

export const adminSmsTemplateFormSchema = z.object({
  fo_no: z.number().int().positive().nullable(),
  fg_no: z.string().trim().regex(/^\d+$/, "그룹을 선택해 주십시오."),
  fo_name: z.string().trim().min(1, "템플릿 이름을 입력해 주십시오."),
  fo_content: z.string().trim().min(1, "템플릿 내용을 입력해 주십시오."),
});

export type AdminSmsTemplateFormValues = z.infer<typeof adminSmsTemplateFormSchema>;

export const emptyAdminSmsTemplateFormValues: AdminSmsTemplateFormValues = {
  fo_no: null,
  fg_no: "0",
  fo_name: "",
  fo_content: "",
};

export function buildAdminSmsTemplateListQuery(
  page: number,
  perPage: number,
  fgNo: number | null,
  searchField: string,
  search: string,
): AdminSmsTemplateListQuery {
  return {
    page,
    per_page: perPage,
    fg_no: fgNo,
    search_field: normalizeString(searchField),
    search: normalizeString(search),
  };
}

export function buildAdminSmsTemplateGroupCreateInput(
  values: AdminSmsTemplateGroupFormValues,
): AdminSmsTemplateGroupCreateInput {
  return {
    fg_name: values.fg_name.trim(),
    fg_member: values.fg_member ? 1 : 0,
  };
}

export function buildAdminSmsTemplateGroupUpdateInput(
  values: AdminSmsTemplateGroupFormValues,
): AdminSmsTemplateGroupUpdateInput {
  return {
    fg_no: values.fg_no ?? 0,
    fg_name: values.fg_name.trim(),
    fg_member: values.fg_member ? 1 : 0,
  };
}

export function buildAdminSmsTemplateGroupMoveInput(
  fgNo: number,
  targetFgNo: number,
): AdminSmsTemplateGroupMoveInput {
  return {
    fg_no: fgNo,
    target_fg_no: targetFgNo,
  };
}

export function buildAdminSmsTemplateCreateInput(
  values: AdminSmsTemplateFormValues,
): AdminSmsTemplateCreateInput {
  return {
    fg_no: parseNonNegativeInteger(values.fg_no),
    fo_name: values.fo_name.trim(),
    fo_content: values.fo_content.trim(),
  };
}

export function buildAdminSmsTemplateUpdateInput(
  values: AdminSmsTemplateFormValues,
): AdminSmsTemplateUpdateInput {
  return {
    fo_no: values.fo_no ?? 0,
    fg_no: parseNonNegativeInteger(values.fg_no),
    fo_name: values.fo_name.trim(),
    fo_content: values.fo_content.trim(),
  };
}

export function buildAdminSmsTemplateBatchInput(
  action: "delete" | "move",
  templateIds: number[],
  targetFgNo?: number | null,
): AdminSmsTemplateBatchInput {
  return {
    action,
    template_ids: dedupePositiveInts(templateIds),
    target_fg_no: targetFgNo ?? null,
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNonNegativeInteger(value: string): number {
  const numeric = Number.parseInt(value.trim(), 10);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function dedupePositiveInts(values: number[]): number[] {
  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
  ).sort((left, right) => left - right);
}
