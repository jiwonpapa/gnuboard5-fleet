import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  exportSiteBackup,
  healthCheckSite,
  importSiteBackup,
  type CommandError,
} from "../../api/client";
import {
  buildMasterSetupRoute,
  buildSiteRoute,
  buildMasterUnlockRoute,
  buildSiteActivateRoute,
  SERVER_FILES_ROUTE,
  SERVER_SSH_ROUTE,
  SITE_ONBOARDING_ROUTE,
} from "../layout/navigation";
import { useMasterLock } from "../master/use-master-lock";
import { SiteDashboardDialogs } from "./SiteDashboardDialogs";
import {
  SiteDashboardContent,
  SiteDashboardLoadingState,
} from "./SiteDashboardSections";
import {
  detectBackupImportFormat,
  formatBytes,
  selectBackupExportPath,
  selectBackupImportPath,
  SensitiveAction,
  toCommandError,
  toOptionalString,
} from "./site-dashboard-helpers";
import { useSiteCatalog } from "./use-site-catalog";

export function SiteDashboardPage(props?: { embedded?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sensitiveAction, setSensitiveAction] =
    useState<SensitiveAction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [backupPending, setBackupPending] = useState<
    null | "export" | "import" | "lock"
  >(null);
  const [stepUpAuth, setStepUpAuth] = useState({
    backup_password: "",
    backup_password_confirm: "",
    current_password: "",
    current_totp_code: "",
  });
  const [stepUpError, setStepUpError] = useState<CommandError | null>(null);
  const currentPath = `${location.pathname}${location.search}`;

  const sites = useMemo(
    () => siteCatalog.catalog?.sites ?? [],
    [siteCatalog.catalog?.sites]
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredSites = useMemo(
    () =>
      sites.filter((entry) => {
        if (normalizedSearchQuery.length === 0) {
          return true;
        }

        return (
          entry.site.name.toLowerCase().includes(normalizedSearchQuery) ||
          entry.site.api_base_url.toLowerCase().includes(normalizedSearchQuery)
        );
      }),
    [normalizedSearchQuery, sites]
  );

  const healthQueries = useQueries({
    queries: sites.map((entry) => ({
      queryKey: [
        "sites",
        "health-status",
        entry.site.id,
        entry.site.api_base_url,
      ],
      queryFn: () =>
        healthCheckSite({
          api_base_url: entry.site.api_base_url,
        }),
      retry: false,
      staleTime: 30_000,
    })),
  });

  async function handleLock() {
    setBackupPending("lock");
    try {
      await masterLock.lock();
      toast.message("앱 잠금을 다시 설정했습니다.");
    } catch (error) {
      toast.error(`앱 잠금 실패: ${String(error)}`);
    } finally {
      setBackupPending(null);
    }
  }

  async function handleBackupExport() {
    const path = await selectBackupExportPath();
    if (!path) {
      return;
    }
    openSensitiveAction({ kind: "export", path });
  }

  async function handleBackupImport() {
    const path = await selectBackupImportPath();
    if (!path) {
      return;
    }
    openSensitiveAction({
      kind: "import",
      format: detectBackupImportFormat(path),
      path,
    });
  }

  function openSensitiveAction(action: SensitiveAction) {
    setSensitiveAction(action);
    setStepUpAuth({
      backup_password: "",
      backup_password_confirm: "",
      current_password: "",
      current_totp_code: "",
    });
    setStepUpError(null);
  }

  function closeSensitiveAction() {
    setSensitiveAction(null);
    setStepUpAuth({
      backup_password: "",
      backup_password_confirm: "",
      current_password: "",
      current_totp_code: "",
    });
    setStepUpError(null);
  }

  async function handleSensitiveActionConfirm() {
    if (!sensitiveAction) {
      return;
    }

    const auth = {
      current_password: stepUpAuth.current_password,
      current_totp_code: toOptionalString(stepUpAuth.current_totp_code),
    };

    try {
      if (sensitiveAction.kind === "delete") {
        const nextCatalog = await siteCatalog.deleteSite({
          site_id: sensitiveAction.entry.site.id,
          auth,
        });
        closeSensitiveAction();
        toast.success(
          `${sensitiveAction.entry.site.name} 사이트를 삭제했습니다.`
        );
        if (nextCatalog.needs_onboarding || nextCatalog.sites.length === 0) {
          void navigate(SITE_ONBOARDING_ROUTE);
        }
        return;
      }

      if (sensitiveAction.kind === "export") {
        setBackupPending("export");
        const result = await exportSiteBackup({
          path: sensitiveAction.path,
          auth,
          backup_password: stepUpAuth.backup_password,
        });
        closeSensitiveAction();
        toast.success("휴대용 암호화 백업 저장 완료", {
          description: `${result.site_count}개 사이트, ${formatBytes(
            result.copied_bytes
          )} 저장`,
        });
        return;
      }

      setBackupPending("import");
      const result = await importSiteBackup({
        path: sensitiveAction.path,
        auth,
        backup_password:
          sensitiveAction.kind === "import" &&
          sensitiveAction.format === "portable"
            ? stepUpAuth.backup_password
            : "",
      });
      await siteCatalog.refetchCatalog();
      closeSensitiveAction();
      toast.success("백업 가져오기 완료", {
        description: `신규 ${result.imported_site_count}개, 재사용 ${result.reused_site_count}개 사이트를 반영했습니다.`,
      });
    } catch (error) {
      setStepUpError(toCommandError(error));
    } finally {
      setBackupPending((current) => (current === "lock" ? current : null));
    }
  }

  if (masterLock.isLoading || siteCatalog.isLoading) {
    return <SiteDashboardLoadingState />;
  }

  if (!masterLock.status?.is_configured) {
    return <Navigate to={buildMasterSetupRoute(currentPath)} replace />;
  }

  if (!masterLock.status.is_unlocked) {
    return <Navigate to={buildMasterUnlockRoute(currentPath)} replace />;
  }

  if (siteCatalog.catalog?.needs_onboarding || sites.length === 0) {
    return <Navigate to={SITE_ONBOARDING_ROUTE} replace />;
  }

  return (
    <>
      <SiteDashboardContent
        embedded={props?.embedded}
        activeSiteId={siteCatalog.catalog?.active_site_id ?? undefined}
        backupPending={backupPending}
        filteredSites={filteredSites}
        healthQueries={healthQueries}
        onAddSite={() => setDialogOpen(true)}
        onBackupExport={() => {
          void handleBackupExport();
        }}
        onBackupImport={() => {
          void handleBackupImport();
        }}
        onDeleteSite={(entry) => openSensitiveAction({ kind: "delete", entry })}
        onLock={() => {
          void handleLock();
        }}
        onOpenFiles={(siteId) => {
          void navigate(buildSiteRoute(siteId, SERVER_FILES_ROUTE));
        }}
        onOpenSsh={(siteId) => {
          void navigate(buildSiteRoute(siteId, SERVER_SSH_ROUTE));
        }}
        onSearchQueryChange={setSearchQuery}
        onSelectSite={(siteId) => {
          void navigate(buildSiteActivateRoute(siteId));
        }}
        searchQuery={searchQuery}
        sites={sites}
      />
      <SiteDashboardDialogs
        backupPending={backupPending}
        deleteSitePending={siteCatalog.deleteSitePending}
        dialogOpen={dialogOpen}
        onBackupPasswordChange={(value) =>
          setStepUpAuth((current) => ({ ...current, backup_password: value }))
        }
        onBackupPasswordConfirmChange={(value) =>
          setStepUpAuth((current) => ({
            ...current,
            backup_password_confirm: value,
          }))
        }
        onDialogClose={() => setDialogOpen(false)}
        onPasswordChange={(value) =>
          setStepUpAuth((current) => ({ ...current, current_password: value }))
        }
        onRegisteredSiteId={(siteId) => {
          void navigate(buildSiteActivateRoute(siteId));
        }}
        onSensitiveActionCancel={closeSensitiveAction}
        onSensitiveActionConfirm={() => {
          void handleSensitiveActionConfirm();
        }}
        onTotpCodeChange={(value) =>
          setStepUpAuth((current) => ({ ...current, current_totp_code: value }))
        }
        requiresTotp={masterLock.status?.totp_enabled ?? false}
        sensitiveAction={sensitiveAction}
        stepUpAuth={stepUpAuth}
        stepUpError={stepUpError}
      />
    </>
  );
}
