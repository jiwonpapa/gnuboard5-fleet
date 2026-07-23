import { useEffect, useMemo, type FormEventHandler } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareMore } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  getAdminSmsConfig,
  syncAdminSmsMembers,
  updateAdminSmsConfig,
  type CommandError,
} from "../../api/client";
import type { AdminSmsConfigResponse } from "../../types/AdminSmsConfigResponse";
import type { AdminSmsConfigUpdateInput } from "../../types/AdminSmsConfigUpdateInput";
import type { AdminSmsMemberSyncResponse } from "../../types/AdminSmsMemberSyncResponse";
import { usePageDiagnostics } from "../../debug/page-diagnostics";
import { PageIntro } from "../layout/PageIntro";
import { useTheme } from "../layout/theme";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import {
  AdminSmsConfigContent,
  AdminSmsConfigFeatureUnavailableCard,
} from "./AdminSmsConfigSections";
import {
  buildAdminSmsConfigUpdateInput,
  emptyAdminSmsConfigFormValues,
  toAdminSmsConfigFormValues,
  type AdminSmsConfigFormValues,
} from "./admin-sms-config-form";
import {
  prepareAdminSmsConfigSubmitPayload,
  resetAdminSmsConfigForm,
  resolveAdminSmsConfigFormValues,
  smsConfigKey,
  smsConfigSchema,
} from "./admin-sms-config-page-helpers";

