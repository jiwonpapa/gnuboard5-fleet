import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ScanSearch, ShieldCheck, Waypoints } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  convertAdminBrowscap,
  getAdminBrowscapStatus,
  updateAdminBrowscap,
  type CommandError,
} from "../../api/client";
import type { AdminBrowscapConvertResponse } from "../../types/AdminBrowscapConvertResponse";
import type { AdminBrowscapStatusResponse } from "../../types/AdminBrowscapStatusResponse";
import {
  ENVIRONMENT_BROWSCAP_ROUTE,
  ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE,
} from "../layout/navigation";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  adminBrowscapConvertFormSchema,
  buildAdminBrowscapConvertInput,
  emptyAdminBrowscapConvertFormValues,
  type AdminBrowscapConvertFormValues,
} from "./admin-browscap-form";
import {
  AdminBrowscapConvertSection,
  AdminBrowscapLatestConvertSection,
  AdminBrowscapStatusSection,
} from "./AdminBrowscapSections";

const browscapStatusQueryKey = ["admin", "system-tools", "browscap", "status"] as const;

export function AdminBrowscapWorkspace() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isConvertRoute =
    location.pathname === ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE;

  const form = useForm<AdminBrowscapConvertFormValues>({
    defaultValues: emptyAdminBrowscapConvertFormValues,
    resolver: zodResolver(adminBrowscapConvertFormSchema),
  });

  const statusQuery = useQuery<AdminBrowscapStatusResponse, CommandError>({
    queryKey: browscapStatusQueryKey,
    queryFn: getAdminBrowscapStatus,
  });

  const updateMutation = useMutation<AdminBrowscapStatusResponse, CommandError>({
    mutationFn: updateAdminBrowscap,
    onSuccess: async () => {
      toast.success("Browscap 캐시를 업데이트했습니다.");
      await queryClient.invalidateQueries({ queryKey: browscapStatusQueryKey });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const convertMutation = useMutation<
    AdminBrowscapConvertResponse,
    CommandError,
    AdminBrowscapConvertFormValues
  >({
    mutationFn: async (values) =>
      convertAdminBrowscap(buildAdminBrowscapConvertInput(values)!),
    onSuccess: async (response) => {
      toast.success(
        `접속로그 변환을 실행했습니다. 처리 ${response.result.processed_count}건`,
      );
      await queryClient.invalidateQueries({ queryKey: browscapStatusQueryKey });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const status = statusQuery.data?.status ?? null;
  const latestConvert = convertMutation.data?.result ?? null;
  const latestError = statusQuery.error ?? updateMutation.error ?? convertMutation.error;
  const isBusy = statusQuery.isFetching || updateMutation.isPending || convertMutation.isPending;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Browscap"
          title={isConvertRoute ? "접속로그 변환" : "Browscap 업데이트"}
          description="`/admin/system/browscap`, `/admin/system/browscap/update`, `/admin/system/browscap/convert`를 하나의 route-native 작업면으로 묶었습니다. 현재 들어온 메뉴에 따라 업데이트 또는 변환 카드를 먼저 강조합니다."
          icon={RefreshCw}
          metrics={[
            {
              hint: "plugin/browscap과 cache 파일이 모두 준비됐는지",
              icon: ShieldCheck,
              label: "사용 가능",
              value: status ? (status.available ? "ready" : "blocked") : "loading...",
            },
            {
              hint: "현재 Browscap 변환 대기 방문 로그 수",
              icon: Waypoints,
              label: "대기 로그",
              value: status ? String(status.pending_visit_count) : "loading...",
            },
            {
              hint: "cache/browscap_cache.php 존재 여부",
              icon: ScanSearch,
              label: "캐시 파일",
              value: status ? (status.cache_exists ? "exists" : "missing") : "loading...",
            },
          ]}
        />

        {latestError ? <ErrorBanner error={latestError} /> : null}

        <AdminBrowscapStatusSection
          emphasized={!isConvertRoute}
          isBusy={isBusy}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: browscapStatusQueryKey });
          }}
          onUpdate={() => updateMutation.mutate()}
          status={status}
          updatePending={updateMutation.isPending}
        />
        <AdminBrowscapConvertSection
          convertPending={convertMutation.isPending}
          emphasized={isConvertRoute}
          form={form}
          isBusy={isBusy}
          onReset={() => form.reset(emptyAdminBrowscapConvertFormValues)}
          onSubmit={(values) => {
            const payload = buildAdminBrowscapConvertInput(values);
            if (!payload) {
              toast.error("변환 건수를 다시 확인해 주십시오.");
              return;
            }

            convertMutation.mutate(values);
          }}
          status={status}
        />
      </div>

      <AdminBrowscapLatestConvertSection
        correlationId={convertMutation.data?.correlation_id ?? null}
        focusRoute={
          isConvertRoute ? ENVIRONMENT_VISIT_LOG_CONVERT_ROUTE : ENVIRONMENT_BROWSCAP_ROUTE
        }
        latestConvert={latestConvert}
        requestId={convertMutation.data?.request_id ?? null}
        serverRequestId={convertMutation.data?.server_request_id ?? null}
      />
    </div>
  );
}
