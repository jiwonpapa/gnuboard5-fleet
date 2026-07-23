import { MessageSquareMore, Smile, Users } from "lucide-react";
import { PageIntro } from "../layout/PageIntro";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SmsStorageUnavailableNotice } from "../shared/SmsStorageUnavailableNotice";
import { adminSmsTemplateSearchFieldOptions } from "./admin-sms-templates-form";
import { SmsTemplateEditorSection } from "./SmsTemplateEditorSection";
import {
  SmsTemplateDialogs,
  SmsTemplateGroupsSection,
} from "./SmsTemplateGroupsSection";
import { SmsTemplateListSection } from "./SmsTemplateListSection";
import { useAdminSmsTemplatesWorkspace } from "./use-admin-sms-templates-workspace";

export function AdminSmsTemplatesWorkspace() {
  const model = useAdminSmsTemplatesWorkspace();
  const schemaQuery = useAdminFieldSchema("sms-templates");
  const fieldSchema = schemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: schemaQuery.error ?? null,
    loading: schemaQuery.isLoading,
    schema: fieldSchema,
  });

  return (
    <>
      <div className="grid gap-6">
        <PageIntro
          kicker="Admin SMS Templates"
          title={model.isGroupRoute ? "이모티콘 그룹" : "이모티콘 관리"}
          description="`/admin/sms/template-groups`와 `/admin/sms/templates`를 한 작업면으로 연결했습니다. 그룹 구조와 템플릿 본문을 같은 화면에서 점검하고, 이동·비우기·일괄 처리까지 바로 수행할 수 있습니다."
          icon={Smile}
          metrics={[
            {
              hint: "현재 서버에 등록된 이모티콘 그룹 수",
              icon: Users,
              label: "그룹 수",
              value: String(model.groups.length),
            },
            {
              hint: "현재 필터 기준 템플릿 총수",
              icon: MessageSquareMore,
              label: "템플릿 수",
              value: String(model.templatePagination?.total ?? 0),
            },
            {
              hint: "현재 일괄 처리 대상으로 체크한 템플릿 수",
              icon: Smile,
              label: "선택 항목",
              value: String(model.selectedTemplateIds.length),
            },
          ]}
        />

        {model.topError ? <ErrorBanner error={model.topError} /> : null}

        {model.isStorageUnavailable ? (
          <SmsStorageUnavailableNotice missingTables={model.missingTables} />
        ) : showSchemaState ? (
          <FieldSchemaStatePanel
            error={schemaQuery.error ?? null}
            hiddenTargetLabel="이모티콘 관리 작업면"
            loading={schemaQuery.isLoading}
            noun="이모티콘 관리"
            schema={fieldSchema}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-6">
              <SmsTemplateGroupsSection
                activeGroupId={model.activeGroupId}
                availableMoveTargets={model.availableMoveTargets}
                fieldSchema={fieldSchema}
                groupForm={model.groupForm}
                groupMoveTarget={model.groupMoveTarget}
                groups={model.groups}
                isBusy={model.isBusy}
                onClearGroup={() => model.clearGroupMutation.mutate()}
                onDeleteGroupDialogOpen={() =>
                  model.setDeleteGroupDialogOpen(true)
                }
                onGroupMove={() => model.moveGroupMutation.mutate()}
                onGroupMoveTargetChange={model.setGroupMoveTarget}
                onGroupReset={model.groupFormReset}
                onGroupSelect={(group) => model.handleGroupSelect(group.fg_no)}
                onGroupSubmit={model.handleGroupSubmit}
                selectedGroup={model.selectedGroup}
              />
            </div>

            <div className="space-y-6">
              <SmsTemplateListSection
                batchMoveTarget={model.batchMoveTarget}
                groups={model.groups}
                isBusy={model.isBusy}
                onBatchDelete={() => model.batchMutation.mutate("delete")}
                onBatchMove={() => model.batchMutation.mutate("move")}
                onBatchMoveTargetChange={model.setBatchMoveTarget}
                onResetFilters={() => {
                  model.setSearchField("all");
                  model.setSearch("");
                  model.setTemplatePage(1);
                }}
                onSearchChange={(value) => {
                  model.setTemplatePage(1);
                  model.setSearch(value);
                }}
                onSearchFieldChange={model.setSearchField}
                onTemplatePageNext={() =>
                  model.setTemplatePage((current) => current + 1)
                }
                onTemplatePagePrev={() =>
                  model.setTemplatePage((current) => Math.max(1, current - 1))
                }
                onTemplateSelect={model.setSelectedTemplateId}
                onTemplateToggle={model.toggleTemplateSelection}
                search={model.search}
                searchField={model.searchField}
                searchFieldOptions={adminSmsTemplateSearchFieldOptions.map(
                  (option) => ({
                    label: option.label,
                    value: option.value,
                  }),
                )}
                selectedTemplateId={model.selectedTemplateId}
                selectedTemplateIds={model.selectedTemplateIds}
                templatePagination={model.templatePagination}
                templates={model.templates}
              />

              <SmsTemplateEditorSection
                activeGroupId={model.activeGroupId}
                fieldSchema={fieldSchema}
                groupOptions={[
                  { label: "기본 그룹(0)", value: "0" },
                  ...model.groups.map((group) => ({
                    label: `${group.fg_name} (#${group.fg_no})`,
                    value: String(group.fg_no),
                  })),
                ]}
                isBusy={model.isBusy}
                onDeleteTemplateDialogOpen={() =>
                  model.setDeleteTemplateDialogOpen(true)
                }
                onTemplateReset={model.templateFormReset}
                onTemplateSubmit={model.handleTemplateSubmit}
                selectedTemplateId={model.selectedTemplateId}
                templateForm={model.templateForm}
              />
            </div>
          </div>
        )}
      </div>

      <SmsTemplateDialogs
        deleteGroupOpen={model.deleteGroupDialogOpen}
        deleteTemplateOpen={model.deleteTemplateDialogOpen}
        isDeletingGroup={model.deleteGroupMutation.isPending}
        isDeletingTemplate={model.deleteTemplateMutation.isPending}
        onCloseDeleteGroup={() => model.setDeleteGroupDialogOpen(false)}
        onCloseDeleteTemplate={() => model.setDeleteTemplateDialogOpen(false)}
        onConfirmDeleteGroup={() => model.deleteGroupMutation.mutate()}
        onConfirmDeleteTemplate={() => model.deleteTemplateMutation.mutate()}
      />
    </>
  );
}
