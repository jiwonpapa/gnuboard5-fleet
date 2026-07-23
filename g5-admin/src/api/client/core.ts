import { invoke } from "@tauri-apps/api/core";
import {
  completeCommandDiagnostic,
  startCommandDiagnostic,
} from "../../debug/diagnostics";
import type { AppErrorPayload } from "../../types/AppErrorPayload";
import { buildCommandContext, type CommandContext } from "./core/command-context";

type InvokeCommandOptions = {
  track?: boolean;
};

export type CommandError = AppErrorPayload & {
  area?: string;
  command?: string;
  debug_summary?: string;
  local_target?: string;
  occurred_at?: string;
  operation?: string;
};

export async function invokeCommand<T>(
  command: string,
  payload?: Record<string, unknown>,
  options: InvokeCommandOptions = {},
): Promise<T> {
  const context = buildCommandContext(command, payload);
  const diagnosticId =
    options.track === false ? null : startCommandDiagnostic(context);

  try {
    const response = await invoke<T>(command, payload);
    if (diagnosticId !== null) {
      completeCommandDiagnostic(diagnosticId, {
        correlationId: extractCorrelationId(response),
        requestId: extractRequestId(response),
        serverRequestId: extractServerRequestId(response),
        state: "success",
        status: 200,
      });
    }
    return response;
  } catch (error) {
    const normalized = normalizeError(error, context);
    if (diagnosticId !== null) {
      completeCommandDiagnostic(diagnosticId, {
        code: normalized.code,
        correlationId: normalized.correlation_id,
        errorCategory: normalized.error_category,
        faultDomain: normalized.fault_domain,
        message: normalized.message,
        owner: normalized.owner,
        requestId: normalized.request_id,
        retryable: normalized.retryable,
        serverRequestId: normalized.server_request_id,
        state: "error",
        status: normalized.status,
        userActionable: normalized.user_actionable,
      });
    }
    throw normalized;
  }
}

function normalizeError(
  error: unknown,
  context: CommandContext,
): CommandError {
  if (isCommandError(error)) {
    return enrichError(error, context);
  }

  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error) as unknown;
      if (isCommandError(parsed)) {
        return enrichError(parsed, context);
      }
    } catch {
      return enrichError(buildUnknownCommandError(error), context);
    }
  }

  return enrichError(buildUnknownCommandError("Unknown invoke error"), context);
}

function isCommandError(value: unknown): value is CommandError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.code === "string" &&
    typeof record.message === "string" &&
    typeof record.request_id === "string"
  );
}

function enrichError(
  error: AppErrorPayload,
  context: CommandContext,
): CommandError {
  const occurredAt = new Date().toISOString();
  const enriched: CommandError = {
    ...error,
    area: context.area,
    command: context.command,
    debug_summary: buildDebugSummary(error, context),
    local_target: context.localTarget,
    occurred_at: occurredAt,
    operation: context.operation,
  };

  console.error("[g5-admin][command-error]", enriched);
  return enriched;
}

function buildDebugSummary(
  error: AppErrorPayload,
  context: CommandContext,
): string {
  return [
    `operation=${context.operation}`,
    `area=${context.area}`,
    `command=${context.command}`,
    `local_target=${context.localTarget ?? "-"}`,
    `api_target=${error.target ?? context.apiTarget}`,
    `status=${error.status ?? "-"}`,
    `code=${error.code}`,
    `request_id=${error.request_id}`,
    `correlation_id=${error.correlation_id}`,
    `server_request_id=${error.server_request_id ?? "-"}`,
    `owner=${error.owner}`,
    `fault_domain=${error.fault_domain}`,
    `error_category=${error.error_category}`,
    `retryable=${String(error.retryable)}`,
  ].join(" | ");
}

function extractRequestId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.request_id === "string") {
    return record.request_id;
  }

  return typeof record.correlation_id === "string"
    ? record.correlation_id
    : undefined;
}

function extractCorrelationId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.correlation_id === "string") {
    return record.correlation_id;
  }

  return typeof record.request_id === "string" ? record.request_id : undefined;
}

function extractServerRequestId(value: unknown): string | null | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.server_request_id === "string") {
    return record.server_request_id;
  }

  return record.server_request_id === null ? null : undefined;
}

function buildUnknownCommandError(message: string): AppErrorPayload {
  return {
    code: "invoke_error",
    correlation_id: "unknown",
    detail: null,
    error_category: "client_runtime",
    fault_domain: "client_runtime",
    guide: null,
    message,
    owner: "rust_ui",
    request_id: "unknown",
    retryable: false,
    server_request_id: null,
    status: null,
    target: null,
    user_actionable: false,
  };
}
