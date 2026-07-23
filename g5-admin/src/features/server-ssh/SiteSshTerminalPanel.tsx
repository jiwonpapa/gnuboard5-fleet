import type { CommandError } from "../../api/client";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  SiteSshTerminalSurface,
  type SiteSshTerminalSurfaceHandle,
} from "./SiteSshTerminalSurface";
import {
  SiteSshTerminalToolbar,
  type TerminalViewportMode,
} from "./SiteSshTerminalToolbar";

const TERMINAL_HEIGHT_CLASS_BY_MODE: Record<TerminalViewportMode, string> = {
  compact: "h-[32rem]",
  standard: "h-[48rem]",
  tall: "h-[60rem]",
};

export type SiteSshTerminalPanelProps = {
  connected: boolean;
  errors: Array<CommandError | null>;
  exitSignal: string | null;
  exitStatus: number | null;
  fitRequestToken: number;
  fontSize: number;
  keepConnected: boolean;
  onClear: () => void;
  onCloseShell: () => void;
  onCommandPresets: () => void;
  onData: (data: string) => void;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onOpenShell: () => void;
  onResetFont: () => void;
  onResize: (size: { cols: number; rows: number }) => void;
  onRunCommandPreset: (slot: number) => void;
  onToggleFullscreen: () => void;
  onToggleKeepConnected: () => void;
  onViewportModeChange: (mode: TerminalViewportMode) => void;
  presetLabels: Array<{ empty: boolean; label: string; slot: number }>;
  shellOpen: boolean;
  viewportMode: TerminalViewportMode;
  workspaceExpanded: boolean;
};

export const SiteSshTerminalPanel = forwardRef<
  SiteSshTerminalSurfaceHandle,
  SiteSshTerminalPanelProps
>(function SiteSshTerminalPanel(props, terminalRef) {
  const terminalHeightClassName = props.workspaceExpanded
    ? "h-[calc(100vh-4rem)] min-h-[44rem]"
    : TERMINAL_HEIGHT_CLASS_BY_MODE[props.viewportMode];

  return (
    <section
      className={cn(
        "min-h-0",
        props.workspaceExpanded
          ? "flex h-full flex-col overflow-hidden bg-black"
          : "overflow-hidden rounded-[1.2rem] border border-slate-800 bg-black shadow-sm",
      )}
    >
      {props.errors.map((error, index) =>
        error ? (
          <ErrorBanner key={`${error.command}-${index}`} error={error} />
        ) : null,
      )}

      <SiteSshTerminalToolbar
        connected={props.connected}
        exitSignal={props.exitSignal}
        exitStatus={props.exitStatus}
        fontSize={props.fontSize}
        fullscreen={props.workspaceExpanded}
        keepConnected={props.keepConnected}
        presetLabels={props.presetLabels}
        shellOpen={props.shellOpen}
        viewportMode={props.viewportMode}
        onClear={props.onClear}
        onCloseShell={props.onCloseShell}
        onCommandPresets={props.onCommandPresets}
        onDecreaseFont={props.onDecreaseFont}
        onIncreaseFont={props.onIncreaseFont}
        onOpenShell={props.onOpenShell}
        onResetFont={props.onResetFont}
        onRunCommandPreset={props.onRunCommandPreset}
        onToggleFullscreen={props.onToggleFullscreen}
        onToggleKeepConnected={props.onToggleKeepConnected}
        onViewportModeChange={props.onViewportModeChange}
      />

      <div className={cn("min-h-0", props.workspaceExpanded && "flex-1")}>
        <SiteSshTerminalSurface
          ref={terminalRef}
          connected={props.connected}
          fitRequestToken={props.fitRequestToken}
          fontSize={props.fontSize}
          shellOpen={props.shellOpen}
          terminalHeightClassName={terminalHeightClassName}
          onData={props.onData}
          onResize={props.onResize}
        />
      </div>
    </section>
  );
});
