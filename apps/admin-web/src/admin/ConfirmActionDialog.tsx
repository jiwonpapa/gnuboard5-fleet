export function ConfirmActionDialog(props: {
  busy?: boolean;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  if (!props.open) {
    return null;
  }
  return (
    <div className="dialog-backdrop">
      <section aria-modal="true" className="confirm-dialog" role="dialog">
        <h2>{props.title}</h2>
        <p>{props.description}</p>
        <div>
          <button type="button" disabled={props.busy} onClick={props.onCancel}>
            취소
          </button>
          <button
            className="danger-action"
            type="button"
            disabled={props.busy}
            onClick={props.onConfirm}
          >
            확인
          </button>
        </div>
      </section>
    </div>
  );
}
