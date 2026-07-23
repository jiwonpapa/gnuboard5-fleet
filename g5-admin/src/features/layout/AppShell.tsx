import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DevDiagnosticsDrawer } from "../../debug/DevDiagnosticsDrawer";
import { DebugDock } from "../../debug/DebugDock";
import { Badge } from "../../components/ui/badge";
import type { MemberProfile } from "../../types/MemberProfile";
import { APP_OVERVIEW_LABEL } from "./branding";
import { AppShellContextMenuOverlay } from "./AppShellContextMenuOverlay";
import { AppShellHeader } from "./AppShellHeader";
import { AppShellSidebar } from "./AppShellSidebar";
import {
  DEFAULT_ROUTE,
  resolveRouteGroup,
  resolveRouteMeta,
} from "./navigation";
import { useTheme } from "./theme";
import { useAppShellRefreshBridge } from "./app-shell-refresh";
import { useAppShellContextMenu } from "./useAppShellContextMenu";
import { useAppShellScrollReset } from "./useAppShellScrollReset";
import { useHeaderVisibility } from "./useHeaderVisibility";

export function AppShell(props: {
  currentMember: MemberProfile | null;
  isBusy: boolean;
  isLocking?: boolean;
  onLock?: () => Promise<unknown>;
  onLogout: () => Promise<unknown>;
}) {
  const { devMode } = useTheme();
  useAppShellRefreshBridge();
  const location = useLocation();
  const activeMeta =
    resolveRouteMeta(location.pathname) ?? resolveRouteMeta(DEFAULT_ROUTE);
  const activeGroup =
    resolveRouteGroup(location.pathname) ?? resolveRouteGroup(DEFAULT_ROUTE);
  const { headerElevated, headerVisible, showHeader } = useHeaderVisibility();
  const scrollViewportToTop = useAppShellScrollReset(showHeader);

  const {
    contextMenu,
    contextMenuItems,
    contextMenuRef,
    handleContextAction,
    handleContextMenu,
  } = useAppShellContextMenu({
    routeKey: location.pathname,
  });

  useLayoutEffect(() => {
    scrollViewportToTop();
  }, [location.pathname, scrollViewportToTop]);

  return (
    <div
      className="app-shell-root min-h-[100dvh] bg-background text-foreground transition-colors"
      onContextMenu={handleContextMenu}
    >
      <div className="app-shell-viewport mx-auto flex min-h-[100dvh] w-full min-w-[380px] max-w-[1500px] flex-col bg-transparent">
        <AppShellHeader
          activeGroup={activeGroup}
          currentMember={props.currentMember}
          headerElevated={headerElevated}
          headerVisible={headerVisible}
          isBusy={props.isBusy}
          isLocking={props.isLocking ?? false}
          onLock={props.onLock ?? (async () => undefined)}
          onLogout={props.onLogout}
          onPrimaryNav={scrollViewportToTop}
        />

        <div className="app-shell-body flex flex-1 flex-col xl:flex-row">
          <AppShellSidebar activeGroup={activeGroup} activeMeta={activeMeta} />

          <main className="app-shell-main min-w-0 flex-1 bg-background">
            <div className="app-shell-main-header border-b border-border bg-card px-5 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <h2 className="text-[1.45rem] font-semibold tracking-tight text-foreground">
                    {activeMeta?.label ?? APP_OVERVIEW_LABEL}
                  </h2>
                  {devMode ? (
                    <p className="max-w-4xl text-sm leading-5 break-words text-muted-foreground">
                      {activeMeta?.description ??
                        "메뉴와 구조 설명을 먼저 보고 필요한 관리 화면으로 이동합니다."}
                    </p>
                  ) : null}
                </div>

                {devMode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <DevDiagnosticsDrawer
                      activeDescription={activeMeta?.description}
                      activeGroupLabel={activeGroup?.label ?? "개요"}
                      activeLabel={activeMeta?.label ?? APP_OVERVIEW_LABEL}
                    />
                    <Badge variant="outline">
                      주메뉴 {activeGroup?.label ?? "개요"}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="app-shell-main-content pl-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AppShellContextMenuOverlay
        contextMenu={contextMenu}
        contextMenuItems={contextMenuItems}
        contextMenuRef={contextMenuRef}
        onAction={(action) => {
          void handleContextAction(action);
        }}
      />

      <DebugDock />
    </div>
  );
}
