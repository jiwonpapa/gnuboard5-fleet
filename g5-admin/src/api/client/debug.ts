import type { DebugDevBootstrapResult } from "../../types/DebugDevBootstrapResult";
import type { DebugDevBootstrapStatus } from "../../types/DebugDevBootstrapStatus";
import type { DebugLogTailResponse } from "../../types/DebugLogTailResponse";
import type { DebugRuntimeInfo } from "../../types/DebugRuntimeInfo";
import { invokeCommand } from "./core";

export async function getDebugRuntimeInfo(): Promise<DebugRuntimeInfo> {
  return invokeCommand<DebugRuntimeInfo>(
    "cmd_debug_runtime_info",
    undefined,
    { track: false },
  );
}

export async function getDebugLogTail(
  limit = 80,
): Promise<DebugLogTailResponse> {
  return invokeCommand<DebugLogTailResponse>(
    "cmd_debug_log_tail",
    { limit },
    { track: false },
  );
}

export async function getDebugDevBootstrapStatus(): Promise<DebugDevBootstrapStatus> {
  return invokeCommand<DebugDevBootstrapStatus>(
    "cmd_debug_dev_bootstrap_status",
    undefined,
    { track: false },
  );
}

export async function applyDebugDevBootstrap(): Promise<DebugDevBootstrapResult> {
  return invokeCommand<DebugDevBootstrapResult>(
    "cmd_debug_dev_bootstrap_apply",
    undefined,
    { track: false },
  );
}

export async function openDebugDevtools(): Promise<string> {
  return invokeCommand<string>("cmd_debug_open_devtools", undefined, {
    track: false,
  });
}
