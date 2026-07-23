import type { AdminPopularListQuery } from "../../types/AdminPopularListQuery";
import type { AdminPopularListResponse } from "../../types/AdminPopularListResponse";
import type { AdminPopularRankQuery } from "../../types/AdminPopularRankQuery";
import type { AdminPopularRankResponse } from "../../types/AdminPopularRankResponse";
import type { AdminPopularResetInput } from "../../types/AdminPopularResetInput";
import type { AdminPopularResetResponse } from "../../types/AdminPopularResetResponse";
import { invokeCommand } from "./core";

export async function getAdminPopularList(
  query?: Partial<AdminPopularListQuery>,
): Promise<AdminPopularListResponse> {
  return invokeCommand<AdminPopularListResponse>("cmd_admin_popular_get_list", {
    query: {
      date_from: query?.date_from ?? null,
      date_to: query?.date_to ?? null,
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function resetAdminPopular(
  input?: AdminPopularResetInput,
): Promise<AdminPopularResetResponse> {
  return invokeCommand<AdminPopularResetResponse>("cmd_admin_popular_reset", {
    input: input ?? { date_from: null, date_to: null },
  });
}

export async function getAdminPopularRank(
  query?: Partial<AdminPopularRankQuery>,
): Promise<AdminPopularRankResponse> {
  return invokeCommand<AdminPopularRankResponse>("cmd_admin_popular_rank_get", {
    query: {
      date_from: query?.date_from ?? null,
      date_to: query?.date_to ?? null,
      limit: query?.limit ?? 20,
    },
  });
}
