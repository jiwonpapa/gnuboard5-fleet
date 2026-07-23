import { FolderTree, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAuthSession } from "../auth/use-auth-session";
import { PageIntro } from "../layout/PageIntro";
import { buildSiteRoute, SERVER_SSH_ROUTE } from "../layout/navigation";
import { useMasterLock } from "../master/use-master-lock";
import { useSiteSshSession } from "../server-ssh/use-site-ssh-session";
import { useCurrentSiteId } from "../sites/site-routing";
import { useSiteCatalog } from "../sites/use-site-catalog";
import { SiteSftpWorkspaceSurface } from "./SiteSftpWorkspaceSurface";
import { useSiteSftpWorkspace } from "./use-site-sftp-workspace";

export function SiteSftpBrowserPage() {
  const navigate = useNavigate();
  const currentSiteId = useCurrentSiteId();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const siteName =
    siteCatalog.catalog?.sites.find((entry) => entry.site.id === currentSiteId)?.site.name ??
    "현재 사이트";
  const selectedEntry =
    siteCatalog.catalog?.sites.find((entry) => entry.site.id === currentSiteId) ?? null;
  const authSession = useAuthSession({
    enabled:
      masterLock.status?.is_unlocked === true && selectedEntry?.status === "authenticated",
  });
  const workspaceEnabled =
    currentSiteId !== null &&
    masterLock.status?.is_unlocked === true &&
    selectedEntry?.status === "authenticated" &&
    authSession.authenticated;
  const securityRestoring =
    masterLock.isLoading || siteCatalog.isLoading || authSession.isLoading;
  const sshSession = useSiteSshSession(currentSiteId, {
    enabled: workspaceEnabled,
  });
  const workspace = useSiteSftpWorkspace(currentSiteId, {
    enabled: workspaceEnabled,
  });

  if (!currentSiteId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사이트를 먼저 선택해 주십시오.</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          SFTP 작업면은 사이트별 활성 SSH 세션 위에서만 동작합니다.
        </CardContent>
      </Card>
    );
  }

  const connected = workspaceEnabled && sshSession.response?.connected === true;

  if (securityRestoring || !workspaceEnabled) {
    return (
      <div className="space-y-5">
        <PageIntro
          kicker="Server Files"
          title="SFTP"
          description="파일 클라이언트처럼 좌측 탐색 트리와 메인 원격 목록을 한 작업면에 두고, 편집은 모달로 처리합니다."
          icon={FolderTree}
        />
        <Card>
          <CardHeader>
            <CardTitle>{securityRestoring ? "세션 복원 중" : "SFTP 사용 준비 중"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {securityRestoring
              ? "앱 잠금 상태와 사이트 로그인 세션을 다시 확인하고 있습니다."
              : "앱 잠금 해제와 사이트 로그인을 다시 완료한 뒤 SFTP 작업면을 사용해 주십시오."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageIntro
        kicker="Server Files"
        title="SFTP"
        description="파일 클라이언트처럼 좌측 탐색 트리와 메인 원격 목록을 한 작업면에 두고, 편집은 모달로 처리합니다."
        icon={FolderTree}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(buildSiteRoute(currentSiteId, SERVER_SSH_ROUTE))}
            >
              SSH
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void workspace.browser.refetchDirectory()}
            >
              <RefreshCcw className="h-4 w-4" />
              새로고침
            </Button>
          </div>
        }
        metrics={[
          {
            label: "사이트",
            value: siteName,
            hint: "현재 SFTP 작업면이 귀속되는 사이트",
            icon: FolderTree,
          },
          {
            label: "SSH 연결",
            value: connected ? "connected" : "disconnected",
            hint: "SFTP 작업면은 활성 SSH 세션을 전제로 동작합니다.",
            icon: FolderTree,
          },
          {
            label: "현재 경로",
            value: workspace.browser.directory?.resolved_path ?? workspace.browsePath,
            hint: "SFTP 서버가 canonicalize한 현재 디렉터리",
            icon: FolderTree,
          },
        ]}
      />

      <SiteSftpWorkspaceSurface
        connected={connected}
        externalError={sshSession.responseError}
        workspace={workspace}
      />
    </div>
  );
}
