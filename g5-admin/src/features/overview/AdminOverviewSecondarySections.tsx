import { ArrowRight, Workflow } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { buildSiteRoute } from "../layout/navigation";
import type { SiteActivityLog } from "../../types/SiteActivityLog";
import { formatActivityAction } from "./overview-formatters";
import { OverviewStatusPanel } from "./overview-presentation";

type OverviewQuickLink = {
  groupLabel: string;
  item: {
    description: string;
    label: string;
    to: string;
  };
};

export function OverviewActivitySection(props: {
  activities: SiteActivityLog[];
  isLoading: boolean;
}) {
  return (
    <Card className="bg-card/98">
      <CardHeader className="space-y-2 border-b border-border/80">
        <CardTitle className="text-lg">최근 작업</CardTitle>
        <CardDescription className="text-sm leading-5 break-words">
          사이트 전환, 등록, 수정 같은 로컬 활동 기록입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {props.activities.length ? (
          props.activities.map((activity) => (
            <article
              key={String(activity.id)}
              className="rounded-lg border border-border bg-background/78 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Workflow className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <strong className="block break-words text-sm text-foreground">
                    {formatActivityAction(activity.action)}
                  </strong>
                  <p className="break-words text-sm leading-5 text-muted-foreground">
                    {activity.detail ?? "상세 설명 없음"}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.created_at}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <OverviewStatusPanel
            message={
              props.isLoading
                ? "활동 기록을 불러오는 중입니다."
                : "아직 기록된 최근 작업이 없습니다."
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewQuickLinksSection(props: {
  activeSiteId: string | null;
  quickLinks: OverviewQuickLink[];
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">빠른 링크</h2>
        <p className="text-sm leading-5 text-muted-foreground">
          자주 쓰는 메뉴를 관리자 앱 스타일로 묶어 제공합니다.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {props.quickLinks.map(({ groupLabel, item }) => (
          <NavLink
            key={item.to}
            to={props.activeSiteId ? buildSiteRoute(props.activeSiteId, item.to) : item.to}
            className="rounded-lg border border-border bg-card/98 p-4 transition-colors hover:border-primary/25 hover:bg-primary/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="outline">{groupLabel}</Badge>
                <strong className="block text-base font-semibold text-foreground">
                  {item.label}
                </strong>
                <p className="text-sm leading-5 break-words text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </section>
  );
}
