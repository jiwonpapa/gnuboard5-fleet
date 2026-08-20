import type {
  AdminVisitDelete,
  AdminVisitSearchQuery,
  AdminVisitStatsQuery,
  AdminVisitStatsType,
} from "../../api/fleet";

export interface AdminVisitStatsDraft {
  dateFrom: string;
  dateTo: string;
  type: AdminVisitStatsType;
  limit: string;
}

export interface AdminVisitSearchDraft {
  dateFrom: string;
  dateTo: string;
  ip: string;
  referer: string;
  agent: string;
}

export interface AdminVisitDeleteDraft {
  before: string;
  dateFrom: string;
  dateTo: string;
  ip: string;
}

export const emptyVisitStatsDraft: AdminVisitStatsDraft = { dateFrom: "", dateTo: "", type: "date", limit: "30" };
export const emptyVisitSearchDraft: AdminVisitSearchDraft = { dateFrom: "", dateTo: "", ip: "", referer: "", agent: "" };
export const emptyVisitDeleteDraft: AdminVisitDeleteDraft = { before: "", dateFrom: "", dateTo: "", ip: "" };

export function buildVisitStatsQuery(draft: AdminVisitStatsDraft): AdminVisitStatsQuery | null {
  const range = dateRange(draft.dateFrom, draft.dateTo);
  const limit = Number(draft.limit);
  if (!range || !Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) return null;
  return { ...range, type: draft.type, limit };
}

export function buildVisitSearchQuery(draft: AdminVisitSearchDraft, page: number, perPage = 50): AdminVisitSearchQuery | null {
  const range = dateRange(draft.dateFrom, draft.dateTo);
  if (!range || draft.ip.trim().length > 45 || draft.referer.trim().length > 2_048 || draft.agent.trim().length > 1_024 || !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100) return null;
  return {
    page,
    per_page: perPage,
    ...range,
    ...optionalText("ip", draft.ip, 45),
    ...optionalText("referer", draft.referer, 2_048),
    ...optionalText("agent", draft.agent, 1_024),
  };
}

export function buildVisitDelete(draft: AdminVisitDeleteDraft): AdminVisitDelete | null {
  const range = dateRange(draft.dateFrom, draft.dateTo);
  const before = optionalDate(draft.before);
  if (!range || before === false || draft.ip.trim().length > 45) return null;
  const input = {
    ...(before ? { before } : {}),
    ...range,
    ...optionalText("ip", draft.ip, 45),
  };
  if (before && (draft.dateFrom.trim() || draft.dateTo.trim() || draft.ip.trim())) return null;
  return Object.keys(input).length ? input : null;
}

function dateRange(dateFromValue: string, dateToValue: string): Pick<AdminVisitStatsQuery, "date_from" | "date_to"> | null {
  const dateFrom = optionalDate(dateFromValue);
  const dateTo = optionalDate(dateToValue);
  if (dateFrom === false || dateTo === false || (dateFrom && dateTo && dateFrom > dateTo)) return null;
  return { ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) };
}

function optionalDate(value: string): string | false | null {
  const normalized = value.trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : false;
}

function optionalText<K extends "ip" | "referer" | "agent">(key: K, value: string, maxLength: number): Partial<Record<K, string>> {
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? { [key]: normalized } as Partial<Record<K, string>> : {};
}
