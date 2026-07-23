import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  getAdminConfig,
  updateAdminConfig,
  type CommandError,
} from "../../api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { usePageDiagnostics } from "../../debug/page-diagnostics";
import type { AuthSessionState } from "../../types/AuthSessionState";
import type { AdminConfigResponse } from "../../types/AdminConfigResponse";
import type { AdminConfigUpdateInput } from "../../types/AdminConfigUpdateInput";
import { buildAuthStatusKey } from "../auth/use-auth-session";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
  getSchemaSections,
  useAdminFieldSchema,
} from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import { useCurrentSiteId } from "../sites/site-routing";
import { AdminConfigPageSkeleton } from "./AdminConfigPageSkeleton";
import { AdminConfigEditor } from "./AdminConfigSections";
import { createAdminConfigFieldAccessors } from "./admin-config-field-accessors";
import { buildAdminConfigDiagnosticsDescriptor } from "./admin-config-diagnostics";
import {
  buildAdminConfigUpdateInput,
  emptyAdminConfigFormValues,
  hasAdminConfigUpdateChanges,
  toAdminConfigFormValues,
  type AdminConfigFormValues,
} from "./admin-config-form";
import {
  useAdminConfigFieldNavigation,
  validateAdminConfigSubmission,
} from "./admin-config-form-feedback";
import { adminConfigKey, adminConfigSchema } from "./admin-config-page-meta";
import { resolveAdminConfigRenderableSections } from "./admin-config-renderable";
import { getAdminConfigLegacyFieldOverride } from "./config-legacy-overrides";

