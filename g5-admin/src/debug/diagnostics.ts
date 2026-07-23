export type CommandDiagnosticEntry = {
  apiTarget: string;
  area: string;
  code?: string;
  command: string;
  completedAt?: string;
  correlationId?: string;
  durationMs?: number;
  errorCategory?: string;
  faultDomain?: string;
  id: string;
  localTarget?: string;
  message?: string;
  operation: string;
  owner?: string;
  requestId?: string;
  retryable?: boolean;
  serverRequestId?: string | null;
  startedAt: string;
  state: "pending" | "success" | "error";
  status?: number | null;
  userActionable?: boolean;
};

type CommandDiagnosticContext = {
  apiTarget: string;
  area: string;
  command: string;
  localTarget?: string;
  operation: string;
};

const MAX_ENTRIES = 160;
const listeners = new Set<VoidFunction>();
let entries: CommandDiagnosticEntry[] = [];

export function getDiagnosticsSnapshot(): CommandDiagnosticEntry[] {
  return entries;
}

export function subscribeDiagnostics(listener: VoidFunction): VoidFunction {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearDiagnostics() {
  entries = [];
  emitChange();
}

export function startCommandDiagnostic(
  context: CommandDiagnosticContext,
): CommandDiagnosticEntry["id"] {
  const entry: CommandDiagnosticEntry = {
    apiTarget: context.apiTarget,
    area: context.area,
    command: context.command,
    id: createDiagnosticId(),
    localTarget: context.localTarget,
    operation: context.operation,
    startedAt: new Date().toISOString(),
    state: "pending",
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  emitChange();
  return entry.id;
}

export function completeCommandDiagnostic(
  id: CommandDiagnosticEntry["id"],
  result: {
    code?: string;
    correlationId?: string;
    errorCategory?: string;
    faultDomain?: string;
    message?: string;
    owner?: string;
    requestId?: string;
    retryable?: boolean;
    serverRequestId?: string | null;
    state: CommandDiagnosticEntry["state"];
    status?: number | null;
    userActionable?: boolean;
  },
) {
  const completedAt = new Date().toISOString();
  entries = entries.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }

    const durationMs = Math.max(
      0,
      new Date(completedAt).getTime() - new Date(entry.startedAt).getTime(),
    );

    return {
      ...entry,
      code: result.code ?? entry.code,
      completedAt,
      correlationId: result.correlationId ?? entry.correlationId,
      durationMs,
      errorCategory: result.errorCategory ?? entry.errorCategory,
      faultDomain: result.faultDomain ?? entry.faultDomain,
      message: result.message ?? entry.message,
      owner: result.owner ?? entry.owner,
      requestId: result.requestId ?? entry.requestId,
      retryable: result.retryable ?? entry.retryable,
      serverRequestId: result.serverRequestId ?? entry.serverRequestId,
      state: result.state,
      status: result.status ?? entry.status,
      userActionable: result.userActionable ?? entry.userActionable,
    };
  });
  emitChange();
}

function createDiagnosticId(): string {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}
