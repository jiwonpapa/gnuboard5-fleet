import { forwardRef, useImperativeHandle, useState } from "react";
import { Input } from "../../components/ui/input";
import type {
  SiteSshTerminalSurfaceHandle,
  SiteSshTerminalSurfaceProps,
} from "./SiteSshTerminalSurface";

export const SiteSshTerminalFallback = forwardRef<
  SiteSshTerminalSurfaceHandle,
  SiteSshTerminalSurfaceProps
>(function SiteSshTerminalFallback({
  connected,
  terminalHeightClassName,
  onData,
  shellOpen,
}: SiteSshTerminalSurfaceProps, ref) {
  const [draft, setDraft] = useState("");
  const [output, setOutput] = useState("");

  useImperativeHandle(ref, () => ({
    appendOutput: (chunk: string) => {
      setOutput((current) => `${current}${chunk}`);
    },
    echoInput: (value: string) => {
      setOutput((current) => `${current}${value}`);
    },
    focus: () => {
      // no-op in fallback
    },
    resetOutput: (value: string) => {
      setOutput(value);
    },
  }));

  return (
    <div className="space-y-3">
      <pre
        aria-label="SSH 터미널 출력"
        className={`${terminalHeightClassName} overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border/70 bg-background p-4 font-mono text-xs leading-6 text-foreground`}
      >
        {output || "(terminal output will appear here)"}
      </pre>
      <Input
        aria-label="SSH 터미널 입력"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          const value = event.currentTarget.value;
          if (value.trim().length === 0) {
            return;
          }

          onData(`${value}\r`);
          setDraft("");
        }}
        disabled={!connected || !shellOpen}
        placeholder="테스트 환경에서는 Enter로 입력을 전송합니다."
      />
    </div>
  );
});
