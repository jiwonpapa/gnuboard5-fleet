import { Button } from "../components/ui/button";
import { DebugDevtoolsButton } from "./DebugDevtoolsButton";
import { clearDiagnostics } from "./diagnostics";
import { SummaryChip, TraceInfoCard, TraceMetaLine } from "./DebugDockComponents";
import type { CommandDiagnosticEntry } from "./diagnostics";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DebugRuntimeInfo } from "../types/DebugRuntimeInfo";
import type { DebugLogTailResponse } from "../types/DebugLogTailResponse";

export function DebugDockPanel(props: {
  entries: CommandDiagnosticEntry[];
  logTailQuery: UseQueryResult<DebugLogTailResponse, Error>;
  runtimeInfoQuery: UseQueryResult<DebugRuntimeInfo, Error>;
  setExpanded: (expanded: boolean) => void;
}) {
  const recentEntries = props.entries.slice(0, 14);

  return (
    <div className="w-full overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/96 shadow-lg backdrop-blur transition-all duration-200">
      <div className="max-h-[70vh] overflow-auto p-4">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 break-words text-muted-foreground">
            펼친 상태에서는 최근 `invoke(cmd_*)` 요청 상세와 Rust 로컬 로그 tail을
            함께 확인합니다. 상단 박스는 축약 상태에서도 유지됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <DebugDevtoolsButton />
            <Button type="button" variant="outline" onClick={() => clearDiagnostics()}>
              기록 비우기
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.setExpanded(false)}
            >
              접기
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section className="grid gap-3 md:grid-cols-3 xl:col-span-2">
            <TraceInfoCard
              label="Active Site"
              value={props.runtimeInfoQuery.data?.active_site_name ?? "loading..."}
              hint={
                props.runtimeInfoQuery.data?.api_base_url ??
                props.runtimeInfoQuery.data?.active_site_id ??
                "loading..."
              }
            />
            <TraceInfoCard
              label="Session Storage"
              value={props.runtimeInfoQuery.data?.session_storage ?? "loading..."}
              hint={props.runtimeInfoQuery.data?.session_storage_target ?? "loading..."}
            />
            <TraceInfoCard
              label="Local DB / Log"
              value={props.runtimeInfoQuery.data?.database_path ?? "loading..."}
              hint={props.runtimeInfoQuery.data?.log_file_path ?? "loading..."}
            />
          </section>

          <section className="rounded-[1.2rem] border border-border/70 bg-background/85 p-4 dark:bg-background/35">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  실시간 명령 추적
                </h3>
                <p className="text-sm leading-6 break-words text-muted-foreground">
                  모든 `invoke(cmd_*)` 요청의 상태와 endpoint를 최근 순으로 표시합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 grid max-h-[320px] gap-3 overflow-auto">
              {recentEntries.length === 0 ? (
                <p className="rounded-[1rem] border border-dashed border-border/70 bg-background/65 px-4 py-6 text-sm text-muted-foreground">
                  아직 추적된 요청이 없습니다.
                </p>
              ) : (
                recentEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1rem] border border-border/70 bg-background/80 p-4 dark:bg-background/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <strong className="break-words text-sm font-semibold text-foreground">
                        {entry.operation}
                      </strong>
                      <SummaryChip
                        label={entry.state}
                        tone={
                          entry.state === "error"
                            ? "error"
                            : entry.state === "pending"
                              ? "pending"
                              : "success"
                        }
                        value={entry.status ?? "-"}
                      />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {entry.area} · {entry.command}
                    </p>
                    <TraceMetaLine label="api_target" value={entry.apiTarget} />
                    {entry.localTarget ? (
                      <TraceMetaLine
                        label="local_target"
                        value={entry.localTarget}
                      />
                    ) : null}
                    <TraceMetaLine
                      label="request"
                      value={`request_id ${entry.requestId ?? "-"} · correlation_id ${entry.correlationId ?? "-"} · server_request_id ${entry.serverRequestId ?? "-"}`}
                    />
                    <TraceMetaLine
                      label="ownership"
                      value={`owner ${entry.owner ?? "-"} · fault_domain ${entry.faultDomain ?? "-"} · category ${entry.errorCategory ?? "-"}`}
                    />
                    <TraceMetaLine
                      label="runtime"
                      value={`duration ${entry.durationMs !== undefined ? `${entry.durationMs}ms` : "-"} · retryable ${String(entry.retryable ?? false)} · user_actionable ${String(entry.userActionable ?? false)}`}
                    />
                    {entry.code ? (
                      <TraceMetaLine label="code" value={entry.code} />
                    ) : null}
                    {entry.message ? (
                      <TraceMetaLine label="message" value={entry.message} />
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[1.2rem] border border-border/70 bg-background/85 p-4 dark:bg-background/35">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                로컬 Rust 로그 tail
              </h3>
              <p className="text-sm leading-6 break-words text-muted-foreground">
                tracing 로그를 앱 내부에서 바로 확인합니다.
              </p>
            </div>
            {props.logTailQuery.isError ? (
              <p className="mt-4 rounded-[1rem] border border-dashed border-border/70 bg-background/65 px-4 py-6 text-sm text-muted-foreground">
                로그 tail 조회 실패: {props.logTailQuery.error.message}
              </p>
            ) : (
              <pre className="mt-4 max-h-[320px] overflow-auto rounded-[1rem] border border-border/70 bg-background/75 p-4 text-xs leading-6 whitespace-pre-wrap break-words text-foreground dark:bg-background/25">
                {(props.logTailQuery.data?.lines ?? []).join("\n") ||
                  "로그가 아직 없습니다."}
              </pre>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
