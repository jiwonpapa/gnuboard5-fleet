import { X } from "lucide-react";
import { Button } from "../../components/ui/button";

export function SiteSftpDialogFrame(props: {
  children: React.ReactNode;
  confirmDisabled?: boolean;
  confirmLabel: string;
  confirmPending?: boolean;
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
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={props.onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {props.title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={props.onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 px-5 py-4">{props.children}</div>
        <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-4">
          <Button type="button" variant="outline" onClick={props.onCancel}>
            취소
          </Button>
          <Button
            type="button"
            disabled={props.confirmDisabled || props.confirmPending}
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
