import { z } from "zod";
import type { AdminVisitDeleteInput } from "../../types/AdminVisitDeleteInput";
import type { AdminVisitSearchQuery } from "../../types/AdminVisitSearchQuery";
import type { AdminVisitStatsQuery } from "../../types/AdminVisitStatsQuery";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const positiveIntegerPattern = /^\d+$/;

const optionalDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || datePattern.test(value),
    "YYYY-MM-DD 형식으로 입력해 주십시오.",
  );

export const visitStatsTypeOptions = [
  "date",
  "hour",
  "week",
  "month",
  "year",
  "browser",
  "os",
  "device",
  "domain",
  "search",
] as const;

export const adminVisitStatsFormSchema = z.object({
  date_from: optionalDateSchema,
  date_to: optionalDateSchema,
  limit: z
    .string()
    .trim()
    .regex(positiveIntegerPattern, "1 이상의 정수를 입력해 주십시오.")
    .refine((value) => Number(value) > 0, "1 이상의 정수를 입력해 주십시오."),
  type: z.enum(visitStatsTypeOptions),
});

export type AdminVisitStatsFormValues = z.infer<
  typeof adminVisitStatsFormSchema
>;

export const emptyAdminVisitStatsFormValues: AdminVisitStatsFormValues = {
  date_from: "",
  date_to: "",
  limit: "30",
  type: "date",
};

export function buildAdminVisitStatsQuery(
  values: AdminVisitStatsFormValues,
): AdminVisitStatsQuery | null {
  const limit = parsePositiveInteger(values.limit);
  if (limit === null) {
    return null;
  }

  return {
    date_from: normalizeOptionalString(values.date_from),
    date_to: normalizeOptionalString(values.date_to),
    limit,
    type: values.type,
  };
}

export const adminVisitSearchFormSchema = z.object({
  agent: z.string().trim(),
  date_from: optionalDateSchema,
  date_to: optionalDateSchema,
  ip: z.string().trim(),
  referer: z.string().trim(),
});

export type AdminVisitSearchFormValues = z.infer<
  typeof adminVisitSearchFormSchema
>;

export const emptyAdminVisitSearchFormValues: AdminVisitSearchFormValues = {
  agent: "",
  date_from: "",
  date_to: "",
  ip: "",
  referer: "",
};

export function buildAdminVisitSearchQuery(
  values: AdminVisitSearchFormValues,
  page = 1,
): AdminVisitSearchQuery {
  return {
    agent: normalizeOptionalString(values.agent),
    date_from: normalizeOptionalString(values.date_from),
    date_to: normalizeOptionalString(values.date_to),
    ip: normalizeOptionalString(values.ip),
    page,
    per_page: 50,
    referer: normalizeOptionalString(values.referer),
  };
}

export const adminVisitDeleteFormSchema = z
  .object({
    before: optionalDateSchema,
    date_from: optionalDateSchema,
    date_to: optionalDateSchema,
    ip: z.string().trim(),
  })
  .refine(
    (value) =>
      [value.before, value.date_from, value.date_to, value.ip].some(
        (field) => field.trim().length > 0,
      ),
    "삭제 조건을 하나 이상 입력해 주십시오.",
  );

export type AdminVisitDeleteFormValues = z.infer<
  typeof adminVisitDeleteFormSchema
>;

export const emptyAdminVisitDeleteFormValues: AdminVisitDeleteFormValues = {
  before: "",
  date_from: "",
  date_to: "",
  ip: "",
};

export function buildAdminVisitDeleteInput(
  values: AdminVisitDeleteFormValues,
): AdminVisitDeleteInput | null {
  const input: AdminVisitDeleteInput = {
    before: normalizeOptionalString(values.before),
    date_from: normalizeOptionalString(values.date_from),
    date_to: normalizeOptionalString(values.date_to),
    ip: normalizeOptionalString(values.ip),
  };

  return input.before || input.date_from || input.date_to || input.ip ? input : null;
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value: string) {
  const normalized = value.trim();
  if (!positiveIntegerPattern.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return parsed > 0 ? parsed : null;
}
