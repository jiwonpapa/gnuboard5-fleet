import { useState } from "react";
import { Bug, ServerCog, WandSparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ErrorBanner } from "../shared/ErrorBanner";
import { useTheme } from "../layout/theme";
import { useDevBootstrap } from "./use-dev-bootstrap";

export function DevBootstrapCard(props: {
  onApplied?: () => void | Promise<void>;
}) {
  const { devMode } = useTheme();
  const bootstrap = useDevBootstrap();
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  if (bootstrap.statusLoading && !bootstrap.status) {
    return null;
  }

  const shouldRender = devMode || bootstrap.isAvailable;
  if (!shouldRender) {
    return null;
  }

  async function handleApply() {
    const result = await bootstrap.apply();
    const summary = [
      result.master_lock_configured ? "마스터 잠금 준비" : null,
      result.site_name ? `사이트: ${result.site_name}` : null,
      result.site_login_authenticated && result.site_login_mb_id
        ? `로그인: ${result.site_login_mb_id}`
        : null,
      result.created_ssh_profile_count > 0
        ? `SSH ${result.created_ssh_profile_count}개 추가`
        : null,
      result.updated_ssh_profile_count > 0
        ? `SSH ${result.updated_ssh_profile_count}개 갱신`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    setApplyMessage(summary || "개발 기본값을 적용했습니다.");
    await props.onApplied?.();
  }

  const sshCount = bootstrap.status?.ssh_profile_count ?? 0;

  return (
    <Card className="border-amber-400/40 bg-amber-50/70 shadow-sm dark:bg-amber-950/20">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
            개발모드
          </Badge>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
            local bootstrap
          </Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-[1.05rem]">
            <WandSparkles className="h-4 w-4 text-amber-600" />
            개발 기본값 한 번에 채우기
          </CardTitle>
          <CardDescription className="leading-6">
            로컬 개발용으로 마스터 비밀번호, 사이트 1개, 사이트 로그인, SSH 접속정보를
            `app-config.json` 기준으로 한 번에 적용합니다.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bootstrap.statusError ? <ErrorBanner error={bootstrap.statusError} /> : null}
        {bootstrap.applyError ? <ErrorBanner error={bootstrap.applyError} /> : null}

        <div className="grid gap-2 text-sm md:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bug className="h-3.5 w-3.5" />
              마스터 잠금
            </div>
            <p className="mt-1 font-medium text-foreground">
              {bootstrap.status?.has_master_password ? "설정값 준비됨" : "미설정"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ServerCog className="h-3.5 w-3.5" />
              사이트
            </div>
            <p className="mt-1 truncate font-medium text-foreground">
              {bootstrap.status?.site_name ?? "미설정"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ServerCog className="h-3.5 w-3.5" />
              사이트 로그인
            </div>
            <p className="mt-1 font-medium text-foreground">
              {bootstrap.status?.has_site_auth ? "설정값 준비됨" : "미설정"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ServerCog className="h-3.5 w-3.5" />
              SSH 프로필
            </div>
            <p className="mt-1 font-medium text-foreground">{sshCount}개</p>
          </div>
        </div>

        {!bootstrap.isAvailable ? (
          <p className="text-sm leading-6 text-muted-foreground">
            `app-config.json`의 `devBootstrap` 블록이 비어 있어 아직 바로 채울 수
            없습니다.
          </p>
        ) : null}
        {applyMessage ? (
          <p className="text-sm leading-6 text-emerald-700 dark:text-emerald-300">
            {applyMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void handleApply();
            }}
            disabled={!bootstrap.isAvailable || bootstrap.applyPending}
          >
            {bootstrap.applyPending ? "적용 중..." : "개발 기본값 채우기"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
