import { FolderKanban, ShieldCheck, Users } from "lucide-react";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  BoardGroupDialogs,
  BoardGroupEditorSection,
  BoardGroupListSection,
  BoardGroupMembersSection,
} from "./AdminBoardGroupsSections";
import { useAdminBoardGroupsWorkspace } from "./use-admin-board-groups-workspace";

export function AdminBoardGroupsWorkspace() {
  const model = useAdminBoardGroupsWorkspace();

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(380px,0.98fr)]">
        <div className="space-y-6">
          <PageIntro
            kicker="Admin Board Groups"
            title="게시판그룹관리"
            description="`/admin/board-groups` CRUD와 그룹 회원 추가/삭제를 route-native 작업면으로 연결했습니다. 그룹 목록과 멤버 운영을 같은 화면에서 처리합니다."
            icon={FolderKanban}
            metrics={[
              {
                hint: "현재 등록된 게시판 그룹 총수",
                icon: FolderKanban,
                label: "그룹 수",
                value: String(model.listQuery.data?.pagination.total ?? 0),
              },
              {
                hint: "선택한 그룹 ID",
                icon: ShieldCheck,
                label: "선택 그룹",
                value: model.selectedGroup?.gr_id ?? "없음",
              },
              {
                hint: "선택 그룹의 회원 수",
                icon: Users,
                label: "그룹 회원",
                value: String(model.memberPagination?.total ?? 0),
              },
            ]}
          />

          {model.topError ? <ErrorBanner error={model.topError} /> : null}

          <BoardGroupListSection
            groups={model.groups}
            onGroupSelect={model.handleGroupSelect}
            selectedGroupId={model.selectedGroupId}
          />

          <BoardGroupMembersSection
            isBusy={model.isBusy}
            memberForm={model.memberForm}
            memberPage={model.memberPage}
            memberPagination={model.memberPagination}
            memberSearchInput={model.memberSearchInput}
            members={model.members}
            membersFetching={model.membersQuery.isFetching}
            onAddMemberSubmit={(values) => model.addMemberMutation.mutate(values)}
            onDeleteMember={(member) =>
              model.setDeleteMemberTarget({ gr_id: member.gr_id, mb_id: member.mb_id })
            }
            onMemberPageNext={() => model.setMemberPage((page) => page + 1)}
            onMemberPagePrev={() => model.setMemberPage((page) => Math.max(1, page - 1))}
            onMemberSearchInputChange={model.setMemberSearchInput}
            onMemberSearchSubmit={() => {
              model.setMemberPage(1);
              model.setMemberSearch(model.memberSearchInput.trim());
            }}
            selectedGroupId={model.selectedGroupId}
          />
        </div>

        <BoardGroupEditorSection
          fieldDescription={model.groupFieldDescription}
          fieldLabel={model.groupFieldLabel}
          groupDeviceOptions={model.groupDeviceOptions}
          groupForm={model.groupForm}
          hasGroupSchemaState={model.hasGroupSchemaState}
          isBusy={model.isBusy}
          memberPagination={model.memberPagination}
          onDeleteGroupDialogOpen={() => model.setDeleteGroupOpen(true)}
          onReset={model.resetGroupSelection}
          onSubmit={model.handleGroupSubmit}
          schema={model.groupFieldSchema}
          schemaError={model.groupSchemaQuery.error ?? null}
          schemaLoading={model.groupSchemaQuery.isLoading || model.groupSchemaQuery.isFetching}
          selectedGroup={model.selectedGroup}
          selectedGroupId={model.selectedGroupId}
        />
      </div>

      <BoardGroupDialogs
        deleteGroupOpen={model.deleteGroupOpen}
        deleteMemberLabel={`그룹 ${model.deleteMemberTarget?.gr_id ?? "-"}에서 ${model.deleteMemberTarget?.mb_id ?? "-"} 회원을 제거합니다.`}
        deleteMemberOpen={model.deleteMemberTarget !== null}
        groupDeletePending={model.deleteMutation.isPending}
        memberDeletePending={model.deleteMemberMutation.isPending}
        onCloseDeleteGroup={() => model.setDeleteGroupOpen(false)}
        onCloseDeleteMember={() => model.setDeleteMemberTarget(null)}
        onConfirmDeleteGroup={() => model.deleteMutation.mutate()}
        onConfirmDeleteMember={() => model.deleteMemberMutation.mutate()}
        selectedGroupId={model.selectedGroupId}
      />
    </>
  );
}
