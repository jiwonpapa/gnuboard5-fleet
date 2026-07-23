import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  getAdminSmsConfig,
  getAdminSmsDeliveryList,
  getAdminSmsMessageBatch,
  getAdminSmsMessageBatchList,
  resendAdminSmsBatchAll,
  resendAdminSmsBatchFailures,
  type CommandError,
} from "../../api/client";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SmsStorageUnavailableNotice } from "../shared/SmsStorageUnavailableNotice";
import {
  SmsBatchHistoryDetailSection,
  SmsBatchHistoryListSection,
  SmsDeliveryHistorySection,
} from "./AdminSmsHistorySections";
import {
  buildAdminSmsBatchResendInput,
  buildAdminSmsDeliveryListQuery,
  buildAdminSmsMessageBatchDetailQuery,
  buildAdminSmsMessageBatchListQuery,
} from "./admin-sms-history-form";
import {
  buildSmsHistoryCopy,
  formatSmsHistorySelectedBatch,
  invalidateSmsHistoryQueries,
} from "./admin-sms-history-page-helpers";

export function AdminSmsHistoryWorkspace() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isDeliveryRoute = location.pathname.endsWith("/history/deliveries");
  const [batchPage, setBatchPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [batchSearch, setBatchSearch] = useState("");
  const [deliverySearchField, setDeliverySearchField] = useState("hp");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [detailSearchField, setDetailSearchField] = useState("name");
  const [detailSearch, setDetailSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<{
    wr_no: number;
    wr_renum: number;
  } | null>(null);
  const [bookingAt, setBookingAt] = useState("");
  const configQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsConfig>>,
    CommandError
  >({
    queryKey: ["admin", "sms", "config"],
    queryFn: () => getAdminSmsConfig(),
    retry: false,
  });
  const storageReady =
    configQuery.isSuccess && configQuery.data.config.storage_ready;

  const batchListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsMessageBatchList>>,
    CommandError
  >({
    enabled: storageReady && !isDeliveryRoute,
    queryKey: ["admin", "sms", "history", "batches", batchPage, batchSearch],
    queryFn: () =>
      getAdminSmsMessageBatchList(
        buildAdminSmsMessageBatchListQuery(batchPage, 20, batchSearch),
      ),
    retry: false,
  });

  const batchDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsMessageBatch>>,
    CommandError
  >({
    enabled: storageReady && selectedBatch !== null && !isDeliveryRoute,
    queryKey: [
      "admin",
      "sms",
      "history",
      "batch-detail",
      selectedBatch?.wr_no,
      selectedBatch?.wr_renum,
      detailPage,
      detailSearchField,
      detailSearch,
    ],
    queryFn: () =>
      getAdminSmsMessageBatch(
        buildAdminSmsMessageBatchDetailQuery(
          selectedBatch?.wr_no ?? 0,
          selectedBatch?.wr_renum ?? 0,
          detailPage,
          20,
          detailSearchField,
          detailSearch,
        ),
      ),
    retry: false,
  });

  const deliveryListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsDeliveryList>>,
    CommandError
  >({
    enabled: storageReady && isDeliveryRoute,
    queryKey: [
      "admin",
      "sms",
      "history",
      "deliveries",
      deliveryPage,
      deliverySearchField,
      deliverySearch,
    ],
    queryFn: () =>
      getAdminSmsDeliveryList(
        buildAdminSmsDeliveryListQuery(
          deliveryPage,
          20,
          deliverySearchField,
          deliverySearch,
        ),
      ),
    retry: false,
  });

  const resendFailuresMutation = useMutation({
    mutationFn: async () =>
      resendAdminSmsBatchFailures(
        buildAdminSmsBatchResendInput(
          selectedBatch?.wr_no ?? 0,
          selectedBatch?.wr_renum ?? 0,
          bookingAt,
        ),
      ),
    onSuccess: async (response) => {
      toast.success(
        `실패건 재전송 완료: 성공 ${response.result.success}, 실패 ${response.result.failure}`,
      );
      await invalidateSmsHistoryQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const resendAllMutation = useMutation({
    mutationFn: async () =>
      resendAdminSmsBatchAll(
        buildAdminSmsBatchResendInput(
          selectedBatch?.wr_no ?? 0,
          selectedBatch?.wr_renum ?? 0,
          bookingAt,
        ),
      ),
    onSuccess: async (response) => {
      toast.success(
        `전체 재전송 완료: 성공 ${response.result.success}, 실패 ${response.result.failure}`,
      );
      await invalidateSmsHistoryQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const batchPagination = batchListQuery.data?.pagination ?? null;
  const batches = batchListQuery.data?.batches ?? [];
  const batchDetail = batchDetailQuery.data?.batch ?? null;
  const deliveryPagination = deliveryListQuery.data?.pagination ?? null;
  const deliveries = deliveryListQuery.data?.deliveries ?? [];
  const topError =
    configQuery.error ??
    batchListQuery.error ??
    batchDetailQuery.error ??
    deliveryListQuery.error ??
    resendFailuresMutation.error ??
    resendAllMutation.error ??
    null;
  const isBusy =
    resendFailuresMutation.isPending || resendAllMutation.isPending;
  const { description, title } = buildSmsHistoryCopy(isDeliveryRoute);

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Admin SMS History"
        title={title}
        description={description}
        icon={Activity}
        metrics={[
          {
            hint: isDeliveryRoute
              ? "현재 조회 조건 기준 번호별 이력 수"
              : "현재 배치 목록 총수",
            icon: Activity,
            label: isDeliveryRoute ? "번호별 로그" : "배치 수",
            value: String(
              isDeliveryRoute
                ? (deliveryPagination?.total ?? 0)
                : (batchPagination?.total ?? 0),
            ),
          },
          {
            hint: "선택한 배치 번호",
            icon: RotateCcw,
            label: "선택 배치",
            value: formatSmsHistorySelectedBatch(selectedBatch),
          },
          {
            hint: "최근 조회 기준 실패 건수",
            icon: Send,
            label: "실패 수",
            value: String(batchDetail?.wr_failure ?? 0),
          },
        ]}
      />

      {topError ? <ErrorBanner error={topError} /> : null}

      {configQuery.isSuccess && !configQuery.data.config.storage_ready ? (
        <SmsStorageUnavailableNotice
          missingTables={configQuery.data.config.missing_tables}
        />
      ) : isDeliveryRoute ? (
        <SmsDeliveryHistorySection
          deliveries={deliveries}
          deliveryPagination={deliveryPagination}
          deliverySearch={deliverySearch}
          deliverySearchField={deliverySearchField}
          isBusy={isBusy}
          onDeliverySearchChange={(value) => {
            setDeliveryPage(1);
            setDeliverySearch(value);
          }}
          onDeliverySearchFieldChange={setDeliverySearchField}
          onNextPage={() => setDeliveryPage((current) => current + 1)}
          onPrevPage={() =>
            setDeliveryPage((current) => Math.max(1, current - 1))
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SmsBatchHistoryListSection
            batchPagination={batchPagination}
            batchSearch={batchSearch}
            batches={batches}
            isBusy={isBusy}
            onBatchSearchChange={(value) => {
              setBatchPage(1);
              setBatchSearch(value);
            }}
            onNextPage={() => setBatchPage((current) => current + 1)}
            onPrevPage={() =>
              setBatchPage((current) => Math.max(1, current - 1))
            }
            onSelectBatch={(batch) => {
              setSelectedBatch({
                wr_no: batch.wr_no,
                wr_renum: batch.wr_renum,
              });
              setDetailPage(1);
            }}
            selectedBatch={selectedBatch}
          />

          <SmsBatchHistoryDetailSection
            batchDetail={batchDetail}
            bookingAt={bookingAt}
            detailSearch={detailSearch}
            detailSearchField={detailSearchField}
            isBusy={isBusy}
            onBookingAtChange={setBookingAt}
            onDetailSearchChange={(value) => {
              setDetailPage(1);
              setDetailSearch(value);
            }}
            onDetailSearchFieldChange={setDetailSearchField}
            onNextPage={() => setDetailPage((current) => current + 1)}
            onPrevPage={() =>
              setDetailPage((current) => Math.max(1, current - 1))
            }
            onResendAll={() => resendAllMutation.mutate()}
            onResendFailures={() => resendFailuresMutation.mutate()}
          />
        </div>
      )}
    </div>
  );
}
