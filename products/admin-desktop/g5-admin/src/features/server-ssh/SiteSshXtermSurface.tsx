import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import "./site-ssh-xterm.css";
import type {
  SiteSshTerminalSurfaceHandle,
  SiteSshTerminalSurfaceProps,
} from "./SiteSshTerminalSurface";

function SiteSshXtermSurface(
  {
    connected,
    fitRequestToken,
    fontSize,
    onData,
    onResize,
    shellOpen,
    terminalHeightClassName,
  }: SiteSshTerminalSurfaceProps,
  ref: ForwardedRef<SiteSshTerminalSurfaceHandle>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const handleTerminalDataRef = useRef<(data: string) => void>(() => {});
  const fitFrameRef = useRef<number | null>(null);
  const flushFrameRef = useRef<number | null>(null);
  const flushOutputQueueRef = useRef<() => void>(() => {});
  const lastReportedSizeRef = useRef<string | null>(null);
  const pendingOutputChunksRef = useRef<string[]>([]);
  const scheduleFitRef = useRef<() => void>(() => {});
  const writeInFlightRef = useRef(false);
  const webglAddonRef = useRef<WebglAddon | null>(null);

  const handleTerminalData = useCallback((data: string) => {
    if (!connected || !shellOpen) {
      return;
    }

    onData(data);
  }, [connected, onData, shellOpen]);

  const scheduleFit = useCallback(() => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!terminal || !fitAddon) {
      return;
    }
    if (fitFrameRef.current !== null) {
      return;
    }

    fitFrameRef.current = window.requestAnimationFrame(() => {
      fitFrameRef.current = null;
      fitAddon.fit();
      if (!connected || !shellOpen) {
        return;
      }
      if (terminal.cols <= 0 || terminal.rows <= 0) {
        return;
      }

      const signature = `${terminal.cols}x${terminal.rows}`;
      if (lastReportedSizeRef.current === signature) {
        return;
      }
      lastReportedSizeRef.current = signature;
      onResize({
        cols: terminal.cols,
        rows: terminal.rows,
      });
    });
  }, [connected, onResize, shellOpen]);

  useEffect(() => {
    handleTerminalDataRef.current = handleTerminalData;
  }, [handleTerminalData]);

  useEffect(() => {
    scheduleFitRef.current = scheduleFit;
  }, [scheduleFit]);

  const flushOutputQueue = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal || pendingOutputChunksRef.current.length === 0 || writeInFlightRef.current) {
      return;
    }

    let chunkSize = 0;
    const batch: string[] = [];
    while (pendingOutputChunksRef.current.length > 0 && chunkSize < 32_768) {
      const nextChunk = pendingOutputChunksRef.current.shift();
      if (!nextChunk) {
        continue;
      }
      batch.push(nextChunk);
      chunkSize += nextChunk.length;
    }

    if (batch.length === 0) {
      return;
    }

    writeInFlightRef.current = true;
    terminal.write(batch.join(""), () => {
      writeInFlightRef.current = false;
      if (pendingOutputChunksRef.current.length === 0) {
        return;
      }
      if (flushFrameRef.current !== null) {
        return;
      }
      flushFrameRef.current = window.requestAnimationFrame(() => {
        flushFrameRef.current = null;
        flushOutputQueueRef.current();
      });
    });
  }, []);

  useEffect(() => {
    flushOutputQueueRef.current = flushOutputQueue;
  }, [flushOutputQueue]);

  const scheduleOutputFlush = useCallback(() => {
    if (flushFrameRef.current !== null) {
      return;
    }

    flushFrameRef.current = window.requestAnimationFrame(() => {
      flushFrameRef.current = null;
      flushOutputQueue();
    });
  }, [flushOutputQueue]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: false,
      allowTransparency: false,
      convertEol: false,
      cursorBlink: false,
      drawBoldTextInBrightColors: false,
      fastScrollModifier: "alt",
      fastScrollSensitivity: 5,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      letterSpacing: 0,
      lineHeight: 1.15,
      scrollback: 5_000,
      smoothScrollDuration: 0,
      theme: {
        background: "#000000",
        cursor: "#ffffff",
        foreground: "#ffffff",
        selectionBackground: "#2b3548",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch {
      webglAddonRef.current = null;
    }
    terminal.open(container);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const dataSubscription = terminal.onData((data) => {
      handleTerminalDataRef.current(data);
    });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            scheduleFitRef.current();
          });
    resizeObserver?.observe(container);

    const animationFrame = window.requestAnimationFrame(() => {
      scheduleFitRef.current();
      terminal.focus();
    });
    const handleWindowResize = () => {
      scheduleFitRef.current();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleWindowResize);
      resizeObserver?.disconnect();
      dataSubscription.dispose();
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = null;
      }
      if (flushFrameRef.current !== null) {
        window.cancelAnimationFrame(flushFrameRef.current);
        flushFrameRef.current = null;
      }
      pendingOutputChunksRef.current = [];
      writeInFlightRef.current = false;
      webglAddonRef.current?.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      lastReportedSizeRef.current = null;
      webglAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.options.fontSize = fontSize;
    scheduleFitRef.current();
  }, [fontSize]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !connected || !shellOpen) {
      return;
    }

    scheduleFitRef.current();
    terminal.focus();
  }, [connected, shellOpen]);

  useEffect(() => {
    if (!connected || !shellOpen) {
      return;
    }

    scheduleFitRef.current();
    terminalRef.current?.focus();
  }, [connected, fitRequestToken, shellOpen]);

  useImperativeHandle(
    ref,
    () => ({
      appendOutput: (chunk: string) => {
        if (chunk.length === 0) {
          return;
        }

        pendingOutputChunksRef.current.push(chunk);
        scheduleOutputFlush();
      },
      echoInput: (value: string) => {
        if (value.length === 0) {
          return;
        }
        terminalRef.current?.write(value);
      },
      focus: () => {
        terminalRef.current?.focus();
      },
      resetOutput: (value: string) => {
        const terminal = terminalRef.current;
        if (!terminal) {
          return;
        }

        pendingOutputChunksRef.current = [];
        writeInFlightRef.current = false;
        terminal.reset();
        if (value.length > 0) {
          pendingOutputChunksRef.current.push(value);
          scheduleOutputFlush();
        }
        scheduleFit();
      },
    }),
    [scheduleFit, scheduleOutputFlush],
  );

  return (
    <div className="relative h-full overflow-hidden rounded-md border border-slate-800 bg-black">
      <div
        ref={containerRef}
        aria-label="SSH 터미널"
        className={`${terminalHeightClassName} site-ssh-xterm w-full bg-black px-2 py-2`}
      />
      {!connected || !shellOpen ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-sm leading-6 text-slate-300">
          {!connected
            ? "SSH 연결 후 셸을 열어 주십시오."
            : "셸 열기 후 터미널이 활성화됩니다."}
        </div>
      ) : null}
    </div>
  );
}

export default forwardRef(SiteSshXtermSurface);
