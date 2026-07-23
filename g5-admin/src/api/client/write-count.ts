import type { AdminWriteCountStatsQuery } from "../../types/AdminWriteCountStatsQuery";
import type { AdminWriteCountStatsResponse } from "../../types/AdminWriteCountStatsResponse";
import { invokeCommand } from "./core";

export async function getAdminWriteCountStats(
  query: AdminWriteCountStatsQuery,
): Promise<AdminWriteCountStatsResponse> {
  return invokeCommand<AdminWriteCountStatsResponse>(
    "cmd_admin_write_count_stats_get",
    { query },
  );
}
