import { forwardRef, lazy, Suspense } from "react";
import { SiteSshTerminalFallback } from "./SiteSshTerminalFallback";

export type SiteSshTerminalSurfaceProps = {
  connected: boolean;
  fitRequestToken: number;
  fontSize: number;
  onData: (data: string) => void;
  onResize: (size: { cols: number; rows: number }) => void;
  shellOpen: boolean;
  terminalHeightClassName: string;
};

export type SiteSshTerminalSurfaceHandle = {
  appendOutput: (chunk: string) => void;
  echoInput: (value: string) => void;
  focus: () => void;
  resetOutput: (value: string) => void;
};

const XtermSurface =
  import.meta.env.MODE === "test"
    ? null
    : lazy(() => import("./SiteSshXtermSurface"));

export const SiteSshTerminalSurface = forwardRef<
  SiteSshTerminalSurfaceHandle,
  SiteSshTerminalSurfaceProps
>(function SiteSshTerminalSurface(props, ref) {
  const fallback = <SiteSshTerminalFallback {...props} />;

  if (XtermSurface === null) {
    return (
      <SiteSshTerminalFallback
        ref={ref}
        {...props}
      />
    );
  }

  return (
    <Suspense fallback={fallback}>
      <XtermSurface ref={ref} {...props} />
    </Suspense>
  );
});
