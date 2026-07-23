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
import { ReadOnlyField } from "../admin/shared/AdminFormFields";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import { PollFormFields } from "./PollFormFields";
import type { CommandError } from "../../api/client";
import type { AdminPoll } from "../../types/AdminPoll";
import type { AdminPollDetailResponse } from "../../types/AdminPollDetailResponse";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { PollFormValues } from "./admin-polls-form";
import { getFieldDescription, getFieldLabel } from "../schema/useAdminFieldSchema";

const pollReadOnlyCountFields = [
  "po_cnt1",
  "po_cnt2",
  "po_cnt3",
  "po_cnt4",
  "po_cnt5",
  "po_cnt6",
  "po_cnt7",
  "po_cnt8",
  "po_cnt9",
] as const;

export function PollWorkspace(props: {
  createForm: UseFormReturn<PollFormValues>;
  createMutation: UseMutationResult<
    AdminPollDetailResponse,
    CommandError,
    PollFormValues,
    unknown
  >;
  createPayload: unknown;
  deleteMutation: UseMutationResult<unknown, CommandError, { po_id: number }, unknown>;
  deleteTarget: AdminPoll | null;
  detailLoading: boolean;
  editForm: UseFormReturn<PollFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  onDeleteTargetChange: (poll: AdminPoll | null) => void;
  onResetEdit: () => void;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  selectedPoll: AdminPoll | null;
  updateMutation: UseMutationResult<
    AdminPollDetailResponse,
    CommandError,
    PollFormValues,
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
            <CardTitle>투표 생성</CardTitle>
            <CardDescription>
              제목과 항목 1, 2는 필수입니다. 나머지 항목은 운영 정책에 따라 선택 입력합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasSchemaStatePanel ? (
              <FieldSchemaStatePanel
                error={props.schemaError}
                hiddenTargetLabel="투표 생성 폼"
                loading={props.schemaLoading}
                noun="투표"
                schema={props.fieldSchema}
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={props.createForm.handleSubmit((values) => {
                  props.createMutation.mutate(values);
                })}
              >
                <PollFormFields
                  disabled={props.isBusy}
                  fieldSchema={props.fieldSchema}
                  form={props.createForm}
                  includeCreateOnlyFields
                />
                <Button type="submit" disabled={props.isBusy || props.createPayload === null}>
                  {props.createMutation.isPending ? "생성 중..." : "투표 생성"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 투표 편집</CardTitle>
            <CardDescription>
              {props.selectedPoll
                ? `${props.selectedPoll.po_id}번 투표를 바로 수정합니다.`
                : "목록에서 투표를 선택하면 이 영역에서 바로 수정합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.detailLoading ? (
              <SelectionPlaceholder description="투표 상세를 불러오는 중입니다." />
            ) : props.selectedPoll ? (
              hasSchemaStatePanel ? (
                <FieldSchemaStatePanel
                  error={props.schemaError}
                  hiddenTargetLabel="투표 수정 폼"
                  loading={props.schemaLoading}
                  noun="투표"
                  schema={props.fieldSchema}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={props.editForm.handleSubmit((values) => {
                    props.updateMutation.mutate(values);
                  })}
                >
                  <PollFormFields
                    disabled={props.isBusy}
                    fieldSchema={props.fieldSchema}
                    form={props.editForm}
                    includeCreateOnlyFields={false}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    {pollReadOnlyCountFields.map((field, index) => (
                      <ReadOnlyField
                        key={field}
                        description={getFieldDescription(props.fieldSchema, field)}
                        label={getFieldLabel(
                          props.fieldSchema,
                          field,
                          `항목 ${index + 1} 득표`,
                        )}
                        value={props.selectedPoll![field]}
                      />
                    ))}
                    <ReadOnlyField
                      description={getFieldDescription(props.fieldSchema, "po_ips")}
                      label={getFieldLabel(props.fieldSchema, "po_ips", "참여 IP 목록")}
                      value={props.selectedPoll.po_ips}
                    />
                    <ReadOnlyField
                      description={getFieldDescription(props.fieldSchema, "mb_ids")}
                      label={getFieldLabel(props.fieldSchema, "mb_ids", "참여 회원 목록")}
                      value={props.selectedPoll.mb_ids}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={props.isBusy || props.updatePayload === null}>
                      {props.updateMutation.isPending ? "저장 중..." : "투표 저장"}
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
                      onClick={() => props.onDeleteTargetChange(props.selectedPoll)}
                    >
                      투표 삭제
                    </Button>
                  </div>
                </form>
              )
            ) : (
              <SelectionPlaceholder description="목록에서 투표를 선택하면 이 영역에서 상세와 수정 액션을 확인합니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        confirmLabel="투표 삭제"
        description={
          props.deleteTarget === null
            ? ""
            : `${props.deleteTarget.po_id} 투표를 삭제합니다. 참여 경로와 결과 조회에 즉시 영향을 줄 수 있습니다.`
        }
        isPending={props.deleteMutation.isPending}
        onCancel={() => props.onDeleteTargetChange(null)}
        onConfirm={() => {
          if (!props.deleteTarget) {
            return;
          }

          props.deleteMutation.mutate({ po_id: props.deleteTarget.po_id });
        }}
        open={props.deleteTarget !== null}
        title="선택 투표를 삭제하시겠습니까?"
        variant="destructive"
      />
    </>
  );
}
