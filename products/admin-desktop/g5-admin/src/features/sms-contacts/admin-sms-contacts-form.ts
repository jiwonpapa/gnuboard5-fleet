import { z } from "zod";
import type { AdminSmsContactBatchInput } from "../../types/AdminSmsContactBatchInput";
import type { AdminSmsContactCreateInput } from "../../types/AdminSmsContactCreateInput";
import type { AdminSmsContactExportQuery } from "../../types/AdminSmsContactExportQuery";
import type { AdminSmsContactGroupCreateInput } from "../../types/AdminSmsContactGroupCreateInput";
import type { AdminSmsContactGroupMoveInput } from "../../types/AdminSmsContactGroupMoveInput";
import type { AdminSmsContactGroupUpdateInput } from "../../types/AdminSmsContactGroupUpdateInput";
import type { AdminSmsContactImportInput } from "../../types/AdminSmsContactImportInput";
import type { AdminSmsContactListQuery } from "../../types/AdminSmsContactListQuery";
import type { AdminSmsContactUpdateInput } from "../../types/AdminSmsContactUpdateInput";

const mobilePhoneSchema = z
  .string()
  .transform((value) => normalizePhoneDigits(value))
  .refine(
    (value) => /^(01[016789])([0-9]{3,4})([0-9]{4})$/.test(value),
    "휴대폰번호를 정확히 입력해 주십시오.",
  );

export const adminSmsContactSearchFieldOptions = [
  { label: "전체", value: "all" },
  { label: "이름", value: "name" },
  { label: "번호", value: "hp" },
] as const;

export const adminSmsContactGroupFormSchema = z.object({
  bg_no: z.number().int().positive().nullable(),
  bg_name: z.string().trim().min(1, "그룹명을 입력해 주십시오."),
});

export type AdminSmsContactGroupFormValues = z.infer<
  typeof adminSmsContactGroupFormSchema
>;

export const emptyAdminSmsContactGroupFormValues: AdminSmsContactGroupFormValues = {
  bg_no: null,
  bg_name: "",
};

export const adminSmsContactFormSchema = z.object({
  bk_no: z.number().int().positive().nullable(),
  bg_no: z.string().trim().regex(/^\d+$/, "그룹을 선택해 주십시오."),
  mb_id: z.string().trim(),
  bk_name: z.string().trim().min(1, "이름을 입력해 주십시오."),
  bk_hp: mobilePhoneSchema,
  bk_receipt: z.boolean(),
  bk_memo: z.string().trim(),
});

export type AdminSmsContactFormValues = z.infer<typeof adminSmsContactFormSchema>;

export const emptyAdminSmsContactFormValues: AdminSmsContactFormValues = {
  bk_no: null,
  bg_no: "1",
  mb_id: "",
  bk_name: "",
  bk_hp: "",
  bk_receipt: true,
  bk_memo: "",
};

export const adminSmsContactImportFormSchema = z.object({
  bg_no: z.string().trim().regex(/^\d+$/, "그룹을 선택해 주십시오."),
  dry_run: z.boolean(),
  contacts_text: z.string(),
  include_no_phone: z.boolean(),
  with_hyphen: z.boolean(),
});

export type AdminSmsContactImportFormValues = z.infer<
  typeof adminSmsContactImportFormSchema
>;

export const emptyAdminSmsContactImportFormValues: AdminSmsContactImportFormValues = {
  bg_no: "1",
  dry_run: true,
  contacts_text: "",
  include_no_phone: false,
  with_hyphen: true,
};

export function buildAdminSmsContactListQuery(
  page: number,
  perPage: number,
  bgNo: number | null,
  searchField: string,
  search: string,
  withPhoneOnly: boolean,
): AdminSmsContactListQuery {
  return {
    page,
    per_page: perPage,
    bg_no: bgNo,
    search_field: normalizeString(searchField),
    search: normalizeString(search),
    with_phone_only: withPhoneOnly ? true : null,
  };
}

export function buildAdminSmsContactGroupCreateInput(
  values: AdminSmsContactGroupFormValues,
): AdminSmsContactGroupCreateInput {
  return {
    bg_name: values.bg_name.trim(),
  };
}

export function buildAdminSmsContactGroupUpdateInput(
  values: AdminSmsContactGroupFormValues,
): AdminSmsContactGroupUpdateInput {
  return {
    bg_no: values.bg_no ?? 0,
    bg_name: values.bg_name.trim(),
  };
}

export function buildAdminSmsContactGroupMoveInput(
  bgNo: number,
  targetBgNo: number,
): AdminSmsContactGroupMoveInput {
  return {
    bg_no: bgNo,
    target_bg_no: targetBgNo,
  };
}

export function buildAdminSmsContactCreateInput(
  values: AdminSmsContactFormValues,
): AdminSmsContactCreateInput {
  return {
    bg_no: parsePositiveInteger(values.bg_no),
    mb_id: normalizeString(values.mb_id),
    bk_name: values.bk_name.trim(),
    bk_hp: normalizePhoneDigits(values.bk_hp),
    bk_receipt: values.bk_receipt ? 1 : 0,
    bk_memo: normalizeString(values.bk_memo),
  };
}

export function buildAdminSmsContactUpdateInput(
  values: AdminSmsContactFormValues,
): AdminSmsContactUpdateInput {
  return {
    bk_no: values.bk_no ?? 0,
    bg_no: parsePositiveInteger(values.bg_no),
    bk_name: values.bk_name.trim(),
    bk_hp: normalizePhoneDigits(values.bk_hp),
    bk_receipt: values.bk_receipt ? 1 : 0,
    bk_memo: normalizeString(values.bk_memo),
  };
}

export function buildAdminSmsContactBatchInput(
  action: "allow" | "copy" | "delete" | "move" | "reject",
  contactIds: number[],
  targetBgNo?: number | null,
): AdminSmsContactBatchInput {
  return {
    action,
    contact_ids: dedupePositiveInts(contactIds),
    target_bg_no: targetBgNo ?? null,
  };
}

export async function buildAdminSmsContactImportInputFromFile(
  bgNo: number,
  dryRun: boolean,
  file: File,
): Promise<AdminSmsContactImportInput> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));

  return {
    bg_no: bgNo,
    dry_run: dryRun,
    bytes,
    file_name: file.name,
    mime_type: file.type || null,
    contacts: null,
  };
}

export function buildAdminSmsContactImportInputFromText(
  bgNo: number,
  dryRun: boolean,
  contactsText: string,
): AdminSmsContactImportInput {
  return {
    bg_no: bgNo,
    dry_run: dryRun,
    bytes: null,
    file_name: null,
    mime_type: null,
    contacts: parseImportContactsText(contactsText),
  };
}

export function buildAdminSmsContactExportQuery(
  bgNo: string,
  includeNoPhone: boolean,
  withHyphen: boolean,
): AdminSmsContactExportQuery {
  return {
    bg_no: bgNo.trim() === "" ? null : parsePositiveInteger(bgNo),
    include_no_phone: includeNoPhone,
    with_hyphen: withHyphen,
  };
}

export function parseImportContactsText(contactsText: string) {
  return contactsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(/\t|,/).map((part) => part.trim());
      if (parts.length >= 2) {
        return {
          name: parts[0] ?? "",
          phone: normalizePhoneDigits(parts.slice(1).join(" ")),
        };
      }

      return {
        name: "",
        phone: normalizePhoneDigits(parts[0] ?? ""),
      };
    });
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value: string): number {
  const numeric = Number.parseInt(value.trim(), 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function dedupePositiveInts(values: number[]): number[] {
  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
  ).sort((left, right) => left - right);
}
