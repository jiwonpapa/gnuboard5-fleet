import type { SiteCatalog } from "../../types/SiteCatalog";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";
import {
  buildSiteActivateRoute,
  buildSiteRoute,
  DEFAULT_ROUTE,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
  stripSiteRoutePrefix,
} from "../layout/navigation";

export function normalizeSiteNextPath(pathname: string | null | undefined) {
  const normalizedPathname = stripSiteRoutePrefix(pathname ?? DEFAULT_ROUTE);
  if (normalizedPathname === "/" || normalizedPathname === "") {
    return DEFAULT_ROUTE;
  }

  return normalizedPathname;
}

export function resolveEntryPath(
  catalog: SiteCatalog | null | undefined,
  targetPath: string,
) {
  if (!catalog || catalog.needs_onboarding || catalog.sites.length === 0) {
    return SITE_ONBOARDING_ROUTE;
  }

  const nextPath = normalizeSiteNextPath(targetPath);
  const activeEntry =
    catalog.sites.find((entry) => entry.site.id === catalog.active_site_id) ??
    catalog.sites[0];
  const siteId = activeEntry?.site.id;

  if (!siteId || !activeEntry) {
    return SITE_ONBOARDING_ROUTE;
  }

  if (nextPath === "/login") {
    return buildSiteRoute(siteId, "/login");
  }

  if (activeEntry.status === "authenticated") {
    return buildSiteRoute(siteId, nextPath);
  }

  if (catalog.sites.length > 1) {
    return SITE_DASHBOARD_ROUTE;
  }

  return buildSiteRoute(siteId, "/login");
}

export function resolvePostRegistrationPath(
  catalog: SiteCatalog | null | undefined,
) {
  if (!catalog) {
    return SITE_ONBOARDING_ROUTE;
  }

  const siteId = catalog.active_site_id ?? catalog.sites[0]?.site.id;
  if (!siteId) {
    return SITE_ONBOARDING_ROUTE;
  }

  return buildSiteActivateRoute(siteId, DEFAULT_ROUTE);
}

export function resolveSiteActivationSuccessPath(
  entry: SiteCatalogEntry,
  nextPath: string | null | undefined,
) {
  if (entry.status === "authenticated") {
    return buildSiteRoute(entry.site.id, normalizeSiteNextPath(nextPath));
  }

  return buildSiteRoute(entry.site.id, "/login");
}
