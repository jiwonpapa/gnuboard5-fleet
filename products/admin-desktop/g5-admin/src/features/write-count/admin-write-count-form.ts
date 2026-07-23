import { z } from "zod";
import type { AdminWriteCountStatsQuery } from "../../types/AdminWriteCountStatsQuery";

export const adminWriteCountFilterSchema = z.object({
  period: z.enum(["hour", "day", "week", "month", "year"]),
  date_from: z.string().trim(),
  date_to: z.string().trim(),
  bo_table: z.string().trim(),
});

export type AdminWriteCountFilterValues = z.infer<typeof adminWriteCountFilterSchema>;

export const emptyAdminWriteCountFilterValues: AdminWriteCountFilterValues = {
  period: "day",
  date_from: "",
  date_to: "",
  bo_table: "",
};

export function buildAdminWriteCountStatsQuery(
  values: AdminWriteCountFilterValues,
): AdminWriteCountStatsQuery {
  return {
    period: values.period,
    date_from: normalizeString(values.date_from),
    date_to: normalizeString(values.date_to),
    bo_table: normalizeString(values.bo_table),
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
