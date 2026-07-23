import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminPointActionResult } from "../../types/AdminPointActionResult";
import type { AdminPointItem } from "../../types/AdminPointItem";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminPointSummary } from "../../types/AdminPointSummary";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  InfoField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import type {
  AdminPointActionFormValues,
  AdminPointExpireFormValues,
} from "./admin-points-form";

const pointSearchFieldOptions = [
  { label: "회원 아이디", value: "mb_id" },
  { label: "내용", value: "po_content" },
] as const;

export function PointFiltersSection(props: {
  fieldSchema: AdminSchemaDetail | null;
  isFetching: boolean;
  memberFilter: string;
  onReset: () => void;
  onSubmit: (formData: FormData) => void;
  searchField: "mb_id" | "po_content";
  searchKeyword: string;
}) {
  const searchFieldOptions = resolveOptions(props.fieldSchema, "search_field");
  const memberLabel = getFieldLabel(props.fieldSchema, "mb_id", "회원 아이디");
  const memberDescription = getFieldDescription(props.fieldSchema, "mb_id");
  const searchFieldLabel = getFieldLabel(props.fieldSchema, "search_field", "검색대상");
  const searchLabel = getFieldLabel(props.fieldSchema, "search", "검색어");
  const searchDescription = getFieldDescription(props.fieldSchema, "search");

  return (
    <Card>
      <CardHeader>
        <CardTitle>조회 조건</CardTitle>
        <CardDescription>
          특정 회원 기준으로 좁히거나, 내용 검색으로 내역을 빠르게 찾습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit(new FormData(event.currentTarget));
          }}
        >
          <label className="grid w-full gap-2 text-sm">
            <span className="font-medium text-foreground">{memberLabel}</span>
            <input
              name="mb_id"
              defaultValue={props.memberFilter}
              placeholder={memberLabel}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {memberDescription ? (
              <span className="text-xs text-muted-foreground">{memberDescription}</span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{searchFieldLabel}</span>
            <select
              name="search_field"
              defaultValue={props.searchField}
              className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {searchFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid w-full gap-2 text-sm">
            <span className="font-medium text-foreground">{searchLabel}</span>
            <input
              name="search"
              defaultValue={props.searchKeyword}
              placeholder={searchLabel}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searchDescription ? (
              <span className="text-xs text-muted-foreground">{searchDescription}</span>
            ) : null}
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={props.isFetching}>
              조회
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isFetching}
              onClick={props.onReset}
            >
              초기화
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PointListSection(props: {
  deletePending: boolean;
  list: AdminPointItem[];
  onClearSelection: () => void;
  onDeleteOpen: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleSelection: (poId: number) => void;
  page: number;
  pagination: {
    page: number;
    last_page: number;
    total: number;
    has_prev: boolean;
    has_next: boolean;
  } | null;
  selectedPointIds: number[];
}) {
  const selectedCount = props.selectedPointIds.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>포인트 내역</CardTitle>
        <CardDescription>
          행 단위로 삭제 후보를 선택할 수 있고, 지급/차감 반영 결과는 목록 새로고침으로 즉시 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminDataTable<AdminPointItem>
          columns={[
            {
              header: "선택",
              render: (point) => {
                const selected = props.selectedPointIds.includes(point.po_id);

                return (
                  <Button
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onToggleSelection(point.po_id);
                    }}
                  >
                    {selected ? "해제" : `#${point.po_id}`}
                  </Button>
                );
              },
            },
            {
              header: "회원/내용",
              render: (point) => (
                <div className="min-w-0 space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {point.mb_id ?? "-"}
                  </strong>
                  <p className="break-words text-xs text-muted-foreground">
                    {point.po_content ?? "-"}
                  </p>
                </div>
              ),
            },
            {
              header: "포인트",
              render: (point) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>change {point.po_point ?? 0}</p>
                  <p>member total {point.po_mb_point ?? 0}</p>
                </div>
              ),
            },
            {
              header: "연결",
              render: (point) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{point.po_rel_table ?? "-"}</p>
                  <p>{point.po_rel_id ?? "-"}</p>
                  <p>{point.po_rel_action ?? "-"}</p>
                </div>
              ),
            },
            {
              header: "일시",
              render: (point) => (
                <span className="text-xs text-muted-foreground">
                  {point.po_datetime ?? "-"}
                </span>
              ),
            },
          ]}
          emptyMessage="조회된 포인트 내역이 없습니다."
          getRowKey={(point) => String(point.po_id)}
          rows={props.list}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={selectedCount === 0 || props.deletePending}
            onClick={props.onDeleteOpen}
          >
            선택 내역 삭제
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={selectedCount === 0 || props.deletePending}
            onClick={props.onClearSelection}
          >
            선택 해제
          </Button>
          <p className="text-sm text-muted-foreground">
            page {props.pagination?.page ?? props.page} / {props.pagination?.last_page ?? 1} ·
            total {props.pagination?.total ?? 0}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={props.deletePending || !(props.pagination?.has_prev ?? props.page > 1)}
            onClick={props.onPrevPage}
          >
            이전
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={props.deletePending || !(props.pagination?.has_next ?? false)}
            onClick={props.onNextPage}
          >
            다음
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PointActionSection(props: {
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<AdminPointActionFormValues>;
  grantPending: boolean;
  deductPending: boolean;
  pendingAction: boolean;
  onDeduct: (values: AdminPointActionFormValues) => void;
  onGrant: (values: AdminPointActionFormValues) => void;
}) {
  const memberLabel = getFieldLabel(props.fieldSchema, "mb_id", "회원 아이디");
  const memberDescription = getFieldDescription(props.fieldSchema, "mb_id");
  const pointLabel = getFieldLabel(props.fieldSchema, "point", "포인트");
  const pointDescription = getFieldDescription(props.fieldSchema, "point");
  const contentLabel = getFieldLabel(props.fieldSchema, "po_content", "사유");
  const contentDescription = getFieldDescription(props.fieldSchema, "po_content");

  return (
    <Card>
      <CardHeader>
        <CardTitle>수동 지급 / 차감</CardTitle>
        <CardDescription>
          같은 폼에서 지급과 차감을 나누되, 버튼만 다르게 타게 구성했습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <TextInputControlField
            control={props.form.control}
            description={memberDescription}
            disabled={props.pendingAction}
            label={memberLabel}
            name="mb_id"
            placeholder="neo1"
          />
          <TextInputControlField
            control={props.form.control}
            description={pointDescription}
            disabled={props.pendingAction}
            label={pointLabel}
            name="point"
            placeholder="100"
            type="number"
          />
          <TextInputControlField
            control={props.form.control}
            description={contentDescription}
            disabled={props.pendingAction}
            label={contentLabel}
            name="po_content"
            placeholder="관리자 수동 지급"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={props.pendingAction}
              onClick={props.form.handleSubmit(props.onGrant)}
            >
              {props.grantPending ? "지급 중..." : "포인트 지급"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.pendingAction}
              onClick={props.form.handleSubmit(props.onDeduct)}
            >
              {props.deductPending ? "차감 중..." : "포인트 차감"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PointExpireSection(props: {
  expirePending: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<AdminPointExpireFormValues>;
  pendingAction: boolean;
  onReset: () => void;
  onSubmit: (values: AdminPointExpireFormValues) => void;
}) {
  const baseDateLabel = getFieldLabel(props.fieldSchema, "base_date", "기준일");
  const baseDateDescription = getFieldDescription(props.fieldSchema, "base_date");

  return (
    <Card>
      <CardHeader>
        <CardTitle>만료 처리</CardTitle>
        <CardDescription>
          기준일을 비우면 서버 기본값을 사용하고, 입력하면 해당 일자를 기준으로 만료를 실행합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={props.form.handleSubmit(props.onSubmit)}
        >
          <TextInputControlField
            control={props.form.control}
            description={baseDateDescription}
            disabled={props.pendingAction}
            label={baseDateLabel}
            name="base_date"
            placeholder="2026-03-08"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={props.pendingAction}>
              {props.expirePending ? "처리 중..." : "포인트 만료 실행"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.pendingAction}
              onClick={props.onReset}
            >
              초기화
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function resolveOptions(
  fieldSchema: AdminSchemaDetail | null,
  name: "search_field",
) {
  const options = getFieldOptions(fieldSchema, name);
  return options.length > 0 ? options : pointSearchFieldOptions;
}

export function PointSummarySection(props: {
  latestActionResult: AdminPointActionResult | null;
  requestId: string | null;
  selectedPointSummary: string;
  summary: AdminPointSummary | null;
}) {
  return (
    <Card className="xl:sticky xl:top-6 xl:self-start">
      <CardHeader>
        <CardTitle>요약</CardTitle>
        <CardDescription>
          마지막 액션 결과와 현재 삭제 후보를 우측에 고정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoField label="summary.mb_id" value={props.summary?.mb_id} />
        <InfoField label="summary.total_point" value={props.summary?.total_point} />
        <InfoField label="summary.total_rows" value={props.summary?.total_rows} />
        <InfoField label="selected_po_ids" value={props.selectedPointSummary} />
        <InfoField label="latest.mb_id" value={props.latestActionResult?.mb_id} />
        <InfoField
          label="latest.changed_point"
          value={props.latestActionResult?.changed_point}
        />
        <InfoField
          label="latest.after_point"
          value={props.latestActionResult?.after_point}
        />
        <InfoField label="request_id" value={props.requestId} />
      </CardContent>
    </Card>
  );
}

export function PointDeleteDialog(props: {
  deletePending: boolean;
  open: boolean;
  selectedPointSummary: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmActionDialog
      confirmLabel="포인트 내역 삭제"
      description={`다음 po_id를 삭제합니다: ${props.selectedPointSummary}`}
      isPending={props.deletePending}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
      open={props.open}
      title="선택한 포인트 내역 삭제"
      variant="destructive"
    />
  );
}
