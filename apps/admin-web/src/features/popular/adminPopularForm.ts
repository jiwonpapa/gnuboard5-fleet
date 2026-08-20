import type {
  AdminPopularListQuery,
  AdminPopularRankQuery,
  AdminPopularReset,
} from "../../api/fleet";

export interface AdminPopularFilterDraft {
  dateFrom: string;
  dateTo: string;
  rankLimit: string;
}

export const emptyAdminPopularFilter: AdminPopularFilterDraft = {
  dateFrom: "",
  dateTo: "",
  rankLimit: "20",
};

export interface AdminPopularQueries {
  list: AdminPopularListQuery;
  rank: AdminPopularRankQuery;
  reset: AdminPopularReset;
}

export function buildAdminPopularQueries(
  draft: AdminPopularFilterDraft,
  page: number,
  perPage = 20,
): AdminPopularQueries | null {
  const dateFrom = optionalDate(draft.dateFrom);
  const dateTo = optionalDate(draft.dateTo);
  const rankLimit = Number(draft.rankLimit);
  if (
    dateFrom === false
    || dateTo === false
    || (dateFrom && dateTo && dateFrom > dateTo)
    || !Number.isSafeInteger(rankLimit)
    || rankLimit < 1
    || rankLimit > 100
    || !Number.isSafeInteger(page)
    || page < 1
    || !Number.isSafeInteger(perPage)
    || perPage < 1
    || perPage > 100
  ) {
    return null;
  }
  const range = {
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };
  return {
    list: { page, per_page: perPage, ...range },
    rank: { limit: rankLimit, ...range },
    reset: range,
  };
}

function optionalDate(value: string): string | false | null {
  const normalized = value.trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : false;
}
