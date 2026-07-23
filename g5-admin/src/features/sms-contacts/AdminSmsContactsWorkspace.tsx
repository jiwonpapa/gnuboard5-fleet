import { Phone, Upload, Users } from "lucide-react";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { PageIntro } from "../layout/PageIntro";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SmsStorageUnavailableNotice } from "../shared/SmsStorageUnavailableNotice";
import { AdminSmsContactEditorSection } from "./AdminSmsContactEditorSection";
import { AdminSmsContactGroupsSection } from "./AdminSmsContactGroupsSection";
import { AdminSmsContactImportExportCard } from "./AdminSmsContactImportExportCard";
import { AdminSmsContactsListSection } from "./AdminSmsContactsListSection";
import { useAdminSmsContactsWorkspace } from "./use-admin-sms-contacts-workspace";

export function AdminSmsContactsWorkspace() {
  const model = useAdminSmsContactsWorkspace();
  const schemaQuery = useAdminFieldSchema("sms-contacts");
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: schemaQuery.error ?? null,
    loading: schemaQuery.isLoading,
    schema: fieldSchema,
  });

  return (
    <>
      <div className="grid gap-5">
        <PageIntro
          kicker="Admin SMS Contacts"
          title={model.pageCopy.title}
          description={model.pageCopy.description}
          icon={Phone}
          actions={
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  현재 그룹
                </p>
                <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                  {model.selectedGroup?.bg_name ?? "없음"}
                </strong>
              </div>
              <div className="rounded-sm border border-border bg-background/90 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  일괄 선택
                </p>
                <strong className="mt-1 block text-[0.9rem] font-semibold text-foreground">
                  {model.selectedContactIds.length}건
                </strong>
              </div>
            </div>
          }
          metrics={[
            {
              hint: "현재 서버에 등록된 휴대폰번호 그룹 수",
              icon: Users,
              label: "그룹 수",
              value: String(model.groups.length),
            },
            {
              hint: "현재 조회 조건 기준 연락처 총수",
              icon: Phone,
              label: "연락처 수",
              value: String(model.contactSummary?.total_count ?? 0),
            },
            {
              hint: "회원 동기화 마지막 실행 시각",
              icon: Upload,
              label: "마지막 동기화",
              value: model.contactSummary?.last_synced_at ?? "-",
            },
          ]}
        />

        {model.topError ? <ErrorBanner error={model.topError} /> : null}

        {model.isStorageUnavailable ? (
          <SmsStorageUnavailableNotice missingTables={model.missingTables} />
        ) : showSchemaState ? (
          <FieldSchemaStatePanel
            error={schemaQuery.error ?? null}
            hiddenTargetLabel="휴대폰번호 관리 작업면"
            loading={schemaQuery.isLoading}
            noun="휴대폰번호 관리"
            schema={fieldSchema}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.84fr)_minmax(0,1.16fr)]">
            <AdminSmsContactGroupsSection
              activeGroupId={model.activeGroupId}
              availableMoveTargets={model.availableMoveTargets}
              contactForm={model.contactForm}
              fieldSchema={fieldSchema}
              groupForm={model.groupForm}
              groupMoveTarget={model.groupMoveTarget}
              groups={model.groups}
              importForm={model.importForm}
              isBusy={model.isBusy}
              onClearGroup={() => model.clearGroupMutation.mutate()}
              onDeleteGroup={() => model.setDeleteGroupDialogOpen(true)}
              onGroupMoveTargetChange={model.setGroupMoveTarget}
              onGroupSelect={(group) => {
                model.handleGroupSelect(group.bg_no);
              }}
              onMoveGroup={() => model.moveGroupMutation.mutate()}
              onResetGroupForm={model.groupFormReset}
              onSubmitGroup={model.handleGroupSubmit}
              selectedGroup={model.selectedGroup}
            />

            <div className="space-y-6">
              <AdminSmsContactsListSection
                batchTarget={model.batchTarget}
                contacts={model.contacts}
                groups={model.groups}
                isBusy={model.isBusy}
                onBatchAction={(action) => model.batchMutation.mutate(action)}
                onBatchTargetChange={model.setBatchTarget}
                onContactSelect={(contact) =>
                  model.setSelectedContactId(contact.bk_no)
                }
                onPageNext={() =>
                  model.setContactPage((current) => current + 1)
                }
                onPagePrev={() =>
                  model.setContactPage((current) => Math.max(1, current - 1))
                }
                onSearchChange={(value) => {
                  model.setContactPage(1);
                  model.setSearch(value);
                }}
                onSearchFieldChange={model.setSearchField}
                onSelectionToggle={model.toggleContactSelection}
                onToggleWithPhoneOnly={() => {
                  model.setContactPage(1);
                  model.setWithPhoneOnly((current) => !current);
                }}
                pagination={model.contactPagination}
                search={model.search}
                searchField={model.searchField}
                selectedContactId={model.selectedContactId}
                selectedContactIds={model.selectedContactIds}
                withPhoneOnly={model.withPhoneOnly}
              />

              <AdminSmsContactEditorSection
                contactForm={model.contactForm}
                fieldSchema={fieldSchema}
                groups={model.groups}
                isBusy={model.isBusy}
                onResetContactForm={model.contactFormReset}
                onSubmitContact={model.handleContactSubmit}
                onToggleDeleteContact={() =>
                  model.setDeleteContactDialogOpen(true)
                }
                selectedContact={model.selectedContact}
              />

              <AdminSmsContactImportExportCard
                exportRows={model.exportRows}
                exportTotal={model.exportTotal}
                fieldSchema={fieldSchema}
                groups={model.groups}
                importFileName={model.importFile?.name ?? null}
                importForm={model.importForm}
                importResultDescription={model.importResultDescription}
                isBusy={model.isBusy}
                onExportPreview={() =>
                  model.importForm.handleSubmit((values) =>
                    model.exportMutation.mutate(values),
                  )()
                }
                onImportFileChange={model.setImportFile}
                onSubmitImport={() =>
                  model.importMutation.mutate(model.importForm.getValues())
                }
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmActionDialog
        confirmLabel="그룹 삭제"
        description="기본 그룹 제약이나 잔여 연락처 조건은 서버가 최종 검사합니다."
        isPending={model.deleteGroupMutation.isPending}
        onCancel={() => model.setDeleteGroupDialogOpen(false)}
        onConfirm={() => model.deleteGroupMutation.mutate()}
        open={model.deleteGroupDialogOpen}
        title="휴대폰번호 그룹을 삭제하시겠습니까?"
        variant="destructive"
      />

      <ConfirmActionDialog
        confirmLabel="연락처 삭제"
        description="선택한 휴대폰번호 항목을 삭제합니다."
        isPending={model.deleteContactMutation.isPending}
        onCancel={() => model.setDeleteContactDialogOpen(false)}
        onConfirm={() => model.deleteContactMutation.mutate()}
        open={model.deleteContactDialogOpen}
        title="연락처를 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
