import { Mail, Send, Users } from "lucide-react";
import { PageIntro } from "../layout/PageIntro";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  AdminMailDeleteDialog,
  MailRecipientsSection,
  MailSendSection,
  MailTemplateEditorSection,
  MailTemplatesSection,
} from "./AdminMailsSections";
import { useAdminMailsWorkspace } from "./use-admin-mails-workspace";

export function AdminMailsWorkspace() {
  const model = useAdminMailsWorkspace();
  const schemaQuery = useAdminFieldSchema("mails");
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: schemaQuery.error ?? null,
    loading: schemaQuery.isLoading,
    schema: fieldSchema,
  });

  return (
    <>
      <PageIntro
        kicker="Admin Mails"
        title="회원메일발송"
        description="`/admin/mails` 템플릿 CRUD, `/admin/mails/recipients` 수신자 미리보기, `/admin/mails` 발송을 한 작업면으로 연결했습니다. 직접 선택 회원 중심으로 드라이런을 기본값으로 두어 대량 회귀를 막습니다."
        icon={Mail}
        metrics={[
          {
            hint: "현재 등록된 메일 템플릿 총수",
            icon: Mail,
            label: "템플릿 수",
            value: String(model.templatePagination?.total ?? 0),
          },
          {
            hint: "최근 미리보기 또는 선택 기준 예상 대상 수",
            icon: Users,
            label: "예상 대상",
            value: String(model.estimatedTargets),
          },
          {
            hint: "가장 최근 발송 또는 드라이런 성공 건수",
            icon: Send,
            label: "최근 성공",
            value: model.latestSendResult ? String(model.latestSendResult.sent_count) : "0",
          },
        ]}
      />

      {model.topError ? <ErrorBanner error={model.topError} /> : null}

      {showSchemaState ? (
        <FieldSchemaStatePanel
          error={schemaQuery.error ?? null}
          hiddenTargetLabel="회원메일 작업면"
          loading={schemaQuery.isLoading}
          noun="회원메일"
          schema={fieldSchema}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-6">
            <MailTemplatesSection
              currentPage={model.templatePage}
              disabled={model.templateListQuery.isFetching}
              hasNext={model.templatePagination?.has_next ?? false}
              hasPrev={model.templatePagination?.has_prev ?? false}
              onNextPage={() => model.setTemplatePage((page) => page + 1)}
              onPrevPage={() => model.setTemplatePage((page) => Math.max(1, page - 1))}
              onSelectTemplate={model.setSelectedTemplateId}
              selectedTemplateId={model.selectedTemplateId}
              templates={model.templates}
            />

            <MailRecipientsSection
              composeForm={model.composeForm}
              currentPage={model.recipientPage}
              disabled={model.recipientListQuery.isFetching}
              fieldSchema={fieldSchema}
              hasNext={model.recipientPagination?.has_next ?? false}
              hasPrev={model.recipientPagination?.has_prev ?? false}
              isBusy={model.isBusy}
              onApplyPreview={() => {
                model.setRecipientPage(1);
                model.setAppliedComposeValues(model.composeForm.getValues());
              }}
              onNextPage={() => model.setRecipientPage((page) => page + 1)}
              onPrevPage={() => model.setRecipientPage((page) => Math.max(1, page - 1))}
              recipientPagination={model.recipientPagination}
              recipients={model.recipients}
              selectedRecipientIds={model.selectedRecipientIds}
              setSelectedRecipientIds={model.setSelectedRecipientIds}
              targetType={model.targetType}
              visibleRecipientIds={model.visibleRecipientIds}
            />
          </div>

          <div className="space-y-6">
            <MailTemplateEditorSection
              createPending={model.createMutation.isPending}
              fieldSchema={fieldSchema}
              isBusy={model.isBusy}
              onCopyTemplateToCompose={model.handleCopyTemplateToCompose}
              onDeleteTemplate={() => model.setDeleteDialogOpen(true)}
              onResetTemplate={model.resetTemplate}
              onSubmit={model.handleTemplateSubmit}
              selectedTemplate={model.selectedTemplate}
              selectedTemplateId={model.selectedTemplateId}
              templateForm={model.templateForm}
              updatePending={model.updateMutation.isPending}
            />

            <MailSendSection
              composeForm={model.composeForm}
              dryRun={model.dryRun}
              fieldSchema={fieldSchema}
              isBusy={model.isBusy}
              latestSendSummary={
                model.latestSendResult
                  ? `target=${model.latestSendResult.target_count}, sent=${model.latestSendResult.sent_count}, skipped=${model.latestSendResult.skipped_count}`
                  : "없음"
              }
              latestTargetsSummary={
                model.latestSendResult?.targets.length
                  ? model.latestSendResult.targets
                      .slice(0, 5)
                      .map((target) => `${target.mb_id} <${target.mb_email}>`)
                      .join(", ")
                  : "없음"
              }
              onSubmit={model.handleComposeSubmit}
              recipientPagination={model.recipientPagination}
              selectedRecipientIds={model.selectedRecipientIds}
              selectedTemplate={model.selectedTemplate}
              sendPending={model.sendMutation.isPending}
              targetType={model.targetType}
              useSelectedTemplate={model.useSelectedTemplate}
            />
          </div>
        </div>
      )}

      <AdminMailDeleteDialog
        isPending={model.deleteMutation.isPending}
        onCancel={() => model.setDeleteDialogOpen(false)}
        onConfirm={() => model.deleteMutation.mutate()}
        open={model.deleteDialogOpen}
        selectedTemplateId={model.selectedTemplateId}
      />
    </>
  );
}
