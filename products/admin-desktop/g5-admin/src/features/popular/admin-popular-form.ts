import { z } from "zod";
import type { AdminPopularListQuery } from "../../types/AdminPopularListQuery";
import type { AdminPopularRankQuery } from "../../types/AdminPopularRankQuery";
import type { AdminPopularResetInput } from "../../types/AdminPopularResetInput";

const integerTextField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), {
    message: "양의 정수를 입력해 주십시오.",
  });

export const adminPopularFilterFormSchema = z.object({
  date_from: z.string().trim(),
  date_to: z.string().trim(),
  rank_limit: integerTextField,
});

export type AdminPopularFilterFormValues = z.infer<typeof adminPopularFilterFormSchema>;

export const emptyAdminPopularFilterFormValues: AdminPopularFilterFormValues = {
  date_from: "",
  date_to: "",
  rank_limit: "20",
};

export function buildAdminPopularListQuery(
  values: AdminPopularFilterFormValues,
  page: number,
  perPage: number,
): AdminPopularListQuery {
  return {
    date_from: normalizeText(values.date_from),
    date_to: normalizeText(values.date_to),
    page,
    per_page: perPage,
  };
}

export function buildAdminPopularRankQuery(
  values: AdminPopularFilterFormValues,
): AdminPopularRankQuery {
  return {
    date_from: normalizeText(values.date_from),
    date_to: normalizeText(values.date_to),
    limit: normalizeInteger(values.rank_limit) ?? 20,
  };
}

export function buildAdminPopularResetInput(
  values: AdminPopularFilterFormValues,
): AdminPopularResetInput {
  return {
    date_from: normalizeText(values.date_from),
    date_to: normalizeText(values.date_to),
  };
}

function normalizeText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInteger(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
