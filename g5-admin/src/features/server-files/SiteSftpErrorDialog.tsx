import type { CommandError } from "../../api/client";
import { SiteSftpDialogFrame } from "./SiteSftpDialogFrame";

export function SiteSftpErrorDialog(props: {
  error: CommandError | null;
  onClose: () => void;
  open: boolean;
}) {
  if (!props.open || !props.error) {
    return null;
  }

  return (
    <SiteSftpDialogFrame
      open={props.open}
      title="SFTP 작업 오류"
      description="요청한 파일 작업을 완료하지 못했습니다."
      confirmLabel="확인"
      onCancel={props.onClose}
      onConfirm={props.onClose}
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{props.error.message}</p>
          {props.error.guide?.reason ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {props.error.guide.reason}
            </p>
          ) : null}
          {props.error.guide?.action ? (
            <p className="mt-2 text-sm leading-6 text-foreground">
              조치: {props.error.guide.action}
            </p>
          ) : null}
        </div>
      </div>
    </SiteSftpDialogFrame>
  );
}
