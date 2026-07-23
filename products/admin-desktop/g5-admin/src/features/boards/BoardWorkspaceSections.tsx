import type { ReactNode } from "react";
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
import { TextInputField } from "../admin/shared/AdminFormFields";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import { ErrorBanner } from "../shared/ErrorBanner";
import { BoardFormFields } from "./BoardFormFields";
import type { CommandError } from "../../api/client";
import type { AdminBoard } from "../../types/AdminBoard";
import type { AdminBoardDetailResponse } from "../../types/AdminBoardDetailResponse";
import type { AdminBoardNewPostDeleteResponse } from "../../types/AdminBoardNewPostDeleteResponse";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { BoardFormValues } from "./admin-boards-form";

export function BoardCreateSection(props: {
  createForm: UseFormReturn<BoardFormValues>;
  createMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    BoardFormValues,
    unknown
  >;
  createPayload: unknown;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  schemaError: CommandError | null;
  schemaLoading: boolean;
}) {
  const schemaPanel = renderBoardSchemaStatePanel(
    props.schemaError,
    props.schemaLoading,
    props.fieldSchema,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>게시판 생성</CardTitle>
        <CardDescription>
          기본 권한과 업로드 규칙을 함께 설정해서 새 게시판을 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {schemaPanel ?? (
          <form
            className="space-y-4"
            onSubmit={props.createForm.handleSubmit((values) => {
              props.createMutation.mutate(values);
            })}
          >
            <BoardFormFields
              disabled={props.isBusy}
              fieldSchema={props.fieldSchema}
              form={props.createForm}
              includeTableField
            />
            <Button type="submit" disabled={props.isBusy || props.createPayload === null}>
              {props.createMutation.isPending ? "생성 중..." : "게시판 생성"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function BoardEditSection(props: {
  copyMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    { bo_table: string; target_bo_subject: string | null; target_bo_table: string },
    unknown
  >;
  copyTargetSubject: string;
  copyTargetTable: string;
  detailLoading: boolean;
  editForm: UseFormReturn<BoardFormValues>;
  fieldSchema: AdminSchemaDetail | null;
  isBusy: boolean;
  newPostIdsText: string;
  newPostsDeleteMutation: UseMutationResult<
    AdminBoardNewPostDeleteResponse,
    CommandError,
    { bn_ids: number[] },
    unknown
  >;
  onCopyTargetSubjectChange: (value: string) => void;
  onCopyTargetTableChange: (value: string) => void;
  onDeleteTargetChange: (board: AdminBoard | null) => void;
  onNewPostIdsTextChange: (value: string) => void;
  onResetEdit: () => void;
  selectedBoard: AdminBoard | null;
  schemaError: CommandError | null;
  schemaLoading: boolean;
  updateMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    BoardFormValues,
    unknown
  >;
  updatePayload: unknown;
}) {
  const schemaPanel = renderBoardSchemaStatePanel(
    props.schemaError,
    props.schemaLoading,
    props.fieldSchema,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>선택 게시판 편집</CardTitle>
        <CardDescription>
          {props.selectedBoard
            ? `${props.selectedBoard.bo_table} 게시판을 바로 수정합니다.`
            : "목록에서 게시판을 선택하면 이 영역에서 바로 수정합니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.detailLoading ? (
          <SelectionPlaceholder description="게시판 상세를 불러오는 중입니다." />
        ) : props.selectedBoard ? (
          <>
            {schemaPanel ?? (
              <form
                className="space-y-4"
                onSubmit={props.editForm.handleSubmit((values) => {
                  props.updateMutation.mutate(values);
                })}
              >
                <BoardFormFields
                  disabled={props.isBusy}
                  fieldSchema={props.fieldSchema}
                  form={props.editForm}
                  includeTableField={false}
                  readOnlyBoard={props.selectedBoard}
                />

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={props.isBusy || props.updatePayload === null}>
                    {props.updateMutation.isPending ? "저장 중..." : "게시판 저장"}
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
                    onClick={() => props.onDeleteTargetChange(props.selectedBoard)}
                  >
                    게시판 삭제
                  </Button>
                </div>
              </form>
            )}

            <BoardOperationsSection
              copyMutation={props.copyMutation}
              copyTargetSubject={props.copyTargetSubject}
              copyTargetTable={props.copyTargetTable}
              isBusy={props.isBusy}
              newPostIdsText={props.newPostIdsText}
              newPostsDeleteMutation={props.newPostsDeleteMutation}
              onCopyTargetSubjectChange={props.onCopyTargetSubjectChange}
              onCopyTargetTableChange={props.onCopyTargetTableChange}
              onNewPostIdsTextChange={props.onNewPostIdsTextChange}
              selectedBoard={props.selectedBoard}
            />
          </>
        ) : (
          <SelectionPlaceholder description="목록에서 게시판을 선택하면 이 영역에서 상세와 수정 액션을 확인합니다." />
        )}
      </CardContent>
    </Card>
  );
}

export function BoardDeleteDialog(props: {
  deleteMutation: UseMutationResult<unknown, CommandError, { bo_table: string }, unknown>;
  deleteTarget: AdminBoard | null;
  onDeleteTargetChange: (board: AdminBoard | null) => void;
}) {
  return (
    <ConfirmActionDialog
      confirmLabel="게시판 삭제"
      description={
        props.deleteTarget === null
          ? ""
          : `${props.deleteTarget.bo_table} 게시판을 삭제합니다. 게시글/댓글 운영 경로에 즉시 영향을 줄 수 있습니다.`
      }
      isPending={props.deleteMutation.isPending}
      onCancel={() => props.onDeleteTargetChange(null)}
      onConfirm={() => {
        if (!props.deleteTarget) {
          return;
        }

        props.deleteMutation.mutate({ bo_table: props.deleteTarget.bo_table });
      }}
      open={props.deleteTarget !== null}
      title="선택 게시판을 삭제하시겠습니까?"
      variant="destructive"
    />
  );
}

function BoardOperationsSection(props: {
  copyMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    { bo_table: string; target_bo_subject: string | null; target_bo_table: string },
    unknown
  >;
  copyTargetSubject: string;
  copyTargetTable: string;
  isBusy: boolean;
  newPostIdsText: string;
  newPostsDeleteMutation: UseMutationResult<
    AdminBoardNewPostDeleteResponse,
    CommandError,
    { bn_ids: number[] },
    unknown
  >;
  onCopyTargetSubjectChange: (value: string) => void;
  onCopyTargetTableChange: (value: string) => void;
  onNewPostIdsTextChange: (value: string) => void;
  selectedBoard: AdminBoard;
}) {
  return (
    <>
      <Card className="border border-border/70 bg-muted/10">
        <CardHeader>
          <CardTitle className="text-base">게시판 복사</CardTitle>
          <CardDescription>
            <code>/admin/boards/{"{bo_table}"}/copy</code>를 현재 작업면에서 바로 호출합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="대상 게시판 코드"
              value={props.copyTargetTable}
              onChange={(event) => props.onCopyTargetTableChange(event.currentTarget.value)}
              disabled={props.isBusy}
              placeholder={`${props.selectedBoard.bo_table}_copy`}
            />
            <TextInputField
              label="대상 게시판 제목"
              value={props.copyTargetSubject}
              onChange={(event) => props.onCopyTargetSubjectChange(event.currentTarget.value)}
              disabled={props.isBusy}
              placeholder={`${props.selectedBoard.bo_subject ?? props.selectedBoard.bo_table} (복사)`}
            />
          </div>
          <Button
            type="button"
            disabled={props.isBusy || props.copyTargetTable.trim().length === 0}
            onClick={() =>
              props.copyMutation.mutate({
                bo_table: props.selectedBoard.bo_table,
                target_bo_subject:
                  props.copyTargetSubject.trim().length === 0
                    ? null
                    : props.copyTargetSubject.trim(),
                target_bo_table: props.copyTargetTable.trim(),
              })
            }
          >
            {props.copyMutation.isPending ? "복사 중..." : "게시판 복사"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-muted/10">
        <CardHeader>
          <CardTitle className="text-base">새글 캐시 삭제</CardTitle>
          <CardDescription>
            `bn_ids`를 줄바꿈 또는 콤마로 입력하면 `/admin/boards/new-posts` 삭제를 실행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextInputField
            label="새글 캐시 ID 목록"
            value={props.newPostIdsText}
            onChange={(event) => props.onNewPostIdsTextChange(event.currentTarget.value)}
            disabled={props.isBusy}
            placeholder="12, 15, 18"
          />
          <Button
            type="button"
            variant="outline"
            disabled={props.isBusy || parseNewPostIds(props.newPostIdsText).length === 0}
            onClick={() =>
              props.newPostsDeleteMutation.mutate({
                bn_ids: parseNewPostIds(props.newPostIdsText),
              })
            }
          >
            {props.newPostsDeleteMutation.isPending ? "삭제 중..." : "새글 캐시 삭제"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function renderBoardSchemaStatePanel(
  schemaError: CommandError | null,
  schemaLoading: boolean,
  fieldSchema: AdminSchemaDetail | null,
): ReactNode | null {
  if (schemaError) {
    return (
      <div className="space-y-3">
        <ErrorBanner error={schemaError} />
        <p className="text-sm leading-6 break-words text-muted-foreground">
          게시판 필드 메타데이터를 불러오지 못해 폼을 숨겼습니다. 스키마 응답이
          정상화되면 생성/수정 폼이 다시 표시됩니다.
        </p>
      </div>
    );
  }

  if (schemaLoading || fieldSchema === null) {
    return <SelectionPlaceholder description="게시판 필드 메타데이터를 불러오는 중입니다." />;
  }

  return null;
}

function parseNewPostIds(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}
