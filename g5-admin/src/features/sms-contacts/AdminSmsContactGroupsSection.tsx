import type { UseFormReturn } from "react-hook-form";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminSmsContactGroup } from "../../types/AdminSmsContactGroup";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import { getFieldDescription, getFieldLabel } from "../schema/useAdminFieldSchema";
import type {
  AdminSmsContactFormValues,
  AdminSmsContactGroupFormValues,
  AdminSmsContactImportFormValues,
} from "./admin-sms-contacts-form";
import { TextInputControlField } from "../admin/shared/AdminFormFields";

export function AdminSmsContactGroupsSection(props: {
  activeGroupId: number | null;
  availableMoveTargets: AdminSmsContactGroup[];
  contactForm: UseFormReturn<AdminSmsContactFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  groupForm: UseFormReturn<AdminSmsContactGroupFormValues>;
  groups: AdminSmsContactGroup[];
  importForm: UseFormReturn<AdminSmsContactImportFormValues>;
  isBusy: boolean;
  onClearGroup: () => void;
  onDeleteGroup: () => void;
  onGroupMoveTargetChange: (value: string) => void;
  onGroupSelect: (group: AdminSmsContactGroup) => void;
  onMoveGroup: () => void;
  onResetGroupForm: () => void;
  onSubmitGroup: () => void;
  selectedGroup: AdminSmsContactGroup | null;
  groupMoveTarget: string;
}) {
  const groupNameLabel = getFieldLabel(props.fieldSchema, "bg_name", "그룹명");
  const groupNameDescription = getFieldDescription(props.fieldSchema, "bg_name");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>그룹 목록</CardTitle>
          <CardDescription>
            좌측 그룹을 선택하면 우측 연락처 목록이 해당 그룹 기준으로 필터링됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={[
              {
                header: "그룹",
                render: (group) => (
                  <div className="space-y-1">
                    <strong className="block text-sm font-semibold text-foreground">
                      {group.bg_name}
                    </strong>
                    <span className="block text-xs text-muted-foreground">bg_no {group.bg_no}</span>
                  </div>
                ),
              },
              {
                header: "통계",
                render: (group) => (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>전체 {group.bg_count}건</p>
                    <p>
                      수신동의 {group.bg_receipt} · 거부 {group.bg_reject}
                    </p>
                  </div>
                ),
              },
            ]}
            emptyMessage="등록된 휴대폰번호 그룹이 없습니다."
            getRowKey={(group) => String(group.bg_no)}
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
            기본 그룹 제약은 서버가 다시 검사합니다. 이 화면은 그룹 CRUD와 이동, 비우기를 제공합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4"
            onSubmit={props.groupForm.handleSubmit(() => props.onSubmitGroup())}
          >
            <TextInputControlField
              control={props.groupForm.control}
              description={groupNameDescription}
              label={groupNameLabel}
              name="bg_name"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isBusy}>
                {props.groupForm.getValues("bg_no") === null ? "그룹 생성" : "그룹 수정"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.isBusy}
                onClick={props.onResetGroupForm}
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
                    onChange={(event) => props.onGroupMoveTargetChange(event.currentTarget.value)}
                    className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-[0.82rem] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">대상 그룹 선택</option>
                    {props.availableMoveTargets.map((group) => (
                      <option key={group.bg_no} value={String(group.bg_no)}>
                        {group.bg_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={props.isBusy || props.groupMoveTarget === ""}
                    onClick={props.onMoveGroup}
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
                  disabled={props.isBusy}
                  onClick={props.onDeleteGroup}
                >
                  그룹 삭제
                </Button>
              </div>
            </>
          ) : (
            <SelectionPlaceholder description="좌측 그룹 목록에서 항목을 선택하면 이곳에서 그룹 편집과 이동/비우기 작업을 계속할 수 있습니다." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
