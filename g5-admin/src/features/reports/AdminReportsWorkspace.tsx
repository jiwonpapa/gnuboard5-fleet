import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Inbox, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminReportList,
  getAdminReportStats,
  updateAdminReport,
  type CommandError,
} from "../../api/client";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  AdminReportDetailSection,
  AdminReportListSection,
  AdminReportStatsSection,
  type AdminReportDraft,
} from "./AdminReportsSections";

const STATUS_OPTIONS = ["pending", "approved", "rejected", "hold"] as const;
const TARGET_OPTIONS = ["", "post", "comment", "member"] as const;

export function AdminReportsWorkspace() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("");
  const [requestedReportId, setRequestedReportId] = useState<number | null>(null);
  const [reportDrafts, setReportDrafts] = useState<
    Record<number, { adminMemo: string; nextStatus: string }>
  >({});

  const statsQuery = useQuery({
    queryKey: ["admin", "reports", "stats"],
    queryFn: getAdminReportStats,
    retry: false,
  });

  const listQuery = useQuery({
    queryKey: ["admin", "reports", page, statusFilter, targetTypeFilter],
    queryFn: () =>
      getAdminReportList({
        page,
        per_page: 20,
        status: statusFilter || null,
        target_type: targetTypeFilter || null,
      }),
    retry: false,
  });

  const reports = listQuery.data?.reports ?? [];
  const selectedReportId =
    requestedReportId && reports.some((report) => report.rp_id === requestedReportId)
      ? requestedReportId
      : reports[0]?.rp_id ?? null;
  const selectedReport =
    reports.find((report) => report.rp_id === selectedReportId) ?? null;
  const reportDraft = selectedReport
    ? reportDrafts[selectedReport.rp_id] ?? {
        adminMemo: selectedReport.rp_admin_memo ?? "",
        nextStatus: selectedReport.rp_status ?? "pending",
      }
    : null;

  const updateMutation = useMutation({
    mutationFn: updateAdminReport,
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin", "reports", page, statusFilter, targetTypeFilter],
        (current: Awaited<ReturnType<typeof getAdminReportList>> | undefined) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            reports: current.reports.map((report) =>
              report.rp_id === response.report.rp_id ? response.report : report,
            ),
          };
        },
      );
      setReportDrafts((current) => {
        const next = { ...current };
        delete next[response.report.rp_id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports", "stats"] });
      toast.success("신고 상태를 저장했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError = pickCommandError(
    statsQuery.error,
    listQuery.error,
    updateMutation.error,
  );
  const isBusy = statsQuery.isFetching || listQuery.isFetching || updateMutation.isPending;

  function updateDraft(patch: Partial<AdminReportDraft>) {
    if (!selectedReport || !reportDraft) {
      return;
    }

    setReportDrafts((current) => ({
      ...current,
      [selectedReport.rp_id]: {
        ...reportDraft,
        ...patch,
      },
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(360px,0.94fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Reports"
          title="신고 관리"
          description="`/admin/reports` 목록/통계/상태변경을 route-native로 연결했습니다. 신고 상태 필터와 운영 메모를 화면에서 바로 관리합니다."
          icon={ShieldAlert}
          metrics={[
            {
              hint: "전체 신고 건수",
              icon: Inbox,
              label: "총 신고",
              value: String(statsQuery.data?.stats.total ?? 0),
            },
            {
              hint: "보류 중 신고",
              icon: Flag,
              label: "대기",
              value: String(statsQuery.data?.stats.pending ?? 0),
            },
            {
              hint: "현재 선택 리포트 ID",
              icon: ShieldAlert,
              label: "선택 신고",
              value: selectedReport ? String(selectedReport.rp_id) : "없음",
            },
          ]}
        />

        {topError ? <ErrorBanner error={topError} /> : null}

        <AdminReportListSection
          hasNext={listQuery.data?.pagination.has_next ?? false}
          hasPrev={listQuery.data?.pagination.has_prev ?? page > 1}
          isBusy={isBusy}
          onNextPage={() => setPage((current) => current + 1)}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onReportSelect={setRequestedReportId}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          onTargetTypeFilterChange={(value) => {
            setTargetTypeFilter(value);
            setPage(1);
          }}
          page={listQuery.data?.pagination.page ?? page}
          reports={reports}
          selectedReportId={selectedReportId}
          statusFilter={statusFilter}
          statusOptions={STATUS_OPTIONS}
          targetOptions={TARGET_OPTIONS}
          targetTypeFilter={targetTypeFilter}
          total={listQuery.data?.pagination.total ?? 0}
          totalPages={listQuery.data?.pagination.last_page ?? 1}
        />
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <AdminReportStatsSection stats={statsQuery.data?.stats ?? null} />
        <AdminReportDetailSection
          isBusy={isBusy}
          onDraftChange={updateDraft}
          onSave={() =>
            selectedReport &&
            reportDraft &&
            updateMutation.mutate({
              report_id: selectedReport.rp_id,
              status: reportDraft.nextStatus,
              admin_memo: reportDraft.adminMemo.trim() || null,
            })
          }
          report={selectedReport}
          reportDraft={reportDraft}
          statusOptions={STATUS_OPTIONS}
        />
      </div>
    </div>
  );
}

function pickCommandError(
  ...errors: Array<CommandError | Error | null | undefined>
) {
  return (
    errors.find(
      (error): error is CommandError =>
        error !== null &&
        error !== undefined &&
        typeof error === "object" &&
        "request_id" in error &&
        "code" in error,
    ) ?? null
  );
}
