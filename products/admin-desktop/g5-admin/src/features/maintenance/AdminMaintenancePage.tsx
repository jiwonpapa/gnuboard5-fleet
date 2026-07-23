import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eraser, FolderX, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  purgeAdminCacheFiles,
  purgeAdminCaptchaFiles,
  purgeAdminMemberListFiles,
  purgeAdminSessionFiles,
  purgeAdminThumbnailFiles,
  type CommandError,
} from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type { AdminMaintenanceResponse } from "../../types/AdminMaintenanceResponse";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";

type MaintenanceAction = {
  description: string;
  id: string;
  label: string;
  route: string;
  run: () => Promise<AdminMaintenanceResponse>;
  task: string;
};

const maintenanceActions: MaintenanceAction[] = [
  {
    id: "session-files",
    label: "세션파일 일괄삭제",
    description: "6시간 이상 지난 세션 파일만 골라 삭제합니다.",
    route: "/environment/maintenance/session-files",
    run: purgeAdminSessionFiles,
    task: "session_files",
  },
  {
    id: "cache-files",
    label: "캐시파일 일괄삭제",
    description: "latest/content 캐시와 소셜 로그 캐시를 정리합니다.",
    route: "/environment/maintenance/cache-files",
    run: purgeAdminCacheFiles,
    task: "cache_files",
  },
  {
    id: "captcha-files",
    label: "캡챠파일 일괄삭제",
    description: "오래된 captcha 캐시 파일만 골라 삭제합니다.",
    route: "/environment/maintenance/captcha-files",
    run: purgeAdminCaptchaFiles,
    task: "captcha_files",
  },
  {
    id: "thumbnail-files",
    label: "썸네일파일 일괄삭제",
    description: "file/editor 영역의 thumb-* 썸네일 캐시를 제거합니다.",
    route: "/environment/maintenance/thumbnail-files",
    run: purgeAdminThumbnailFiles,
    task: "thumbnail_files",
  },
  {
    id: "member-list-files",
    label: "회원관리파일 일괄삭제",
    description: "회원 export 산출물은 지우고 log 계열은 보존합니다.",
    route: "/environment/maintenance/member-list-files",
    run: purgeAdminMemberListFiles,
    task: "member_list_files",
  },
];

export function AdminMaintenancePage() {
  const location = useLocation();
  const currentAction =
    maintenanceActions.find((action) => action.route === location.pathname) ??
    maintenanceActions[0];

  const mutation = useMutation<AdminMaintenanceResponse, CommandError, MaintenanceAction>({
    mutationFn: (action) => action.run(),
    onSuccess: (_response, action) => {
      toast.success(`${action.label} 작업을 실행했습니다.`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const latestResult = mutation.data?.result ?? null;
  const latestAction = useMemo(() => {
    if (!latestResult) {
      return currentAction;
    }

    return (
      maintenanceActions.find((action) => action.task === latestResult.task) ?? currentAction
    );
  }, [currentAction, latestResult]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Maintenance"
          title={currentAction.label}
          description="세션, 캐시, 캡챠, 썸네일, 회원관리 산출물 purge 작업을 하나의 maintenance 작업면에서 실행합니다. 현재 들어온 서브메뉴 route에 맞는 작업을 먼저 강조합니다."
          icon={Trash2}
          metrics={[
            {
              hint: "현재 선택된 purge 작업",
              icon: FolderX,
              label: "현재 작업",
              value: currentAction.label,
            },
            {
              hint: "최근 실행 삭제 건수",
              icon: Eraser,
              label: "최근 삭제",
              value: latestResult ? String(latestResult.deleted_count) : "대기",
            },
            {
              hint: "최근 실행 상태",
              icon: ShieldCheck,
              label: "최근 상태",
              value: latestResult?.status ?? "대기",
            },
          ]}
        />

        {mutation.error ? <ErrorBanner error={mutation.error} /> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {maintenanceActions.map((action) => {
            const isCurrent = currentAction.id === action.id;
            const isLatest = latestAction.id === action.id && latestResult !== null;

            return (
              <Card
                key={action.id}
                className={cn(
                  "border-border/70 bg-card/96 shadow-sm",
                  isCurrent && "border-primary/40 bg-primary/5",
                )}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isCurrent ? "secondary" : "outline"}>
                      {isCurrent ? "현재 메뉴" : "Maintenance"}
                    </Badge>
                    {isLatest ? (
                      <Badge variant="outline">
                        최근 실행 {latestResult?.deleted_count ?? 0}건
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle>{action.label}</CardTitle>
                  <CardDescription className="leading-6 break-words">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    endpoint
                  </p>
                  <p className="break-words text-sm text-foreground">
                    {resolveTarget(action.id)}
                  </p>
                  <Button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate(action)}
                  >
                    {mutation.isPending && isCurrent ? "실행 중..." : `${action.label} 실행`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>최근 실행 결과</CardTitle>
          <CardDescription>
            마지막으로 실행한 maintenance 작업의 서버 응답을 그대로 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResultField label="task" value={latestResult?.task ?? "없음"} />
          <ResultField label="status" value={latestResult?.status ?? "대기"} />
          <ResultField label="directory" value={latestResult?.directory ?? "없음"} />
          <ResultField
            label="deleted_count"
            value={latestResult ? String(latestResult.deleted_count) : "0"}
          />
          <ResultField
            label="message"
            value={latestResult?.message ?? "-"}
          />
          <ResultField
            label="social_log_deleted_count"
            value={
              latestResult?.social_log_deleted_count !== null &&
              latestResult?.social_log_deleted_count !== undefined
                ? String(latestResult.social_log_deleted_count)
                : "-"
            }
          />
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              deleted_paths
            </p>
            <div className="mt-2 space-y-1">
              {latestResult?.deleted_paths?.length ? (
                latestResult.deleted_paths.map((path) => (
                  <p
                    key={path}
                    className="break-all text-sm leading-6 text-foreground"
                  >
                    {path}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">없음</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultField(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-foreground">{props.value}</p>
    </div>
  );
}

function resolveTarget(actionId: string) {
  switch (actionId) {
    case "session-files":
      return "/admin/system/maintenance/session-files/purge";
    case "cache-files":
      return "/admin/system/maintenance/cache-files/purge";
    case "captcha-files":
      return "/admin/system/maintenance/captcha-files/purge";
    case "thumbnail-files":
      return "/admin/system/maintenance/thumbnail-files/purge";
    case "member-list-files":
      return "/admin/system/maintenance/member-list-files/purge";
    default:
      return "-";
  }
}