export function AdminConfigPage() {
  const currentSiteId = useCurrentSiteId();
  const queryClient = useQueryClient();
  const sessionState =
    queryClient.getQueryData<AuthSessionState>(buildAuthStatusKey(currentSiteId)) ?? null;
  const currentSessionAdminId = sessionState?.member?.mb_id?.trim() ?? "";
  const configSchemaQuery = useAdminFieldSchema("config");
  const configQuery = useQuery<AdminConfigResponse, CommandError>({
    queryKey: adminConfigKey,
    queryFn: getAdminConfig,
    retry: false,
  });
  const form = useForm<AdminConfigFormValues>({
    defaultValues: emptyAdminConfigFormValues,
    resolver: zodResolver(adminConfigSchema),
  });

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    form.reset(toAdminConfigFormValues(configQuery.data.config));
  }, [configQuery.data, form]);

  const updateMutation = useMutation<
    AdminConfigResponse,
    CommandError,
    Partial<AdminConfigUpdateInput>
  >({
    mutationFn: updateAdminConfig,
    onSuccess: (response) => {
      queryClient.setQueryData(adminConfigKey, response);
      form.reset(toAdminConfigFormValues(response.config));
      toast.success("기본환경설정을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const error = updateMutation.error ?? configQuery.error ?? null;
  const baseline = configQuery.data?.config ?? null;
  const isBusy = configQuery.isLoading || updateMutation.isPending;
  const watchedValues = useWatch({ control: form.control });
  const values: AdminConfigFormValues = {
    ...emptyAdminConfigFormValues,
    ...watchedValues,
    extraFlags: {
      ...emptyAdminConfigFormValues.extraFlags,
      ...(watchedValues?.extraFlags ?? {}),
    },
    extraTexts: {
      ...emptyAdminConfigFormValues.extraTexts,
      ...(watchedValues?.extraTexts ?? {}),
    },
  };
  const fieldSchema = configSchemaQuery.data?.schema ?? null;
  const pendingPayload = baseline ? buildAdminConfigUpdateInput(values, baseline) : null;
  const hasChanges = pendingPayload ? hasAdminConfigUpdateChanges(pendingPayload) : false;
  const renderableTabs = resolveAdminConfigRenderableSections(getSchemaSections(fieldSchema));
  const {
    activeTabId,
    focusInvalidField,
    handleInvalidSubmit,
    setActiveTabId,
  } = useAdminConfigFieldNavigation({
    form,
    tabs: renderableTabs,
  });
  const hasConfigSchemaState = hasFieldSchemaState({
    error: configSchemaQuery.error ?? null,
    loading: configSchemaQuery.isLoading || configSchemaQuery.isFetching,
    schema: fieldSchema,
  });
  const showLoadingSkeleton =
    configQuery.isLoading
    || ((configSchemaQuery.isLoading || configSchemaQuery.isFetching)
      && !configSchemaQuery.error
      && !fieldSchema);
  const configuredAdminId = values.cf_admin.trim();
  const fieldLabel = (name: string, fallback: string) =>
    getAdminConfigLegacyFieldOverride(name)?.label
    ?? getFieldLabel(fieldSchema, name, fallback);
  const fieldDescription = (name: string) =>
    getAdminConfigLegacyFieldOverride(name)?.description
    ?? getFieldDescription(fieldSchema, name);
  const fieldOptions = (name: string) => {
    const schemaOptions = getFieldOptions(fieldSchema, name);
    if (schemaOptions.length > 0) {
      return schemaOptions;
    }

    if (name === "cf_admin") {
      if (configuredAdminId.length > 0) {
        return [{ label: configuredAdminId, value: configuredAdminId }];
      }

      if (currentSessionAdminId.length > 0) {
        return [
          {
            label: `${currentSessionAdminId} (현재 세션 관리자)`,
            value: "",
          },
        ];
      }
    }

    return getAdminConfigLegacyFieldOverride(name)?.options ?? [];
  };
  const fieldRequired = (name: string) =>
    getAdminConfigLegacyFieldOverride(name)?.required
    ?? (configSchemaQuery.data?.schema.fields_by_name[name]?.required === true);

  usePageDiagnostics(
    buildAdminConfigDiagnosticsDescriptor({
      configResponse: configQuery.data,
      hasChanges,
      updateResponse: updateMutation.data,
      values,
    }),
  );

  const resetToServerValues = () => {
    form.reset(baseline ? toAdminConfigFormValues(baseline) : emptyAdminConfigFormValues);
  };

  return (
    <div className="config-page-layout grid gap-5">
      <div className="config-page-main space-y-5">
        {error ? <ErrorBanner error={error} /> : null}

        {showLoadingSkeleton ? (
          <AdminConfigPageSkeleton />
        ) : hasConfigSchemaState ? (
          <Card>
            <CardHeader>
              <CardTitle>기본환경설정</CardTitle>
              <CardDescription>
                화면 구성이 준비되면 편집 폼을 표시합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldSchemaStatePanel
                error={configSchemaQuery.error ?? null}
                hiddenTargetLabel="기본환경설정 편집 폼"
                loading={configSchemaQuery.isLoading || configSchemaQuery.isFetching}
                noun="기본환경설정"
                schema={fieldSchema}
              />
            </CardContent>
          </Card>
        ) : (
          <AdminConfigEditor
            activeTabId={activeTabId}
            fieldAccessors={createAdminConfigFieldAccessors({
              fieldDescription,
              fieldLabel,
              fieldOptions,
              fieldRequired,
              fieldSchema,
            })}
            form={form}
            hasChanges={hasChanges}
            isBusy={isBusy}
            onInvalid={handleInvalidSubmit}
            onReset={resetToServerValues}
            onTabChange={setActiveTabId}
            onSubmit={(submittedValues) => {
              if (!baseline) {
                return;
              }

              const validationResult = validateAdminConfigSubmission(
                form,
                fieldSchema,
                submittedValues,
              );
              if (!validationResult.isValid) {
                if (validationResult.firstInvalidFieldName) {
                  focusInvalidField(validationResult.firstInvalidFieldName);
                }
                return;
              }

              const payload = buildAdminConfigUpdateInput(submittedValues, baseline);
              if (!hasAdminConfigUpdateChanges(payload)) {
                toast("변경된 설정이 없습니다.");
                return;
              }

              updateMutation.mutate(payload);
            }}
            saveLabel={updateMutation.isPending ? "저장 중..." : "기본환경설정 저장"}
            tabs={renderableTabs}
          />
        )}
      </div>
    </div>
  );
}
