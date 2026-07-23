import { forwardRef, useImperativeHandle } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSshShellCard } from "./SiteSshShellCard";

type ShellStreamPayload = {
  site_id: string;
  stdout: string;
  stderr: string;
  closed: boolean;
  exit_status: number | null;
  exit_signal: string | null;
};

const closeShellSpy = vi.fn();
const connectSshTerminalBridgeSpy = vi.fn();
const listenSshShellStreamSpy = vi.fn();
const openShellSpy = vi.fn();
const readShellSpy = vi.fn();
const resizeShellSpy = vi.fn();
const terminalAppendOutputSpy = vi.fn();
const terminalEchoInputSpy = vi.fn();
const terminalResetOutputSpy = vi.fn();
const writeShellSpy = vi.fn();
const emptyReadResponse = {
  closed: false,
  correlation_id: "corr-shell-read",
  exit_signal: null,
  exit_status: null,
  request_id: "req-shell-read",
  server_request_id: null,
  site_id: "site-alpha",
  stderr: "",
  stdout: "",
};

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readonly url: string;
  readonly send = vi.fn();
  private listeners = new Map<string, Set<(event?: { data?: string }) => void>>();
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.dispatch("open");
    });
  }

  addEventListener(type: string, listener: (event?: { data?: string }) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close");
  });

  emitMessage(payload: unknown) {
    this.dispatch("message", {
      data: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
  }

  private dispatch(type: string, event?: { data?: string }) {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(event);
    }
  }
}

vi.mock("./use-site-ssh-shell", () => ({
  useSiteSshShell: () => ({
    closeShell: closeShellSpy,
    closeShellError: null,
    closeShellPending: false,
    openShell: openShellSpy,
    openShellError: null,
    openShellPending: false,
    readShell: readShellSpy,
    readShellError: null,
    readShellPending: false,
    readShellResponse: null,
    resizeShell: resizeShellSpy,
    resizeShellError: null,
    resizeShellPending: false,
    writeShell: writeShellSpy,
    writeShellError: null,
    writeShellPending: false,
  }),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>(
    "../../api/client",
  );
  return {
    ...actual,
    connectSshTerminalBridge: (...args: unknown[]) =>
      connectSshTerminalBridgeSpy(...args),
    listenSshShellStream: (...args: unknown[]) => listenSshShellStreamSpy(...args),
  };
});

vi.mock("./SiteSshTerminalSurface", () => ({
  SiteSshTerminalSurface: forwardRef(function MockSiteSshTerminalSurface(
    {
      onData,
      onResize,
    }: {
      onData: (data: string) => void;
      onResize: (size: { cols: number; rows: number }) => void;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      appendOutput: terminalAppendOutputSpy,
      echoInput: terminalEchoInputSpy,
      focus: vi.fn(),
      resetOutput: terminalResetOutputSpy,
    }));

    return (
      <div>
        <button type="button" onClick={() => onData("l")}>
          type-l
        </button>
        <button type="button" onClick={() => onData("s")}>
          type-s
        </button>
        <button type="button" onClick={() => onData("pwd\r")}>
          submit-command
        </button>
        <button type="button" onClick={() => onResize({ cols: 120, rows: 32 })}>
          resize-120x32
        </button>
        <button type="button" onClick={() => onResize({ cols: 120, rows: 32 })}>
          resize-120x32-again
        </button>
        <button type="button" onClick={() => onResize({ cols: 140, rows: 48 })}>
          resize-140x48
        </button>
      </div>
    );
  }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });
}

