import type { AdminReportDetailResponse } from "../../types/AdminReportDetailResponse";
import type { AdminReportListQuery } from "../../types/AdminReportListQuery";
import type { AdminReportListResponse } from "../../types/AdminReportListResponse";
import type { AdminReportStatsResponse } from "../../types/AdminReportStatsResponse";
import type { AdminReportUpdateInput } from "../../types/AdminReportUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminReportList(
  query?: Partial<AdminReportListQuery>,
): Promise<AdminReportListResponse> {
  return invokeCommand<AdminReportListResponse>("cmd_admin_report_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
      status: query?.status ?? null,
      target_type: query?.target_type ?? null,
    },
  });
}

export async function getAdminReportStats(): Promise<AdminReportStatsResponse> {
  return invokeCommand<AdminReportStatsResponse>("cmd_admin_report_stats_get");
}

export async function updateAdminReport(
  input: AdminReportUpdateInput,
): Promise<AdminReportDetailResponse> {
  return invokeCommand<AdminReportDetailResponse>("cmd_admin_report_update", { input });
}
