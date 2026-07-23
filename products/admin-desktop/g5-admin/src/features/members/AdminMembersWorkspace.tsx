import { useState } from "react";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { ErrorBanner } from "../shared/ErrorBanner";
import { MemberDetailCard } from "./MemberDetailCard";
import { AdminMembersListSection } from "./AdminMembersSections";
import { useAdminMembersWorkspace } from "./use-admin-members-workspace";

export function AdminMembersWorkspace() {
  const model = useAdminMembersWorkspace();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {model.topError ? <ErrorBanner error={model.topError} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <AdminMembersListSection
          currentMember={model.currentMember}
          listBusy={model.listBusy}
          members={model.membersQuery.data?.members ?? []}
          mutationBusy={model.mutationBusy}
          onNextPage={model.goNextPage}
          onPrevPage={model.goPrevPage}
          onResetSearch={model.resetSearch}
          onSearch={model.searchMembers}
          onSelectMember={model.selectMember}
          page={model.page}
          pagination={model.pagination}
          search={model.search}
          selectedMemberId={model.selectedMemberId}
          totalMembers={model.membersQuery.data?.pagination.total ?? 0}
        />

        <MemberDetailCard
          key={model.selectedMemberId ?? "member-empty"}
          canDeleteMember={model.canDeleteMember}
          canSaveProfile={model.canSaveProfile}
          currentMember={model.currentMember}
          detailError={model.detailQuery.error}
          detailLoading={model.detailQuery.isLoading}
          fieldSchema={model.memberSchemaQuery.data?.schema ?? null}
          form={model.form}
          iconDeleteResult={model.iconDeleteMutation.data?.media ?? null}
          iconUploadResult={model.iconUploadMutation.data?.media ?? null}
          imageDeleteResult={model.imageDeleteMutation.data?.media ?? null}
          imageUploadResult={model.imageUploadMutation.data?.media ?? null}
          isDeletePending={model.deleteMutation.isPending}
          isProfilePending={model.profileMutation.isPending}
          isRefetching={model.detailQuery.isFetching}
          isSubmitting={model.mutationBusy}
          isTopAdminSelected={model.isTopAdminSelected}
          maxAssignableLevel={model.maxAssignableLevel}
          member={model.selectedMember}
          onDelete={() => {
            if (!model.selectedMember) {
              return;
            }
            setDeleteDialogOpen(true as never);
          }}
          onDeleteIcon={model.handleDeleteIcon}
          onDeleteImage={model.handleDeleteImage}
          onRefresh={() => {
            void model.detailQuery.refetch();
          }}
          onSubmitLevel={model.handleSubmitLevel}
          onSubmitProfile={model.handleSubmitProfile}
          onUploadIcon={model.handleUploadIcon}
          onUploadImage={model.handleUploadImage}
          schemaError={model.memberSchemaQuery.error ?? null}
          schemaLoading={model.memberSchemaQuery.isLoading || model.memberSchemaQuery.isFetching}
          selectedMemberId={model.selectedMemberId}
        />
      </div>

      <ConfirmActionDialog
        confirmLabel="회원 삭제"
        description={
          model.selectedMember
            ? `${model.selectedMember.mb_id} 회원을 삭제합니다. 되돌릴 수 없는 운영 작업입니다.`
            : ""
        }
        isPending={model.deleteMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          model.handleDeleteConfirm();
          setDeleteDialogOpen(false);
        }}
        open={deleteDialogOpen}
        title="선택 회원을 삭제하시겠습니까?"
        variant="destructive"
      />
    </div>
  );
}
