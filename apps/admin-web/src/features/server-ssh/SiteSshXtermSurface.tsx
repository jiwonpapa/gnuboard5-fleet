import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "xterm";
import "xterm/css/xterm.css";

export interface SiteSshXtermSurfaceHandle {
  focus: () => void;
  reset: () => void;
  write: (chunk: string) => void;
}

export const SiteSshXtermSurface = forwardRef<
  SiteSshXtermSurfaceHandle,
  {
    active: boolean;
    fontSize: number;
    transcript: string;
    viewport: "compact" | "standard" | "tall";
    onData: (data: string) => void;
  }
>(function SiteSshXtermSurface(props, forwardedRef) {
  const container = useRef<HTMLDivElement | null>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const onData = useRef(props.onData);
  const pendingOutput = useRef<string[]>([]);
  const initialActive = useRef(props.active);
  const initialFontSize = useRef(props.fontSize);
  const initialTranscript = useRef(props.transcript);

  useEffect(() => {
    onData.current = props.onData;
  }, [props.onData]);

  useEffect(() => {
    if (import.meta.env.MODE === "test" || !container.current) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let dataSubscription: { dispose: () => void } | null = null;
    let frame = 0;

    void Promise.all([import("xterm"), import("@xterm/addon-fit")])
      .then(([{ Terminal }, { FitAddon }]) => {
        if (disposed || !container.current) return;
        const next = new Terminal({
          allowTransparency: false,
          convertEol: false,
          cursorBlink: true,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: initialFontSize.current,
          lineHeight: 1.18,
          scrollback: 5_000,
          theme: {
            background: "#101816",
            cursor: "#f3f7f5",
            foreground: "#dce8e3",
            selectionBackground: "#355249",
          },
        });
        const nextFitAddon = new FitAddon();
        next.loadAddon(nextFitAddon);
        next.open(container.current);
        terminal.current = next;
        fitAddon.current = nextFitAddon;
        dataSubscription = next.onData((value) => onData.current(value));
        const initialOutput = [
          initialTranscript.current,
          ...pendingOutput.current,
        ].join("");
        pendingOutput.current = [];
        if (initialOutput) next.write(initialOutput);

        const fit = () => {
          try {
            nextFitAddon.fit();
          } catch {
            // The surface can be hidden while the workspace tab changes.
          }
        };
        frame = globalThis.requestAnimationFrame(() => {
          fit();
          if (initialActive.current) next.focus();
        });
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(fit);
          resizeObserver.observe(container.current);
        }
      });

    return () => {
      disposed = true;
      globalThis.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      dataSubscription?.dispose();
      terminal.current?.dispose();
      terminal.current = null;
      fitAddon.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terminal.current) return;
    terminal.current.options.fontSize = props.fontSize;
    try {
      fitAddon.current?.fit();
    } catch {
      // The surface can be hidden while the workspace tab changes.
    }
  }, [props.fontSize, props.viewport]);

  useEffect(() => {
    if (props.active) terminal.current?.focus();
  }, [props.active]);

  useImperativeHandle(forwardedRef, () => ({
    focus: () => terminal.current?.focus(),
    reset: () => {
      initialTranscript.current = "";
      pendingOutput.current = [];
      terminal.current?.reset();
    },
    write: (chunk) => {
      if (terminal.current) terminal.current.write(chunk);
      else pendingOutput.current.push(chunk);
    },
  }), []);

  if (import.meta.env.MODE === "test") {
    return (
      <pre className="terminal-output" aria-label="터미널 출력">
        {props.transcript || "출력 대기"}
      </pre>
    );
  }

  return (
    <div className="ssh-xterm-frame" data-viewport={props.viewport}>
      <div ref={container} className="ssh-xterm-surface" aria-label="SSH 터미널" />
      {!props.active && (
        <div className="ssh-xterm-cover">SSH 연결 후 터미널이 활성화됩니다.</div>
      )}
    </div>
  );
});
