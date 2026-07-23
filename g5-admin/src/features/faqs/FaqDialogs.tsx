import { ConfirmActionDialog } from "../admin/shared/ConfirmActionDialog";

export function FaqDialogs(props: {
  deleteFaqPending: boolean;
  deleteMasterPending: boolean;
  deleteFaqDialogOpen: boolean;
  deleteMasterDialogOpen: boolean;
  onDeleteFaqCancel: () => void;
  onDeleteFaqConfirm: () => void;
  onDeleteMasterCancel: () => void;
  onDeleteMasterConfirm: () => void;
}) {
  return (
    <>
      <ConfirmActionDialog
        open={props.deleteMasterDialogOpen}
        title="FAQ 마스터를 삭제하시겠습니까?"
        description="소속 FAQ 문항과 이미지 아티팩트도 함께 정리됩니다."
        confirmLabel="삭제"
        isPending={props.deleteMasterPending}
        onCancel={props.onDeleteMasterCancel}
        onConfirm={props.onDeleteMasterConfirm}
        variant="destructive"
      />

      <ConfirmActionDialog
        open={props.deleteFaqDialogOpen}
        title="FAQ 문항을 삭제하시겠습니까?"
        description="선택한 질문/답변 항목이 삭제됩니다."
        confirmLabel="삭제"
        isPending={props.deleteFaqPending}
        onCancel={props.onDeleteFaqCancel}
        onConfirm={props.onDeleteFaqConfirm}
        variant="destructive"
      />
    </>
  );
}
