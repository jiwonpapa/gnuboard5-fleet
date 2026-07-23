import { FileText, Search, Smartphone } from "lucide-react";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  AdminContentsEditorSection,
  AdminContentsListSection,
} from "./AdminContentsSections";
import { useAdminContentsWorkspace } from "./use-admin-contents-workspace";

export function AdminContentsWorkspace() {
  const model = useAdminContentsWorkspace();

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <PageIntro
            kicker="Admin Contents"
            title="내용관리"
            description="`/admin/contents` CRUD를 route-native 작업면으로 옮겼습니다. 정적 내용 페이지 목록, 본문, 모바일 본문, HTML 여부를 한 화면에서 관리합니다."
            icon={FileText}
            metrics={[
              {
                hint: "현재 조건 기준 내용 페이지 수",
                icon: FileText,
                label: "목록 건수",
                value: String(model.pagination?.total ?? 0),
              },
              {
                hint: "검색어 적용 상태",
                icon: Search,
                label: "검색",
                value: model.appliedSearch || "전체",
              },
              {
                hint: "모바일 본문이 있는 선택 항목",
                icon: Smartphone,
                label: "모바일 본문",
                value:
                  model.selectedContent &&
                  model.selectedContent.co_mobile_content.trim().length > 0
                    ? "있음"
                    : "없음",
              },
            ]}
          />

          {model.topError ? <ErrorBanner error={model.topError} /> : null}

          <AdminContentsListSection
            contents={model.contents}
            isBusy={model.isBusy}
            onPageNext={() => model.setPage((current) => current + 1)}
            onPagePrev={() => model.setPage((current) => Math.max(1, current - 1))}
            onResetSearch={model.handleResetSearch}
            onSearchChange={model.setSearch}
            onSearchSubmit={model.handleSearchSubmit}
            onSelectContent={model.setSelectedContentId}
            page={model.page}
            pagination={model.pagination}
            search={model.search}
            selectedContentId={model.selectedContentId}
          />
        </div>

        <AdminContentsEditorSection
          contentFieldDescription={model.contentFieldDescription}
          contentFieldLabel={model.contentFieldLabel}
          contentFieldSchema={model.contentFieldSchema}
          contentSchemaError={model.contentSchemaQuery.error ?? null}
          contentSchemaLoading={
            model.contentSchemaQuery.isLoading || model.contentSchemaQuery.isFetching
          }
          form={model.form}
          hasContentSchemaState={model.hasContentSchemaState}
          isBusy={model.isBusy}
          isEditing={model.isEditing}
          onOpenDeleteDialog={() => model.setDeleteDialogOpen(true)}
          onResetContent={model.handleResetContent}
          onSubmit={model.handleSubmit}
          selectedContent={model.selectedContent}
          selectedContentId={model.selectedContentId}
        />
      </div>

      <ConfirmActionDialog
        open={model.deleteDialogOpen}
        title="내용 항목을 삭제하시겠습니까?"
        description={
          model.selectedContentId
            ? `${model.selectedContentId} 항목과 본문이 삭제됩니다.`
            : ""
        }
        confirmLabel="삭제"
        isPending={model.deleteMutation.isPending}
        onCancel={() => model.setDeleteDialogOpen(false)}
        onConfirm={model.handleConfirmDelete}
        variant="destructive"
      />
    </>
  );
}
