import { useState } from "react";
import { Link2, PlugZap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  buildSiteRoute,
  SERVER_FILES_ROUTE,
} from "../layout/navigation";
import { ErrorBanner } from "../shared/ErrorBanner";
import { useCurrentSiteId } from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";
import { SiteSshCurrentConnectionCard } from "./SiteSshCurrentConnectionCard";
import { SiteSshHostPolicyCard } from "./SiteSshHostPolicyCard";
import { SiteSshProfilesModal } from "./SiteSshProfilesModal";
import { SiteSshShellCard } from "./SiteSshShellCard";
import { useSiteSshSession } from "./use-site-ssh-session";

export function SiteSshSessionPage() {
  const navigate = useNavigate();
  const [profilesModalOpen, setProfilesModalOpen] = useState(false);
  const currentSiteId = useCurrentSiteId();
  const siteCatalog = useSiteCatalog();
  const sshSession = useSiteSshSession(currentSiteId);
  const siteName =
    siteCatalog.catalog?.sites.find((entry) => entry.site.id === currentSiteId)?.site.name ??
    "현재 사이트";

  async function handleDisconnect() {
    if (!currentSiteId) {
      return;
    }

    try {
      await sshSession.disconnect({ site_id: currentSiteId });
      toast.success("SSH 연결을 해제했습니다.");
    } catch {
      // ErrorBanner handles payload details.
    }
  }

  if (!currentSiteId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사이트를 먼저 선택해 주십시오.</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          SSH 연결은 사이트별 런타임 상태로 관리됩니다.
        </CardContent>
      </Card>
    );
  }

  const activeProfile = sshSession.response?.active_profile ?? null;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-card/95 px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <PlugZap className="size-4 text-primary" aria-hidden="true" />
            <h1 className="text-lg font-semibold tracking-tight text-foreground">SSH</h1>
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {siteName}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Link2 className="size-3.5" aria-hidden="true" />
              {sshSession.response?.connected ? "connected" : "disconnected"}
            </span>
            <span className="inline-flex items-center gap-1">
              <PlugZap className="size-3.5" aria-hidden="true" />
              {sshSession.response?.shell_open ? "shell-open" : "shell-closed"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setProfilesModalOpen(true)}
          >
            프로필/연결
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(buildSiteRoute(currentSiteId, SERVER_FILES_ROUTE))}
          >
            SFTP
          </Button>
        </div>
      </section>

      {sshSession.responseError ? <ErrorBanner error={sshSession.responseError} /> : null}
      {sshSession.disconnectError ? <ErrorBanner error={sshSession.disconnectError} /> : null}

      <SiteSshCurrentConnectionCard
        activeProfile={activeProfile}
        disconnectPending={sshSession.disconnectPending}
        isLoading={sshSession.isLoading}
        onManageProfiles={() => setProfilesModalOpen(true)}
        response={sshSession.response}
        onDisconnect={() => {
          void handleDisconnect();
        }}
      />

      <SiteSshShellCard
        key={currentSiteId}
        connected={sshSession.response?.connected ?? false}
        shellOpen={sshSession.response?.shell_open ?? false}
        siteId={currentSiteId}
        onStatusSync={sshSession.refetchStatus}
      />

      <SiteSshHostPolicyCard />

      <SiteSshProfilesModal
        open={profilesModalOpen}
        siteId={currentSiteId}
        siteName={siteName}
        onOpenChange={setProfilesModalOpen}
      />
    </div>
  );
}
