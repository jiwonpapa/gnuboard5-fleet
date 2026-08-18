import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { getHealth, getMeta, type MetaResponse } from "./api/system";
import { AuditLogPage } from "./features/audit/AuditLogPage";
import { FleetAccessGate } from "./features/auth/FleetAccessGate";
import { BackupPage } from "./features/backup/BackupPage";
import { AdminBoardsPage } from "./features/boards/AdminBoardsPage";
import { AdminConfigWorkspacePage } from "./features/config/AdminConfigWorkspacePage";
import { AdminContentsPage } from "./features/contents/AdminContentsPage";
import { DiagnosticsPage } from "./features/debug/DiagnosticsPage";
import { AdminFaqsPage } from "./features/faqs/AdminFaqsPage";
import { AdminBoardGroupsPage } from "./features/groups/AdminBoardGroupsPage";
import { AdminLayoutsPage } from "./features/layouts/AdminLayoutsPage";
import { AdminMemberFilesPage } from "./features/members/AdminMemberFilesPage";
import { AdminMembersPage } from "./features/members/AdminMembersPage";
import { AdminMenusPage } from "./features/menus/AdminMenusPage";
import { AdminThemePage } from "./features/theme/AdminThemePage";
import { SiteOnboardingPage } from "./features/onboarding/SiteOnboardingPage";
import { AdminOverviewPage } from "./features/overview/AdminOverviewPage";
import { AdminPermissionsWorkspacePage } from "./features/permissions/AdminPermissionsWorkspacePage";
import { AdminPointsPage } from "./features/points/AdminPointsPage";
import { SecuritySettingsPage } from "./features/security/SecuritySettingsPage";
import { SiteActivationPage } from "./features/sites/SiteActivationPage";
import { SiteDashboardPage } from "./features/sites/SiteDashboardPage";
import { AppShell } from "./layout/AppShell";
import { AdminMenuStatusPage } from "./status/AdminMenuStatusPage";

type ServerState =
  | { status: "checking"; meta: null }
  | { status: "online"; meta: MetaResponse }
  | { status: "offline"; meta: null };

export default function App() {
  const server = useServerState();

  return (
    <BrowserRouter>
      <FleetAccessGate>
        <AppShell
          serverState={server.status}
          serverVersion={server.meta?.server_version}
        >
          <Routes>
            <Route path="/" element={<AdminOverviewPage />} />
            <Route path="/sites" element={<SiteDashboardPage />} />
            <Route path="/sites/new" element={<SiteOnboardingPage />} />
            <Route path="/sites/:siteId" element={<SiteDashboardPage />} />
            <Route path="/sites/:siteId/activate" element={<SiteActivationPage />} />
            <Route
              path="/sites/:siteId/admin/config"
              element={<AdminConfigWorkspacePage />}
            />
            <Route
              path="/sites/:siteId/admin/permissions"
              element={<AdminPermissionsWorkspacePage />}
            />
            <Route
              path="/sites/:siteId/admin/members"
              element={<AdminMembersPage />}
            />
            <Route
              path="/sites/:siteId/admin/members/export"
              element={<AdminMemberFilesPage />}
            />
            <Route
              path="/sites/:siteId/admin/groups"
              element={<AdminBoardGroupsPage />}
            />
            <Route
              path="/sites/:siteId/admin/boards"
              element={<AdminBoardsPage />}
            />
            <Route
              path="/sites/:siteId/admin/contents"
              element={<AdminContentsPage />}
            />
            <Route
              path="/sites/:siteId/admin/faqs"
              element={<AdminFaqsPage />}
            />
            <Route
              path="/sites/:siteId/admin/menus"
              element={<AdminMenusPage />}
            />
            <Route
              path="/sites/:siteId/admin/layouts"
              element={<AdminLayoutsPage />}
            />
            <Route
              path="/sites/:siteId/admin/theme"
              element={<AdminThemePage />}
            />
            <Route
              path="/sites/:siteId/admin/points"
              element={<AdminPointsPage />}
            />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/security" element={<SecuritySettingsPage />} />
            <Route path="/admin/:domain" element={<AdminMenuStatusPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </FleetAccessGate>
    </BrowserRouter>
  );
}

function useServerState(): ServerState {
  const [state, setState] = useState<ServerState>({
    status: "checking",
    meta: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      getHealth(controller.signal),
      getMeta(controller.signal),
    ])
      .then(([, meta]) => setState({ status: "online", meta }))
      .catch(() => setState({ status: "offline", meta: null }));
    return () => controller.abort();
  }, []);
  return state;
}

function NotFound() {
  return (
    <PlaceholderPage
      eyebrow="404"
      title="화면을 찾을 수 없습니다."
      description="왼쪽 메뉴에서 사용할 작업 공간을 선택하십시오."
    />
  );
}

function PlaceholderPage(props: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{props.eyebrow}</span>
          <h2>{props.title}</h2>
          <p>{props.description}</p>
        </div>
      </div>
      <div className="placeholder-rule">
        <span />
        <p>활성 서버 API와 함께 단계적으로 연결됩니다.</p>
      </div>
    </section>
  );
}
