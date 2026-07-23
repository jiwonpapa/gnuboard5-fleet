import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Radar, ScanSearch, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  searchAdminVisits,
  type CommandError,
} from "../../api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminVisitSearchResponse } from "../../types/AdminVisitSearchResponse";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ListPagination } from "../shared/ListPagination";
import {
  TextInputControlField,
  InfoField,
} from "../admin/shared/AdminFormFields";
import { Button } from "../../components/ui/button";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  adminVisitSearchFormSchema,
  buildAdminVisitSearchQuery,
  emptyAdminVisitSearchFormValues,
  type AdminVisitSearchFormValues,
} from "./admin-visits-form";

export function AdminVisitSearchPage() {
  const [page, setPage] = useState(1);
  const [submittedQuery, setSubmittedQuery] = useState(
    buildAdminVisitSearchQuery(emptyAdminVisitSearchFormValues),
  );

  const form = useForm<AdminVisitSearchFormValues>({
    defaultValues: emptyAdminVisitSearchFormValues,
    resolver: zodResolver(adminVisitSearchFormSchema),
  });

  const query = useQuery<AdminVisitSearchResponse, CommandError>({
    queryKey: [
      "admin",
      "visits",
      "search",
      page,
      submittedQuery.date_from ?? "",
      submittedQuery.date_to ?? "",
      submittedQuery.ip ?? "",
      submittedQuery.referer ?? "",
      submittedQuery.agent ?? "",
    ],
    queryFn: () => searchAdminVisits({ ...submittedQuery, page }),
    retry: false,
  });

  const visits = query.data?.visits ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Visit Search"
          title="접속자검색"
          description="`/admin/visits/search`를 route-native 화면으로 분리했습니다. 기간, IP, referer, agent 기준으로 접속 로그를 검색하고 페이지 이동합니다."
          icon={ScanSearch}
          metrics={[
            {
              hint: "현재 검색 조건 기준 total rows",
              icon: Radar,
              label: "조회 건수",
              value: String(pagination?.total ?? 0),
            },
            {
              hint: "현재 페이지 번호",
              icon: ShieldCheck,
              label: "현재 페이지",
              value: String(pagination?.page ?? page),
            },
            {
              hint: "현재 IP 필터",
              icon: ScanSearch,
              label: "IP 필터",
              value: submittedQuery.ip ?? "없음",
            },
          ]}
        />

        {query.error ? <ErrorBanner error={query.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>검색 조건</CardTitle>
            <CardDescription>
              접속 로그는 기간과 일부 문자열 조건만으로 빠르게 필터링합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => {
                setPage(1);
                setSubmittedQuery(buildAdminVisitSearchQuery(values, 1));
              })}
            >
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
              <TextInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="IP"
                name="ip"
                placeholder="127.0.0.1"
              />
              <TextInputControlField
                control={form.control}
                disabled={query.isFetching}
                label="Referer"
                name="referer"
                placeholder="google.com"
              />
              <TextInputControlField
                className="md:col-span-2"
                control={form.control}
                disabled={query.isFetching}
                label="User-Agent"
                name="agent"
                placeholder="Mozilla/5.0"
              />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={query.isFetching}>
                  {query.isFetching ? "검색 중..." : "검색"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => {
                    form.reset(emptyAdminVisitSearchFormValues);
                    setPage(1);
                    setSubmittedQuery(
                      buildAdminVisitSearchQuery(emptyAdminVisitSearchFormValues),
                    );
                  }}
                >
                  초기화
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>접속 로그 목록</CardTitle>
            <CardDescription>
              응답 필드 그대로 IP, 시간, referer, agent, 브라우저, OS, 디바이스를 노출합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminDataTable
              columns={[
                {
                  header: "기본",
                  render: (visit) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        #{visit.vi_id} · {visit.vi_ip ?? "-"}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {visit.vi_date ?? "-"} {visit.vi_time ?? ""}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "환경",
                  render: (visit) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>browser: {visit.vi_browser ?? "-"}</p>
                      <p>os: {visit.vi_os ?? "-"}</p>
                      <p>device: {visit.vi_device ?? "-"}</p>
                    </div>
                  ),
                },
                {
                  header: "Referer / Agent",
                  render: (visit) => (
                    <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                      <p className="break-words">{visit.vi_referer ?? "-"}</p>
                      <p className="break-words">{visit.vi_agent ?? "-"}</p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="조회된 접속 로그가 없습니다."
              getRowKey={(visit) => String(visit.vi_id)}
              rows={visits}
            />

            <ListPagination
              hasNext={pagination?.has_next ?? false}
              hasPrev={pagination?.has_prev ?? page > 1}
              isBusy={query.isFetching}
              onNext={() => setPage((current) => current + 1)}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              page={pagination?.page ?? page}
              total={pagination?.total ?? 0}
              totalPages={pagination?.last_page ?? 1}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>현재 검색 요약</CardTitle>
          <CardDescription>
            현재 검색 조건과 마지막 응답 request id를 우측에 고정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoField label="date_from" value={submittedQuery.date_from} />
          <InfoField label="date_to" value={submittedQuery.date_to} />
          <InfoField label="ip" value={submittedQuery.ip} />
          <InfoField label="referer" value={submittedQuery.referer} />
          <InfoField label="agent" value={submittedQuery.agent} />
          <InfoField label="request_id" value={query.data?.request_id} />
        </CardContent>
      </Card>
    </div>
  );
}
