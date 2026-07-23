import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Plus, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { Label } from "../../components/ui/label";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";
import { EntryScreen } from "../layout/EntryScreen";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
  buildSiteActivateRoute,
  buildSiteRoute,
  DEFAULT_ROUTE,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
} from "../layout/navigation";
import { useMasterLock } from "../master/use-master-lock";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SiteFormDialog } from "../sites/SiteFormDialog";
import { useCurrentSiteId } from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";
import { useAuthSession } from "./use-auth-session";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSiteId = useCurrentSiteId();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const [mbId, setMbId] = useState("");
  const [mbPassword, setMbPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentPath = `${location.pathname}${location.search}`;
  const currentEntry =
    siteCatalog.catalog?.sites.find(
      (entry: SiteCatalogEntry) => entry.site.id === currentSiteId,
    ) ?? null;
  const currentSite = currentEntry?.site ?? null;
  const fallbackSiteId =
    siteCatalog.catalog?.active_site_id ??
    siteCatalog.catalog?.sites[0]?.site.id ??
    null;
  const session = useAuthSession({
    enabled:
      masterLock.status?.is_unlocked === true &&
      currentEntry?.status === "authenticated",
  });

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextMbId = String(formData.get("mb_id") ?? "").trim();
    const nextPassword = String(formData.get("mb_password") ?? "");

    setMbId(nextMbId);
    setMbPassword(nextPassword);

    void session.login({
      mb_id: nextMbId,
      mb_password: nextPassword,
    });
  }

  if (masterLock.isLoading || siteCatalog.isLoading || session.isLoading) {
    return null;
  }

  if (!masterLock.status?.is_configured) {
    return <Navigate to={buildMasterSetupRoute(currentPath)} replace />;
  }

  if (!masterLock.status.is_unlocked) {
    return <Navigate to={buildMasterUnlockRoute(currentPath)} replace />;
  }

  if (!siteCatalog.isLoading && siteCatalog.catalog?.needs_onboarding) {
    return <Navigate to={SITE_ONBOARDING_ROUTE} replace />;
  }

  if (!siteCatalog.isLoading && (!currentSiteId || !currentSite)) {
    if (siteCatalog.catalog && siteCatalog.catalog.sites.length > 1) {
      return <Navigate to={SITE_DASHBOARD_ROUTE} replace />;
    }

    if (fallbackSiteId) {
      return <Navigate to={buildSiteRoute(fallbackSiteId, "/login")} replace />;
    }

    return <Navigate to={SITE_ONBOARDING_ROUTE} replace />;
  }

  if (session.authenticated && currentSiteId) {
    return (
      <Navigate to={buildSiteRoute(currentSiteId, DEFAULT_ROUTE)} replace />
    );
  }

  return (
    <EntryScreen
      title="사이트 관리자 로그인을 진행해 주십시오."
      description={
        currentSite
          ? `${currentSite.name}에 로그인하면 바로 작업 화면으로 이동합니다.`
          : "선택한 사이트에 로그인하면 바로 작업 화면으로 이동합니다."
      }
    >
      <Card className="border-border/70 bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-[1.45rem]">사이트 관리자 로그인</CardTitle>
          <CardDescription className="text-[1rem] leading-7">
            관리자 계정으로 로그인해 사이트 작업을 시작합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.loginError ? (
            <ErrorBanner error={session.loginError} />
          ) : null}

          <div className="rounded-sm border border-border bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[0.98rem] font-semibold text-foreground">
                {currentSite?.name ?? "선택한 사이트"}
              </strong>
              {currentEntry ? (
                <Badge
                  variant={
                    currentEntry.status === "authenticated"
                      ? "secondary"
                      : "outline"
                  }
                  className={
                    currentEntry.status === "authenticated"
                      ? "bg-emerald-100 text-emerald-900"
                      : "border-slate-300 bg-slate-50 text-slate-700"
                  }
                >
                  {currentEntry.status === "authenticated"
                    ? "로그인됨"
                    : "로그인 필요"}
                </Badge>
              ) : null}
              {currentSite?.is_default ? (
                <Badge variant="outline">기본 사이트</Badge>
              ) : null}
            </div>
            <p className="mt-2 break-all text-[0.96rem] leading-7 text-muted-foreground">
              {currentSite?.api_base_url ?? "선택한 사이트가 없습니다."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div className="space-y-2">
              <Label htmlFor="mb-id">관리자 아이디</Label>
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="mb-id"
                  name="mb_id"
                  value={mbId}
                  onChange={(event) => setMbId(event.currentTarget.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={session.loginPending}
                />
              </InputGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mb-password">관리자 비밀번호</Label>
              <InputGroup className="h-12 rounded-sm border-border/70">
                <InputGroupAddon className="pl-3 pr-0">
                  <InputGroupText>
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="mb-password"
                  name="mb_password"
                  type="password"
                  value={mbPassword}
                  onChange={(event) => setMbPassword(event.currentTarget.value)}
                  placeholder="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={session.loginPending}
                />
              </InputGroup>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void navigate(SITE_DASHBOARD_ROUTE);
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  다른 사이트 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  사이트 추가
                </Button>
              </div>

              <Button
                type="submit"
                disabled={
                  session.loginPending ||
                  mbId.trim().length < 3 ||
                  mbPassword.length === 0
                }
              >
                {session.loginPending ? "로그인 중..." : "로그인"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SiteFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRegistered={(catalog) => {
          const nextSiteId =
            catalog.active_site_id ?? catalog.sites[0]?.site.id;
          if (!nextSiteId) {
            return;
          }
          void navigate(buildSiteActivateRoute(nextSiteId));
        }}
      />
    </EntryScreen>
  );
}
