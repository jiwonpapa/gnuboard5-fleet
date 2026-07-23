import type { ReactNode } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { AdminReportItem } from "../../types/AdminReportItem";
import type { AdminReportStats } from "../../types/AdminReportStats";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ListPagination } from "../shared/ListPagination";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";

export type AdminReportDraft = {
  adminMemo: string;
  nextStatus: string;
};

export function AdminReportListSection(props: {
  hasNext: boolean;
  hasPrev: boolean;
  isBusy: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onReportSelect: (reportId: number) => void;
  onStatusFilterChange: (value: string) => void;
  onTargetTypeFilterChange: (value: string) => void;
  page: number;
  reports: AdminReportItem[];
  selectedReportId: number | null;
  statusFilter: string;
  statusOptions: readonly string[];
  targetOptions: readonly string[];
  targetTypeFilter: string;
  total: number;
  totalPages: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>신고 목록</CardTitle>
        <CardDescription>
          상태와 대상 유형으로 필터링하고, 선택 항목을 우측에서 처리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="상태">
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={props.statusFilter}
              onChange={(event) => props.onStatusFilterChange(event.currentTarget.value)}
            >
              <option value="">전체</option>
              {props.statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="대상 유형">
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={props.targetTypeFilter}
              onChange={(event) =>
                props.onTargetTypeFilterChange(event.currentTarget.value)
              }
            >
              <option value="">전체</option>
              {props.targetOptions.filter(Boolean).map((targetType) => (
                <option key={targetType} value={targetType}>
                  {targetType}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <AdminDataTable
          columns={[
            {
              header: "신고",
              render: (report) => (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">#{report.rp_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.mb_id ?? "guest"} · {report.rp_target_type ?? "-"}
                  </p>
                </div>
              ),
            },
            {
              header: "사유",
              render: (report) => (
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{report.rp_reason ?? "-"}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {report.rp_detail ?? "-"}
                  </p>
                </div>
              ),
            },
            {
              header: "상태",
              render: (report) => (
                <Badge variant="outline">{report.rp_status ?? "pending"}</Badge>
              ),
            },
          ]}
          emptyMessage="신고 내역이 없습니다."
          getRowKey={(report) => String(report.rp_id)}
          onRowClick={(report) => props.onReportSelect(report.rp_id)}
          rows={props.reports}
          selectedKey={
            props.selectedReportId === null ? null : String(props.selectedReportId)
          }
        />

        <ListPagination
          hasNext={props.hasNext}
          hasPrev={props.hasPrev}
          isBusy={props.isBusy}
          onNext={props.onNextPage}
          onPrev={props.onPrevPage}
          page={props.page}
          total={props.total}
          totalPages={props.totalPages}
        />
      </CardContent>
    </Card>
  );
}

export function AdminReportStatsSection(props: {
  stats: AdminReportStats | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>통계</CardTitle>
        <CardDescription>신고 상태별 집계를 즉시 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Stat label="Pending" value={props.stats?.pending} />
        <Stat label="Approved" value={props.stats?.approved} />
        <Stat label="Rejected" value={props.stats?.rejected} />
        <Stat label="Hold" value={props.stats?.hold} />
      </CardContent>
    </Card>
  );
}

export function AdminReportDetailSection(props: {
  isBusy: boolean;
  onDraftChange: (patch: Partial<AdminReportDraft>) => void;
  onSave: () => void;
  report: AdminReportItem | null;
  reportDraft: AdminReportDraft | null;
  statusOptions: readonly string[];
}) {
  if (!props.report || !props.reportDraft) {
    return (
      <SelectionPlaceholder description="신고 항목을 선택하면 우측에서 상태와 운영 메모를 수정합니다." />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>신고 처리</CardTitle>
        <CardDescription>
          신고 상태와 <code>rp_admin_memo</code>를 함께 저장합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm text-muted-foreground">
          <ReportResult label="Reporter" value={props.report.mb_id ?? "guest"} />
          <ReportResult label="Target" value={props.report.rp_target_type ?? "-"} />
          <ReportResult label="Target ID" value={props.report.rp_target_id ?? "-"} />
          <ReportResult label="Created" value={props.report.rp_datetime ?? "-"} />
          <ReportResult label="Processed" value={props.report.rp_processed_at ?? "-"} />
        </div>

        <Field label="상태">
          <select
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
            value={props.reportDraft.nextStatus}
            onChange={(event) =>
              props.onDraftChange({ nextStatus: event.currentTarget.value })
            }
          >
            {props.statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>

        <Field label="운영 메모">
          <Textarea
            rows={8}
            value={props.reportDraft.adminMemo}
            onChange={(event) =>
              props.onDraftChange({ adminMemo: event.currentTarget.value })
            }
          />
        </Field>

        <Button type="button" disabled={props.isBusy} onClick={props.onSave}>
          저장
        </Button>
      </CardContent>
    </Card>
  );
}

function Field(props: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function ReportResult(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 px-3 py-2">
      <span>{props.label}</span>
      <strong className="text-right text-foreground">{props.value}</strong>
    </div>
  );
}

function Stat(props: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {props.label}
      </p>
      <strong className="text-xl text-foreground">{props.value ?? 0}</strong>
    </div>
  );
}
