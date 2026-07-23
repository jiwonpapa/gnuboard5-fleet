import type { SiteAddInput } from "../../types/SiteAddInput";
import type { SiteCatalog } from "../../types/SiteCatalog";
import type { SiteDeleteInput } from "../../types/SiteDeleteInput";
import type { SiteHealthCheckInput } from "../../types/SiteHealthCheckInput";
import type { SiteHealthCheckResult } from "../../types/SiteHealthCheckResult";
import type { SiteSwitchInput } from "../../types/SiteSwitchInput";
import type { SiteUpdateInput } from "../../types/SiteUpdateInput";
import type { SiteActivityListResponse } from "../../types/SiteActivityListResponse";
import { invokeCommand } from "./core";

export async function getSiteCatalog(): Promise<SiteCatalog> {
  return invokeCommand<SiteCatalog>("cmd_site_catalog_get");
}

export async function addSite(input: SiteAddInput): Promise<SiteCatalog> {
  return invokeCommand<SiteCatalog>("cmd_site_add", { input });
}

export async function updateSite(input: SiteUpdateInput): Promise<SiteCatalog> {
  return invokeCommand<SiteCatalog>("cmd_site_update", { input });
}

export async function deleteSite(input: SiteDeleteInput): Promise<SiteCatalog> {
  return invokeCommand<SiteCatalog>("cmd_site_delete", { input });
}

export async function switchSite(input: SiteSwitchInput): Promise<SiteCatalog> {
  return invokeCommand<SiteCatalog>("cmd_site_switch", { input });
}

export async function healthCheckSite(
  input: SiteHealthCheckInput,
): Promise<SiteHealthCheckResult> {
  return invokeCommand<SiteHealthCheckResult>("cmd_site_health_check", { input });
}

export async function getSiteActivityList(
  siteId?: string | null,
  limit = 12,
): Promise<SiteActivityListResponse> {
  return invokeCommand<SiteActivityListResponse>("cmd_site_activity_list", {
    limit,
    site_id: siteId ?? null,
  });
}
