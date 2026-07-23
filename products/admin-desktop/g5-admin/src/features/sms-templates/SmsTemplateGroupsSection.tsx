import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import {
  TextInputControlField,
  ToggleControlField,
} from "../admin/shared/AdminFormFields";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminSmsTemplateGroup } from "../../types/AdminSmsTemplateGroup";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import { getFieldDescription, getFieldLabel } from "../schema/useAdminFieldSchema";
import type { AdminSmsTemplateGroupFormValues } from "./admin-sms-templates-form";

export function SmsTemplateGroupsSection(props: {
  activeGroupId: number | null;
  availableMoveTargets: AdminSmsTemplateGroup[];
  fieldSchema: AdminSchemaDetail | null;
  groupForm: UseFormReturn<AdminSmsTemplateGroupFormValues>;
  groupMoveTarget: string;
  groups: AdminSmsTemplateGroup[];
  isBusy: boolean;
  onClearGroup: () => void;
  onDeleteGroupDialogOpen: () => void;
  onGroupMove: () => void;
  onGroupMoveTargetChange: (value: string) => void;
  onGroupReset: () => void;
  onGroupSelect: (group: AdminSmsTemplateGroup) => void;
  onGroupSubmit: (values: AdminSmsTemplateGroupFormValues) => void;
  selectedGroup: AdminSmsTemplateGroup | null;
}) {
  const groupNameLabel = getFieldLabel(props.fieldSchema, "fg_name", "그룹명");
  const groupNameDescription = getFieldDescription(props.fieldSchema, "fg_name");
  const groupMemberLabel = getFieldLabel(props.fieldSchema, "fg_member", "회원 전용");
  const groupMemberDescription =
    getFieldDescription(props.fieldSchema, "fg_member") ??
    "회원 전용 그룹이면 ON, 공용 템플릿 그룹이면 OFF입니다.";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>그룹 목록</CardTitle>
          <CardDescription>
            레거시 이모티콘 그룹 구조를 그대로 보여줍니다. 그룹을 선택하면 우측
            템플릿과 하단 편집 폼이 함께 바뀝니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable<AdminSmsTemplateGroup>
            columns={[
              {
                header: "그룹",
                render: (group) => (
                  <div className="space-y-1">
                    <strong className="block text-sm font-semibold text-foreground">
                      {group.fg_name}
                    </strong>
                    <span className="block text-xs text-muted-foreground">
                      fg_no {group.fg_no}
                    </span>
                  </div>
                ),
              },
              {
                header: "범위",
                render: (group) => (
                  <div className="text-sm text-muted-foreground">
                    {group.fg_member === 1 ? "회원 전용" : "공용"} · {group.fg_count}개
                  </div>
                ),
              },
            ]}
            emptyMessage="등록된 이모티콘 그룹이 없습니다."
            getRowKey={(group) => String(group.fg_no)}
            onRowClick={props.onGroupSelect}
            rows={props.groups}
            selectedKey={props.activeGroupId === null ? null : String(props.activeGroupId)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>그룹 편집</CardTitle>
          <CardDescription>
            그룹명 수정, 회원 전용 여부, 다른 그룹으로 이동, 그룹 비우기를 이
            카드에서 처리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4"
            onSubmit={props.groupForm.handleSubmit(props.onGroupSubmit)}
          >
            <TextInputControlField
              control={props.groupForm.control}
              description={groupNameDescription}
              label={groupNameLabel}
              name="fg_name"
            />
            <ToggleControlField
              control={props.groupForm.control}
              description={groupMemberDescription}
              label={groupMemberLabel}
              name="fg_member"
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isBusy}>
                {props.groupForm.getValues("fg_no") === null ? "그룹 생성" : "그룹 수정"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.isBusy}
                onClick={props.onGroupReset}
              >
                새 그룹 폼
              </Button>
            </div>
          </form>

          {props.selectedGroup ? (
            <>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">이동 대상 그룹</span>
                  <select
                    value={props.groupMoveTarget}
                    onChange={(event) =>
                      props.onGroupMoveTargetChange(event.currentTarget.value)
                    }
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">대상 그룹 선택</option>
                    {props.availableMoveTargets.map((group) => (
                      <option key={group.fg_no} value={String(group.fg_no)}>
                        {group.fg_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={props.isBusy || props.groupMoveTarget.trim() === ""}
                    onClick={props.onGroupMove}
                  >
                    그룹 이동
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy}
                  onClick={props.onClearGroup}
                >
                  그룹 비우기
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={props.isBusy || props.selectedGroup.fg_no === 0}
                  onClick={props.onDeleteGroupDialogOpen}
                >
                  그룹 삭제
                </Button>
              </div>
            </>
          ) : (
            <SelectionPlaceholder description="좌측 그룹 목록에서 항목을 선택하면 상세 편집과 이동/비우기 액션이 열립니다." />
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function SmsTemplateDialogs(props: {
  deleteGroupOpen: boolean;
  deleteTemplateOpen: boolean;
  isDeletingGroup: boolean;
  isDeletingTemplate: boolean;
  onCloseDeleteGroup: () => void;
  onCloseDeleteTemplate: () => void;
  onConfirmDeleteGroup: () => void;
  onConfirmDeleteTemplate: () => void;
}) {
  return (
    <>
      <ConfirmActionDialog
        confirmLabel="그룹 삭제"
        description="그룹 삭제는 되돌릴 수 없습니다. 그룹 안 템플릿이 남아 있으면 서버가 거절할 수 있습니다."
        isPending={props.isDeletingGroup}
        onCancel={props.onCloseDeleteGroup}
        onConfirm={props.onConfirmDeleteGroup}
        open={props.deleteGroupOpen}
        title="이모티콘 그룹을 삭제하시겠습니까?"
        variant="destructive"
      />

      <ConfirmActionDialog
        confirmLabel="템플릿 삭제"
        description="선택한 이모티콘 템플릿을 삭제합니다."
        isPending={props.isDeletingTemplate}
        onCancel={props.onCloseDeleteTemplate}
        onConfirm={props.onConfirmDeleteTemplate}
        open={props.deleteTemplateOpen}
        title="템플릿을 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
