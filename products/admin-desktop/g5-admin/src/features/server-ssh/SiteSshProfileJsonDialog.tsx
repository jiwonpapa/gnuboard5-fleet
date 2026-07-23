import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";

type JsonMode = "export" | "import";

export function SiteSshProfileJsonDialog(props: {
  description: string;
  initialValue: string;
  mode: JsonMode;
  onCancel: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  onImportFromFile?: () => void | Promise<void>;
  onSaveToFile?: (value: string) => void | Promise<void>;
  open: boolean;
  pending?: boolean;
}) {
  const [value, setValue] = useState(props.initialValue);

  if (!props.open) {
    return null;
  }

  const exportMode = props.mode === "export";

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={props.onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              SSH Profile JSON
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {exportMode ? "SSH 프로필 내보내기" : "SSH 프로필 가져오기"}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
          </div>
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-full border",
              exportMode
                ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {exportMode ? <Download className="size-5" /> : <Upload className="size-5" />}
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Textarea
            className="min-h-[22rem] font-mono text-xs leading-6"
            value={value}
            readOnly={exportMode}
            spellCheck={false}
            onChange={(event) => setValue(event.currentTarget.value)}
          />
          <p className="text-xs leading-6 text-muted-foreground">
            비밀번호와 키 passphrase는 JSON에 포함하지 않습니다. 가져온 뒤 필요한 비밀값만
            다시 입력하시면 됩니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-5">
          <Button type="button" variant="outline" onClick={props.onCancel}>
            닫기
          </Button>
          {exportMode ? (
            <Button
              type="button"
              variant="outline"
              disabled={props.pending}
              onClick={() => {
                void props.onSaveToFile?.(value);
              }}
            >
              파일 저장
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={props.pending}
              onClick={() => {
                void props.onImportFromFile?.();
              }}
            >
              파일 열기
            </Button>
          )}
          <Button
            type="button"
            disabled={props.pending || (!exportMode && value.trim().length === 0)}
            onClick={() => {
              void props.onConfirm(value);
            }}
          >
            {exportMode ? "JSON 복사" : "프로필 가져오기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
