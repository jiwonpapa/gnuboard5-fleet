import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Activity, MessageSquare, PanelsTopLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getAdminWriteCountStats, type CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  SelectInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  adminWriteCountFilterSchema,
  buildAdminWriteCountStatsQuery,
  emptyAdminWriteCountFilterValues,
  type AdminWriteCountFilterValues,
} from "./admin-write-count-form";

const periodOptions = [
  { label: "시간", value: "hour" },
  { label: "일", value: "day" },
  { label: "주", value: "week" },
  { label: "월", value: "month" },
  { label: "년", value: "year" },
] as const;

export function AdminWriteCountPage() {
  const [filters, setFilters] = useState<AdminWriteCountFilterValues>(
    emptyAdminWriteCountFilterValues,
  );
  const form = useForm<AdminWriteCountFilterValues>({
    defaultValues: emptyAdminWriteCountFilterValues,
    resolver: zodResolver(adminWriteCountFilterSchema),
  });

  const statsQuery = useQuery<
    Awaited<ReturnType<typeof getAdminWriteCountStats>>,
    CommandError
  >({
    queryKey: ["admin", "write-count", filters],
    queryFn: () => getAdminWriteCountStats(buildAdminWriteCountStatsQuery(filters)),
    retry: false,
  });

  const topError = statsQuery.error ?? null;
  const summary = statsQuery.data?.summary ?? null;
  const items = statsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin Write Count"
        title="글,댓글 현황"
        description="`/admin/write-count/stats`를 route-native로 연결했습니다. 기간 단위별 글/댓글 버킷 집계와 누적 합계를 한 화면에서 확인합니다."
        icon={Activity}
        metrics={[
          {
            hint: "현재 필터 기준 글 수 합계",
            icon: PanelsTopLeft,
            label: "글 합계",
            value: String(summary?.write_total ?? 0),
          },
          {
            hint: "현재 필터 기준 댓글 수 합계",
            icon: MessageSquare,
            label: "댓글 합계",
            value: String(summary?.comment_total ?? 0),
          },
          {
            hint: "버킷 row 수",
            icon: Activity,
            label: "버킷 수",
            value: String(items.length),
          },
        ]}
      />

      {topError ? <ErrorBanner error={topError} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>집계 조건</CardTitle>
          <CardDescription>
            기간 단위, 날짜 범위, 게시판을 바꿔 글/댓글 흐름을 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={form.handleSubmit((values) => setFilters(values))}
          >
            <SelectInputControlField
              control={form.control}
              label="기간 단위"
              name="period"
              options={[...periodOptions]}
            />
            <TextInputControlField
              control={form.control}
              label="시작일"
              name="date_from"
              type="date"
            />
            <TextInputControlField
              control={form.control}
              label="종료일"
              name="date_to"
              type="date"
            />
            <TextInputControlField
              control={form.control}
              label="게시판"
              name="bo_table"
              placeholder="notice"
            />
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" disabled={statsQuery.isFetching}>
                {statsQuery.isFetching ? "조회 중..." : "조회"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={statsQuery.isFetching}
                onClick={() => {
                  form.reset(emptyAdminWriteCountFilterValues);
                  setFilters(emptyAdminWriteCountFilterValues);
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
          <CardTitle>버킷 집계</CardTitle>
          <CardDescription>
            bucket별 글/댓글 수를 확인합니다. `week`는 `YYYY-Wnn` 형식으로 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={[
              {
                header: "Bucket",
                render: (row) => (
                  <p className="font-medium text-foreground">{row.bucket}</p>
                ),
              },
              {
                header: "글 수",
                render: (row) => (
                  <p className="text-sm text-muted-foreground">
                    {row.write_count.toLocaleString()}
                  </p>
                ),
              },
              {
                header: "댓글 수",
                render: (row) => (
                  <p className="text-sm text-muted-foreground">
                    {row.comment_count.toLocaleString()}
                  </p>
                ),
              },
            ]}
            emptyMessage="조회 조건에 맞는 글/댓글 집계가 없습니다."
            getRowKey={(row) => row.bucket}
            rows={items}
          />
        </CardContent>
      </Card>
    </div>
  );
}
