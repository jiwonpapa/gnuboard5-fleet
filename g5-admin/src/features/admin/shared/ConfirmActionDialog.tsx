import { useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

export function ConfirmActionDialog(props: {
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "default" | "destructive";
}) {
  const { onCancel, open } = props;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={props.onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-dialog-title"
        className="w-full max-w-lg rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Confirm Action
          </p>
          <h2
            id="confirm-action-dialog-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {props.title}
          </h2>
          <p className="text-sm leading-6 break-words text-muted-foreground">
            {props.description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onCancel}>
            취소
          </Button>
          <Button
            type="button"
            variant={props.variant === "destructive" ? "destructive" : "default"}
            onClick={props.onConfirm}
            disabled={props.isPending}
            className={cn(props.variant === "destructive" && "shadow-sm")}
          >
            {props.isPending ? "처리 중..." : props.confirmLabel ?? "확인"}
          </Button>
        </div>
      </div>
    </div>
  );
}
