import { useQuery } from "@tanstack/react-query";
import { getSiteActivityList, type CommandError } from "../../api/client";
import type { SiteActivityListResponse } from "../../types/SiteActivityListResponse";

export function useSiteActivity(siteId: string | null, limit = 12) {
  return useQuery<SiteActivityListResponse, CommandError>({
    queryKey: ["sites", "activity", siteId ?? "all-sites", limit],
    queryFn: () => getSiteActivityList(siteId, limit),
    staleTime: 15_000,
  });
}
