import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminPopularItem } from "../../types/AdminPopularItem";
import type { AdminPopularRankItem } from "../../types/AdminPopularRankItem";
import type { Pagination } from "../../types/Pagination";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { TextInputControlField } from "../admin/shared/AdminFormFields";
import type { AdminPopularFilterFormValues } from "./admin-popular-form";

export function AdminPopularFiltersSection(props: {
  form: UseFormReturn<AdminPopularFilterFormValues>;
  isBusy: boolean;
  onOpenResetDialog: () => void;
  onSubmit: (values: AdminPopularFilterFormValues) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>조회 기준</CardTitle>
        <CardDescription>
          날짜 범위를 바꾸면 목록과 순위가 함께 갱신됩니다. 초기화는 같은 날짜 조건을
          그대로 사용합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={props.form.handleSubmit(props.onSubmit)}
        >
          <TextInputControlField
            control={props.form.control}
            disabled={props.isBusy}
            label="시작일"
            name="date_from"
            type="date"
          />
          <TextInputControlField
            control={props.form.control}
            disabled={props.isBusy}
            label="종료일"
            name="date_to"
            type="date"
          />
          <TextInputControlField
            control={props.form.control}
            disabled={props.isBusy}
            label="순위 limit"
            name="rank_limit"
            placeholder="20"
            type="number"
          />

          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button type="submit" disabled={props.isBusy}>
              {props.isBusy ? "조회 중..." : "조회"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={props.isBusy}
              onClick={props.onOpenResetDialog}
            >
              인기검색어 초기화
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminPopularListSection(props: {
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  isFetching: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  pagination: Pagination | null;
  populars: AdminPopularItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>인기검색어관리</CardTitle>
        <CardDescription>
          일자별 검색어 집계를 확인합니다. rank는 날짜별 내림차순, count 순으로
          정렬됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminDataTable
          columns={[
            {
              header: "검색어",
              render: (row) => (
                <strong className="block break-words text-sm font-semibold text-foreground">
                  {row.pp_word}
                </strong>
              ),
            },
            {
              header: "일자/순위",
              render: (row) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{row.pp_date}</p>
                  <p>순위 {row.pp_rank}</p>
                </div>
              ),
            },
            {
              header: "횟수",
              render: (row) => (
                <p className="text-sm text-muted-foreground">
                  {row.pp_cnt.toLocaleString()}
                </p>
              ),
            },
          ]}
          emptyMessage="조회 조건에 맞는 인기검색어가 없습니다."
          getRowKey={(row) => `${row.pp_date}:${row.pp_word}`}
          rows={props.populars}
        />

        <Pager
          currentPage={props.currentPage}
          disabled={props.isFetching}
          hasNext={props.hasNext}
          hasPrev={props.hasPrev}
          onNext={props.onNextPage}
          onPrev={props.onPrevPage}
          total={props.pagination?.total ?? 0}
        />
      </CardContent>
    </Card>
  );
}

export function AdminPopularRankSection(props: {
  ranks: AdminPopularRankItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>인기검색어순위</CardTitle>
        <CardDescription>
          기간 전체 기준 검색어 hit_count 순위를 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          columns={[
            {
              header: "순위/검색어",
              render: (row) => (
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {row.rank}. {row.pp_word}
                  </strong>
                  <p className="text-xs text-muted-foreground">
                    {row.hit_count.toLocaleString()} hits
                  </p>
                </div>
              ),
            },
            {
              header: "기간",
              render: (row) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>first {row.first_date}</p>
                  <p>last {row.last_date}</p>
                </div>
              ),
            },
          ]}
          emptyMessage="조회 조건에 맞는 순위가 없습니다."
          getRowKey={(row) => `${row.rank}:${row.pp_word}`}
          rows={props.ranks}
        />
      </CardContent>
    </Card>
  );
}

function Pager(props: {
  currentPage: number;
  disabled: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        현재 페이지 {props.currentPage} · 총 {props.total.toLocaleString()}건
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={props.disabled || !props.hasPrev}
          onClick={props.onPrev}
        >
          이전
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={props.disabled || !props.hasNext}
          onClick={props.onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
