import type { AdminVisitDeleteInput } from "../../types/AdminVisitDeleteInput";
import type { AdminVisitDeleteResponse } from "../../types/AdminVisitDeleteResponse";
import type { AdminVisitSearchQuery } from "../../types/AdminVisitSearchQuery";
import type { AdminVisitSearchResponse } from "../../types/AdminVisitSearchResponse";
import type { AdminVisitStatsQuery } from "../../types/AdminVisitStatsQuery";
import type { AdminVisitStatsResponse } from "../../types/AdminVisitStatsResponse";
import { invokeCommand } from "./core";

export async function getAdminVisitStats(
  query?: Partial<AdminVisitStatsQuery>,
): Promise<AdminVisitStatsResponse> {
  return invokeCommand<AdminVisitStatsResponse>("cmd_admin_visit_stats_get", {
    query: {
      date_from: query?.date_from ?? null,
      date_to: query?.date_to ?? null,
      limit: query?.limit ?? 30,
      type: query?.type ?? "date",
    },
  });
}

export async function searchAdminVisits(
  query?: Partial<AdminVisitSearchQuery>,
): Promise<AdminVisitSearchResponse> {
  return invokeCommand<AdminVisitSearchResponse>("cmd_admin_visit_search", {
    query: {
      agent: query?.agent ?? null,
      date_from: query?.date_from ?? null,
      date_to: query?.date_to ?? null,
      ip: query?.ip ?? null,
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 50,
      referer: query?.referer ?? null,
    },
  });
}

export async function deleteAdminVisits(
  input: AdminVisitDeleteInput,
): Promise<AdminVisitDeleteResponse> {
  return invokeCommand<AdminVisitDeleteResponse>("cmd_admin_visit_delete", {
    input,
  });
}
