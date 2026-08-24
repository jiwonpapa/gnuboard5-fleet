import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  groupedAdminRoutes,
  routePathForSite,
  selectedSiteId,
} from "./navigation";

export type ShellServerState = "checking" | "offline" | "online";

export function AppShell(props: {
  children: ReactNode;
  serverState: ShellServerState;
  serverVersion?: string;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const groups = groupedAdminRoutes();

  return (
    <div className="app-shell">
      <AppShellHeader
        navigationOpen={navigationOpen}
        onToggleNavigation={() => setNavigationOpen((open) => !open)}
      />
      <AppShellSidebar
        navigationOpen={navigationOpen}
        onNavigate={() => setNavigationOpen(false)}
        serverState={props.serverState}
      />
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">G5 Fleet / 운영 공간</span>
            <h1>사이트 운영 현황</h1>
          </div>
          <div className="version">
            <span>서버 버전</span>
            <strong>{props.serverVersion ?? "확인 중"}</strong>
          </div>
        </header>
        {props.children}
      </main>
      <div hidden data-navigation-group-count={groups.size} />
    </div>
  );
}

export function Brand() {
  return (
    <div className="brand" aria-label="G5 Fleet">
      <span className="brand-symbol">G5</span>
      <span>
        <strong>Fleet</strong>
        <small>통합 관리자</small>
      </span>
    </div>
  );
}

export function AppShellHeader(props: {
  navigationOpen: boolean;
  onToggleNavigation: () => void;
}) {
  return (
    <header className="mobile-header">
      <Brand />
      <button
        className="menu-button"
        type="button"
        aria-expanded={props.navigationOpen}
        aria-controls="primary-navigation"
        onClick={props.onToggleNavigation}
      >
        메뉴
      </button>
    </header>
  );
}

export function AppShellSidebar(props: {
  navigationOpen: boolean;
  onNavigate: () => void;
  serverState: ShellServerState;
}) {
  const location = useLocation();
  const siteId = selectedSiteId(location.pathname);
  return (
    <aside
      id="primary-navigation"
      className="sidebar"
      data-open={props.navigationOpen}
    >
      <Brand />
      <p className="sidebar-label">Fleet workspace</p>
      <nav aria-label="주요 메뉴">
        {[...groupedAdminRoutes()].map(([group, routes]) => (
          <section className="nav-group" key={group}>
            <strong>{group}</strong>
            {routes.map((route) => (
              <NavLink
                key={route.path}
                to={routePathForSite(route.path, siteId)}
                end={route.path === "/"}
                onClick={props.onNavigate}
              >
                <span>{route.label}</span>
                <span className="nav-mark">
                  {route.delivery === "active" ? "ON" : "—"}
                </span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-context">
        <span className="context-kicker">선택된 사이트</span>
        <strong>{siteId ?? "아직 선택되지 않음"}</strong>
        <span>
          {siteId
            ? "사이트 메뉴는 현재 site_id에만 귀속됩니다."
            : "사이트 목록에서 관리 대상을 선택하십시오."}
        </span>
      </div>
      <ServerBadge state={props.serverState} />
    </aside>
  );
}

export function ServerBadge({ state }: { state: ShellServerState }) {
  const label = state === "online"
    ? "서버 정상"
    : state === "offline"
    ? "서버 연결 실패"
    : "서버 확인 중";
  return (
    <div className="server-badge" data-state={state}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
