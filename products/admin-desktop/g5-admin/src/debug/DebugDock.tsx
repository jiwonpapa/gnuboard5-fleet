import { Power, Terminal } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../lib/utils";
import {
  getDiagnosticsSnapshot,
  subscribeDiagnostics,
} from "./diagnostics";
import { getDebugLogTail, getDebugRuntimeInfo } from "../api/client";
import { DebugDockCompact } from "./DebugDockCompact";
import { DebugDockPanel } from "./DebugDockPanel";
import { SummaryChip } from "./DebugDockComponents";
import { useTheme } from "../features/layout/theme";

const DEBUG_DOCK_ENABLED_STORAGE_KEY = "g5-admin.debug-dock.enabled";

export function DebugDock() {
  const { devMode } = useTheme();
  const entries = useSyncExternalStore(
    subscribeDiagnostics,
    getDiagnosticsSnapshot,
    getDiagnosticsSnapshot,
  );
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(readEnabledState);

  useEffect(() => {
    window.localStorage.setItem(
      DEBUG_DOCK_ENABLED_STORAGE_KEY,
      enabled ? "enabled" : "disabled",
    );
  }, [enabled]);

  const runtimeInfoQuery = useQuery({
    queryKey: ["debug", "runtime-info"],
    queryFn: getDebugRuntimeInfo,
    staleTime: 60_000,
  });

  const debugEnabled =
    runtimeInfoQuery.data?.debug_overlay ?? import.meta.env.DEV ?? false;

  const logTailQuery = useQuery({
    queryKey: ["debug", "log-tail"],
    queryFn: () => getDebugLogTail(80),
    enabled: debugEnabled && enabled && expanded,
    refetchInterval: enabled && expanded ? 4_000 : false,
  });

  if (!devMode || !debugEnabled) {
    return null;
  }

  const pendingEntries = entries.filter((entry) => entry.state === "pending");
  const failedEntries = entries.filter((entry) => entry.state === "error");
  const compactMode = !expanded;
  const highlightedEntry = failedEntries[0] ?? pendingEntries[0] ?? entries[0];
  const highlightedSummary = highlightedEntry
    ? `${highlightedEntry.operation} · ${highlightedEntry.apiTarget}`
    : "최근 요청이 아직 없습니다.";

  return (
    <aside
      className={cn(
        "fixed bottom-4 z-[70] flex flex-col gap-2 text-foreground transition-[left,right,width] duration-300 ease-out",
        enabled && expanded
          ? "left-4 right-4 items-stretch"
          : "left-4 w-fit max-w-[calc(100vw-1rem)] items-start",
      )}
    >
      <div className="w-fit rounded-[1.2rem] border border-border/70 bg-card/96 p-1.5 shadow-lg backdrop-blur">
        {compactMode ? (
          <DebugDockCompact
            enabled={enabled}
            entriesCount={entries.length}
            errorCount={failedEntries.length}
            expanded={expanded}
            pendingCount={pendingEntries.length}
            setEnabled={setEnabled}
            setExpanded={setExpanded}
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] px-2 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (enabled) {
                    setExpanded((current) => !current);
                  }
                }}
                disabled={!enabled}
                aria-expanded={expanded}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-primary/10 text-primary">
                  <Terminal className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Debug Dock
                  </span>
                  <strong className="block text-sm font-semibold text-foreground">
                    {enabled ? "요청 추적" : "요청 추적 OFF"}
                  </strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {highlightedSummary}
                  </span>
                </span>
              </button>

              <button
                type="button"
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-[0.95rem] border px-3 text-xs font-semibold transition-colors",
                  enabled
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-muted-foreground",
                )}
                onClick={() => {
                  setEnabled((current) => {
                    const next = !current;
                    if (!next) {
                      setExpanded(false);
                    }
                    return next;
                  });
                }}
                aria-pressed={enabled}
              >
                <Power className="h-3.5 w-3.5" />
                {enabled ? "ON" : "OFF"}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 px-2 pb-1">
              <SummaryChip label="pending" tone="pending" value={pendingEntries.length} />
              <SummaryChip label="error" tone="error" value={failedEntries.length} />
              <SummaryChip label="total" tone="total" value={entries.length} />
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (enabled) {
                    setExpanded((current) => !current);
                  }
                }}
                disabled={!enabled}
              >
                {expanded ? "닫기" : "열기"}
              </button>
            </div>
          </>
        )}
      </div>

      <div
        className={cn(
          "w-full overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/96 shadow-lg backdrop-blur transition-all duration-200",
          enabled && expanded
            ? "max-h-[70vh] opacity-100"
            : "pointer-events-none max-h-0 border-transparent opacity-0",
        )}
      >
        {enabled && expanded ? (
          <DebugDockPanel
            entries={entries}
            logTailQuery={logTailQuery}
            runtimeInfoQuery={runtimeInfoQuery}
            setExpanded={setExpanded}
          />
        ) : null}
      </div>
    </aside>
  );
}

function readEnabledState() {
  const stored = window.localStorage.getItem(DEBUG_DOCK_ENABLED_STORAGE_KEY);
  return stored === null ? true : stored === "enabled";
}
