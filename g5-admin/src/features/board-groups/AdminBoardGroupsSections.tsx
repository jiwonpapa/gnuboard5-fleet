import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  SelectInputControlField,
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import type { CommandError } from "../../api/client";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminBoardGroupMember } from "../../types/AdminBoardGroupMember";
import type { AdminBoardGroup } from "../../types/AdminBoardGroup";
import type { Pagination } from "../../types/Pagination";
import type {
  AdminBoardGroupFormValues,
  AdminBoardGroupMemberFormValues,
} from "./admin-board-groups-form";

export function BoardGroupListSection(props: {
  groups: AdminBoardGroup[];
  onGroupSelect: (groupId: string) => void;
  selectedGroupId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>게시판 그룹 목록</CardTitle>
        <CardDescription>
          행을 선택하면 우측 편집 카드와 그룹 회원 작업면이 같은 `gr_id`를 기준으로
          바뀝니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminDataTable<AdminBoardGroup>
          columns={[
            {
              header: "그룹 ID",
              render: (group) => (
                <strong className="block break-words text-sm font-semibold text-foreground">
                  {group.gr_id}
                </strong>
              ),
            },
            {
              header: "그룹 제목",
              render: (group) => (
                <p className="break-words text-sm text-muted-foreground">
                  {group.gr_subject ?? "-"}
                </p>
              ),
            },
          ]}
          emptyMessage="등록된 게시판 그룹이 없습니다."
          getRowKey={(group) => group.gr_id}
          onRowClick={(group) => props.onGroupSelect(group.gr_id)}
          rows={props.groups}
          selectedKey={props.selectedGroupId}
        />
      </CardContent>
    </Card>
  );
}

