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
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import { PopupFormFields } from "./PopupFormFields";
import type { CommandError } from "../../api/client";
import type { AdminPopup } from "../../types/AdminPopup";
import type { AdminPopupDetailResponse } from "../../types/AdminPopupDetailResponse";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { PopupFormValues } from "./admin-popups-form";

export function PopupWorkspace(props: {
  createForm: UseFormReturn<PopupFormValues>;
  createMutation: UseMutationResult<
    AdminPopupDetailResponse,
    CommandError,
    PopupFormValues,
    unknown
  >;
  createPayload: unknown;
  deleteMutation: UseMutationResult<unknown, CommandError, { nw_id: number }, unknown>;
  deleteTarget: AdminPopup | null;
  detailLoading: boolean;
  editForm: UseFormReturn<PopupFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  onDeleteTargetChange: (popup: AdminPopup | null) => void;
  onResetEdit: () => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  selectedPopup: AdminPopup | null;
  updateMutation: UseMutationResult<
    AdminPopupDetailResponse,
    CommandError,
    PopupFormValues,
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
            <CardTitle>팝업 생성</CardTitle>
            <CardDescription>
              제목과 본문은 필수이며, 나머지 위치/크기/시각 값은 운영 기본값으로 시작합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSchemaStatePanel ? (
              <FieldSchemaStatePanel
                error={props.schemaError}
                hiddenTargetLabel="팝업 생성 폼"
                loading={props.schemaLoading}
                noun="팝업"
                schema={props.fieldSchema}
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={props.createForm.handleSubmit((values) => {
                  props.createMutation.mutate(values);
                })}
              >
                <PopupFormFields
                  disabled={props.isBusy}
                  fieldSchema={props.fieldSchema}
                  form={props.createForm}
                />
                <Button type="submit" disabled={props.isBusy || props.createPayload === null}>
                  {props.createMutation.isPending ? "생성 중..." : "팝업 생성"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 팝업 편집</CardTitle>
            <CardDescription>
              {props.selectedPopup
                ? `${props.selectedPopup.nw_id}번 팝업을 바로 수정합니다.`
                : "목록에서 팝업을 선택하면 이 영역에서 바로 수정합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.detailLoading ? (
              <SelectionPlaceholder description="팝업 상세를 불러오는 중입니다." />
            ) : props.selectedPopup ? (
              hasSchemaStatePanel ? (
                <FieldSchemaStatePanel
                  error={props.schemaError}
                  hiddenTargetLabel="팝업 수정 폼"
                  loading={props.schemaLoading}
                  noun="팝업"
                  schema={props.fieldSchema}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={props.editForm.handleSubmit((values) => {
                    props.updateMutation.mutate(values);
                  })}
                >
                  <PopupFormFields
                    disabled={props.isBusy}
                    fieldSchema={props.fieldSchema}
                    form={props.editForm}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={props.isBusy || props.updatePayload === null}>
                      {props.updateMutation.isPending ? "저장 중..." : "팝업 저장"}
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
                      onClick={() => props.onDeleteTargetChange(props.selectedPopup)}
                    >
                      팝업 삭제
                    </Button>
                  </div>
                </form>
              )
            ) : (
              <SelectionPlaceholder description="목록에서 팝업을 선택하면 이 영역에서 상세와 수정 액션을 확인합니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        confirmLabel="팝업 삭제"
        description={
          props.deleteTarget === null
            ? ""
            : `${props.deleteTarget.nw_id} 팝업을 삭제합니다. 즉시 비노출로 이어질 수 있습니다.`
        }
        isPending={props.deleteMutation.isPending}
        onCancel={() => props.onDeleteTargetChange(null)}
        onConfirm={() => {
          if (!props.deleteTarget) {
            return;
          }

          props.deleteMutation.mutate({ nw_id: props.deleteTarget.nw_id });
        }}
        open={props.deleteTarget !== null}
        title="선택 팝업을 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
