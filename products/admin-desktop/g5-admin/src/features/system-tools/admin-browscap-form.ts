import { z } from "zod";
import type { AdminBrowscapConvertInput } from "../../types/AdminBrowscapConvertInput";

const rowsSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "1 이상의 정수를 입력해 주십시오.")
  .refine((value) => Number(value) > 0, "1 이상의 정수를 입력해 주십시오.");

export const adminBrowscapConvertFormSchema = z.object({
  rows: rowsSchema,
});

export type AdminBrowscapConvertFormValues = z.infer<
  typeof adminBrowscapConvertFormSchema
>;

export const emptyAdminBrowscapConvertFormValues: AdminBrowscapConvertFormValues = {
  rows: "100",
};

export function buildAdminBrowscapConvertInput(
  values: AdminBrowscapConvertFormValues,
): AdminBrowscapConvertInput | null {
  const normalized = values.rows.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const rows = Number(normalized);
  if (rows <= 0) {
    return null;
  }

  return { rows };
}
