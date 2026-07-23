import type { UseMutationResult } from "@tanstack/react-query";
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
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import { PermissionFormFields } from "./PermissionFormFields";
import type { CommandError } from "../../api/client";
import type { AdminPermissionItem } from "../../types/AdminPermissionItem";
import type { PermissionFormValues } from "./admin-permissions-form";
import type { AdminPermissionSaveResponse } from "../../types/AdminPermissionSaveResponse";

export function PermissionsWorkspace(props: {
  deleteMutation: UseMutationResult<
    unknown,
    CommandError,
    { au_menu: string; mb_id: string },
    unknown
  >;
  deleteTarget: AdminPermissionItem | null;
  form: UseFormReturn<PermissionFormValues>;
  isBusy: boolean;
  onDeleteTargetChange: (permission: AdminPermissionItem | null) => void;
  onResetToBlank: () => void;
  onResetToSelected: () => void;
  saveMutation: UseMutationResult<
    AdminPermissionSaveResponse,
    CommandError,
    PermissionFormValues,
    unknown
  >;
  savePayload: unknown;
  selectedPermission: AdminPermissionItem | null;
}) {
  return (
    <>
      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>권한 저장</CardTitle>
            <CardDescription>
              기존 항목을 선택하면 수정, 선택이 없으면 신규 권한 저장으로 동작합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={props.form.handleSubmit((values) => {
                props.saveMutation.mutate(values);
              })}
            >
              <PermissionFormFields disabled={props.isBusy} form={props.form} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={props.isBusy || props.savePayload === null}>
                  {props.saveMutation.isPending ? "저장 중..." : "권한 저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy}
                  onClick={props.onResetToBlank}
                >
                  신규 입력 초기화
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.selectedPermission === null || props.isBusy}
                  onClick={props.onResetToSelected}
                >
                  선택 항목으로 되돌리기
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 권한 액션</CardTitle>
            <CardDescription>
              {props.selectedPermission
                ? `${props.selectedPermission.mb_id} / ${props.selectedPermission.au_menu} 권한에 대한 삭제만 이 영역에서 처리합니다.`
                : "목록에서 권한을 선택하면 삭제 액션이 이 영역에 표시됩니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.selectedPermission ? (
              <Button
                type="button"
                variant="destructive"
                disabled={props.isBusy}
                onClick={() => props.onDeleteTargetChange(props.selectedPermission)}
              >
                선택 권한 삭제
              </Button>
            ) : (
              <SelectionPlaceholder description="목록에서 권한을 선택하면 상세와 삭제 액션이 이 영역에 표시됩니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        confirmLabel="권한 삭제"
        description={
          props.deleteTarget === null
            ? ""
            : `${props.deleteTarget.mb_id} / ${props.deleteTarget.au_menu} 권한을 삭제합니다. 이 작업은 즉시 적용됩니다.`
        }
        isPending={props.deleteMutation.isPending}
        onCancel={() => props.onDeleteTargetChange(null)}
        onConfirm={() => {
          if (!props.deleteTarget) {
            return;
          }

          props.deleteMutation.mutate({
            au_menu: props.deleteTarget.au_menu,
            mb_id: props.deleteTarget.mb_id,
          });
        }}
        open={props.deleteTarget !== null}
        title="선택 권한을 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
