import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import type { NavigationGroup, NavigationItem } from "./navigation";
import {
  DEFAULT_ROUTE,
  getNavigationDeliveryLabel,
  navigationGroups,
  primaryNavigationGroups,
} from "./navigation";
import { APP_OVERVIEW_LABEL } from "./branding";
import { shellIconClass } from "./shell";
import { useTheme } from "./theme";
import { toSiteRoute, useCurrentSiteId } from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";

const workspaceGroupIds = new Set(["overview", "app-settings", "site-management"]);

export function AppShellSidebar(props: {
  activeGroup: NavigationGroup | undefined;
  activeMeta: NavigationItem | undefined;
}) {
  const currentSiteId = useCurrentSiteId();
  const siteCatalog = useSiteCatalog();
  const { devMode } = useTheme();
  const routeSiteId = currentSiteId ?? siteCatalog.catalog?.active_site_id ?? null;
  const activePrimaryGroupId =
    props.activeGroup && props.activeGroup.showInPrimaryNav !== false
      ? props.activeGroup.id
      : null;
  const [sidebarState, setSidebarState] = useState<{
    routeGroupId: string | null;
    expandedGroupId: string | null;
  }>({
    routeGroupId: activePrimaryGroupId,
    expandedGroupId: activePrimaryGroupId,
  });
  const expandedGroupId =
    sidebarState.routeGroupId === activePrimaryGroupId
      ? sidebarState.expandedGroupId
      : activePrimaryGroupId;

  const workspaceGroups = navigationGroups.filter((group) =>
    workspaceGroupIds.has(group.id),
  );
  const serverGroup = navigationGroups.find((group) => group.id === "server");
  const secondaryGroup = routeSiteId ? serverGroup : undefined;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card px-4 py-4 text-sidebar-foreground xl:w-[280px] xl:border-r xl:border-b-0">
      <div className="space-y-5">
        <section className="space-y-2.5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              작업 탭
            </p>
            <h2 className="text-[0.98rem] font-semibold tracking-tight text-foreground">
              {props.activeMeta?.label ?? APP_OVERVIEW_LABEL}
            </h2>
          </div>

          <nav className="space-y-1.5" aria-label="작업 탭 메뉴">
            {workspaceGroups.flatMap((group) =>
              group.items.map((item) => renderNavigationItem(item, routeSiteId, devMode)),
            )}
          </nav>
        </section>

        <section className="space-y-2.5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              관리 메뉴
            </p>
            <p className="text-[0.82rem] leading-5 text-sidebar-muted">
              메뉴 묶음을 펼쳐 바로 이동합니다.
            </p>
          </div>

          <nav className="space-y-2" aria-label="좌측 서브메뉴">
            {primaryNavigationGroups.map((group) => {
              const GroupIcon = group.icon;
              const expanded = expandedGroupId === group.id;
              const isCurrentGroup = props.activeGroup?.id === group.id;

              return (
                <section
                  key={group.id}
                  className={cn(
                    "overflow-hidden rounded-sm border transition-colors",
                    expanded
                      ? "border-border bg-background"
                      : "border-border/70 bg-card",
                  )}
                >
                  <button
                    type="button"
                    aria-controls={`sidebar-group-${group.id}`}
                    aria-expanded={expanded}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      expanded
                        ? "bg-background text-foreground"
                        : "text-sidebar-foreground hover:bg-background hover:text-foreground",
                    )}
                    onClick={() => {
                      setSidebarState((current) => ({
                        routeGroupId: activePrimaryGroupId,
                        expandedGroupId:
                          current.routeGroupId === activePrimaryGroupId &&
                          current.expandedGroupId === group.id
                            ? null
                            : group.id,
                      }));
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted/70 text-primary">
                      <GroupIcon className={shellIconClass} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-[0.84rem] font-semibold text-foreground">
                        {group.label}
                      </strong>
                      <span className="block text-[0.74rem] text-muted-foreground">
                        {group.items.length}개 메뉴
                      </span>
                    </div>
                    {isCurrentGroup ? (
                      <Badge variant="outline" className="shrink-0">
                        현재
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>

                  {expanded ? (
                    <div
                      id={`sidebar-group-${group.id}`}
                      className="space-y-1 border-t border-border/80 bg-background px-2 py-2"
                    >
                      {group.items.map((item) =>
                        renderNavigationItem(item, routeSiteId, devMode, true),
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </nav>
        </section>

        {secondaryGroup ? (
          <section className="space-y-2.5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                보조 메뉴
              </p>
              <h3 className="text-[0.92rem] font-semibold tracking-tight text-foreground">
                {secondaryGroup.label}
              </h3>
            </div>

            <nav className="space-y-1.5" aria-label={`${secondaryGroup.label} 메뉴`}>
              {secondaryGroup.items.map((item) =>
                renderNavigationItem(item, routeSiteId, devMode),
              )}
            </nav>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function renderNavigationItem(
  item: NavigationItem,
  currentSiteId: string | null,
  devMode: boolean,
  nested = false,
) {
  const Icon = item.icon;

  return (
    <NavLink
      key={item.to}
      to={toSiteRoute(currentSiteId, item.to)}
      end={item.to === DEFAULT_ROUTE}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-sm border px-3 py-2 transition-colors",
          nested && "pl-4",
          isActive
            ? "border-border bg-muted/70 text-foreground"
            : "border-transparent bg-transparent text-sidebar-foreground/85 hover:border-border hover:bg-muted/45 hover:text-foreground",
        )
      }
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-background text-primary">
        <Icon className={shellIconClass} />
      </div>
      <div className="min-w-0 flex flex-1 items-center gap-2">
        <strong className="min-w-0 flex-1 text-[0.82rem] font-semibold text-foreground">
          {item.label}
        </strong>
        {devMode ? (
          <Badge
            variant={item.delivery === "implemented" ? "secondary" : "outline"}
            className={
              item.delivery === "implemented"
                ? "bg-emerald-100 text-emerald-900"
                : item.delivery === "api_ready"
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-slate-300 bg-slate-50 text-slate-700"
            }
          >
            {getNavigationDeliveryLabel(item.delivery)}
          </Badge>
        ) : null}
      </div>
    </NavLink>
  );
}
