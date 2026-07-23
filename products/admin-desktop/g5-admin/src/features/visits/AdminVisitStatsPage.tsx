import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarRange, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  getAdminVisitStats,
  type CommandError,
} from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminVisitStatsResponse } from "../../types/AdminVisitStatsResponse";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  InfoField,
  SelectInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  adminVisitStatsFormSchema,
  buildAdminVisitStatsQuery,
  emptyAdminVisitStatsFormValues,
  visitStatsTypeOptions,
  type AdminVisitStatsFormValues,
} from "./admin-visits-form";
import { useState } from "react";

export function AdminVisitStatsPage() {
  const [submittedQuery, setSubmittedQuery] = useState(
    buildAdminVisitStatsQuery(emptyAdminVisitStatsFormValues)!,
  );

  const form = useForm<AdminVisitStatsFormValues>({
    defaultValues: emptyAdminVisitStatsFormValues,
    resolver: zodResolver(adminVisitStatsFormSchema),
  });

  const query = useQuery<AdminVisitStatsResponse, CommandError>({
    queryKey: [
      "admin",
      "visits",
      "stats",
      submittedQuery.type ?? "date",
      submittedQuery.date_from ?? "",
      submittedQuery.date_to ?? "",
      submittedQuery.limit ?? 30,
    ],
    queryFn: () => getAdminVisitStats(submittedQuery),
    retry: false,
  });

  const summary = query.data?.summary ?? null;
  const items = query.data?.items ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Visit Stats"
          title="접속자집계"
          description="`/admin/visits/stats`를 route-native 화면으로 분리했습니다. 집계 유형, 기간, 제한 건수를 바꿔가며 방문 통계를 바로 조회합니다."
          icon={Activity}
          metrics={[
            {
              hint: "현재 선택한 집계 유형",
              icon: Activity,
              label: "집계 유형",
              value: query.data?.type ?? submittedQuery.type ?? "date",
            },
            {
              hint: "조건 기간 내 총 방문 수",
              icon: CalendarRange,
              label: "총 방문",
              value: summary ? String(summary.total_visits) : "loading...",
            },
            {
              hint: "조건 기간 내 unique IP 수",
              icon: ShieldCheck,
              label: "고유 IP",
              value: summary ? String(summary.unique_ips) : "loading...",
            },
          ]}
        />

        {query.error ? <ErrorBanner error={query.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>집계 조건</CardTitle>
            <CardDescription>
              기간과 집계 축을 바꾸면 같은 통계 endpoint를 다른 관점으로 바로 볼 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => {
                const nextQuery = buildAdminVisitStatsQuery(values);
                if (!nextQuery) {
                  return;
                }

                setSubmittedQuery(nextQuery);
              })}
            >
              <SelectInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="집계 유형"
                name="type"
                options={visitStatsTypeOptions.map((value) => ({
                  label: value,
                  value,
                }))}
              />
              <TextInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="조회 제한"
                name="limit"
                placeholder="30"
                type="number"
              />
              <TextInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="시작일"
                name="date_from"
                placeholder="2026-03-01"
              />
              <TextInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="종료일"
                name="date_to"
                placeholder="2026-03-08"
              />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={query.isFetching}>
                  {query.isFetching ? "조회 중..." : "통계 조회"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => {
                    form.reset(emptyAdminVisitStatsFormValues);
                    setSubmittedQuery(
                      buildAdminVisitStatsQuery(emptyAdminVisitStatsFormValues)!,
                    );
                  }}
                >
                  기본값 복원
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>집계 결과</CardTitle>
            <CardDescription>
              현재 집계 유형과 기간 기준으로 반환된 stat_key / visit_count 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminDataTable
              columns={[
                {
                  header: "stat_key",
                  render: (item) => (
                    <div className="min-w-0">
                      <strong className="block text-sm font-semibold text-foreground">
                        {item.stat_key}
                      </strong>
                    </div>
                  ),
                },
                {
                  header: "visit_count",
                  render: (item) => (
                    <span className="text-sm text-foreground">
                      {item.visit_count.toLocaleString()}
                    </span>
                  ),
                },
              ]}
              emptyMessage="조회된 집계 결과가 없습니다."
              getRowKey={(item) => `${item.stat_key}-${item.visit_count}`}
              rows={items}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>요약</CardTitle>
          <CardDescription>
            현재 조건의 핵심 숫자를 우측에 고정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoField label="type" value={query.data?.type ?? submittedQuery.type} />
          <InfoField label="total_visits" value={summary?.total_visits} />
          <InfoField label="active_days" value={summary?.active_days} />
          <InfoField label="visit_rows" value={summary?.visit_rows} />
          <InfoField label="unique_ips" value={summary?.unique_ips} />
          <InfoField label="first_date" value={summary?.first_date} />
          <InfoField label="last_date" value={summary?.last_date} />
          <InfoField label="request_id" value={query.data?.request_id} />
        </CardContent>
      </Card>
    </div>
  );
}
