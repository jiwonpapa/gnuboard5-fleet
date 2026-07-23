import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ListPagination } from "../shared/ListPagination";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import {
  adminSmsBatchDetailSearchFieldOptions,
  adminSmsDeliverySearchFieldOptions,
} from "./admin-sms-history-form";
import type { Pagination } from "../../types/Pagination";
import type { AdminSmsDeliveryItem } from "../../types/AdminSmsDeliveryItem";
import type { AdminSmsMessageBatchDetail } from "../../types/AdminSmsMessageBatchDetail";
import type { AdminSmsMessageBatchItem } from "../../types/AdminSmsMessageBatchItem";

export function SmsDeliveryHistorySection(props: {
  deliveries: AdminSmsDeliveryItem[];
  deliveryPagination: Pagination | null;
  deliverySearch: string;
  deliverySearchField: string;
  isBusy: boolean;
  onDeliverySearchChange: (value: string) => void;
  onDeliverySearchFieldChange: (value: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>번호별 이력 조회</CardTitle>
        <CardDescription>번호별 전송 로그를 직접 확인하는 화면입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색 기준</span>
            <select
              value={props.deliverySearchField}
              onChange={(event) => props.onDeliverySearchFieldChange(event.currentTarget.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {adminSmsDeliverySearchFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색어</span>
            <Input
              value={props.deliverySearch}
              onChange={(event) => props.onDeliverySearchChange(event.currentTarget.value)}
              placeholder="번호 또는 이름 검색"
            />
          </label>
        </div>

        <AdminDataTable
          columns={[
            {
              header: "수신자",
              render: (delivery) => (
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {delivery.hs_name ?? "-"}
                  </strong>
                  <span className="block text-xs text-muted-foreground">
                    {delivery.hs_hp ?? "-"}
                  </span>
                </div>
              ),
            },
            {
              header: "배치",
              render: (delivery) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>wr_no {delivery.wr_no ?? "-"}</p>
                  <p>renum {delivery.wr_renum ?? "-"}</p>
                </div>
              ),
            },
            {
              header: "상태",
              render: (delivery) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{delivery.hs_code ?? "-"}</p>
                  <p>{delivery.hs_memo ?? delivery.hs_log ?? "-"}</p>
                </div>
              ),
            },
          ]}
          emptyMessage="번호별 전송 이력이 없습니다."
          getRowKey={(delivery) => String(delivery.hs_no)}
          rows={props.deliveries}
        />

        {props.deliveryPagination ? (
          <ListPagination
            hasNext={props.deliveryPagination.has_next}
            hasPrev={props.deliveryPagination.has_prev}
            isBusy={props.isBusy}
            onNext={props.onNextPage}
            onPrev={props.onPrevPage}
            page={props.deliveryPagination.page}
            total={props.deliveryPagination.total}
            totalPages={props.deliveryPagination.last_page}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SmsBatchHistoryListSection(props: {
  batchPagination: Pagination | null;
  batchSearch: string;
  batches: AdminSmsMessageBatchItem[];
  isBusy: boolean;
  onBatchSearchChange: (value: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSelectBatch: (batch: AdminSmsMessageBatchItem) => void;
  selectedBatch: { wr_no: number; wr_renum: number } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>배치 목록</CardTitle>
        <CardDescription>
          배치를 선택하면 우측에서 상세 로그와 재전송 액션을 확인할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">검색어</span>
          <Input
            value={props.batchSearch}
            onChange={(event) => props.onBatchSearchChange(event.currentTarget.value)}
            placeholder="메시지 내용 검색"
          />
        </label>

        <AdminDataTable
          columns={[
            {
              header: "배치",
              render: (batch) => (
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    #{batch.wr_no} / {batch.wr_renum}
                  </strong>
                  <span className="block text-xs text-muted-foreground">
                    {batch.wr_datetime ?? "-"}
                  </span>
                </div>
              ),
            },
            {
              header: "메시지",
              render: (batch) => (
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {batch.wr_message ?? "-"}
                </p>
              ),
            },
            {
              header: "결과",
              render: (batch) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>성공 {batch.wr_success}</p>
                  <p>실패 {batch.wr_failure}</p>
                </div>
              ),
            },
          ]}
          emptyMessage="전송 배치 이력이 없습니다."
          getRowKey={(batch) => `${batch.wr_no}-${batch.wr_renum}`}
          onRowClick={props.onSelectBatch}
          rows={props.batches}
          selectedKey={
            props.selectedBatch === null
              ? null
              : `${props.selectedBatch.wr_no}-${props.selectedBatch.wr_renum}`
          }
        />

        {props.batchPagination ? (
          <ListPagination
            hasNext={props.batchPagination.has_next}
            hasPrev={props.batchPagination.has_prev}
            isBusy={props.isBusy}
            onNext={props.onNextPage}
            onPrev={props.onPrevPage}
            page={props.batchPagination.page}
            total={props.batchPagination.total}
            totalPages={props.batchPagination.last_page}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SmsBatchHistoryDetailSection(props: {
  batchDetail: AdminSmsMessageBatchDetail | null;
  bookingAt: string;
  detailSearch: string;
  detailSearchField: string;
  isBusy: boolean;
  onBookingAtChange: (value: string) => void;
  onDetailSearchChange: (value: string) => void;
  onDetailSearchFieldChange: (value: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onResendAll: () => void;
  onResendFailures: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>배치 상세 / 재전송</CardTitle>
        <CardDescription>상세 로그 검색과 재전송 예약 시각 지정이 가능합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.batchDetail ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectionPlaceholder
                description={`메시지: ${props.batchDetail.wr_message ?? "-"}\n성공 ${props.batchDetail.wr_success}건 / 실패 ${props.batchDetail.wr_failure}건 / 중복 ${props.batchDetail.duplicate_summary?.total ?? 0}건`}
              />
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">재전송 예약 시각</span>
                  <Input
                    placeholder="2026-03-08 16:00"
                    value={props.bookingAt}
                    onChange={(event) => props.onBookingAtChange(event.currentTarget.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={props.isBusy}
                    onClick={props.onResendFailures}
                  >
                    실패건 재전송
                  </Button>
                  <Button type="button" disabled={props.isBusy} onClick={props.onResendAll}>
                    전체 재전송
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">상세 검색 기준</span>
                <select
                  value={props.detailSearchField}
                  onChange={(event) => props.onDetailSearchFieldChange(event.currentTarget.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {adminSmsBatchDetailSearchFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">상세 검색어</span>
                <Input
                  value={props.detailSearch}
                  onChange={(event) => props.onDetailSearchChange(event.currentTarget.value)}
                  placeholder="이름 또는 번호 검색"
                />
              </label>
            </div>

            <AdminDataTable
              columns={[
                {
                  header: "수신자",
                  render: (delivery) => (
                    <div className="space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {delivery.hs_name ?? "-"}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {delivery.hs_hp ?? "-"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "그룹",
                  render: (delivery) => (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{delivery.bg_name ?? "-"}</p>
                      <p>{delivery.mb_id ?? "비회원"}</p>
                    </div>
                  ),
                },
                {
                  header: "상태",
                  render: (delivery) => (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{delivery.hs_code ?? "-"}</p>
                      <p>{delivery.hs_memo ?? delivery.hs_log ?? "-"}</p>
                    </div>
                  ),
                },
              ]}
              emptyMessage="배치 상세 로그가 없습니다."
              getRowKey={(delivery) => String(delivery.hs_no)}
              rows={props.batchDetail.deliveries}
            />

            <ListPagination
              hasNext={props.batchDetail.deliveries_pagination.has_next}
              hasPrev={props.batchDetail.deliveries_pagination.has_prev}
              isBusy={props.isBusy}
              onNext={props.onNextPage}
              onPrev={props.onPrevPage}
              page={props.batchDetail.deliveries_pagination.page}
              total={props.batchDetail.deliveries_pagination.total}
              totalPages={props.batchDetail.deliveries_pagination.last_page}
            />
          </>
        ) : (
          <SelectionPlaceholder description="좌측 배치 목록에서 항목을 선택하면 상세 로그와 재전송 도구가 열립니다." />
        )}
      </CardContent>
    </Card>
  );
}
