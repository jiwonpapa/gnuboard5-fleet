import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import type { SftpReadFileResponse } from "../../types/SftpReadFileResponse";
import { SiteSftpCodeEditor } from "./SiteSftpCodeEditor";
import {
  formatSiteSftpContent,
  supportsSiteSftpFormatting,
} from "./site-sftp-editor-formatting";

export function SiteSftpEditorSurface(props: {
  file: SftpReadFileResponse;
  onCancel: () => void;
  onSave: (content: string) => void | Promise<void>;
  savePending: boolean;
}) {
  return (
    <EditableEditor
      key={`${props.file.resolved_path}:${props.file.request_id}`}
      file={props.file}
      onCancel={props.onCancel}
      onSave={props.onSave}
      savePending={props.savePending}
    />
  );
}

function EditableEditor(props: {
  file: SftpReadFileResponse;
  onCancel: () => void;
  onSave: (content: string) => void | Promise<void>;
  savePending: boolean;
}) {
  const [draft, setDraft] = useState(props.file.content);
  const [formatPending, setFormatPending] = useState(false);
  const saveBlocked = props.file.truncated || props.file.utf8_lossy;
  const formatSupported =
    !saveBlocked && supportsSiteSftpFormatting(props.file.resolved_path);
  const dirty = draft !== props.file.content;
  const saveDisabled = saveBlocked || draft === props.file.content || props.savePending;
  const saveShortcutLabel = navigator.platform.toLowerCase().includes("mac")
    ? "Cmd+S"
    : "Ctrl+S";

  async function handleSave() {
    if (saveDisabled) {
      return;
    }

    try {
      await props.onSave(draft);
      props.onCancel();
    } catch {
      // ErrorBanner renders payload details outside the modal.
    }
  }

  async function handleFormat() {
    if (!formatSupported || formatPending) {
      return;
    }

    setFormatPending(true);
    try {
      const formatted = await formatSiteSftpContent(props.file.resolved_path, draft);
      if (formatted === null) {
        return;
      }
      setDraft(formatted);
      toast.success("코드 형식을 정리했습니다.");
    } catch {
      toast.error("현재 파일은 자동 형식 정리를 완료하지 못했습니다.");
    } finally {
      setFormatPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm leading-6">
        <p>
          <strong>경로</strong>: {props.file.resolved_path}
        </p>
        <p>
          <strong>길이</strong>: {props.file.byte_length.toLocaleString("ko-KR")} bytes
        </p>
        <p>
          <strong>디코딩</strong>: {props.file.utf8_lossy ? "utf-8-lossy" : "utf-8"}
        </p>
        {props.file.truncated ? (
          <p className="text-amber-700 dark:text-amber-300">
            미리보기 상한 때문에 일부만 표시했습니다. 이 상태에서는 저장을 비활성화합니다.
          </p>
        ) : null}
        {props.file.utf8_lossy ? (
          <p className="text-amber-700 dark:text-amber-300">
            UTF-8 lossless 본문이 아니어서 현재 슬라이스에서는 저장을 막습니다.
          </p>
        ) : null}
        {!saveBlocked ? (
          <p className="text-muted-foreground">
            저장 단축키: <strong>{saveShortcutLabel}</strong>
          </p>
        ) : null}
        {!formatSupported ? (
          <p className="text-muted-foreground">
            자동 형식 정리는 현재 확장자에서 지원하지 않습니다.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {dirty ? "변경사항이 있습니다." : "원격 파일과 동기화된 상태입니다."}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!formatSupported || formatPending}
            onClick={() => {
              void handleFormat();
            }}
          >
            <Sparkles className="h-4 w-4" />
            형식 정리
          </Button>
          <Button type="button" variant="outline" onClick={props.onCancel}>
            취소
          </Button>
          <Button
            type="button"
            disabled={saveDisabled}
            onClick={() => {
              void handleSave();
            }}
          >
            저장
          </Button>
        </div>
      </div>
      <SiteSftpCodeEditor
        height="62vh"
        path={props.file.resolved_path}
        value={draft}
        onChange={setDraft}
        onSaveShortcut={saveDisabled ? undefined : handleSave}
      />
    </div>
  );
}
