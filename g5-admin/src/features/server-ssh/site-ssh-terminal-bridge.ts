import type { SshShellStreamEvent } from "../../types/SshShellStreamEvent";
import type { SshTerminalBridgeConnectionResponse } from "../../types/SshTerminalBridgeConnectionResponse";

type ClientFrame =
  | { type: "auth"; token: string }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

type ServerFrame =
  | { type: "ready"; snapshot?: string }
  | { type: "output"; payload: SshShellStreamEvent }
  | { type: "error"; message: string };

export type SiteSshTerminalBridge = {
  close: () => void;
  isReady: () => boolean;
  sendInput: (data: string) => boolean;
  sendResize: (size: { cols: number; rows: number }) => boolean;
};

type OpenSiteSshTerminalBridgeOptions = {
  connection: SshTerminalBridgeConnectionResponse;
  onClose: () => void;
  onError: (message: string) => void;
  onOutput: (event: SshShellStreamEvent) => void;
  onReady: (snapshot: string) => void;
};

export function openSiteSshTerminalBridge({
  connection,
  onClose,
  onError,
  onOutput,
  onReady,
}: OpenSiteSshTerminalBridgeOptions): SiteSshTerminalBridge {
  const socket = new WebSocket(connection.websocket_url);
  let ready = false;

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        type: "auth",
        token: connection.token,
      } satisfies ClientFrame),
    );
  });

  socket.addEventListener("message", (event) => {
    const payload = parseServerFrame(event.data);
    if (!payload) {
      onError("SSH 터미널 브리지 응답을 해석하지 못했습니다.");
      return;
    }

    if (payload.type === "ready") {
      ready = true;
      onReady(payload.snapshot ?? "");
      return;
    }
    if (payload.type === "error") {
      onError(payload.message);
      return;
    }
    onOutput(payload.payload);
  });

  socket.addEventListener("error", () => {
    onError("SSH 터미널 브리지 연결이 끊겼습니다. 기본 경로로 전환합니다.");
  });

  socket.addEventListener("close", () => {
    ready = false;
    onClose();
  });

  return {
    close: () => {
      ready = false;
      socket.close();
    },
    isReady: () => ready && socket.readyState === WebSocket.OPEN,
    sendInput: (data) => {
      if (!ready || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      socket.send(JSON.stringify({ type: "input", data } satisfies ClientFrame));
      return true;
    },
    sendResize: ({ cols, rows }) => {
      if (!ready || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      socket.send(JSON.stringify({ type: "resize", cols, rows } satisfies ClientFrame));
      return true;
    },
  };
}

function parseServerFrame(value: unknown): ServerFrame | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ServerFrame;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
