import { z } from "zod";
import type { AdminSmsSendInput } from "../../types/AdminSmsSendInput";

export const adminSmsMessageFormSchema = z
  .object({
    template_id: z.string().trim(),
    message: z.string().trim(),
    group_ids_csv: z.string().trim(),
    contact_ids_csv: z.string().trim(),
    member_levels_csv: z.string().trim(),
    manual_targets_text: z.string().trim(),
    booking_at: z.string().trim(),
    wr_reply: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.template_id === "" && values.message === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "메시지 또는 템플릿을 지정해 주십시오.",
        path: ["message"],
      });
    }

    const targetCount =
      parsePositiveIntList(values.group_ids_csv).length +
      parsePositiveIntList(values.contact_ids_csv).length +
      parsePositiveIntList(values.member_levels_csv).length +
      parseManualTargets(values.manual_targets_text).length;
    if (targetCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "최소 한 개 이상의 발송 대상을 지정해 주십시오.",
        path: ["group_ids_csv"],
      });
    }
  });

export type AdminSmsMessageFormValues = z.infer<typeof adminSmsMessageFormSchema>;

export const emptyAdminSmsMessageFormValues: AdminSmsMessageFormValues = {
  template_id: "",
  message: "",
  group_ids_csv: "",
  contact_ids_csv: "",
  member_levels_csv: "",
  manual_targets_text: "",
  booking_at: "",
  wr_reply: "",
};

export function buildAdminSmsSendInput(
  values: AdminSmsMessageFormValues,
): AdminSmsSendInput {
  return {
    message: normalizeString(values.message),
    template_id: parseNullablePositiveInteger(values.template_id),
    group_ids: parsePositiveIntList(values.group_ids_csv),
    contact_ids: parsePositiveIntList(values.contact_ids_csv),
    member_levels: parsePositiveIntList(values.member_levels_csv),
    manual_targets: parseManualTargets(values.manual_targets_text),
    booking_at: normalizeString(values.booking_at),
    wr_reply: normalizePhoneOrNull(values.wr_reply),
  };
}

export function parsePositiveIntList(value: string): number[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ).sort((left, right) => left - right);
}

export function parseManualTargets(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(/\t|,/).map((part) => part.trim());
      if (parts.length >= 2) {
        return {
          name: normalizeString(parts[0] ?? ""),
          phone: normalizePhoneDigits(parts.slice(1).join(" ")),
        };
      }

      return {
        name: null,
        phone: normalizePhoneDigits(parts[0] ?? ""),
      };
    })
    .filter((target) => target.phone.length > 0);
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function normalizePhoneOrNull(value: string): string | null {
  const digits = normalizePhoneDigits(value);
  return digits.length > 0 ? digits : null;
}

function parseNullablePositiveInteger(value: string): number | null {
  const numeric = Number.parseInt(value.trim(), 10);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}
