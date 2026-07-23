import type { AdminDashboardResponse } from "../../types/AdminDashboardResponse";
import { invokeCommand } from "./core";

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  return invokeCommand<AdminDashboardResponse>("cmd_admin_dashboard_get");
}
