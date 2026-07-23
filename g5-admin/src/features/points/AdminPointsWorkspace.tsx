import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  deductAdminPoint,
  deleteAdminPointHistory,
  expireAdminPoints,
  getAdminPointList,
  getAdminPointSummary,
  grantAdminPoint,
  type CommandError,
} from "../../api/client";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import type { AdminPointActionResponse } from "../../types/AdminPointActionResponse";
import type { AdminPointListResponse } from "../../types/AdminPointListResponse";
import type { AdminPointSummaryResponse } from "../../types/AdminPointSummaryResponse";
import {
  adminPointActionFormSchema,
  adminPointExpireFormSchema,
  buildAdminPointActionInput,
  buildAdminPointExpireInput,
  emptyAdminPointActionFormValues,
  emptyAdminPointExpireFormValues,
  type AdminPointActionFormValues,
  type AdminPointExpireFormValues,
} from "./admin-points-form";
import {
  invalidatePointQueries,
  togglePointSelection,
} from "./admin-points-page-helpers";
import {
  PointActionSection,
  PointDeleteDialog,
  PointExpireSection,
  PointFiltersSection,
  PointListSection,
  PointSummarySection,
} from "./AdminPointsSections";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";

export function AdminPointsWorkspace() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [memberFilter, setMemberFilter] = useState("");
  const [searchField, setSearchField] = useState<"mb_id" | "po_content">("mb_id");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const schemaQuery = useAdminFieldSchema("points");

  const actionForm = useForm<AdminPointActionFormValues>({
    defaultValues: emptyAdminPointActionFormValues,
    resolver: zodResolver(adminPointActionFormSchema),
  });
  const expireForm = useForm<AdminPointExpireFormValues>({
    defaultValues: emptyAdminPointExpireFormValues,
    resolver: zodResolver(adminPointExpireFormSchema),
  });

  const listQuery = useQuery<AdminPointListResponse, CommandError>({
    queryKey: ["admin", "points", "list", page, memberFilter, searchField, searchKeyword],
    queryFn: () =>
      getAdminPointList({
        mb_id: memberFilter.length > 0 ? memberFilter : null,
        page,
        per_page: 20,
        search: searchKeyword.length > 0 ? searchKeyword : null,
        search_field: searchField,
      }),
    retry: false,
  });

  const summaryQuery = useQuery<AdminPointSummaryResponse, CommandError>({
    queryKey: ["admin", "points", "summary", memberFilter],
    queryFn: () => getAdminPointSummary(memberFilter.length > 0 ? memberFilter : null),
    retry: false,
  });

  const grantMutation = useMutation<
    AdminPointActionResponse,
    CommandError,
    AdminPointActionFormValues
  >({
    mutationFn: async (values) => grantAdminPoint(buildAdminPointActionInput(values)!),
    onSuccess: async (response) => {
      toast.success(`${response.result.mb_id} 포인트를 지급했습니다.`);
      await invalidatePointQueries(queryClient);
      actionForm.reset(emptyAdminPointActionFormValues);
    },
    onError: (error) => toast.error(error.message),
  });

  const deductMutation = useMutation<
    AdminPointActionResponse,
    CommandError,
    AdminPointActionFormValues
  >({
    mutationFn: async (values) => deductAdminPoint(buildAdminPointActionInput(values)!),
    onSuccess: async (response) => {
      toast.success(`${response.result.mb_id} 포인트를 차감했습니다.`);
      await invalidatePointQueries(queryClient);
      actionForm.reset(emptyAdminPointActionFormValues);
    },
    onError: (error) => toast.error(error.message),
  });

  const expireMutation = useMutation({
    mutationFn: (values: AdminPointExpireFormValues) =>
      expireAdminPoints(buildAdminPointExpireInput(values)),
    onSuccess: async (response) => {
      toast.success(
        `포인트 만료 ${response.result.expired_count.toLocaleString()}건 처리했습니다.`,
      );
      await invalidatePointQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (poIds: number[]) => deleteAdminPointHistory({ po_ids: poIds }),
    onSuccess: async (response) => {
      toast.success(
        `포인트 내역 ${response.result.deleted_count.toLocaleString()}건 삭제했습니다.`,
      );
      setSelectedPointIds([]);
      setDeleteDialogOpen(false);
      await invalidatePointQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError =
    listQuery.error ??
    summaryQuery.error ??
    grantMutation.error ??
    deductMutation.error ??
    expireMutation.error ??
    deleteMutation.error ??
    null;
  const list = listQuery.data?.points ?? [];
  const summary = summaryQuery.data?.summary ?? null;
  const pendingAction =
    grantMutation.isPending || deductMutation.isPending || expireMutation.isPending;
  const latestActionResult =
    deductMutation.data?.result ?? grantMutation.data?.result ?? null;
  const selectedPointSummary = useMemo(
    () => selectedPointIds.map((poId) => `#${poId}`).join(", "),
    [selectedPointIds],
  );
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: schemaQuery.error ?? null,
    loading: schemaQuery.isLoading,
    schema: fieldSchema,
  });

  return (
    <>
      <PageIntro
        kicker="Admin Points"
        title="포인트관리"
        description="`/admin/points`와 `/admin/points/summary`를 route-native 작업면으로 묶었습니다. 내역 조회, 수동 지급/차감, 만료 처리, 선택 삭제를 같은 화면에서 수행합니다."
        icon={Coins}
        metrics={[
          {
            hint: "현재 조건 기준 총 포인트 합계",
            icon: Coins,
            label: "합계 포인트",
            value: summary ? String(summary.total_point) : "loading...",
          },
          {
            hint: "현재 조건 기준 총 내역 수",
            icon: History,
            label: "내역 수",
            value: summary ? String(summary.total_rows) : "loading...",
          },
          {
            hint: "삭제 후보로 선택한 po_id 수",
            icon: ShieldAlert,
            label: "선택 삭제",
            value: String(selectedPointIds.length),
          },
        ]}
      />

      {topError ? <ErrorBanner error={topError} /> : null}

      {showSchemaState ? (
        <FieldSchemaStatePanel
          error={schemaQuery.error ?? null}
          hiddenTargetLabel="포인트 관리 작업면"
          loading={schemaQuery.isLoading}
          noun="포인트 관리"
          schema={fieldSchema}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <PointFiltersSection
              fieldSchema={fieldSchema}
              isFetching={listQuery.isFetching || summaryQuery.isFetching}
              memberFilter={memberFilter}
              onReset={() => {
                setPage(1);
                setMemberFilter("");
                setSearchField("mb_id");
                setSearchKeyword("");
              }}
              onSubmit={(formData) => {
                setPage(1);
                setMemberFilter(String(formData.get("mb_id") ?? "").trim());
                setSearchField(
                  String(formData.get("search_field") ?? "mb_id") as "mb_id" | "po_content",
                );
                setSearchKeyword(String(formData.get("search") ?? "").trim());
              }}
              searchField={searchField}
              searchKeyword={searchKeyword}
            />

            <PointListSection
              deletePending={deleteMutation.isPending || listQuery.isFetching}
              list={list}
              onClearSelection={() => setSelectedPointIds([])}
              onDeleteOpen={() => setDeleteDialogOpen(true)}
              onNextPage={() => setPage((current) => current + 1)}
              onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
              onToggleSelection={(poId) =>
                setSelectedPointIds((current) => togglePointSelection(current, poId))
              }
              page={page}
              pagination={listQuery.data?.pagination ?? null}
              selectedPointIds={selectedPointIds}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <PointActionSection
                fieldSchema={fieldSchema}
                form={actionForm}
                grantPending={grantMutation.isPending}
                deductPending={deductMutation.isPending}
                pendingAction={pendingAction}
                onDeduct={(values) => {
                  if (!buildAdminPointActionInput(values)) {
                    return;
                  }
                  deductMutation.mutate(values);
                }}
                onGrant={(values) => {
                  if (!buildAdminPointActionInput(values)) {
                    return;
                  }
                  grantMutation.mutate(values);
                }}
              />

              <PointExpireSection
                expirePending={expireMutation.isPending}
                fieldSchema={fieldSchema}
                form={expireForm}
                pendingAction={pendingAction}
                onReset={() => expireForm.reset(emptyAdminPointExpireFormValues)}
                onSubmit={(values) => expireMutation.mutate(values)}
              />
            </div>
          </div>

          <PointSummarySection
            latestActionResult={latestActionResult}
            requestId={summaryQuery.data?.request_id ?? null}
            selectedPointSummary={selectedPointSummary}
            summary={summary}
          />
        </div>
      )}

      <PointDeleteDialog
        deletePending={deleteMutation.isPending}
        open={deleteDialogOpen}
        selectedPointSummary={selectedPointSummary}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate(selectedPointIds)}
      />
    </>
  );
}
