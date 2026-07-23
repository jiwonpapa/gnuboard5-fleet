import {
  DEFAULT_ROUTE,
  MASTER_SETUP_ROUTE,
  MASTER_UNLOCK_ROUTE,
  SITE_ROUTE_PREFIX,
} from "./navigation-routes";
import { flatNavigationItems, navigationGroups } from "./navigation-manifest";
import type { NavigationDelivery } from "./navigation-types";

const routeMeta = new Map(
  flatNavigationItems.flatMap((item) =>
    item.allPaths.map((path) => [path, item] as const),
  ),
);

export function resolveRouteMeta(pathname: string) {
  const normalizedPathname = stripSiteRoutePrefix(pathname);
  const exact = routeMeta.get(normalizedPathname);
  if (exact) {
    return exact;
  }

  return flatNavigationItems.find((item) =>
    item.allPaths.some(
      (path) =>
        normalizedPathname === path || normalizedPathname.startsWith(`${path}/`),
    ),
  );
}

export function resolveRouteGroup(pathname: string) {
  const normalizedPathname = stripSiteRoutePrefix(pathname);
  return navigationGroups.find((group) =>
    group.items.some((item) =>
      [item.to, ...(item.aliases ?? [])].some(
        (path) =>
          normalizedPathname === path || normalizedPathname.startsWith(`${path}/`),
      ),
    ),
  );
}

export function stripSiteRoutePrefix(pathname: string) {
  const match = pathname.match(/^\/sites\/[^/]+(?<rest>\/.*)?$/);
  if (!match) {
    return pathname;
  }

  return match.groups?.rest ?? "/";
}

export function buildSiteRoute(siteId: string, pathname: string) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_ROUTE_PREFIX}/${siteId}${normalizedPathname}`;
}

export function buildMasterSetupRoute(nextPath?: string | null) {
  const normalizedNextPath = nextPath?.trim();
  if (!normalizedNextPath) {
    return MASTER_SETUP_ROUTE;
  }

  return `${MASTER_SETUP_ROUTE}?next=${encodeURIComponent(normalizedNextPath)}`;
}

export function buildMasterUnlockRoute(nextPath?: string | null) {
  const normalizedNextPath = nextPath?.trim();
  if (!normalizedNextPath) {
    return MASTER_UNLOCK_ROUTE;
  }

  return `${MASTER_UNLOCK_ROUTE}?next=${encodeURIComponent(normalizedNextPath)}`;
}

export function buildSiteActivateRoute(siteId: string, nextPath = DEFAULT_ROUTE) {
  const normalizedNextPath = stripSiteRoutePrefix(nextPath);
  const resolvedNextPath =
    normalizedNextPath === "/" || normalizedNextPath === ""
      ? DEFAULT_ROUTE
      : normalizedNextPath;

  return `${buildSiteRoute(siteId, "/activate")}?next=${encodeURIComponent(
    resolvedNextPath,
  )}`;
}

export function getNavigationDeliveryLabel(delivery: NavigationDelivery) {
  switch (delivery) {
    case "implemented":
      return "구현완료";
    case "api_ready":
      return "API만 완료";
    case "api_excluded":
      return "API 제외";
  }
}

export function getNavigationDeliveryDescription(delivery: NavigationDelivery) {
  switch (delivery) {
    case "implemented":
      return "Rust 작업면과 REST API가 모두 연결된 상태입니다.";
    case "api_ready":
      return "REST API는 준비됐지만 Rust 작업면이 아직 없습니다.";
    case "api_excluded":
      return "운영 정책상 REST API 이관 대상에서 제외된 항목입니다.";
  }
}
