import { useEffect, type ReactNode } from "react";

const ACTIVITY_EVENTS = ["keydown", "pointerdown", "scroll"] as const;

export function MasterIdleGuard(props: {
  children: ReactNode;
  onIdle: () => void;
  timeoutMinutes: number;
}) {
  useEffect(() => {
    let timer = globalThis.setTimeout(
      props.onIdle,
      props.timeoutMinutes * 60 * 1000,
    );
    const reset = () => {
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(
        props.onIdle,
        props.timeoutMinutes * 60 * 1000,
      );
    };
    for (const event of ACTIVITY_EVENTS) {
      globalThis.addEventListener(event, reset, { passive: true });
    }
    return () => {
      globalThis.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        globalThis.removeEventListener(event, reset);
      }
    };
  }, [props.onIdle, props.timeoutMinutes]);

  return props.children;
}
