import {
  adminRoutes,
  groupedAdminRoutes,
  resolveRouteMeta,
  type AdminRouteMeta,
} from "../app/adminRouteRegistry";

export { adminRoutes, groupedAdminRoutes, resolveRouteMeta };
export type { AdminRouteMeta };

export function deliveryLabel(delivery: AdminRouteMeta["delivery"]): string {
  return delivery === "active" ? "활성" : "배치 대기";
}
