import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { EntryScreen } from "../layout/EntryScreen";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
} from "../layout/navigation";
import { useMasterLock } from "../master/use-master-lock";
import { resolveSiteActivationSuccessPath } from "./site-flow";
import { useSiteCatalog } from "./use-site-catalog";

export function SiteActivationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId?: string }>();
  const [searchParams] = useSearchParams();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const [activationError, setActivationError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);
  const currentPath = `${location.pathname}${location.search}`;

  const currentEntry =
    siteCatalog.catalog?.sites.find((entry) => entry.site.id === siteId) ??
    null;
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (!currentEntry || startedRef.current) {
      return;
    }

    startedRef.current = true;

    void (async () => {
      try {
        const health = await siteCatalog.healthCheckSite({
          api_base_url: currentEntry.site.api_base_url,
        });

        if (!health.reachable) {
          setActivationError(health.message);
          return;
        }

        await siteCatalog.switchSite({ site_id: currentEntry.site.id });
        void navigate(
          resolveSiteActivationSuccessPath(currentEntry, nextPath),
          {
            replace: true,
          },
        );
      } catch (error) {
        setActivationError(String(error));
        toast.error(`사이트 활성화 실패: ${String(error)}`);
      }
    })();
  }, [attempt, currentEntry, navigate, nextPath, siteCatalog]);

  if (masterLock.isLoading || siteCatalog.isLoading) {
    return <ActivationLoadingState />;
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

  if (!currentEntry) {
    return <Navigate to={SITE_DASHBOARD_ROUTE} replace />;
  }

  if (!activationError) {
    return (
      <ActivationLoadingState
        siteName={currentEntry.site.name}
        message="사이트 세션을 활성화 중입니다. API 건강 상태를 먼저 확인한 뒤 로그인 또는 작업 홈으로 이동합니다."
      />
    );
  }

  return (
    <EntryScreen
      title={`${currentEntry.site.name} 사이트를 활성화하지 못했습니다.`}
      description="연결 상태를 다시 확인한 뒤 계속 진행해 주십시오."
    >
      <Card className="w-full border-border/70 bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-[1.35rem]">활성화 실패</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-[0.98rem] leading-7 text-muted-foreground">
            {activationError}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigate(SITE_DASHBOARD_ROUTE);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              사이트 목록으로
            </Button>
            <Button
              type="button"
              onClick={() => {
                startedRef.current = false;
                setActivationError(null);
                setAttempt((currentAttempt) => currentAttempt + 1);
              }}
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    </EntryScreen>
  );
}

function ActivationLoadingState(
  props: { message?: string; siteName?: string } = {},
) {
  return (
    <EntryScreen
      title="사이트 세션을 확인하고 있습니다."
      description={
        props.message ?? "사이트 세션과 접근 가능 여부를 확인하고 있습니다."
      }
    >
      <Card className="w-full border-border/70 bg-card">
        <CardContent className="flex items-center gap-3 p-6 text-[0.98rem] text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>
            {props.siteName ? `${props.siteName} 확인 중` : "확인 중"}
          </span>
        </CardContent>
      </Card>
    </EntryScreen>
  );
}
