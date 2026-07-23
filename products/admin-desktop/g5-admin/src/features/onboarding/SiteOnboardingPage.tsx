import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { EntryScreen } from "../layout/EntryScreen";
import { DevBootstrapCard } from "../dev/DevBootstrapCard";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
  DEFAULT_ROUTE,
} from "../layout/navigation";
import { useMasterLock } from "../master/use-master-lock";
import { SiteRegistrationForm } from "../sites/SiteRegistrationForm";
import {
  resolveEntryPath,
  resolvePostRegistrationPath,
} from "../sites/site-flow";
import { useSiteCatalog } from "../sites/use-site-catalog";
import type { SiteCatalog } from "../../types/SiteCatalog";

export function SiteOnboardingPage() {
  const location = useLocation();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const [registeredCatalog, setRegisteredCatalog] =
    useState<SiteCatalog | null>(null);
  const currentPath = `${location.pathname}${location.search}`;

  if (masterLock.isLoading || siteCatalog.isLoading) {
    return null;
  }

  if (!masterLock.status?.is_configured) {
    return <Navigate to={buildMasterSetupRoute(currentPath)} replace />;
  }

  if (!masterLock.status.is_unlocked) {
    return <Navigate to={buildMasterUnlockRoute(currentPath)} replace />;
  }

  if (registeredCatalog) {
    return (
      <Navigate to={resolvePostRegistrationPath(registeredCatalog)} replace />
    );
  }

  if (
    !siteCatalog.isLoading &&
    siteCatalog.catalog &&
    !siteCatalog.catalog.needs_onboarding
  ) {
    return (
      <Navigate
        to={resolveEntryPath(siteCatalog.catalog, DEFAULT_ROUTE)}
        replace
      />
    );
  }

  return (
    <EntryScreen
      title="첫 사이트를 등록해 주십시오."
      description="사이트 이름과 API 주소를 입력하면 바로 다음 단계로 이동합니다."
    >
      <DevBootstrapCard
        onApplied={async () => {
          const response = await siteCatalog.refetchCatalog();
          if (response.data) {
            setRegisteredCatalog(response.data);
          }
        }}
      />
      <SiteRegistrationForm
        submitLabel="첫 사이트 등록"
        title="첫 사이트 등록"
        description="관리할 사이트 이름과 API 주소를 입력해 주십시오."
        onRegistered={(catalog) => {
          setRegisteredCatalog(catalog);
        }}
      />
    </EntryScreen>
  );
}
