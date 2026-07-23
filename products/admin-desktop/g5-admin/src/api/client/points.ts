import type { AdminPointActionInput } from "../../types/AdminPointActionInput";
import type { AdminPointActionResponse } from "../../types/AdminPointActionResponse";
import type { AdminPointDeleteInput } from "../../types/AdminPointDeleteInput";
import type { AdminPointDeleteResponse } from "../../types/AdminPointDeleteResponse";
import type { AdminPointExpireInput } from "../../types/AdminPointExpireInput";
import type { AdminPointExpireResponse } from "../../types/AdminPointExpireResponse";
import type { AdminPointListQuery } from "../../types/AdminPointListQuery";
import type { AdminPointListResponse } from "../../types/AdminPointListResponse";
import type { AdminPointSummaryResponse } from "../../types/AdminPointSummaryResponse";
import { invokeCommand } from "./core";

export async function getAdminPointList(
  query?: Partial<AdminPointListQuery>
): Promise<AdminPointListResponse> {
  return invokeCommand<AdminPointListResponse>("cmd_admin_point_get_list", {
    query: {
      mb_id: query?.mb_id ?? null,
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
      search: query?.search ?? null,
      search_field: query?.search_field ?? null,
    },
  });
}

export async function getAdminPointSummary(
  mbId?: string | null
): Promise<AdminPointSummaryResponse> {
  return invokeCommand<AdminPointSummaryResponse>(
    "cmd_admin_point_summary_get",
    {
      mbId: mbId ?? null,
    }
  );
}

export async function grantAdminPoint(
  input: AdminPointActionInput
): Promise<AdminPointActionResponse> {
  return invokeCommand<AdminPointActionResponse>("cmd_admin_point_grant", {
    input,
  });
}

export async function deductAdminPoint(
  input: AdminPointActionInput
): Promise<AdminPointActionResponse> {
  return invokeCommand<AdminPointActionResponse>("cmd_admin_point_deduct", {
    input,
  });
}

export async function deleteAdminPointHistory(
  input: AdminPointDeleteInput
): Promise<AdminPointDeleteResponse> {
  return invokeCommand<AdminPointDeleteResponse>("cmd_admin_point_delete", {
    input,
  });
}

export async function expireAdminPoints(
  input?: AdminPointExpireInput
): Promise<AdminPointExpireResponse> {
  return invokeCommand<AdminPointExpireResponse>("cmd_admin_point_expire", {
    input: input ?? { base_date: null },
  });
}

export async function grantLegacyAdminPoint(
  input: AdminPointActionInput
): Promise<AdminPointActionResponse> {
  return invokeCommand<AdminPointActionResponse>(
    "cmd_admin_point_grant_legacy",
    { input }
  );
}

export async function deductLegacyAdminPoint(
  input: AdminPointActionInput
): Promise<AdminPointActionResponse> {
  return invokeCommand<AdminPointActionResponse>(
    "cmd_admin_point_deduct_legacy",
    { input }
  );
}

export async function expireLegacyAdminPoints(
  input?: AdminPointExpireInput
): Promise<AdminPointExpireResponse> {
  return invokeCommand<AdminPointExpireResponse>(
    "cmd_admin_point_expire_legacy",
    {
      input: input ?? { base_date: null },
    }
  );
}
