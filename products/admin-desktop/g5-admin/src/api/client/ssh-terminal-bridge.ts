import type { SshTerminalBridgeConnectInput } from "../../types/SshTerminalBridgeConnectInput";
import type { SshTerminalBridgeConnectionResponse } from "../../types/SshTerminalBridgeConnectionResponse";
import { invokeCommand } from "./core";

export async function connectSshTerminalBridge(
  input: SshTerminalBridgeConnectInput,
): Promise<SshTerminalBridgeConnectionResponse> {
  return invokeCommand<SshTerminalBridgeConnectionResponse>(
    "cmd_ssh_terminal_bridge_connect",
    { input },
  );
}
