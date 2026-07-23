import { z } from "zod";
import type { AdminFaqCreateInput } from "../../types/AdminFaqCreateInput";
import type { AdminFaqImageUploadInput } from "../../types/AdminFaqImageUploadInput";
import type { AdminFaqListQuery } from "../../types/AdminFaqListQuery";
import type { AdminFaqMasterCreateInput } from "../../types/AdminFaqMasterCreateInput";
import type { AdminFaqMasterUpdateInput } from "../../types/AdminFaqMasterUpdateInput";
import type { AdminFaqUpdateInput } from "../../types/AdminFaqUpdateInput";

const orderField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^-?\d+$/.test(value), {
    message: "정수를 입력해 주십시오.",
  });

export const adminFaqMasterFormSchema = z.object({
  fm_id: z.number().int().nonnegative(),
  fm_subject: z.string().trim().min(1, "마스터 제목을 입력해 주십시오."),
  fm_order: orderField,
  fm_head_html: z.string().trim(),
  fm_tail_html: z.string().trim(),
  fm_mobile_head_html: z.string().trim(),
  fm_mobile_tail_html: z.string().trim(),
});

export type AdminFaqMasterFormValues = z.infer<typeof adminFaqMasterFormSchema>;

export const emptyAdminFaqMasterFormValues: AdminFaqMasterFormValues = {
  fm_id: 0,
  fm_subject: "",
  fm_order: "0",
  fm_head_html: "",
  fm_tail_html: "",
  fm_mobile_head_html: "",
  fm_mobile_tail_html: "",
};

export const adminFaqFormSchema = z.object({
  fa_id: z.number().int().nonnegative(),
  fm_id: z.string().trim().min(1, "FAQ 마스터를 선택해 주십시오."),
  fa_subject: z.string().trim().min(1, "질문 제목을 입력해 주십시오."),
  fa_order: orderField,
  fa_content: z.string().trim().min(1, "답변 내용을 입력해 주십시오."),
});

export type AdminFaqFormValues = z.infer<typeof adminFaqFormSchema>;

export const emptyAdminFaqFormValues: AdminFaqFormValues = {
  fa_id: 0,
  fm_id: "",
  fa_subject: "",
  fa_order: "0",
  fa_content: "",
};

export function buildAdminFaqMasterListQuery(page: number, perPage: number) {
  return {
    page,
    per_page: perPage,
  };
}

export function buildAdminFaqMasterCreateInput(
  values: AdminFaqMasterFormValues,
): AdminFaqMasterCreateInput {
  return {
    fm_subject: values.fm_subject.trim(),
    fm_head_html: normalizeString(values.fm_head_html),
    fm_tail_html: normalizeString(values.fm_tail_html),
    fm_mobile_head_html: normalizeString(values.fm_mobile_head_html),
    fm_mobile_tail_html: normalizeString(values.fm_mobile_tail_html),
    fm_order: parseOrder(values.fm_order),
  };
}

export function buildAdminFaqMasterUpdateInput(
  values: AdminFaqMasterFormValues,
): AdminFaqMasterUpdateInput {
  return {
    fm_id: values.fm_id,
    fm_subject: values.fm_subject.trim(),
    fm_head_html: normalizeString(values.fm_head_html),
    fm_tail_html: normalizeString(values.fm_tail_html),
    fm_mobile_head_html: normalizeString(values.fm_mobile_head_html),
    fm_mobile_tail_html: normalizeString(values.fm_mobile_tail_html),
    fm_order: parseOrder(values.fm_order),
  };
}

export function buildAdminFaqListQuery(
  fmId: number | null,
  page: number,
  perPage: number,
): AdminFaqListQuery {
  return {
    fm_id: fmId,
    page,
    per_page: perPage,
  };
}

export function buildAdminFaqCreateInput(
  values: AdminFaqFormValues,
): AdminFaqCreateInput {
  return {
    fm_id: Number.parseInt(values.fm_id, 10),
    fa_subject: values.fa_subject.trim(),
    fa_content: values.fa_content.trim(),
    fa_order: parseOrder(values.fa_order),
  };
}

export function buildAdminFaqUpdateInput(
  values: AdminFaqFormValues,
): AdminFaqUpdateInput {
  return {
    fa_id: values.fa_id,
    fm_id: Number.parseInt(values.fm_id, 10),
    fa_subject: values.fa_subject.trim(),
    fa_content: values.fa_content.trim(),
    fa_order: parseOrder(values.fa_order),
  };
}

export async function buildAdminFaqImageUploadInput(
  fmId: number,
  file: File,
): Promise<AdminFaqImageUploadInput> {
  return {
    fm_id: fmId,
    file_name: file.name,
    mime_type: file.type || null,
    bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOrder(value: string): number {
  const parsed = Number.parseInt(value.trim() || "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
