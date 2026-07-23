import { AlertTriangle, DatabaseZap, FileText, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  getNavigationDeliveryDescription,
  getNavigationDeliveryLabel,
  resolveRouteMeta,
} from "../layout/navigation";
import { PageIntro } from "../layout/PageIntro";
import { useTheme } from "../layout/theme";

export function AdminMenuStatusPage() {
  const { devMode } = useTheme();
  const location = useLocation();
  const meta = resolveRouteMeta(location.pathname);

  if (!meta) {
    return null;
  }

  if (!devMode) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker="준비 중"
          title={`${meta.label} 작업면 준비 중`}
          description={`${meta.label} 메뉴는 현재 단계적으로 정리 중입니다.`}
          icon={meta.icon}
          metrics={[
            {
              label: "현재 상태",
              value: getNavigationDeliveryLabel(meta.delivery),
              icon: AlertTriangle,
            },
          ]}
        />

        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardHeader>
            <CardTitle>현재 상태</CardTitle>
            <CardDescription className="leading-6 break-words">
              이 메뉴는 아직 전용 작업면을 마무리하는 중입니다. 구현 완료 전까지는
              상태 안내 화면을 유지합니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Menu Status"
        title={`${meta.label} 작업면 준비 상태`}
        description={`${meta.description} 현재 메뉴 구조는 레거시 관리자 명칭을 우선 맞춘 상태이며, 이 화면은 PHP REST API와 Rust 작업면 사이의 갭을 정확히 드러내기 위한 상태 페이지입니다.`}
        icon={meta.icon}
        metrics={[
          {
            label: "현재 판정",
            value: getNavigationDeliveryLabel(meta.delivery),
            hint: getNavigationDeliveryDescription(meta.delivery),
            icon: AlertTriangle,
          },
          {
            label: "레거시 근거",
            value: meta.legacySource,
            hint: "그누보드 관리자 원본 메뉴 파일 기준",
            icon: FileText,
          },
          {
            label: "REST 계약",
            value:
              meta.apiTargets && meta.apiTargets.length > 0
                ? `${meta.apiTargets.length}개 endpoint`
                : "API 직접 노출 제외",
            hint:
              meta.delivery === "api_excluded"
                ? "웹/CLI 또는 외부 링크 성격으로 유지"
                : "OpenAPI와 PHP Admin 도메인 기준",
            icon: DatabaseZap,
          },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardHeader>
            <CardTitle>왜 아직 비어 있나</CardTitle>
            <CardDescription className="leading-6 break-words">
              {meta.delivery === "implemented"
                ? "현재 항목은 실작업 페이지가 이미 존재합니다. 이 상태 페이지가 보인다면 라우팅 매핑이 어긋난 것입니다."
                : meta.delivery === "api_ready"
                  ? "PHP REST API는 이미 준비됐지만, Rust 쪽 목록/상세/실행 폼과 후속 진단 UI가 아직 작성되지 않았습니다."
                  : "이 항목은 REST API 이관 대상이 아니라 운영 전용 실행기 또는 외부 링크 성격으로 유지되는 메뉴입니다."}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardHeader>
            <CardTitle>현재 셸 반영 방식</CardTitle>
            <CardDescription className="leading-6 break-words">
              레거시 관리자 메뉴 명칭은 먼저 맞추고, 아직 미구현인 화면은 이 상태 페이지로 연결해 구조를 숨기지 않도록 했습니다.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription className="leading-6 break-words">
              {meta.delivery === "api_ready"
                ? "목록/상세/실행 액션을 Rust route 화면으로 올리고, request_id 기반 디버그 진단까지 연결합니다."
                : meta.delivery === "api_excluded"
                  ? "REST가 아닌 내부 실행기 또는 웹 전용 흐름으로 유지할지 정책만 명확히 관리하면 됩니다."
                  : "현재 항목은 구현 상태를 유지하면서 세부 기능 확장과 검증을 이어가면 됩니다."}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/96 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{meta.groupLabel}</Badge>
            <Badge
              variant={meta.delivery === "implemented" ? "secondary" : "outline"}
              className={
                meta.delivery === "implemented"
                  ? "bg-emerald-100 text-emerald-900"
                  : meta.delivery === "api_ready"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-slate-300 bg-slate-50 text-slate-700"
              }
            >
              {getNavigationDeliveryLabel(meta.delivery)}
            </Badge>
          </div>
          <CardTitle>REST API 계약</CardTitle>
          <CardDescription className="leading-6 break-words">
            {meta.apiTargets && meta.apiTargets.length > 0
              ? "현재 PHP Admin API 기준으로 확인된 endpoint 목록입니다."
              : "이 메뉴는 공개 REST endpoint로 직접 노출하지 않는 항목입니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meta.apiTargets && meta.apiTargets.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {meta.apiTargets.map((target) => (
                <article
                  key={target}
                  className="rounded-[1.15rem] border border-border/70 bg-background/85 p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Endpoint
                  </p>
                  <strong className="mt-2 block break-words text-sm font-semibold text-foreground">
                    {target}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-border/70 bg-background/75 p-5 text-sm leading-6 text-muted-foreground">
              이 항목은 REST endpoint 대신 내부 실행 흐름 또는 외부 링크 성격으로 유지합니다.
            </div>
          )}
        </CardContent>
      </Card>

      {meta.note ? (
        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <CardTitle>보충 메모</CardTitle>
            </div>
            <CardDescription className="leading-6 break-words">
              {meta.note}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
