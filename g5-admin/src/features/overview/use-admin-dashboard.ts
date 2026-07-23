import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard, type CommandError } from "../../api/client";
import type { AdminDashboardResponse } from "../../types/AdminDashboardResponse";

type UseAdminDashboardOptions = {
  enabled: boolean;
  siteId: string | null;
};

export function useAdminDashboard(options: UseAdminDashboardOptions) {
  return useQuery<AdminDashboardResponse, CommandError>({
    queryKey: ["admin", "dashboard", options.siteId ?? "no-site"],
    queryFn: getAdminDashboard,
    enabled: options.enabled && options.siteId !== null,
    retry: false,
    staleTime: 30_000,
  });
}
