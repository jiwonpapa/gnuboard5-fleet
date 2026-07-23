import { Navigate, useLocation } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuthSession } from "../auth/use-auth-session";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
  buildSiteRoute,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
} from "./navigation";
import { useMasterLock } from "../master/use-master-lock";
import { useCurrentSiteId } from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";

export function ProtectedLayout() {
  const location = useLocation();
  const currentSiteId = useCurrentSiteId();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const selectedSiteId =
    currentSiteId ??
    siteCatalog.catalog?.active_site_id ??
    (siteCatalog.catalog?.sites.length === 1 ? siteCatalog.catalog.sites[0]?.site.id : null) ??
    null;
  const selectedEntry =
    siteCatalog.catalog?.sites.find((entry: SiteCatalogEntry) => entry.site.id === selectedSiteId) ??
    null;
  const session = useAuthSession({
    enabled:
      masterLock.status?.is_unlocked === true && selectedEntry?.status === "authenticated",
  });
  const currentPath = `${location.pathname}${location.search}`;

  if (masterLock.isLoading || siteCatalog.isLoading || session.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>세션 확인 중</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            현재 관리자 세션과 route 접근 권한을 확인하고 있습니다.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!masterLock.status?.is_configured) {
    return <Navigate to={buildMasterSetupRoute(currentPath)} replace />;
  }

  if (!masterLock.status.is_unlocked) {
    return <Navigate to={buildMasterUnlockRoute(currentPath)} replace />;
  }

  if (siteCatalog.catalog?.needs_onboarding) {
    return <Navigate to={SITE_ONBOARDING_ROUTE} replace />;
  }

  if (!currentSiteId) {
    if ((siteCatalog.catalog?.sites.length ?? 0) > 1) {
      return <Navigate to={SITE_DASHBOARD_ROUTE} replace />;
    }

    const nextSiteId =
      siteCatalog.catalog?.active_site_id ?? siteCatalog.catalog?.sites[0]?.site.id;
    if (nextSiteId) {
      return <Navigate to={buildSiteRoute(nextSiteId, "/login")} replace />;
    }
  }

  const currentSite = selectedEntry?.site ?? null;
  if (!currentSite) {
    if ((siteCatalog.catalog?.sites.length ?? 0) > 1) {
      return <Navigate to={SITE_DASHBOARD_ROUTE} replace />;
    }

    const nextSiteId =
      siteCatalog.catalog?.active_site_id ?? siteCatalog.catalog?.sites[0]?.site.id;
    if (nextSiteId) {
      return <Navigate to={buildSiteRoute(nextSiteId, "/login")} replace />;
    }

    return <Navigate to={SITE_ONBOARDING_ROUTE} replace />;
  }

  if (selectedEntry?.status !== "authenticated" || !session.authenticated) {
    return <Navigate to={buildSiteRoute(currentSite.id, "/login")} replace />;
  }

  return (
    <AppShell
      currentMember={session.currentMember}
      isBusy={session.logoutPending}
      isLocking={masterLock.lockPending}
      onLock={masterLock.lock}
      onLogout={session.logout}
    />
  );
}