export function AdminSmsConfigWorkspace() {
  const queryClient = useQueryClient();
  const { devMode } = useTheme();
  const schemaQuery = useAdminFieldSchema("system");
  const configQuery = useQuery<AdminSmsConfigResponse, CommandError>({
    queryKey: smsConfigKey,
    queryFn: getAdminSmsConfig,
    retry: false,
  });
  const form = useForm<AdminSmsConfigFormValues>({
    resolver: zodResolver(smsConfigSchema),
    defaultValues: emptyAdminSmsConfigFormValues,
  });

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    form.reset(toAdminSmsConfigFormValues(configQuery.data.config));
  }, [configQuery.data, form]);

  const updateMutation = useMutation<
    AdminSmsConfigResponse,
    CommandError,
    Partial<AdminSmsConfigUpdateInput>
  >({
    mutationFn: updateAdminSmsConfig,
    onSuccess: (response) => {
      queryClient.setQueryData(smsConfigKey, response);
      form.reset(toAdminSmsConfigFormValues(response.config));
      toast.success("SMS 설정을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const syncMutation = useMutation<AdminSmsMemberSyncResponse, CommandError>({
    mutationFn: syncAdminSmsMembers,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: smsConfigKey });
      toast.success(
        `회원 ${response.result.summary.total_members}건 동기화를 완료했습니다.`,
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const configError = configQuery.error ?? null;
  const mutationError = updateMutation.error ?? syncMutation.error ?? null;
  const featureUnavailable =
    configError?.status === 404 && configError.code === "resource.not_found";
  const baseline = configQuery.data?.config ?? null;
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const isBusy =
    configQuery.isLoading || updateMutation.isPending || syncMutation.isPending;
  const watchedValues = useWatch({ control: form.control });
  const values = resolveAdminSmsConfigFormValues(watchedValues);
  const latestSync = syncMutation.data?.result ?? null;
  const pendingPayload = baseline
    ? buildAdminSmsConfigUpdateInput(values, baseline)
    : null;
  const hasChanges = pendingPayload ? Object.keys(pendingPayload).length > 0 : false;
  const canSyncMembers = values.cf_sms_use === "icode" && !isBusy;
  const schemaStateVisible =
    !featureUnavailable &&
    hasFieldSchemaState({
      error: schemaQuery.error ?? null,
      loading: schemaQuery.isLoading,
      schema: fieldSchema,
    });

  const diagnosticsDescriptor = useMemo(
    () => ({
      commands: [
        {
          apiTarget: "/admin/sms/config",
          command: "cmd_admin_sms_config_get",
          label: "SMS 설정 조회",
        },
        {
          apiTarget: "/admin/sms/config",
          command: "cmd_admin_sms_config_update",
          label: "SMS 설정 저장",
        },
        {
          apiTarget: "/admin/sms/member-sync",
          command: "cmd_admin_sms_member_sync",
          label: "회원 연락처 동기화",
        },
        {
          apiTarget: "/admin/schema/system",
          command: "cmd_admin_schema_get",
          label: "system 스키마 조회",
        },
      ],
      description: "SMS 공급자 설정 조회·저장·회원 동기화와 system 스키마 소비 경로를 함께 추적합니다.",
      items: [
        { label: "기능 상태", value: featureUnavailable ? "미지원" : "활성" },
        { label: "SMS 사용", value: values.cf_sms_use || "사용 안 함" },
        { label: "전송 타입", value: values.cf_sms_type || "기본 SMS" },
        { label: "변경 여부", value: hasChanges },
        { label: "회원 동기화 가능", value: canSyncMembers },
        {
          label: "request_id",
          value:
            syncMutation.data?.request_id ??
            updateMutation.data?.request_id ??
            configQuery.data?.request_id ??
            "-",
        },
        {
          label: "correlation_id",
          value:
            syncMutation.data?.correlation_id ??
            updateMutation.data?.correlation_id ??
            configQuery.data?.correlation_id ??
            "-",
        },
        {
          label: "server_request_id",
          value:
            syncMutation.data?.server_request_id ??
            updateMutation.data?.server_request_id ??
            configQuery.data?.server_request_id ??
            "-",
        },
        {
          label: "최근 동기화 회원 수",
          value: latestSync?.summary.total_members ?? 0,
        },
        {
          label: "유효 전화번호",
          value: latestSync?.summary.phone_valid ?? 0,
        },
        {
          label: "수신 허용",
          value: latestSync?.summary.receipt_enabled ?? 0,
        },
      ],
      title: "SMS 기본설정",
    }),
    [
      canSyncMembers,
      configQuery.data?.correlation_id,
      configQuery.data?.request_id,
      configQuery.data?.server_request_id,
      featureUnavailable,
      hasChanges,
      latestSync?.summary.phone_valid,
      latestSync?.summary.receipt_enabled,
      latestSync?.summary.total_members,
      syncMutation.data?.correlation_id,
      syncMutation.data?.request_id,
      syncMutation.data?.server_request_id,
      updateMutation.data?.correlation_id,
      updateMutation.data?.request_id,
      updateMutation.data?.server_request_id,
      values.cf_sms_type,
      values.cf_sms_use,
    ],
  );

  usePageDiagnostics(diagnosticsDescriptor);

  const handleReset = () => {
    resetAdminSmsConfigForm(form, baseline);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    void form.handleSubmit((submittedValues) => {
      const payload = prepareAdminSmsConfigSubmitPayload({
        baseline,
        form,
        submittedValues,
      });

      if (!payload) {
        return;
      }

      updateMutation.mutate(payload);
    })(event);
  };

  return (
    <div className="grid gap-5">
      <div className="space-y-5">
        <PageIntro
          kicker="SMS 관리"
          title="SMS 기본설정"
          description="공급자 연결, 회신번호, 회원 연락처 동기화를 한 화면에서 관리합니다."
          icon={MessageSquareMore}
        />

        {featureUnavailable ? (
          <AdminSmsConfigFeatureUnavailableCard
            configError={configError}
            devMode={devMode}
          />
        ) : schemaStateVisible ? (
          <FieldSchemaStatePanel
            error={schemaQuery.error ?? null}
            hiddenTargetLabel="SMS 설정 작업면"
            loading={schemaQuery.isLoading}
            noun="SMS 설정"
            schema={fieldSchema}
          />
        ) : (
          <AdminSmsConfigContent
            baseline={baseline}
            canSyncMembers={canSyncMembers}
            configError={configError}
            fieldSchema={fieldSchema}
            form={form}
            hasChanges={hasChanges}
            isBusy={isBusy}
            mutationError={mutationError}
            onReset={handleReset}
            onSubmit={handleSubmit}
            onSyncMembers={() => syncMutation.mutate()}
            syncPending={syncMutation.isPending}
            updatePending={updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
