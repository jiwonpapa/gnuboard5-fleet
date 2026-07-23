import type { SshConnectInput } from "../../types/SshConnectInput";
import type { SshDisconnectInput } from "../../types/SshDisconnectInput";
import type { SshSessionStatusResponse } from "../../types/SshSessionStatusResponse";
import { invokeCommand } from "./core";

export async function getSshStatus(
  siteId: string,
): Promise<SshSessionStatusResponse> {
  return invokeCommand<SshSessionStatusResponse>("cmd_ssh_status", {
    siteId,
  });
}

export async function connectSsh(
  input: SshConnectInput,
): Promise<SshSessionStatusResponse> {
  return invokeCommand<SshSessionStatusResponse>("cmd_ssh_connect", { input });
}

export async function disconnectSsh(
  input: SshDisconnectInput,
): Promise<SshSessionStatusResponse> {
  return invokeCommand<SshSessionStatusResponse>("cmd_ssh_disconnect", {
    input,
  });
}
