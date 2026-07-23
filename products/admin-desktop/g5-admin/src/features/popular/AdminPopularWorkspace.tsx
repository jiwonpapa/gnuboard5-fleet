import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  getAdminPopularList,
  getAdminPopularRank,
  resetAdminPopular,
  type CommandError,
} from "../../api/client";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { PageIntro } from "../layout/PageIntro";
import { BOARD_POPULAR_RANK_ROUTE } from "../layout/navigation";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminPopularListResponse } from "../../types/AdminPopularListResponse";
import type { AdminPopularRankResponse } from "../../types/AdminPopularRankResponse";
import type { AdminPopularResetResponse } from "../../types/AdminPopularResetResponse";
import {
  adminPopularFilterFormSchema,
  buildAdminPopularListQuery,
  buildAdminPopularRankQuery,
  buildAdminPopularResetInput,
  emptyAdminPopularFilterFormValues,
  type AdminPopularFilterFormValues,
} from "./admin-popular-form";
import {
  AdminPopularFiltersSection,
  AdminPopularListSection,
  AdminPopularRankSection,
} from "./AdminPopularSections";

export function AdminPopularWorkspace() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminPopularFilterFormValues>(
    emptyAdminPopularFilterFormValues,
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const form = useForm<AdminPopularFilterFormValues>({
    defaultValues: emptyAdminPopularFilterFormValues,
    resolver: zodResolver(adminPopularFilterFormSchema),
  });

  const popularQuery = useQuery<AdminPopularListResponse, CommandError>({
    queryKey: ["admin", "popular", "list", page, filters],
    queryFn: () => getAdminPopularList(buildAdminPopularListQuery(filters, page, 20)),
    retry: false,
  });

  const rankQuery = useQuery<AdminPopularRankResponse, CommandError>({
    queryKey: ["admin", "popular", "rank", filters],
    queryFn: () => getAdminPopularRank(buildAdminPopularRankQuery(filters)),
    retry: false,
  });

  const resetMutation = useMutation<
    AdminPopularResetResponse,
    CommandError,
    AdminPopularFilterFormValues
  >({
    mutationFn: async (values) =>
      resetAdminPopular(buildAdminPopularResetInput(values)),
    onSuccess: async (response) => {
      toast.success(
        `인기검색어 ${response.result.deleted_rows.toLocaleString()}건을 정리했습니다.`,
      );
      setResetDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "popular", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "popular", "rank"] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const topError = popularQuery.error ?? rankQuery.error ?? resetMutation.error ?? null;
  const populars = popularQuery.data?.populars ?? [];
  const ranks = rankQuery.data?.ranks ?? [];
  const pagination = popularQuery.data?.pagination ?? null;
  const topRank = ranks[0] ?? null;
  const preferRank = location.pathname === BOARD_POPULAR_RANK_ROUTE;

  return (
    <>
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Popular"
          title={preferRank ? "인기검색어순위" : "인기검색어관리"}
          description="`/admin/popular` 목록과 초기화, `/admin/popular/rank` 기간별 랭킹을 한 작업면에서 함께 다룹니다. `인기검색어순위` route에서는 랭킹 카드가 먼저 보이도록 배치합니다."
          icon={Search}
          metrics={[
            {
              hint: "현재 목록 총 건수",
              icon: Search,
              label: "목록 수",
              value: String(pagination?.total ?? 0),
            },
            {
              hint: "현재 랭킹 1위 검색어",
              icon: Activity,
              label: "Top 1",
              value: topRank?.pp_word ?? "없음",
            },
            {
              hint: "최근 초기화 삭제 건수",
              icon: Trash2,
              label: "최근 삭제",
              value: resetMutation.data ? String(resetMutation.data.result.deleted_rows) : "0",
            },
          ]}
        />

        {topError ? <ErrorBanner error={topError} /> : null}

        <AdminPopularFiltersSection
          form={form}
          isBusy={
            resetMutation.isPending || popularQuery.isFetching || rankQuery.isFetching
          }
          onOpenResetDialog={() => setResetDialogOpen(true)}
          onSubmit={(values) => {
            setPage(1);
            setFilters(values);
          }}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {preferRank ? (
            <>
              <AdminPopularRankSection ranks={ranks} />
              <AdminPopularListSection
                currentPage={page}
                hasNext={pagination?.has_next ?? false}
                hasPrev={pagination?.has_prev ?? false}
                isFetching={popularQuery.isFetching}
                onNextPage={() => setPage((current) => current + 1)}
                onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
                pagination={pagination}
                populars={populars}
              />
            </>
          ) : (
            <>
              <AdminPopularListSection
                currentPage={page}
                hasNext={pagination?.has_next ?? false}
                hasPrev={pagination?.has_prev ?? false}
                isFetching={popularQuery.isFetching}
                onNextPage={() => setPage((current) => current + 1)}
                onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
                pagination={pagination}
                populars={populars}
              />
              <AdminPopularRankSection ranks={ranks} />
            </>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        confirmLabel="초기화"
        description={
          filters.date_from || filters.date_to
            ? `날짜 범위(${filters.date_from || "-"} ~ ${filters.date_to || "-"})의 인기검색어를 삭제합니다.`
            : "전체 인기검색어 집계를 모두 삭제합니다."
        }
        isPending={resetMutation.isPending}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => resetMutation.mutate(form.getValues())}
        open={resetDialogOpen}
        title="인기검색어 초기화"
        variant="destructive"
      />
    </>
  );
}
