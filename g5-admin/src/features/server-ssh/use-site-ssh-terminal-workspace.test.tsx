import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSiteSshTerminalWorkspace } from "./use-site-ssh-terminal-workspace";

describe("useSiteSshTerminalWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores transcript across remounts when keep-connected is enabled", async () => {
    const firstRender = renderHook(() => useSiteSshTerminalWorkspace("site-alpha"));

    act(() => {
      firstRender.result.current.setKeepConnected(true);
      firstRender.result.current.appendTranscript("alpha-shell-output");
    });

    await waitFor(() => {
      expect(firstRender.result.current.keepConnected).toBe(true);
    });
    firstRender.unmount();

    const secondRender = renderHook(() => useSiteSshTerminalWorkspace("site-alpha"));

    await waitFor(() => {
      expect(secondRender.result.current.keepConnected).toBe(true);
    });
    expect(secondRender.result.current.transcript).toContain("alpha-shell-output");
  });

  it("does not restore transcript when keep-connected is disabled", async () => {
    const firstRender = renderHook(() => useSiteSshTerminalWorkspace("site-alpha"));

    act(() => {
      firstRender.result.current.appendTranscript("ephemeral-output");
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useSiteSshTerminalWorkspace("site-alpha"));

    await waitFor(() => {
      expect(secondRender.result.current.keepConnected).toBe(false);
    });
    expect(secondRender.result.current.transcript).toBe("");
  });
});
