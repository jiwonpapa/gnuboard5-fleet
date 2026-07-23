import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  connectSshTerminalBridge,
  listenSshShellStream,
} from "../../api/client";
import { SiteSshCommandPresetsDialog } from "./SiteSshCommandPresetsDialog";
import {
  openSiteSshTerminalBridge,
  type SiteSshTerminalBridge,
} from "./site-ssh-terminal-bridge";
import type { SiteSshTerminalSurfaceHandle } from "./SiteSshTerminalSurface";
import { SiteSshTerminalPanel } from "./SiteSshTerminalPanel";
import type { TerminalViewportMode } from "./SiteSshTerminalToolbar";
import {
  buildPresetChipLabel,
  consumeOptimisticEcho,
  normalizeTerminalText,
  shouldFlushTerminalInputImmediately,
  shouldOptimisticallyEchoTerminalInput,
} from "./site-ssh-terminal-input";
import { useSiteSshCommandPresets } from "./use-site-ssh-command-presets";
import { useSiteSshShell } from "./use-site-ssh-shell";
import {
  useSiteSshTerminalLifecycle,
  type SiteSshShellOutcome,
} from "./use-site-ssh-terminal-lifecycle";
import { useSiteSshTerminalWorkspace } from "./use-site-ssh-terminal-workspace";

const TERMINAL_DEFAULT_FONT_SIZE = 13;
const TERMINAL_MIN_FONT_SIZE = 11;
const TERMINAL_MAX_FONT_SIZE = 20;

type SiteSshShellCardProps = {
  connected: boolean;
  onStatusSync: () => Promise<unknown>;
  shellOpen: boolean;
  siteId: string;
};

