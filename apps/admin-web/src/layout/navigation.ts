import {
  adminRoutes,
  groupedAdminRoutes,
  routePathForSite,
  resolveRouteMeta,
  selectedSiteId,
  type AdminRouteMeta,
} from "../app/adminRouteRegistry";

export {
  adminRoutes,
  groupedAdminRoutes,
  routePathForSite,
  resolveRouteMeta,
  selectedSiteId,
};
export type { AdminRouteMeta };

export function deliveryLabel(delivery: AdminRouteMeta["delivery"]): string {
  return delivery === "active" ? "활성" : "배치 대기";
}
