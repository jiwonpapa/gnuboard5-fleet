import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasterIdleGuard } from "./MasterIdleGuard";

const lockMock = vi.fn();
const toastMessageMock = vi.fn();
const toastErrorMock = vi.fn();
const masterLockState = {
  lock: lockMock,
  lockPending: false,
  status: {
    is_configured: true,
    is_unlocked: true,
    passkey_enabled: false,
    requires_totp: false,
    totp_enabled: false,
    request_id: "test-request",
    correlation_id: "test-correlation",
    server_request_id: null,
  },
};

vi.mock("./use-master-lock", () => ({
  useMasterLock: () => masterLockState,
}));

vi.mock("../security/use-security-settings", () => ({
  useSecuritySettings: () => ({
    settings: {
      fast_unlock_available: false,
      fast_unlock_enabled: false,
      idle_timeout_minutes: 15,
      totp_enabled: false,
      request_id: "security-request",
      correlation_id: "security-correlation",
      server_request_id: null,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    message: (...args: unknown[]) => toastMessageMock(...args),
  },
}));

function renderGuard(idleTimeoutMs: number) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MasterIdleGuard idleTimeoutMs={idleTimeoutMs} />
    </QueryClientProvider>,
  );
}

describe("MasterIdleGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.location.hash = "#/sites/site-1/overview";
    lockMock.mockReset();
    lockMock.mockResolvedValue(masterLockState.status);
    toastMessageMock.mockReset();
    toastErrorMock.mockReset();
    masterLockState.lockPending = false;
    masterLockState.status.is_configured = true;
    masterLockState.status.is_unlocked = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks the app after the idle timeout expires", async () => {
    renderGuard(1_000);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(lockMock).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toContain("/master/unlock");
    expect(toastMessageMock).toHaveBeenCalled();
  });

  it("resets the idle timer when user activity occurs", async () => {
    renderGuard(1_000);

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent("mousemove"));
      vi.advanceTimersByTime(900);
    });

    expect(lockMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(lockMock).toHaveBeenCalledTimes(1);
  });
});
