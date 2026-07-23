import { Activity, ArrowRight, Coins, FileText, Globe, Server, ShieldCheck, SquareStack, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { buildSiteRoute } from "../layout/navigation";
import type { AdminDashboardData } from "../../types/AdminDashboardData";
import type { AdminDashboardSummary } from "../../types/AdminDashboardSummary";
import type { Site } from "../../types/Site";
import {
  formatCount,
  formatLastSeen,
  formatParts,
} from "./overview-formatters";
import {
  DashboardListCard,
  OverviewDetailRow,
  OverviewMetricCard,
  OverviewStatusPanel,
} from "./overview-presentation";

type OverviewQuickLink = {
  groupLabel: string;
  item: {
    description: string;
    label: string;
    to: string;
  };
};

export function OverviewSummarySection(props: {
  activeSite: Site | null;
  activityCount: number;
  dashboardActive: boolean;
  hasCurrentEntry: boolean;
  isAuthenticated: boolean;
  quickLinks: OverviewQuickLink[];
  sessionLabel: string;
  siteCount: number;
}) {
  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetricCard
          icon={Server}
          label="API 대상"
          value={props.activeSite?.api_base_url ?? "선택된 사이트가 없습니다."}
        />
        <OverviewMetricCard
          icon={ShieldCheck}
          label="세션 상태"
          value={props.sessionLabel}
        />
        <OverviewMetricCard
          icon={SquareStack}
          label="등록 사이트"
          value={`${props.siteCount}개`}
        />
        <OverviewMetricCard
          icon={Activity}
          label="최근 활동"
          value={`${props.activityCount}건`}
        />
      </section>

      <Card className="bg-card/98">
        <CardHeader className="space-y-4 border-b border-border/80">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              사이트 작업 홈
            </p>
            <CardTitle className="text-[1.85rem] tracking-tight">
              {props.activeSite?.name ?? "현재 사이트"} 운영 요약
            </CardTitle>
            <CardDescription className="text-sm leading-5 break-words">
              현재 사이트 상태와 원격 운영 요약을 함께 확인하고 자주 쓰는 메뉴로 바로 이동하십시오.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {props.hasCurrentEntry ? (
              <Badge
                variant={props.isAuthenticated ? "secondary" : "outline"}
                className={
                  props.isAuthenticated
                    ? "border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
                }
              >
                {props.sessionLabel}
              </Badge>
            ) : null}
            {props.activeSite?.is_default ? <Badge variant="outline">기본 사이트</Badge> : null}
            {props.dashboardActive ? <Badge variant="outline">원격 대시보드 활성</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 md:grid-cols-2">
            <OverviewDetailRow
              label="현재 API 주소"
              value={props.activeSite?.api_base_url ?? "선택된 사이트가 없습니다."}
            />
            <OverviewDetailRow
              label="활성 사이트 ID"
              value={props.activeSite?.id ?? "없음"}
            />
            <OverviewDetailRow
              label="세션 연결"
              value={props.sessionLabel}
            />
            <OverviewDetailRow
              label="최근 활동 수"
              value={`${props.activityCount}건`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {props.quickLinks.slice(0, 4).map(({ groupLabel, item }) => (
              <NavLink
                key={item.to}
                to={props.activeSite ? buildSiteRoute(props.activeSite.id, item.to) : item.to}
                className="flex items-center justify-between rounded-lg border border-border bg-background/75 px-4 py-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {groupLabel}
                  </p>
                  <strong className="block text-sm font-semibold text-foreground">
                    {item.label}
                  </strong>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </NavLink>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function OverviewRemoteDashboardSection(props: {
  activeSite: Site | null;
  dashboardData: AdminDashboardData | null;
  dashboardSummary: AdminDashboardSummary | null;
  errorMessage?: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          원격 관리자 대시보드
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          활성 사이트의 <code>/admin/dashboard</code> 응답을 작업 홈에 바로 표시합니다.
        </p>
      </div>

      {!props.activeSite ? (
        <OverviewStatusPanel message="사이트를 활성화하면 원격 관리자 대시보드를 불러옵니다." />
      ) : !props.isAuthenticated ? (
        <OverviewStatusPanel message="활성 사이트에 로그인하면 원격 관리자 대시보드가 표시됩니다." />
      ) : props.isLoading ? (
        <OverviewStatusPanel message="원격 관리자 대시보드를 불러오는 중입니다." />
      ) : props.errorMessage ? (
        <OverviewStatusPanel message={props.errorMessage} tone="error" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <OverviewMetricCard
              icon={Users}
              label="총 회원"
              value={formatCount(props.dashboardSummary?.members?.total_members, "명")}
              hint={formatParts([
                formatCount(props.dashboardSummary?.members?.blocked_members, "차단"),
                formatCount(props.dashboardSummary?.members?.leave_members, "탈퇴"),
              ])}
            />
            <OverviewMetricCard
              icon={FileText}
              label="게시물"
              value={formatCount(props.dashboardSummary?.posts?.total_rows, "건")}
            />
            <OverviewMetricCard
              icon={Coins}
              label="포인트 로그"
              value={formatCount(props.dashboardSummary?.points?.total_rows, "건")}
            />
            <OverviewMetricCard
              icon={Globe}
              label="방문"
              value={formatCount(props.dashboardSummary?.visits?.total_visits, "회")}
              hint={formatParts([
                formatCount(props.dashboardSummary?.visits?.unique_ips, "고유 IP"),
                formatLastSeen(props.dashboardSummary?.visits?.last_date),
              ])}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <DashboardListCard
              description={`최근 가입 회원 ${props.dashboardData?.limit ?? 5}건`}
              emptyMessage="최근 가입 회원이 없습니다."
              items={props.dashboardData?.recent_members ?? []}
              title="최근 회원"
              renderPrimary={(member) =>
                member.mb_name ?? member.mb_nick ?? member.mb_id ?? "이름 없음"
              }
              renderSecondary={(member) =>
                formatParts([
                  member.mb_id ? `ID ${member.mb_id}` : null,
                  member.mb_level !== undefined && member.mb_level !== null
                    ? `레벨 ${member.mb_level}`
                    : null,
                  member.mb_point !== undefined && member.mb_point !== null
                    ? `포인트 ${member.mb_point.toLocaleString("ko-KR")}`
                    : null,
                ])
              }
              renderMeta={(member) => member.mb_datetime ?? null}
            />
            <DashboardListCard
              description={`최근 게시물 ${props.dashboardData?.limit ?? 5}건`}
              emptyMessage="최근 게시물이 없습니다."
              items={props.dashboardData?.recent_posts ?? []}
              title="최근 게시물"
              renderPrimary={(post) => post.wr_subject ?? "제목 없음"}
              renderSecondary={(post) =>
                formatParts([
                  post.bo_subject ?? post.bo_table ?? null,
                  post.wr_name ?? null,
                  post.view_type === "c" ? "댓글" : post.view_type === "w" ? "글" : null,
                ])
              }
              renderMeta={(post) => post.wr_datetime ?? null}
            />
            <DashboardListCard
              description={`최근 포인트 ${props.dashboardData?.limit ?? 5}건`}
              emptyMessage="최근 포인트 내역이 없습니다."
              items={props.dashboardData?.recent_points ?? []}
              title="최근 포인트"
              renderPrimary={(point) => point.po_content ?? "내용 없음"}
              renderSecondary={(point) =>
                formatParts([
                  point.mb_name ?? point.mb_id ?? null,
                  point.po_point !== undefined && point.po_point !== null
                    ? `${point.po_point.toLocaleString("ko-KR")}점`
                    : null,
                  point.po_mb_point !== undefined && point.po_mb_point !== null
                    ? `잔여 ${point.po_mb_point.toLocaleString("ko-KR")}점`
                    : null,
                ])
              }
              renderMeta={(point) => point.po_datetime ?? null}
            />
          </div>
        </div>
      )}
    </section>
  );
}
