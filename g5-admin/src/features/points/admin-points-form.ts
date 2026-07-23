import { z } from "zod";
import type { AdminPointActionInput } from "../../types/AdminPointActionInput";
import type { AdminPointExpireInput } from "../../types/AdminPointExpireInput";

const positiveIntegerSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "1 이상의 정수를 입력해 주십시오.")
  .refine((value) => Number(value) > 0, "1 이상의 정수를 입력해 주십시오.");

const optionalDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "YYYY-MM-DD 형식으로 입력해 주십시오.",
  );

export const adminPointActionFormSchema = z.object({
  mb_id: z.string().trim().min(1, "회원 아이디를 입력해 주십시오."),
  po_content: z.string().trim(),
  point: positiveIntegerSchema,
});

export type AdminPointActionFormValues = z.infer<
  typeof adminPointActionFormSchema
>;

export const emptyAdminPointActionFormValues: AdminPointActionFormValues = {
  mb_id: "",
  po_content: "",
  point: "100",
};

export function buildAdminPointActionInput(
  values: AdminPointActionFormValues,
): AdminPointActionInput | null {
  const point = Number(values.point.trim());
  if (!Number.isInteger(point) || point <= 0) {
    return null;
  }

  const memberId = values.mb_id.trim();
  if (memberId.length === 0) {
    return null;
  }

  const content = values.po_content.trim();

  return {
    mb_id: memberId,
    po_content: content.length > 0 ? content : null,
    point,
  };
}

export const adminPointExpireFormSchema = z.object({
  base_date: optionalDateSchema,
});

export type AdminPointExpireFormValues = z.infer<
  typeof adminPointExpireFormSchema
>;

export const emptyAdminPointExpireFormValues: AdminPointExpireFormValues = {
  base_date: "",
};

export function buildAdminPointExpireInput(
  values: AdminPointExpireFormValues,
): AdminPointExpireInput {
  const baseDate = values.base_date.trim();

  return {
    base_date: baseDate.length > 0 ? baseDate : null,
  };
}