describe("SiteSshShellCard", () => {
  beforeEach(() => {
    vi.useRealTimers();
    closeShellSpy.mockReset();
    connectSshTerminalBridgeSpy.mockReset();
    listenSshShellStreamSpy.mockReset();
    openShellSpy.mockReset();
    readShellSpy.mockReset();
    resizeShellSpy.mockReset();
    terminalAppendOutputSpy.mockReset();
    terminalEchoInputSpy.mockReset();
    terminalResetOutputSpy.mockReset();
    writeShellSpy.mockReset();
    closeShellSpy.mockResolvedValue(undefined);
    connectSshTerminalBridgeSpy.mockResolvedValue({
      correlation_id: "corr-bridge",
      request_id: "req-bridge",
      server_request_id: null,
      site_id: "site-alpha",
      token: "bridge-token",
      websocket_url: "ws://127.0.0.1:4545",
    });
    openShellSpy.mockResolvedValue(undefined);
    listenSshShellStreamSpy.mockResolvedValue(vi.fn());
    readShellSpy.mockResolvedValue(emptyReadResponse);
    resizeShellSpy.mockResolvedValue(undefined);
    writeShellSpy.mockResolvedValue(undefined);
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
  });

  it("sends PTY resize only when terminal dimensions change", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "resize-120x32" }));

    await waitFor(() => {
      expect(resizeShellSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
        cols: 120,
        rows: 32,
      });
    });

    await user.click(screen.getByRole("button", { name: "resize-120x32-again" }));
    await user.click(screen.getByRole("button", { name: "resize-140x48" }));

    await waitFor(() => {
      expect(resizeShellSpy).toHaveBeenCalledTimes(2);
    });

    expect(resizeShellSpy).toHaveBeenLastCalledWith({
      site_id: "site-alpha",
      cols: 140,
      rows: 48,
    });
  });

  it("flushes enter-terminated input to the active shell immediately", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "submit-command" }));

    await waitFor(() => {
      expect(writeShellSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
        data: "pwd\r",
      });
    });
  });

  it("subscribes once to streamed shell output for the current terminal", async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(listenSshShellStreamSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("forwards rapid sequential key input without dropping characters", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "type-l" }));
    await user.click(screen.getByRole("button", { name: "type-s" }));

    await waitFor(() => {
      expect(
        writeShellSpy.mock.calls
          .map(([payload]) => payload.data as string)
          .join(""),
      ).toContain("ls");
    });

    expect(terminalEchoInputSpy).toHaveBeenNthCalledWith(1, "l");
    expect(terminalEchoInputSpy).toHaveBeenNthCalledWith(2, "s");
  });

  it("routes terminal input through the websocket bridge once the bridge is ready", async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(connectSshTerminalBridgeSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
      });
    });
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();
    await waitFor(() => {
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "auth",
          token: "bridge-token",
        }),
      );
    });
    socket.emitMessage({ type: "ready", snapshot: "" });

    await user.click(screen.getByRole("button", { name: "submit-command" }));

    await waitFor(() => {
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "input",
          data: "pwd\r",
        }),
      );
    });
    expect(writeShellSpy).not.toHaveBeenCalled();
  });

  it("hydrates the terminal with the bridge snapshot on reconnect", async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(connectSshTerminalBridgeSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
      });
    });
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();

    socket.emitMessage({
      type: "ready",
      snapshot: "neojins@host:~$ ",
    });

    await waitFor(() => {
      expect(terminalResetOutputSpy).toHaveBeenCalledWith("neojins@host:~$ ");
    });
    expect(writeShellSpy).not.toHaveBeenCalled();
  });

  it("requests a prompt refresh immediately when the bridge snapshot is empty", async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(connectSshTerminalBridgeSpy).toHaveBeenCalledWith({
        site_id: "site-alpha",
      });
    });
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();

    socket.emitMessage({ type: "ready", snapshot: "" });

    await waitFor(() => {
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "input",
          data: "\r",
        }),
      );
    });
  });

  it("strips already echoed optimistic input from streamed stdout", async () => {
    const user = userEvent.setup();
    const streamHandlerRef: { current: ((payload: ShellStreamPayload) => void) | null } = {
      current: null,
    };
    listenSshShellStreamSpy.mockImplementation(async (handler) => {
      streamHandlerRef.current = handler;
      return vi.fn();
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SiteSshShellCard
          connected
          shellOpen
          siteId="site-alpha"
          onStatusSync={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "type-l" }));
    await user.click(screen.getByRole("button", { name: "type-s" }));

    expect(streamHandlerRef.current).not.toBeNull();
    const activeStreamHandler = streamHandlerRef.current;
    if (activeStreamHandler === null) {
      throw new Error("shell stream handler was not registered");
    }
    activeStreamHandler({
      site_id: "site-alpha",
      stdout: "ls\r\nprompt$ ",
      stderr: "",
      closed: false,
      exit_status: null,
      exit_signal: null,
    });

    await waitFor(() => {
      expect(terminalAppendOutputSpy).toHaveBeenCalledWith("\r\nprompt$ ");
    });
  });

});
