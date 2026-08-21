import type { AdminWriteCountStatsQuery } from "../../api/fleet";

export interface AdminWriteCountFilterDraft {
  period: "hour" | "day" | "week" | "month" | "year";
  dateFrom: string;
  dateTo: string;
  boardTable: string;
}

export const emptyAdminWriteCountFilter: AdminWriteCountFilterDraft = {
  period: "day",
  dateFrom: "",
  dateTo: "",
  boardTable: "",
};

export function buildAdminWriteCountQuery(
  draft: AdminWriteCountFilterDraft,
): AdminWriteCountStatsQuery | null {
  const dateFrom = optionalDate(draft.dateFrom);
  const dateTo = optionalDate(draft.dateTo);
  const boardTable = draft.boardTable.trim();
  if (
    dateFrom === false
    || dateTo === false
    || (dateFrom && dateTo && dateFrom > dateTo)
    || (boardTable.length > 0 && !/^[A-Za-z0-9_]{1,20}$/.test(boardTable))
  ) {
    return null;
  }
  return {
    period: draft.period,
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    ...(boardTable ? { bo_table: boardTable } : {}),
  };
}

function optionalDate(value: string): string | false | null {
  const normalized = value.trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : false;
}
