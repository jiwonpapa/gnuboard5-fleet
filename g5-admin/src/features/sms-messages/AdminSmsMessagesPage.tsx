import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Smile, Users } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  getAdminSmsConfig,
  getAdminSmsContactGroupList,
  getAdminSmsTemplateList,
  sendAdminSmsMessage,
  type CommandError,
} from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  SelectInputControlField,
  TextAreaInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import { PageIntro } from "../layout/PageIntro";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
  useAdminFieldSchema,
} from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import { SmsStorageUnavailableNotice } from "../shared/SmsStorageUnavailableNotice";
import {
  adminSmsMessageFormSchema,
  buildAdminSmsSendInput,
  emptyAdminSmsMessageFormValues,
  parseManualTargets,
  parsePositiveIntList,
  type AdminSmsMessageFormValues,
} from "./admin-sms-messages-form";

export function AdminSmsMessagesPage() {
  const queryClient = useQueryClient();
  const schemaQuery = useAdminFieldSchema("sms-messages");
  const form = useForm<AdminSmsMessageFormValues>({
    defaultValues: emptyAdminSmsMessageFormValues,
    resolver: zodResolver(adminSmsMessageFormSchema),
  });
  const watched = useWatch({ control: form.control });

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
  const groupListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsContactGroupList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: ["admin", "sms", "contact-groups"],
    queryFn: () => getAdminSmsContactGroupList(),
    retry: false,
  });
  const templateListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsTemplateList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: ["admin", "sms", "templates", "send"],
    queryFn: () =>
      getAdminSmsTemplateList({
        page: 1,
        per_page: 100,
        fg_no: null,
        search_field: null,
        search: null,
      }),
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: async (values: AdminSmsMessageFormValues) =>
      sendAdminSmsMessage(buildAdminSmsSendInput(values)),
    onSuccess: async (response) => {
      toast.success(
        `발송 완료: 총 ${response.result.total}건, 성공 ${response.result.success}건, 실패 ${response.result.failure}건`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin", "sms", "history"],
      });
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError =
    configQuery.error ??
    groupListQuery.error ??
    templateListQuery.error ??
    sendMutation.error ??
    null;
  const providerReady = configQuery.data?.config.provider_ready ?? false;
  const isStorageUnavailable =
    configQuery.isSuccess && !configQuery.data.config.storage_ready;
  const missingTables = configQuery.data?.config.missing_tables ?? [];
  const groups = groupListQuery.data?.groups ?? [];
  const templates = templateListQuery.data?.templates ?? [];
  const estimatedTargets =
    parsePositiveIntList(watched?.group_ids_csv ?? "").length +
    parsePositiveIntList(watched?.contact_ids_csv ?? "").length +
    parsePositiveIntList(watched?.member_levels_csv ?? "").length +
    parseManualTargets(watched?.manual_targets_text ?? "").length;
  const selectedGroupIds = useMemo(
    () => parsePositiveIntList(watched?.group_ids_csv ?? ""),
    [watched?.group_ids_csv],
  );
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: schemaQuery.error ?? null,
    loading: schemaQuery.isLoading,
    schema: fieldSchema,
  });
  const templateOptions = resolveTemplateOptions(fieldSchema, templates);
  const fieldLabel = (
    name: keyof AdminSmsMessageFormValues,
    fallback: string,
  ) => getFieldLabel(fieldSchema, name, fallback);
  const fieldDescription = (name: keyof AdminSmsMessageFormValues) =>
    getFieldDescription(fieldSchema, name);

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Admin SMS Messages"
        title="문자 보내기"
        description="`/admin/sms/messages` 발송 작업면입니다. 템플릿 선택, 직접 메시지 입력, 그룹/연락처/회원레벨/수동 수신자 조합, 예약 발송을 한 화면에서 설정합니다."
        icon={Send}
        metrics={[
          {
            hint: "현재 SMS 공급자 설정 반영 상태",
            icon: Send,
            label: "Provider",
            value: providerReady ? "READY" : "NOT READY",
          },
          {
            hint: "선택 가능한 연락처 그룹 수",
            icon: Users,
            label: "그룹 수",
            value: String(groups.length),
          },
          {
            hint: "폼 기준 예상 발송 대상 수",
            icon: Smile,
            label: "예상 대상",
            value: String(estimatedTargets),
          },
        ]}
      />

      {topError ? <ErrorBanner error={topError} /> : null}

      {isStorageUnavailable ? (
        <SmsStorageUnavailableNotice missingTables={missingTables} />
      ) : showSchemaState ? (
        <FieldSchemaStatePanel
          error={schemaQuery.error ?? null}
          hiddenTargetLabel="문자 보내기 작업면"
          loading={schemaQuery.isLoading}
          noun="문자 보내기"
          schema={fieldSchema}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card>
            <CardHeader>
              <CardTitle>발송 작성</CardTitle>
              <CardDescription>
                템플릿을 선택하거나 메시지를 직접 입력하십시오. 둘 중 하나는
                반드시 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-4"
                onSubmit={form.handleSubmit((values) =>
                  sendMutation.mutate(values),
                )}
              >
                <SelectInputControlField
                  control={form.control}
                  description={fieldDescription("template_id")}
                  label={fieldLabel("template_id", "템플릿")}
                  name="template_id"
                  options={templateOptions}
                />
                <TextAreaInputControlField
                  control={form.control}
                  description={
                    fieldDescription("message") ??
                    "직접 메시지를 쓰지 않으면 템플릿 내용이 사용됩니다."
                  }
                  label={fieldLabel("message", "메시지")}
                  name="message"
                  rows={6}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInputControlField
                    control={form.control}
                    description={fieldDescription("booking_at")}
                    label={fieldLabel("booking_at", "예약 발송 시각")}
                    name="booking_at"
                    placeholder="2026-03-08 16:00"
                  />
                  <TextInputControlField
                    control={form.control}
                    description={fieldDescription("wr_reply")}
                    label={fieldLabel("wr_reply", "회신번호")}
                    name="wr_reply"
                    placeholder="0212345678"
                  />
                </div>
                <TextInputControlField
                  control={form.control}
                  description={
                    fieldDescription("group_ids_csv") ??
                    "쉼표 또는 줄바꿈으로 구분된 그룹 번호 목록입니다."
                  }
                  label={fieldLabel("group_ids_csv", "선택 그룹 ID")}
                  name="group_ids_csv"
                />
                <TextInputControlField
                  control={form.control}
                  description={
                    fieldDescription("contact_ids_csv") ??
                    "쉼표 또는 줄바꿈으로 구분된 연락처 번호(bk_no) 목록입니다."
                  }
                  label={fieldLabel("contact_ids_csv", "개별 연락처 ID")}
                  name="contact_ids_csv"
                />
                <TextInputControlField
                  control={form.control}
                  description={
                    fieldDescription("member_levels_csv") ??
                    "쉼표 또는 줄바꿈으로 구분된 회원 레벨 목록입니다."
                  }
                  label={fieldLabel("member_levels_csv", "회원 레벨")}
                  name="member_levels_csv"
                />
                <TextAreaInputControlField
                  control={form.control}
                  description={
                    fieldDescription("manual_targets_text") ??
                    "한 줄에 `이름,번호` 또는 `번호` 형식으로 입력하십시오."
                  }
                  label={fieldLabel("manual_targets_text", "수동 수신자")}
                  name="manual_targets_text"
                  rows={5}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={sendMutation.isPending || !providerReady}
                  >
                    문자 발송
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sendMutation.isPending}
                    onClick={() => form.reset(emptyAdminSmsMessageFormValues)}
                  >
                    폼 초기화
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>빠른 그룹 선택</CardTitle>
                <CardDescription>
                  체크박스를 사용하면 그룹 ID 목록에 바로 반영됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {groups.length > 0 ? (
                  groups.map((group) => {
                    const checked = selectedGroupIds.includes(group.bg_no);

                    return (
                      <label
                        key={group.bg_no}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <strong className="block text-foreground">
                            {group.bg_name}
                          </strong>
                          <p className="text-muted-foreground">
                            #{group.bg_no} · 전체 {group.bg_count}건
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.currentTarget.checked
                              ? Array.from(
                                  new Set([...selectedGroupIds, group.bg_no]),
                                ).sort((left, right) => left - right)
                              : selectedGroupIds.filter(
                                  (value) => value !== group.bg_no,
                                );
                            form.setValue("group_ids_csv", next.join(","), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        />
                      </label>
                    );
                  })
                ) : (
                  <SelectionPlaceholder description="선택 가능한 연락처 그룹이 없습니다." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>발송 요약</CardTitle>
                <CardDescription>
                  현재 폼 기준으로 실제 발송 요청에 들어갈 주요 값을 요약합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SelectionPlaceholder
                  description={`템플릿 ${watched?.template_id || "직접 입력"} / 그룹 ${parsePositiveIntList(watched?.group_ids_csv ?? "").length} / 연락처 ${parsePositiveIntList(watched?.contact_ids_csv ?? "").length} / 레벨 ${parsePositiveIntList(watched?.member_levels_csv ?? "").length} / 수동 ${parseManualTargets(watched?.manual_targets_text ?? "").length}`}
                />
                {sendMutation.data ? (
                  <SelectionPlaceholder
                    description={`최근 결과: write ${sendMutation.data.result.write_no}/${sendMutation.data.result.write_renum}, 총 ${sendMutation.data.result.total}건, 성공 ${sendMutation.data.result.success}건, 실패 ${sendMutation.data.result.failure}건`}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function resolveTemplateOptions(
  fieldSchema: Parameters<typeof getFieldOptions>[0],
  templates: Array<{ fo_name: string; fo_no: number }>,
) {
  const options = getFieldOptions(fieldSchema, "template_id");
  if (options.length > 0) {
    return [{ label: "직접 입력", value: "" }, ...options];
  }

  return [
    { label: "직접 입력", value: "" },
    ...templates.map((template) => ({
      label: `${template.fo_name} (#${template.fo_no})`,
      value: String(template.fo_no),
    })),
  ];
}