export function BoardGroupMembersSection(props: {
  isBusy: boolean;
  memberForm: UseFormReturn<AdminBoardGroupMemberFormValues>;
  memberPage: number;
  memberPagination: Pagination | null;
  memberSearchInput: string;
  members: AdminBoardGroupMember[];
  membersFetching: boolean;
  onAddMemberSubmit: (values: AdminBoardGroupMemberFormValues) => void;
  onDeleteMember: (member: AdminBoardGroupMember) => void;
  onMemberPageNext: () => void;
  onMemberPagePrev: () => void;
  onMemberSearchInputChange: (value: string) => void;
  onMemberSearchSubmit: () => void;
  selectedGroupId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>그룹 회원</CardTitle>
        <CardDescription>
          {"/admin/board-groups/{gr_id}/members 기준 목록/검색과 회원 추가/삭제를 수행합니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.selectedGroupId === null ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            좌측에서 게시판 그룹을 먼저 선택해 주십시오.
          </p>
        ) : (
          <>
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                props.onMemberSearchSubmit();
              }}
            >
              <Input
                value={props.memberSearchInput}
                disabled={props.isBusy}
                onChange={(event) =>
                  props.onMemberSearchInputChange(event.currentTarget.value)
                }
                placeholder="회원ID/이름/닉네임 검색"
              />
              <Button type="submit" disabled={props.isBusy || props.membersFetching}>
                {props.membersFetching ? "조회 중..." : "회원 검색"}
              </Button>
            </form>

            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={props.memberForm.handleSubmit(props.onAddMemberSubmit)}
            >
              <div className="flex-1">
                <TextInputControlField
                  control={props.memberForm.control}
                  disabled={props.isBusy}
                  label="추가할 회원 아이디"
                  name="mb_id"
                  placeholder="neo"
                />
              </div>
              <Button type="submit" disabled={props.isBusy} className="self-end md:mb-[2px]">
                회원 추가
              </Button>
            </form>

            <AdminDataTable<AdminBoardGroupMember>
              columns={[
                {
                  header: "회원",
                  render: (member) => (
                    <div className="space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {member.mb_id}
                      </strong>
                      <p className="text-xs text-muted-foreground">
                        {(member.mb_name ?? "-") + " / " + (member.mb_nick ?? "-")}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "레벨/최근 로그인",
                  render: (member) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>레벨 {member.mb_level ?? "-"}</p>
                      <p>{member.mb_today_login ?? "-"}</p>
                    </div>
                  ),
                },
                {
                  header: "등록일",
                  render: (member) => (
                    <p className="text-xs text-muted-foreground">
                      {member.gm_datetime ?? "-"}
                    </p>
                  ),
                },
                {
                  header: "관리",
                  cellClassName: "w-[7rem]",
                  render: (member) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDeleteMember(member);
                      }}
                    >
                      제거
                    </Button>
                  ),
                },
              ]}
              emptyMessage="등록된 그룹 회원이 없습니다."
              getRowKey={(member) => `${member.gr_id}:${member.mb_id}`}
              rows={props.members}
            />

            <Pager
              currentPage={props.memberPage}
              disabled={props.membersFetching}
              hasNext={props.memberPagination?.has_next ?? false}
              hasPrev={props.memberPagination?.has_prev ?? false}
              onNext={props.onMemberPageNext}
              onPrev={props.onMemberPagePrev}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BoardGroupEditorSection(props: {
  fieldDescription: (name: string) => string | undefined;
  fieldLabel: (name: string, fallback: string) => string;
  groupDeviceOptions: Array<{ label: string; value: string }>;
  groupForm: UseFormReturn<AdminBoardGroupFormValues>;
  hasGroupSchemaState: boolean;
  isBusy: boolean;
  memberPagination: Pagination | null;
  onDeleteGroupDialogOpen: () => void;
  onReset: () => void;
  onSubmit: (values: AdminBoardGroupFormValues) => void;
  schema: AdminSchemaDetail | null;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  selectedGroup: AdminBoardGroup | null;
  selectedGroupId: string | null;
}) {
  return (
    <Card className="xl:sticky xl:top-6 xl:self-start">
      <CardHeader>
        <CardTitle>그룹 편집</CardTitle>
        <CardDescription>
          새 그룹을 만들거나 선택한 그룹 제목을 수정합니다. 그룹 ID는 생성 후 변경하지
          않고, 삭제는 별도 확인을 거칩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.hasGroupSchemaState ? (
          <FieldSchemaStatePanel
            error={props.schemaError}
            hiddenTargetLabel="그룹 편집 폼"
            loading={props.schemaLoading}
            noun="게시판 그룹"
            schema={props.schema}
          />
        ) : (
          <>
            <form
              className="space-y-4"
              onSubmit={props.groupForm.handleSubmit(props.onSubmit)}
            >
              <TextInputControlField
                control={props.groupForm.control}
                description={props.fieldDescription("gr_id")}
                disabled={props.isBusy || props.selectedGroupId !== null}
                label={props.fieldLabel("gr_id", "그룹 ID")}
                name="gr_id"
                placeholder="staff"
              />
              <TextInputControlField
                control={props.groupForm.control}
                description={props.fieldDescription("gr_subject")}
                disabled={props.isBusy}
                label={props.fieldLabel("gr_subject", "그룹 제목")}
                name="gr_subject"
                placeholder="운영팀 게시판"
              />
              <TextInputControlField
                control={props.groupForm.control}
                description={props.fieldDescription("gr_admin")}
                disabled={props.isBusy}
                label={props.fieldLabel("gr_admin", "그룹 관리자")}
                name="gr_admin"
                placeholder="admin_id"
              />
              <SelectInputControlField
                control={props.groupForm.control}
                description={props.fieldDescription("gr_device")}
                disabled={props.isBusy}
                label={props.fieldLabel("gr_device", "접속기기")}
                name="gr_device"
                options={props.groupDeviceOptions}
              />
              <ToggleControlField
                control={props.groupForm.control}
                description={
                  props.fieldDescription("gr_use_access") ??
                  "체크하면 그룹 접근회원만 해당 그룹 게시판에 접근할 수 있습니다."
                }
                disabled={props.isBusy}
                label={props.fieldLabel("gr_use_access", "접근회원사용")}
                name="gr_use_access"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={props.isBusy}>
                  {props.selectedGroupId === null ? "그룹 생성" : "그룹 수정"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy}
                  onClick={props.onReset}
                >
                  새 그룹
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={props.selectedGroupId === null || props.isBusy}
                  onClick={props.onDeleteGroupDialogOpen}
                >
                  그룹 삭제
                </Button>
              </div>
            </form>

            <div className="grid gap-3">
              <SummaryField
                label={props.fieldLabel("gr_id", "그룹 ID")}
                value={props.selectedGroup?.gr_id ?? "없음"}
              />
              <SummaryField
                label={props.fieldLabel("gr_subject", "그룹 제목")}
                value={props.selectedGroup?.gr_subject ?? "없음"}
              />
              <SummaryField
                label={props.fieldLabel("gr_admin", "그룹 관리자")}
                value={props.selectedGroup?.gr_admin ?? "-"}
              />
              <SummaryField
                label={props.fieldLabel("gr_device", "접속기기")}
                value={props.selectedGroup?.gr_device ?? "both"}
              />
              <SummaryField
                label={props.fieldLabel("gr_use_access", "접근회원사용")}
                value={(props.selectedGroup?.gr_use_access ?? 0) === 1 ? "사용" : "미사용"}
              />
              <SummaryField label="그룹 회원" value={String(props.memberPagination?.total ?? 0)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BoardGroupDialogs(props: {
  deleteGroupOpen: boolean;
  deleteMemberLabel: string;
  deleteMemberOpen: boolean;
  groupDeletePending: boolean;
  memberDeletePending: boolean;
  onCloseDeleteGroup: () => void;
  onCloseDeleteMember: () => void;
  onConfirmDeleteGroup: () => void;
  onConfirmDeleteMember: () => void;
  selectedGroupId: string | null;
}) {
  return (
    <>
      <ConfirmActionDialog
        confirmLabel="삭제"
        description={`게시판 그룹 ${props.selectedGroupId ?? "-"}를 삭제합니다. 되돌릴 수 없습니다.`}
        isPending={props.groupDeletePending}
        onCancel={props.onCloseDeleteGroup}
        onConfirm={props.onConfirmDeleteGroup}
        open={props.deleteGroupOpen}
        title="게시판 그룹 삭제"
        variant="destructive"
      />

      <ConfirmActionDialog
        confirmLabel="제거"
        description={props.deleteMemberLabel}
        isPending={props.memberDeletePending}
        onCancel={props.onCloseDeleteMember}
        onConfirm={props.onConfirmDeleteMember}
        open={props.deleteMemberOpen}
        title="그룹 회원 제거"
        variant="destructive"
      />
    </>
  );
}

function Pager(props: {
  currentPage: number;
  disabled: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">현재 페이지 {props.currentPage}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={props.disabled || !props.hasPrev}
          onClick={props.onPrev}
        >
          이전
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={props.disabled || !props.hasNext}
          onClick={props.onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}

function SummaryField(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-foreground">{props.value}</p>
    </div>
  );
}
