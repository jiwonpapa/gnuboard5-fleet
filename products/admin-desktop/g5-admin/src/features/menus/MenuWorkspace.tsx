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
import type { CommandError } from "../../api/client";
import type { AdminMenu } from "../../types/AdminMenu";
import type { AdminMenuDetailResponse } from "../../types/AdminMenuDetailResponse";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { MenuFormValues } from "./admin-menus-form";
import { MenuFormFields } from "./MenuFormFields";

export function MenuWorkspace(props: {
  createForm: UseFormReturn<MenuFormValues>;
  createMutation: UseMutationResult<
    AdminMenuDetailResponse,
    CommandError,
    MenuFormValues,
    unknown
  >;
  createPayload: unknown;
  deleteMutation: UseMutationResult<unknown, CommandError, { me_id: number }, unknown>;
  deleteTarget: AdminMenu | null;
  detailLoading: boolean;
  editForm: UseFormReturn<MenuFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  onDeleteTargetChange: (menu: AdminMenu | null) => void;
  onResetEdit: () => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  selectedMenu: AdminMenu | null;
  updateMutation: UseMutationResult<
    AdminMenuDetailResponse,
    CommandError,
    MenuFormValues,
    unknown
  >;
  updatePayload: unknown;
}) {
  const hasSchemaStatePanel = hasFieldSchemaState({
    error: props.schemaError,
    loading: props.schemaLoading,
    schema: props.fieldSchema,
  });

  return (
    <>
      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>메뉴 생성</CardTitle>
            <CardDescription>
              메뉴 코드, 링크, 노출 여부를 지정해 새 관리자 메뉴를 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSchemaStatePanel ? (
              <FieldSchemaStatePanel
                error={props.schemaError}
                hiddenTargetLabel="메뉴 생성 폼"
                loading={props.schemaLoading}
                noun="메뉴"
                schema={props.fieldSchema}
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={props.createForm.handleSubmit((values) => {
                  props.createMutation.mutate(values);
                })}
              >
                <MenuFormFields
                  disabled={props.isBusy}
                  fieldSchema={props.fieldSchema}
                  form={props.createForm}
                />
                <Button type="submit" disabled={props.isBusy || props.createPayload === null}>
                  {props.createMutation.isPending ? "생성 중..." : "메뉴 생성"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 메뉴 편집</CardTitle>
            <CardDescription>
              {props.selectedMenu
                ? `${props.selectedMenu.me_name} (${props.selectedMenu.me_code}) 메뉴를 바로 수정합니다.`
                : "목록에서 메뉴를 선택하면 이 영역에서 바로 수정합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.detailLoading ? (
              <SelectionPlaceholder description="메뉴 상세를 불러오는 중입니다." />
            ) : props.selectedMenu ? (
              hasSchemaStatePanel ? (
                <FieldSchemaStatePanel
                  error={props.schemaError}
                  hiddenTargetLabel="메뉴 수정 폼"
                  loading={props.schemaLoading}
                  noun="메뉴"
                  schema={props.fieldSchema}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={props.editForm.handleSubmit((values) => {
                    props.updateMutation.mutate(values);
                  })}
                >
                  <MenuFormFields
                    disabled={props.isBusy}
                    fieldSchema={props.fieldSchema}
                    form={props.editForm}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={props.isBusy || props.updatePayload === null}>
                      {props.updateMutation.isPending ? "저장 중..." : "메뉴 저장"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={props.isBusy}
                      onClick={props.onResetEdit}
                    >
                      서버 값으로 되돌리기
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={props.isBusy}
                      onClick={() => props.onDeleteTargetChange(props.selectedMenu)}
                    >
                      메뉴 삭제
                    </Button>
                  </div>
                </form>
              )
            ) : (
              <SelectionPlaceholder description="목록에서 메뉴를 선택하면 이 영역에서 상세와 수정 액션을 확인합니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        confirmLabel="메뉴 삭제"
        description={
          props.deleteTarget === null
            ? ""
            : `${props.deleteTarget.me_name} 메뉴를 삭제합니다. 사이트 네비게이션과 권한 코드 정렬에 직접 영향을 줄 수 있습니다.`
        }
        isPending={props.deleteMutation.isPending}
        onCancel={() => props.onDeleteTargetChange(null)}
        onConfirm={() => {
          if (!props.deleteTarget) {
            return;
          }

          props.deleteMutation.mutate({ me_id: props.deleteTarget.me_id });
        }}
        open={props.deleteTarget !== null}
        title="선택 메뉴를 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
