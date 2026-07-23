import type { SftpReadFileResponse } from "../../types/SftpReadFileResponse";
import { SiteSftpEditorSurface } from "./SiteSftpEditorSurface";

export function SiteSftpEditorModal(props: {
  file: SftpReadFileResponse | null;
  loading: boolean;
  onCancel: () => void;
  onSave: (content: string) => void | Promise<void>;
  open: boolean;
  savePending: boolean;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[93] bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-sftp-editor-modal-title"
        className="mx-auto flex h-full max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-2xl"
      >
        <div className="border-b border-border/70 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Remote Editor
          </p>
          <h2
            id="site-sftp-editor-modal-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            {props.file?.resolved_path ?? "원격 파일 편집기"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            바깥을 클릭해도 닫히지 않습니다. 저장 또는 취소 버튼으로만 닫습니다.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {props.loading ? (
            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 px-5 py-6 text-sm leading-6 text-muted-foreground">
              원격 파일을 읽는 중입니다.
            </div>
          ) : props.file ? (
            <SiteSftpEditorSurface
              file={props.file}
              savePending={props.savePending}
              onCancel={props.onCancel}
              onSave={props.onSave}
            />
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/60 px-5 py-6 text-sm leading-6 text-muted-foreground">
              편집할 원격 파일을 선택해 주십시오.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