export function SiteSshShellCard({
  connected,
  onStatusSync,
  shellOpen,
  siteId,
}: SiteSshShellCardProps) {
  const sshShell = useSiteSshShell();
  const {
    appendTranscript,
    clearTranscript,
    keepConnected,
    setKeepConnected,
    transcript: restoredTranscript,
  } = useSiteSshTerminalWorkspace(siteId);
  const { presets, replacePresets } = useSiteSshCommandPresets(siteId);
  const terminalRef = useRef<SiteSshTerminalSurfaceHandle | null>(null);
  const bridgeRef = useRef<SiteSshTerminalBridge | null>(null);
  const lastResizeSignatureRef = useRef<string | null>(null);
  const keepConnectedRef = useRef(keepConnected);
  const pendingInputRef = useRef("");
  const terminalTranscriptLengthRef = useRef(0);
  const promptKickSentRef = useRef(false);
  const optimisticEchoRef = useRef("");
  const writeQueuedRef = useRef(false);
  const writeInFlightRef = useRef(false);
  const performFlushTerminalInputRef = useRef<(() => Promise<void>) | null>(
    null,
  );
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [fitRequestToken, setFitRequestToken] = useState(0);
  const [fontSize, setFontSize] = useState(TERMINAL_DEFAULT_FONT_SIZE);
  const [lastShellOutcome, setLastShellOutcome] = useState<SiteSshShellOutcome>(
    {
      exitSignal: null,
      exitStatus: null,
    },
  );
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [viewportMode, setViewportMode] =
    useState<TerminalViewportMode>("tall");

  const resetTerminalRuntime = useSiteSshTerminalLifecycle({
    bridgeRef,
    clearTranscript,
    connected,
    keepConnected,
    keepConnectedRef,
    lastResizeSignatureRef,
    optimisticEchoRef,
    pendingInputRef,
    promptKickSentRef,
    restoredTranscript,
    setLastShellOutcome,
    shellOpen,
    terminalRef,
    terminalTranscriptLengthRef,
    workspaceExpanded,
    writeInFlightRef,
    writeQueuedRef,
  });

  const appendOutput = useCallback(
    (stdout: string, stderr: string) => {
      const normalizedStdout = consumeOptimisticEcho(stdout, optimisticEchoRef);
      const chunks = [
        normalizedStdout,
        stderr ? `[stderr]\n${stderr}` : "",
      ].filter(Boolean);
      if (chunks.length === 0) {
        return;
      }

      const normalizedChunk = normalizeTerminalText(chunks.join("\n"));
      terminalRef.current?.appendOutput(normalizedChunk);
      terminalTranscriptLengthRef.current += normalizedChunk.length;
      appendTranscript(normalizedChunk);
    },
    [appendTranscript],
  );

  const syncClosedShell = useCallback(async () => {
    pendingInputRef.current = "";
    await onStatusSync();
    toast.success("SSH 셸이 종료되었습니다.");
  }, [onStatusSync]);

  const performFlushTerminalInput = useCallback(async () => {
    if (!connected || !shellOpen || writeInFlightRef.current) {
      return;
    }

    const data = pendingInputRef.current;
    if (data.length === 0) {
      return;
    }

    pendingInputRef.current = "";
    writeInFlightRef.current = true;

    try {
      if (bridgeRef.current?.sendInput(data)) {
        return;
      }
      await sshShell.writeShell({
        data,
        site_id: siteId,
      });
    } catch {
      pendingInputRef.current = `${data}${pendingInputRef.current}`;
    } finally {
      writeInFlightRef.current = false;
      if (pendingInputRef.current.length > 0) {
        queueMicrotask(() => {
          void performFlushTerminalInputRef.current?.();
        });
      }
    }
  }, [connected, shellOpen, siteId, sshShell]);

  const scheduleTerminalInputFlush = useCallback((immediate: boolean) => {
    if (writeQueuedRef.current && !immediate) {
      return;
    }

    writeQueuedRef.current = true;
    queueMicrotask(() => {
      writeQueuedRef.current = false;
      void performFlushTerminalInputRef.current?.();
    });
  }, []);

  useEffect(() => {
    performFlushTerminalInputRef.current = performFlushTerminalInput;
  }, [performFlushTerminalInput]);

  const requestPromptRefresh = useCallback(
    (bridge?: SiteSshTerminalBridge | null) => {
      if (promptKickSentRef.current || !connected || !shellOpen) {
        return;
      }
      promptKickSentRef.current = true;

      if (bridge?.sendInput("\r")) {
        return;
      }

      pendingInputRef.current = `${pendingInputRef.current}\r`;
      scheduleTerminalInputFlush(true);
    },
    [connected, scheduleTerminalInputFlush, shellOpen],
  );

  const handleShellStreamEvent = useCallback(
    (event: {
      site_id: string;
      stdout: string;
      stderr: string;
      closed: boolean;
      exit_status: number | null;
      exit_signal: string | null;
    }) => {
      if (event.site_id !== siteId) {
        return;
      }

      appendOutput(event.stdout, event.stderr);
      if (
        event.exit_status !== null ||
        event.exit_signal !== null ||
        event.closed
      ) {
        setLastShellOutcome({
          exitSignal: event.exit_signal,
          exitStatus: event.exit_status,
        });
      }
      if (event.closed) {
        void syncClosedShell();
      }
    },
    [appendOutput, siteId, syncClosedShell],
  );

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    void listenSshShellStream((payload) => {
      if (cancelled) {
        return;
      }
      if (bridgeRef.current?.isReady()) {
        return;
      }
      handleShellStreamEvent(payload);
    }).then((nextUnlisten) => {
      if (cancelled) {
        nextUnlisten();
        return;
      }
      unlisten = nextUnlisten;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [connected, handleShellStreamEvent]);

  useEffect(() => {
    if (!connected || !shellOpen) {
      bridgeRef.current?.close();
      bridgeRef.current = null;
      return;
    }

    let disposed = false;
    void connectSshTerminalBridge({ site_id: siteId })
      .then((connection) => {
        if (disposed) {
          return;
        }
        const bridge = openSiteSshTerminalBridge({
          connection,
          onClose: () => {
            if (bridgeRef.current === bridge) {
              bridgeRef.current = null;
            }
          },
          onError: (message) => {
            if (disposed) {
              return;
            }
            if (bridgeRef.current === bridge) {
              bridgeRef.current = null;
            }
            toast.error(message);
          },
          onOutput: (event) => {
            if (disposed) {
              return;
            }
            handleShellStreamEvent(event);
          },
          onReady: (snapshot) => {
            if (disposed) {
              return;
            }
            if (
              terminalTranscriptLengthRef.current === 0 &&
              restoredTranscript.length === 0 &&
              snapshot.length > 0
            ) {
              const normalizedSnapshot = normalizeTerminalText(snapshot);
              terminalRef.current?.resetOutput(normalizedSnapshot);
              terminalTranscriptLengthRef.current = normalizedSnapshot.length;
              appendTranscript(normalizedSnapshot);
              promptKickSentRef.current = true;
              return;
            }
            if (
              terminalTranscriptLengthRef.current === 0 &&
              restoredTranscript.length === 0 &&
              snapshot.length === 0
            ) {
              requestPromptRefresh(bridge);
            }
            if (pendingInputRef.current.length > 0) {
              scheduleTerminalInputFlush(true);
            }
          },
        });
        bridgeRef.current = bridge;
      })
      .catch(() => {
        bridgeRef.current = null;
      });

    return () => {
      disposed = true;
      bridgeRef.current?.close();
      bridgeRef.current = null;
    };
  }, [
    appendTranscript,
    connected,
    handleShellStreamEvent,
    requestPromptRefresh,
    restoredTranscript.length,
    scheduleTerminalInputFlush,
    shellOpen,
    siteId,
  ]);

  const handleRunCommandPreset = useCallback(
    async (slot: number) => {
      if (!connected || !shellOpen) {
        return;
      }

      const preset = presets.find((entry) => entry.slot === slot);
      if (!preset || preset.command.trim().length === 0) {
        return;
      }

      try {
        if (bridgeRef.current?.sendInput(`${preset.command}\r`)) {
          terminalRef.current?.focus();
          return;
        }
        await sshShell.writeShell({
          data: `${preset.command}\r`,
          site_id: siteId,
        });
        terminalRef.current?.focus();
      } catch {
        // ErrorBanner handles payload details.
      }
    },
    [connected, presets, shellOpen, siteId, sshShell],
  );

  async function handleOpenShell() {
    try {
      await sshShell.openShell({ site_id: siteId });
      resetTerminalRuntime(true);
      toast.success("SSH 셸을 열었습니다.");
    } catch {
      // ErrorBanner handles payload details.
    }
  }

  async function handleCloseShell() {
    try {
      bridgeRef.current?.close();
      bridgeRef.current = null;
      await sshShell.closeShell({ site_id: siteId });
      resetTerminalRuntime(false);
      toast.success("SSH 셸을 닫았습니다.");
    } catch {
      // ErrorBanner handles payload details.
    }
  }

  const presetLabels = presets.map((preset) => {
    const label = buildPresetChipLabel(preset);
    return {
      empty: preset.command.trim().length === 0,
      label,
      slot: preset.slot,
    };
  });

  const shellSurface = (
    <SiteSshTerminalPanel
      ref={terminalRef}
      connected={connected}
      errors={[
        sshShell.openShellError,
        sshShell.writeShellError,
        sshShell.readShellError,
        sshShell.closeShellError,
        sshShell.resizeShellError,
      ]}
      exitSignal={lastShellOutcome.exitSignal}
      exitStatus={lastShellOutcome.exitStatus}
      fitRequestToken={fitRequestToken}
      fontSize={fontSize}
      keepConnected={keepConnected}
      presetLabels={presetLabels}
      shellOpen={shellOpen}
      viewportMode={viewportMode}
      workspaceExpanded={workspaceExpanded}
      onClear={() => {
        optimisticEchoRef.current = "";
        terminalTranscriptLengthRef.current = 0;
        terminalRef.current?.resetOutput("");
        clearTranscript();
      }}
      onCloseShell={() => void handleCloseShell()}
      onCommandPresets={() => setCommandDialogOpen(true)}
      onData={(data) => {
        pendingInputRef.current = `${pendingInputRef.current}${data}`;
        if (!connected || !shellOpen) return;
        if (shouldOptimisticallyEchoTerminalInput(data)) {
          optimisticEchoRef.current = `${optimisticEchoRef.current}${data}`;
          terminalRef.current?.echoInput(data);
        }
        scheduleTerminalInputFlush(shouldFlushTerminalInputImmediately(data));
      }}
      onDecreaseFont={() =>
        setFontSize((current) => Math.max(TERMINAL_MIN_FONT_SIZE, current - 1))
      }
      onIncreaseFont={() =>
        setFontSize((current) => Math.min(TERMINAL_MAX_FONT_SIZE, current + 1))
      }
      onOpenShell={() => void handleOpenShell()}
      onResetFont={() => {
        setFontSize(TERMINAL_DEFAULT_FONT_SIZE);
        setFitRequestToken((current) => current + 1);
      }}
      onResize={(size) => {
        if (!connected || !shellOpen) return;
        const signature = `${size.cols}x${size.rows}`;
        if (lastResizeSignatureRef.current === signature) return;
        lastResizeSignatureRef.current = signature;
        if (bridgeRef.current?.sendResize(size)) return;
        void sshShell.resizeShell({ ...size, site_id: siteId }).catch(() => {
          lastResizeSignatureRef.current = null;
        });
      }}
      onRunCommandPreset={(slot) => void handleRunCommandPreset(slot)}
      onToggleFullscreen={() => {
        setWorkspaceExpanded((current) => !current);
        setFitRequestToken((current) => current + 1);
      }}
      onToggleKeepConnected={() => setKeepConnected(!keepConnected)}
      onViewportModeChange={(mode) => {
        setViewportMode(mode);
        setFitRequestToken((current) => current + 1);
      }}
    />
  );

  return (
    <>
      {workspaceExpanded
        ? createPortal(
            <div className="fixed inset-0 z-[80] bg-slate-950">
              {shellSurface}
            </div>,
            document.body,
          )
        : shellSurface}

      <SiteSshCommandPresetsDialog
        key={presets
          .map((preset) => `${preset.slot}:${preset.label}:${preset.command}`)
          .join("|")}
        open={commandDialogOpen}
        presets={presets}
        onClose={() => setCommandDialogOpen(false)}
        onSave={(nextPresets) => {
          replacePresets(nextPresets);
          setCommandDialogOpen(false);
          toast.success("빠른 명령 1~10을 저장했습니다.");
        }}
      />
    </>
  );
}
