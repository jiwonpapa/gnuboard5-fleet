import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { SiteSshTerminalBridge } from "./site-ssh-terminal-bridge";
import type { SiteSshTerminalSurfaceHandle } from "./SiteSshTerminalSurface";

export type SiteSshShellOutcome = {
  exitSignal: string | null;
  exitStatus: number | null;
};

type LifecycleOptions = {
  bridgeRef: MutableRefObject<SiteSshTerminalBridge | null>;
  clearTranscript: () => void;
  connected: boolean;
  keepConnected: boolean;
  keepConnectedRef: MutableRefObject<boolean>;
  lastResizeSignatureRef: MutableRefObject<string | null>;
  optimisticEchoRef: MutableRefObject<string>;
  pendingInputRef: MutableRefObject<string>;
  promptKickSentRef: MutableRefObject<boolean>;
  restoredTranscript: string;
  setLastShellOutcome: Dispatch<SetStateAction<SiteSshShellOutcome>>;
  shellOpen: boolean;
  terminalRef: RefObject<SiteSshTerminalSurfaceHandle | null>;
  terminalTranscriptLengthRef: MutableRefObject<number>;
  workspaceExpanded: boolean;
  writeInFlightRef: MutableRefObject<boolean>;
  writeQueuedRef: MutableRefObject<boolean>;
};

export function useSiteSshTerminalLifecycle(options: LifecycleOptions) {
  const {
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
  } = options;

  useEffect(() => {
    keepConnectedRef.current = keepConnected;
  }, [keepConnected, keepConnectedRef]);

  useEffect(() => {
    if (!connected || !shellOpen) {
      lastResizeSignatureRef.current = null;
      pendingInputRef.current = "";
      writeInFlightRef.current = false;
      writeQueuedRef.current = false;
      promptKickSentRef.current = false;
      optimisticEchoRef.current = "";
      bridgeRef.current?.close();
      bridgeRef.current = null;
      return;
    }

    return () => {
      pendingInputRef.current = "";
      writeInFlightRef.current = false;
      writeQueuedRef.current = false;
    };
  }, [
    bridgeRef,
    connected,
    lastResizeSignatureRef,
    optimisticEchoRef,
    pendingInputRef,
    promptKickSentRef,
    shellOpen,
    writeInFlightRef,
    writeQueuedRef,
  ]);

  useEffect(
    () => () => {
      if (!keepConnectedRef.current) clearTranscript();
    },
    [clearTranscript, keepConnectedRef],
  );

  useEffect(() => {
    if (!shellOpen) {
      promptKickSentRef.current = false;
      optimisticEchoRef.current = "";
    }
  }, [optimisticEchoRef, promptKickSentRef, shellOpen]);

  useEffect(() => {
    if (!workspaceExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [workspaceExpanded]);

  useEffect(() => {
    if (restoredTranscript.length === terminalTranscriptLengthRef.current) {
      return;
    }
    terminalRef.current?.resetOutput(restoredTranscript);
    terminalTranscriptLengthRef.current = restoredTranscript.length;
  }, [restoredTranscript, terminalRef, terminalTranscriptLengthRef]);

  return useCallback(
    (clearOutput: boolean) => {
      lastResizeSignatureRef.current = null;
      pendingInputRef.current = "";
      writeInFlightRef.current = false;
      writeQueuedRef.current = false;
      promptKickSentRef.current = false;
      optimisticEchoRef.current = "";
      bridgeRef.current?.close();
      bridgeRef.current = null;
      setLastShellOutcome({ exitSignal: null, exitStatus: null });
      if (clearOutput) {
        terminalTranscriptLengthRef.current = 0;
        clearTranscript();
        terminalRef.current?.resetOutput("");
      }
    },
    [
      bridgeRef,
      clearTranscript,
      lastResizeSignatureRef,
      optimisticEchoRef,
      pendingInputRef,
      promptKickSentRef,
      setLastShellOutcome,
      terminalRef,
      terminalTranscriptLengthRef,
      writeInFlightRef,
      writeQueuedRef,
    ],
  );
}
