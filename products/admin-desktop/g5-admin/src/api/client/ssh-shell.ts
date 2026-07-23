import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { SshShellCloseInput } from "../../types/SshShellCloseInput";
import type { SshShellOpenInput } from "../../types/SshShellOpenInput";
import type { SshShellReadInput } from "../../types/SshShellReadInput";
import type { SshShellReadResponse } from "../../types/SshShellReadResponse";
import type { SshShellResizeInput } from "../../types/SshShellResizeInput";
import type { SshShellStreamEvent } from "../../types/SshShellStreamEvent";
import type { SshShellWriteInput } from "../../types/SshShellWriteInput";
import { invokeCommand } from "./core";
import type { SshSessionStatusResponse } from "../../types/SshSessionStatusResponse";

export const SSH_SHELL_STREAM_EVENT = "g5:ssh-shell-output";

export async function openSshShell(
  input: SshShellOpenInput,
): Promise<SshSessionStatusResponse> {
  return invokeCommand<SshSessionStatusResponse>("cmd_ssh_shell_open", { input });
}

export async function writeSshShell(
  input: SshShellWriteInput,
): Promise<void> {
  return invokeCommand<void>("cmd_ssh_shell_write", {
    input,
  });
}

export async function readSshShell(
  input: SshShellReadInput,
): Promise<SshShellReadResponse> {
  return invokeCommand<SshShellReadResponse>("cmd_ssh_shell_read", { input });
}

export async function closeSshShell(
  input: SshShellCloseInput,
): Promise<SshSessionStatusResponse> {
  return invokeCommand<SshSessionStatusResponse>("cmd_ssh_shell_close", {
    input,
  });
}

export async function resizeSshShell(
  input: SshShellResizeInput,
): Promise<void> {
  return invokeCommand<void>("cmd_ssh_shell_resize", {
    input,
  });
}

export async function listenSshShellStream(
  onEvent: (payload: SshShellStreamEvent) => void,
): Promise<UnlistenFn> {
  return listen<SshShellStreamEvent>(SSH_SHELL_STREAM_EVENT, ({ payload }) => {
    onEvent(payload);
  });
}
