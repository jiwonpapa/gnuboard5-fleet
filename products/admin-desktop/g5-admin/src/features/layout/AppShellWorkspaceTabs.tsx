import { Cog, Layers3, MoreHorizontal, Server } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import {
  APP_SITE_MANAGEMENT_ROUTE,
  DEFAULT_ROUTE,
  buildSiteActivateRoute,
  buildSiteRoute,
  LOCAL_SECURITY_ROUTE,
} from "./navigation";
import {
  normalizeCurrentCanonicalPath,
  toSiteRoute,
  useCurrentSiteId,
} from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";

const MAX_VISIBLE_SITE_TABS = 4;

export function AppShellWorkspaceTabs(props: { onPrimaryNav: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSiteId = useCurrentSiteId();
  const siteCatalog = useSiteCatalog();
  const overflowRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const currentCanonicalPath = normalizeCurrentCanonicalPath(location.pathname);
  const orderedActiveSiteId =
    currentSiteId ?? siteCatalog.catalog?.active_site_id ?? null;
  const inFixedWorkspace =
    currentCanonicalPath === LOCAL_SECURITY_ROUTE ||
    currentCanonicalPath === APP_SITE_MANAGEMENT_ROUTE;
  const siteTabNextPath = inFixedWorkspace ? DEFAULT_ROUTE : currentCanonicalPath;
  const fixedTabs = useMemo(
    () => [
      {
        icon: Cog,
        id: "app-settings",
        isActive: currentCanonicalPath === LOCAL_SECURITY_ROUTE,
        label: "앱설정",
        to: toSiteRoute(currentSiteId, LOCAL_SECURITY_ROUTE),
      },
      {
        icon: Layers3,
        id: "site-management",
        isActive: currentCanonicalPath === APP_SITE_MANAGEMENT_ROUTE,
        label: "사이트관리",
        to: toSiteRoute(currentSiteId, APP_SITE_MANAGEMENT_ROUTE),
      },
    ],
    [currentCanonicalPath, currentSiteId],
  );

  const orderedSites = useMemo(() => {
    const sites = [...(siteCatalog.catalog?.sites ?? [])];
    const activeIndex = sites.findIndex(
      (entry) => entry.site.id === orderedActiveSiteId,
    );

    if (activeIndex > 0) {
      const [activeSite] = sites.splice(activeIndex, 1);

      if (activeSite) {
        sites.unshift(activeSite);
      }
    }

    return sites;
  }, [orderedActiveSiteId, siteCatalog.catalog?.sites]);

  const visibleSites = orderedSites.slice(0, MAX_VISIBLE_SITE_TABS);
  const overflowSites = orderedSites.slice(MAX_VISIBLE_SITE_TABS);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        overflowRef.current &&
        event.target instanceof Node &&
        !overflowRef.current.contains(event.target)
      ) {
        setOverflowOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [overflowOpen]);

  function moveToSite(siteId: string) {
    props.onPrimaryNav();
    setOverflowOpen(false);

    if (siteId === orderedActiveSiteId && siteTabNextPath === DEFAULT_ROUTE) {
      void navigate(buildSiteRoute(siteId, DEFAULT_ROUTE));
      return;
    }

    void navigate(buildSiteActivateRoute(siteId, siteTabNextPath));
  }

  return (
    <div className="flex min-w-0 items-end gap-3 border-b border-border">
      <nav
        className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto pb-px [scrollbar-width:none] [-ms-overflow-style:none]"
        aria-label="상단 작업 탭"
      >
        {fixedTabs.map((tab) => {
          const TabIcon = tab.icon;

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              onClick={() => {
                props.onPrimaryNav();
              }}
              className={cn(
                "inline-flex h-9 min-w-fit items-center gap-2 rounded-t-sm border border-b-0 px-3 text-[0.77rem] font-semibold tracking-tight whitespace-nowrap transition-colors",
                tab.isActive
                  ? "border-border bg-background text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/45 hover:text-foreground",
              )}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}

        {visibleSites.length > 0 ? (
          <div
            className="ml-2 h-6 w-px shrink-0 self-center bg-border"
            aria-hidden="true"
          />
        ) : null}

        {visibleSites.map((entry) => {
          const isActive =
            entry.site.id === currentSiteId && !inFixedWorkspace;

          return (
            <button
              key={entry.site.id}
              type="button"
              className={cn(
                "inline-flex h-9 min-w-fit items-center gap-2 rounded-t-sm border border-b-0 px-3 text-[0.77rem] font-semibold tracking-tight whitespace-nowrap transition-colors",
                isActive
                  ? "border-border bg-background text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/45 hover:text-foreground",
              )}
              onClick={() => {
                if (isActive) {
                  props.onPrimaryNav();
                  return;
                }

                moveToSite(entry.site.id);
              }}
            >
              <Server className="h-4 w-4" />
              <span>{entry.site.name}</span>
            </button>
          );
        })}
      </nav>

      {overflowSites.length > 0 ? (
        <div ref={overflowRef} className="relative shrink-0 pb-px">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-sm border-border bg-background/92 px-2.5 text-[0.76rem]"
            aria-expanded={overflowOpen}
            aria-haspopup="menu"
            onClick={() => setOverflowOpen((current) => !current)}
          >
            <MoreHorizontal className="h-4 w-4" />
            더보기
          </Button>

          {overflowOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[13rem] overflow-hidden rounded-sm border border-border bg-card/98 p-1.5"
            >
              {overflowSites.map((entry) => (
                <button
                  key={entry.site.id}
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[0.84rem] text-foreground transition-colors hover:bg-muted/70"
                  onClick={() => moveToSite(entry.site.id)}
                >
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{entry.site.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
