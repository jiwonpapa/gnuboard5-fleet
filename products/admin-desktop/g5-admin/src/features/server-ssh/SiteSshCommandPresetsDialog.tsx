import { useState } from "react";
import { Keyboard, Settings2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { SiteSshCommandPreset } from "./use-site-ssh-command-presets";

export function SiteSshCommandPresetsDialog(props: {
  onClose: () => void;
  onSave: (presets: SiteSshCommandPreset[]) => void;
  open: boolean;
  presets: SiteSshCommandPreset[];
}) {
  const [draftPresets, setDraftPresets] = useState<SiteSshCommandPreset[]>(props.presets);

  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              SSH Quick Commands
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              빠른 명령 1~10
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              등록된 사이트별로 저장됩니다. 버튼을 누르면 명령 뒤에 Enter까지 붙여
              바로 실행합니다.
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-100">
            <Settings2 className="size-5" />
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 md:grid-cols-2">
          {draftPresets.map((preset) => (
            <div
              key={preset.slot}
              className="rounded-xl border border-border/70 bg-background/70 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-100">
                  {preset.slot}
                </div>
                <span className="text-sm font-medium text-foreground">
                  빠른 명령 {preset.slot}
                </span>
              </div>
              <div className="space-y-3">
                <Input
                  value={preset.label}
                  placeholder="예: 로그 확인"
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDraftPresets((current) =>
                      current.map((entry) =>
                        entry.slot === preset.slot ? { ...entry, label: value } : entry,
                      ),
                    );
                  }}
                />
                <div className="flex items-center gap-2">
                  <Keyboard className="size-4 text-muted-foreground" />
                  <Input
                    value={preset.command}
                    placeholder="예: tail -n 200 storage/logs/laravel.log"
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraftPresets((current) =>
                        current.map((entry) =>
                          entry.slot === preset.slot ? { ...entry, command: value } : entry,
                        ),
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-5">
          <Button type="button" variant="outline" onClick={props.onClose}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => {
              props.onSave(draftPresets);
            }}
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
