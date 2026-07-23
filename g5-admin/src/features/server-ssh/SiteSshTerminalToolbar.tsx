import {
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RefreshCcw,
  Settings2,
  TerminalSquare,
  X,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";

type TerminalViewportMode = "compact" | "standard" | "tall";

export function SiteSshTerminalToolbar(props: {
  connected: boolean;
  exitSignal?: string | null;
  exitStatus?: number | null;
  fontSize: number;
  fullscreen: boolean;
  keepConnected: boolean;
  onCommandPresets: () => void;
  onClear: () => void;
  onCloseShell: () => void;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onOpenShell: () => void;
  onResetFont: () => void;
  onRunCommandPreset: (slot: number) => void;
  onToggleKeepConnected: () => void;
  onToggleFullscreen: () => void;
  onViewportModeChange: (mode: TerminalViewportMode) => void;
  presetLabels: Array<{ empty: boolean; label: string; slot: number }>;
  shellOpen: boolean;
  viewportMode: TerminalViewportMode;
}) {
  return (
    <div className="space-y-2 border-b border-slate-800/90 bg-slate-950 px-3 py-2.5 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-200"
          >
            {props.shellOpen ? "shell-open" : "shell-closed"}
          </Badge>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
            disabled={!props.connected || props.shellOpen}
            aria-label="SSH 셸 열기"
            title="SSH 셸 열기"
            onClick={props.onOpenShell}
          >
            <TerminalSquare className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
            disabled={!props.shellOpen}
            aria-label="SSH 셸 닫기"
            title="SSH 셸 닫기"
            onClick={props.onCloseShell}
          >
            <X className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
            aria-label="빠른 명령 편집"
            title="빠른 명령 편집"
            onClick={props.onCommandPresets}
          >
            <Settings2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
            aria-label="터미널 화면 비우기"
            title="화면 비우기"
            onClick={props.onClear}
          >
            <RefreshCcw className="size-4" />
          </Button>
          {props.exitStatus !== null && props.exitStatus !== undefined ? (
            <Badge
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200"
            >
              exit {props.exitStatus}
            </Badge>
          ) : null}
          {props.exitSignal ? (
            <Badge
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200"
            >
              signal {props.exitSignal}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/70 p-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-slate-200 hover:bg-slate-800 hover:text-white"
              aria-label="터미널 글꼴 축소"
              title="터미널 글꼴 축소"
              onClick={props.onDecreaseFont}
            >
              <Minus className="size-4" />
            </Button>
            <button
              type="button"
              className="min-w-12 rounded px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              onClick={props.onResetFont}
            >
              {props.fontSize}px
            </button>
            <div className="flex items-center gap-2 border-l border-slate-800 pl-2 pr-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                유지
              </span>
              <Switch
                checked={props.keepConnected}
                aria-label={props.keepConnected ? "연결유지 on" : "연결유지 off"}
                onCheckedChange={props.onToggleKeepConnected}
              />
              <span className="min-w-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {props.keepConnected ? "on" : "off"}
              </span>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-slate-200 hover:bg-slate-800 hover:text-white"
              aria-label="터미널 글꼴 확대"
              title="터미널 글꼴 확대"
              onClick={props.onIncreaseFont}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/70 p-1">
            {(["compact", "standard", "tall"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
                  props.viewportMode === mode &&
                    "bg-slate-100 text-slate-950 hover:bg-slate-100",
                )}
                onClick={() => props.onViewportModeChange(mode)}
              >
                {mode === "compact" ? "S" : mode === "standard" ? "M" : "L"}
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
            aria-label={props.fullscreen ? "작업면 최대화 해제" : "작업면 최대화"}
            title={props.fullscreen ? "작업면 최대화 해제" : "작업면 최대화"}
            onClick={props.onToggleFullscreen}
          >
            {props.fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-900/80 pt-2">
        {props.presetLabels.map((preset) => (
          <Button
            key={preset.slot}
            type="button"
            size="sm"
            variant="ghost"
            disabled={!props.connected || !props.shellOpen || preset.empty}
            className={cn(
              "h-8 gap-1.5 px-2.5 text-slate-200 hover:bg-slate-800 hover:text-white",
              preset.empty &&
                "text-slate-600 hover:bg-transparent hover:text-slate-600",
            )}
            aria-label={
              preset.empty
                ? `${preset.slot}번 빠른 명령 비어 있음`
                : `${preset.slot}번 빠른 명령 실행`
            }
            title={
              preset.empty
                ? `${preset.slot}번 빠른 명령 비어 있음`
                : `${preset.slot}. ${preset.label}`
            }
            onClick={() => props.onRunCommandPreset(preset.slot)}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {preset.slot}
            </span>
            <span className="max-w-14 truncate text-xs font-semibold">{preset.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export type { TerminalViewportMode };
