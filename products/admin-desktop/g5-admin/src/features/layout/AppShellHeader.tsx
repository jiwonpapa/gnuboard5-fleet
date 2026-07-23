import { LockKeyhole, LogOut, PanelsTopLeft, PlugZap } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { MemberProfile } from "../../types/MemberProfile";
import type { NavigationGroup } from "./navigation";
import { DEFAULT_ROUTE } from "./navigation";
import { APP_DISPLAY_NAME } from "./branding";
import { DisplayToolbar } from "./DisplayToolbar";
import { requestAppShellRefresh } from "./app-shell-refresh";
import { toSiteRoute, useCurrentSiteId } from "../sites/site-routing";
import { useSiteSshConnectionPresence } from "../server-ssh/site-ssh-connection-presence";
import { useSiteCatalog } from "../sites/use-site-catalog";
import { useTheme } from "./theme";
import {
  buildInitials,
  shellControlSurfaceClass,
  shellIconClass,
} from "./shell";
import { AppShellWorkspaceTabs } from "./AppShellWorkspaceTabs";
import { AppShellHeaderSearch } from "./AppShellHeaderSearch";

export function AppShellHeader(props: {
  activeGroup: NavigationGroup | undefined;
  currentMember: MemberProfile | null;
  headerElevated: boolean;
  headerVisible: boolean;
  isBusy: boolean;
  isLocking?: boolean;
  onLock?: () => Promise<unknown>;
  onLogout: () => Promise<unknown>;
  onPrimaryNav: () => void;
}) {
  const { devMode } = useTheme();
  const currentSiteId = useCurrentSiteId();
  const siteCatalog = useSiteCatalog();
  const resolvedSiteId = currentSiteId ?? siteCatalog.catalog?.active_site_id ?? null;
  const sshConnected = useSiteSshConnectionPresence(resolvedSiteId);
  const location = useLocation();
  const navigate = useNavigate();
  const initials = buildInitials(
    props.currentMember?.mb_nick ??
      props.currentMember?.mb_name ??
      props.currentMember?.mb_id ??
      "GM",
  );

  return (
    <header
      className={cn(
        "app-shell-header sticky top-0 z-40 border-b border-border bg-card/94 backdrop-blur transition-transform duration-300 ease-out will-change-transform",
        props.headerVisible ? "translate-y-0" : "-translate-y-[calc(100%+0.75rem)]",
        props.headerElevated && "border-b-border",
      )}
    >
      <div className="app-shell-header-inner space-y-1.5 px-4 py-2.5">
        <div className="app-shell-header-row flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <button
            type="button"
            className="app-shell-brand flex min-w-0 cursor-pointer items-center gap-3 text-left"
            aria-label={`${APP_DISPLAY_NAME} 첫 화면으로 이동`}
            onClick={() => {
              props.onPrimaryNav();
              const targetPath = toSiteRoute(currentSiteId, DEFAULT_ROUTE);
              if (
                location.pathname === targetPath ||
                location.pathname.startsWith(`${targetPath}/`)
              ) {
                return;
              }
              void navigate(targetPath);
            }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/12 text-sm font-semibold text-primary">
              <PanelsTopLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-[0.95rem] font-semibold tracking-tight text-foreground">
                {APP_DISPLAY_NAME}
              </h1>
              {devMode ? (
                <p className="max-w-3xl text-[11px] leading-4.5 break-words text-muted-foreground">
                  {props.activeGroup?.description ??
                    "상단 작업 탭과 좌측 서브메뉴 기준으로 관리자 작업면을 분리합니다."}
                </p>
              ) : null}
            </div>
          </button>

          <div className="app-shell-header-controls flex flex-wrap items-center justify-end gap-2">
            <AppShellHeaderSearch
              activeGroup={props.activeGroup}
              devMode={devMode}
              onPrimaryNav={props.onPrimaryNav}
            />

            <DisplayToolbar
              onRefresh={() => requestAppShellRefresh()}
              className="shrink-0"
            />

            {resolvedSiteId ? (
              <div
                className={cn(
                  shellControlSurfaceClass,
                  "flex h-10 items-center justify-center px-2.5",
                  sshConnected && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                )}
                aria-label={
                  sshConnected
                    ? "현재 사이트 SSH 연결 중"
                    : "현재 사이트 SSH 연결 없음"
                }
                title={
                  sshConnected
                    ? "현재 사이트 SSH 연결 중"
                    : "현재 사이트 SSH 연결 없음"
                }
              >
                <PlugZap className={cn(shellIconClass, sshConnected && "text-emerald-300")} />
              </div>
            ) : null}

            <div
              className={cn(
                shellControlSurfaceClass,
                "flex min-w-0 items-center gap-2 px-3",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-secondary text-sm font-semibold text-secondary-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-[0.84rem] font-semibold text-foreground">
                  {props.currentMember?.mb_id ?? "관리자"}
                </strong>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.isLocking}
              className="h-10 rounded-sm border-border bg-background/92 px-3 text-[0.82rem] text-foreground"
              onClick={() => {
                void props.onLock?.();
              }}
            >
              <LockKeyhole className={shellIconClass} />
              앱 잠금
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.isLocking}
              className="h-10 rounded-sm border-border bg-background/92 px-3 text-[0.82rem] text-foreground hover:border-destructive/25 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                void props.onLogout();
              }}
            >
              <LogOut className={shellIconClass} />
              로그아웃
            </Button>
          </div>
        </div>

        <AppShellWorkspaceTabs onPrimaryNav={props.onPrimaryNav} />
      </div>
    </header>
  );
}
