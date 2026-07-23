import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildMasterUnlockRoute } from "../layout/navigation";
import { useSecuritySettings } from "../security/use-security-settings";
import { useMasterLock } from "./use-master-lock";

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "focus",
] as const;

export function MasterIdleGuard(props?: { idleTimeoutMs?: number }) {
  const queryClient = useQueryClient();
  const masterLock = useMasterLock();
  const security = useSecuritySettings({
    enabled: masterLock.status?.is_unlocked === true,
  });
  const timerRef = useRef<number | null>(null);
  const lockInFlightRef = useRef(false);
  const isUnlocked = masterLock.status?.is_configured && masterLock.status.is_unlocked;
  const lock = masterLock.lock;
  const lockPending = masterLock.lockPending;
  const idleDisabled =
    props?.idleTimeoutMs === undefined && security.settings?.idle_timeout_minutes === null;
  const idleTimeoutMs =
    props?.idleTimeoutMs ??
    (security.settings?.idle_timeout_minutes ?? DEFAULT_IDLE_TIMEOUT_MS / 60_000) * 60_000;

  useEffect(() => {
    if (!isUnlocked || lockPending || idleDisabled) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lockInFlightRef.current = false;
      return;
    }

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleLock = () => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (lockInFlightRef.current) {
          return;
        }

        lockInFlightRef.current = true;
        void lock()
          .then(() => {
            queryClient.removeQueries({ queryKey: ["auth"] });
            queryClient.removeQueries({ queryKey: ["admin"] });
            queryClient.invalidateQueries({ queryKey: ["sites"] });
            const currentPath = window.location.hash.replace(/^#/, "") || "/";
            const nextPath = currentPath.startsWith("/master/") ? "/" : currentPath;
            window.location.hash = `#${buildMasterUnlockRoute(nextPath)}`;
            toast.message(
              `${Math.round(idleTimeoutMs / 60_000)}분 동안 입력이 없어 앱 잠금을 다시 걸었습니다.`,
            );
          })
          .catch((error) => {
            lockInFlightRef.current = false;
            toast.error(`자동 잠금 실패: ${String(error)}`);
          });
      }, idleTimeoutMs);
    };

    const handleActivity = () => {
      if (!lockInFlightRef.current) {
        scheduleLock();
      }
    };

    scheduleLock();
    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      clearTimer();
      IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [idleDisabled, idleTimeoutMs, isUnlocked, lock, lockPending, queryClient]);

  return null;
}
