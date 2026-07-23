import type { UseMutationResult } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import type { CommandError } from "../../api/client";
import type { AdminBoard } from "../../types/AdminBoard";
import type { AdminBoardDetailResponse } from "../../types/AdminBoardDetailResponse";
import type { AdminBoardNewPostDeleteResponse } from "../../types/AdminBoardNewPostDeleteResponse";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { BoardFormValues } from "./admin-boards-form";
import {
  BoardCreateSection,
  BoardDeleteDialog,
  BoardEditSection,
} from "./BoardWorkspaceSections";

export function BoardWorkspace(props: {
  createForm: UseFormReturn<BoardFormValues>;
  createMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    BoardFormValues,
    unknown
  >;
  createPayload: unknown;
  copyMutation: UseMutationResult<
    AdminBoardDetailResponse,
    CommandError,
    { bo_table: string; target_bo_subject: string | null; target_bo_table: string },
    unknown
  >;
  copyTargetSubject: string;
  copyTargetTable: string;
  deleteMutation: UseMutationResult<unknown, CommandError, { bo_table: string }, unknown>;
  deleteTarget: AdminBoard | null;
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
  return (
    <>
      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <BoardCreateSection
          createForm={props.createForm}
          createMutation={props.createMutation}
          createPayload={props.createPayload}
          fieldSchema={props.fieldSchema}
          isBusy={props.isBusy}
          schemaError={props.schemaError}
          schemaLoading={props.schemaLoading}
        />
        <BoardEditSection
          copyMutation={props.copyMutation}
          copyTargetSubject={props.copyTargetSubject}
          copyTargetTable={props.copyTargetTable}
          detailLoading={props.detailLoading}
          editForm={props.editForm}
          fieldSchema={props.fieldSchema}
          isBusy={props.isBusy}
          newPostIdsText={props.newPostIdsText}
          newPostsDeleteMutation={props.newPostsDeleteMutation}
          onCopyTargetSubjectChange={props.onCopyTargetSubjectChange}
          onCopyTargetTableChange={props.onCopyTargetTableChange}
          onDeleteTargetChange={props.onDeleteTargetChange}
          onNewPostIdsTextChange={props.onNewPostIdsTextChange}
          onResetEdit={props.onResetEdit}
          schemaError={props.schemaError}
          schemaLoading={props.schemaLoading}
          selectedBoard={props.selectedBoard}
          updateMutation={props.updateMutation}
          updatePayload={props.updatePayload}
        />
      </div>

      <BoardDeleteDialog
        deleteMutation={props.deleteMutation}
        deleteTarget={props.deleteTarget}
        onDeleteTargetChange={props.onDeleteTargetChange}
      />
    </>
  );
}
