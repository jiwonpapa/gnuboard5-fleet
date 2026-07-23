import { primaryNavigationGroups } from "../layout/navigation";
import { useCurrentSiteId } from "../sites/site-routing";
import { useSiteActivity } from "../sites/use-site-activity";
import { useSiteCatalog } from "../sites/use-site-catalog";
import {
  OverviewRemoteDashboardSection,
  OverviewSummarySection,
} from "./AdminOverviewSections";
import {
  OverviewActivitySection,
  OverviewQuickLinksSection,
} from "./AdminOverviewSecondarySections";
import { useAdminDashboard } from "./use-admin-dashboard";

export function AdminOverviewPage() {
  const currentSiteId = useCurrentSiteId();
  const siteCatalog = useSiteCatalog();
  const activityQuery = useSiteActivity(currentSiteId, 8);
  const currentEntry =
    siteCatalog.catalog?.sites.find((entry) => entry.site.id === currentSiteId) ??
    siteCatalog.catalog?.sites.find(
      (entry) => entry.site.id === siteCatalog.catalog?.active_site_id,
    ) ??
    null;
  const activeSite = currentEntry?.site ?? null;
  const isAuthenticated = currentEntry?.status === "authenticated";
  const dashboardQuery = useAdminDashboard({
    enabled: isAuthenticated,
    siteId: activeSite?.id ?? null,
  });
  const dashboardData = dashboardQuery.data?.data ?? null;
  const dashboardSummary = dashboardData?.summary ?? null;
  const quickLinks = primaryNavigationGroups.flatMap((group) =>
    group.items.slice(0, 2).map((item) => ({
      groupLabel: group.label,
      item,
    })),
  );
  const sessionLabel = isAuthenticated ? "로그인됨" : "로그인 필요";
  const activityCount = activityQuery.data?.activities.length ?? 0;

  return (
    <div className="space-y-5">
      <OverviewSummarySection
        activeSite={activeSite}
        activityCount={activityCount}
        dashboardActive={isAuthenticated && dashboardData !== null}
        hasCurrentEntry={currentEntry !== null}
        isAuthenticated={isAuthenticated}
        quickLinks={quickLinks}
        sessionLabel={sessionLabel}
        siteCount={siteCatalog.catalog?.sites.length ?? 0}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <OverviewActivitySection
            activities={activityQuery.data?.activities ?? []}
            isLoading={activityQuery.isLoading}
          />
        </div>
        <div className="space-y-5">
          <OverviewRemoteDashboardSection
            activeSite={activeSite}
            dashboardData={dashboardData}
            dashboardSummary={dashboardSummary}
            errorMessage={
              dashboardQuery.error?.message ??
              (dashboardQuery.error
                ? "원격 관리자 대시보드를 불러오지 못했습니다."
                : null)
            }
            isAuthenticated={isAuthenticated}
            isLoading={dashboardQuery.isLoading}
          />
        </div>
      </section>

      <OverviewQuickLinksSection
        activeSiteId={activeSite?.id ?? null}
        quickLinks={quickLinks}
      />
    </div>
  );
}
