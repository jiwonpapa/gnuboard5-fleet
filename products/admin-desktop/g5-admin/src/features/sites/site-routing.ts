import { useLocation, useParams } from "react-router-dom";
import {
  buildSiteRoute,
  DEFAULT_ROUTE,
  stripSiteRoutePrefix,
} from "../layout/navigation";

export function useCurrentSiteId() {
  const location = useLocation();
  const params = useParams<{ siteId?: string }>();
  if (params.siteId) {
    return params.siteId;
  }

  const match = location.pathname.match(/^\/sites\/([^/]+)/);
  return match?.[1] ?? null;
}

export function toSiteRoute(siteId: string | null, pathname: string) {
  if (!siteId) {
    return pathname;
  }

  return buildSiteRoute(siteId, pathname);
}

export function normalizeCurrentCanonicalPath(pathname: string) {
  const normalized = stripSiteRoutePrefix(pathname);
  if (normalized === "/" || normalized === "") {
    return DEFAULT_ROUTE;
  }

  return normalized;
}
