import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bug, Network, Route, ScrollText } from "lucide-react";
import { getDebugRuntimeInfo } from "../api/client";
import { apiTargetsByCommand } from "../api/client/core/api-target-registry";
import { Button } from "../components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/drawer";
import {
  clearDiagnostics,
  getDiagnosticsSnapshot,
  subscribeDiagnostics,
  type CommandDiagnosticEntry,
} from "./diagnostics";
import { SummaryChip, TraceInfoCard, TraceMetaLine } from "./DebugDockComponents";
import { DebugDevtoolsButton } from "./DebugDevtoolsButton";
import {
  subscribePageDiagnostics,
  getPageDiagnosticsSnapshot,
} from "./page-diagnostics";

export function DevDiagnosticsDrawer(props: {
  activeDescription?: string;
  activeGroupLabel: string;
  activeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pageDiagnostics = useSyncExternalStore(
    subscribePageDiagnostics,
    getPageDiagnosticsSnapshot,
    getPageDiagnosticsSnapshot,
  );
  const entries = useSyncExternalStore(
    subscribeDiagnostics,
    getDiagnosticsSnapshot,
    getDiagnosticsSnapshot,
  );
  const runtimeInfoQuery = useQuery({
    enabled: open,
    queryFn: getDebugRuntimeInfo,
    queryKey: ["debug", "runtime-info"],
    retry: false,
    staleTime: 60_000,
  });

  const commandCatalog = useMemo(() => {
    return (pageDiagnostics?.commands ?? []).map((command) => {
      const apiTarget =
        command.apiTarget ?? apiTargetsByCommand[command.command] ?? "경로 미정";
      return {
        ...command,
        absoluteTarget: resolveAbsoluteApiTarget(
          runtimeInfoQuery.data?.api_base_url ?? null,
          apiTarget,
        ),
        apiTarget,
      };
    });
  }, [pageDiagnostics?.commands, runtimeInfoQuery.data?.api_base_url]);

  const scopedEntries = useMemo(() => {
    const trackedCommands = new Set(commandCatalog.map((command) => command.command));
    if (trackedCommands.size === 0) {
      return entries.slice(0, 8);
    }

    return entries
      .filter((entry) => trackedCommands.has(entry.command))
      .slice(0, 8);
  }, [commandCatalog, entries]);

  const pendingCount = scopedEntries.filter((entry) => entry.state === "pending").length;
  const errorCount = scopedEntries.filter((entry) => entry.state === "error").length;

  return (
    <Drawer
      direction="right"
      handleOnly
      open={open}
      shouldScaleBackground={false}
      onOpenChange={setOpen}
    >
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="app-shell-dev-drawer-trigger h-10 rounded-sm"
        >
          <Bug className="h-4 w-4" />
          개발 진단
        </Button>
      </DrawerTrigger>

      <DrawerContent
        data-testid="dev-diagnostics-drawer"
        data-vaul-no-drag=""
        className="app-shell-dev-drawer select-text data-[vaul-drawer-direction=right]:w-[min(94vw,42rem)] data-[vaul-drawer-direction=right]:sm:max-w-[42rem]"
      >
        <DrawerHeader className="app-shell-dev-drawer-header border-b border-border/70 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DrawerTitle>개발 진단</DrawerTitle>
              <DrawerDescription className="leading-6">
                현재 작업면이 소비하는 API 경로와 최근 요청 추적을 같은 흐름에서
                확인합니다.
              </DrawerDescription>
            </div>
            <SummaryChip
              label="menu"
              tone="total"
              value={props.activeGroupLabel || "개요"}
            />
          </div>
        </DrawerHeader>

        <div
          data-vaul-no-drag=""
          className="app-shell-dev-drawer-body flex-1 overflow-y-auto px-5 pb-5 select-text"
        >
          <section className="app-shell-dev-drawer-section grid gap-3 pt-5 md:grid-cols-2">
            <TraceInfoCard
              label="Current Page"
              value={pageDiagnostics?.title ?? props.activeLabel}
              hint={pageDiagnostics?.description ?? props.activeDescription}
            />
            <TraceInfoCard
              label="Active Site / API Base"
              value={runtimeInfoQuery.data?.active_site_name ?? "loading..."}
              hint={runtimeInfoQuery.data?.api_base_url ?? "loading..."}
            />
            <TraceInfoCard
              label="Session Storage"
              value={runtimeInfoQuery.data?.session_storage ?? "loading..."}
              hint={runtimeInfoQuery.data?.session_storage_target ?? "loading..."}
            />
            <TraceInfoCard
              label="Local DB / Log"
              value={runtimeInfoQuery.data?.database_path ?? "loading..."}
              hint={runtimeInfoQuery.data?.log_file_path ?? "loading..."}
            />
          </section>

          <section className="app-shell-dev-drawer-section mt-5 rounded-[1.2rem] border border-border/70 bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <span className="app-shell-dev-drawer-section-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <ScrollText className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">페이지 상태 요약</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  현재 화면이 등록한 진단 메타를 전역 Drawer에서 동일한 형식으로
                  보여줍니다.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(pageDiagnostics?.items ?? []).length > 0 ? (
                pageDiagnostics?.items?.map((item) => (
                  <TraceInfoCard
                    key={item.label}
                    hint={item.hint}
                    label={item.label}
                    value={formatDiagnosticValue(item.value)}
                  />
                ))
              ) : (
                <p className="rounded-[1rem] border border-dashed border-border/70 bg-background/65 px-4 py-5 text-sm text-muted-foreground md:col-span-2">
                  현재 화면에서 등록한 개발 요약 정보가 아직 없습니다.
                </p>
              )}
            </div>
          </section>

          <section className="app-shell-dev-drawer-section mt-5 rounded-[1.2rem] border border-border/70 bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <span className="app-shell-dev-drawer-section-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Route className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  현재 화면이 소비하는 API
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  메뉴가 실제로 조회·저장·스키마 소비에 사용하는 REST 경로를
                  페이지 단위로 확인합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {commandCatalog.length > 0 ? (
                commandCatalog.map((command) => (
                  <article
                    key={`${command.command}-${command.apiTarget}`}
                    className="rounded-[1rem] border border-border/70 bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <strong className="break-words text-sm font-semibold text-foreground">
                        {command.label}
                      </strong>
                      <SummaryChip
                        label="cmd"
                        tone="total"
                        value={command.command}
                      />
                    </div>
                    <TraceMetaLine label="api_target" value={command.apiTarget} />
                    {command.absoluteTarget ? (
                      <TraceMetaLine
                        label="resolved_url"
                        value={command.absoluteTarget}
                      />
                    ) : null}
                    {command.note ? (
                      <TraceMetaLine label="note" value={command.note} />
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-[1rem] border border-dashed border-border/70 bg-background/65 px-4 py-5 text-sm text-muted-foreground">
                  이 화면은 아직 전용 API 소비 목록을 등록하지 않았습니다.
                </p>
              )}
            </div>
          </section>

          <section className="app-shell-dev-drawer-section mt-5 rounded-[1.2rem] border border-border/70 bg-card/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="app-shell-dev-drawer-section-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Network className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    최근 요청 추적
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    현재 화면과 연결된 명령만 우선 표시합니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SummaryChip label="pending" tone="pending" value={pendingCount} />
                <SummaryChip label="error" tone="error" value={errorCount} />
                <SummaryChip label="total" tone="total" value={scopedEntries.length} />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {scopedEntries.length > 0 ? (
                scopedEntries.map((entry) => (
                  <DiagnosticsEntryCard key={entry.id} entry={entry} />
                ))
              ) : (
                <p className="rounded-[1rem] border border-dashed border-border/70 bg-background/65 px-4 py-5 text-sm text-muted-foreground">
                  현재 화면과 연결된 최근 요청이 아직 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>

        <DrawerFooter className="app-shell-dev-drawer-footer border-t border-border/70 bg-card/95 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DebugDevtoolsButton />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => clearDiagnostics()}>
                기록 비우기
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  닫기
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DiagnosticsEntryCard(props: { entry: CommandDiagnosticEntry }) {
  return (
    <article className="rounded-[1rem] border border-border/70 bg-background/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <strong className="break-words text-sm font-semibold text-foreground">
          {props.entry.operation}
        </strong>
        <SummaryChip
          label={props.entry.state}
          tone={
            props.entry.state === "error"
              ? "error"
              : props.entry.state === "pending"
                ? "pending"
                : "success"
          }
          value={props.entry.status ?? "-"}
        />
      </div>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {props.entry.area} · {props.entry.command}
      </p>
      <TraceMetaLine label="api_target" value={props.entry.apiTarget} />
      {props.entry.localTarget ? (
        <TraceMetaLine label="local_target" value={props.entry.localTarget} />
      ) : null}
      <TraceMetaLine
        label="request"
        value={`request_id ${props.entry.requestId ?? "-"} · correlation_id ${props.entry.correlationId ?? "-"} · server_request_id ${props.entry.serverRequestId ?? "-"}`}
      />
      <TraceMetaLine
        label="runtime"
        value={`duration ${props.entry.durationMs !== undefined ? `${props.entry.durationMs}ms` : "-"} · owner ${props.entry.owner ?? "-"} · category ${props.entry.errorCategory ?? "-"}`}
      />
      {props.entry.message ? (
        <TraceMetaLine label="message" value={props.entry.message} />
      ) : null}
    </article>
  );
}

function formatDiagnosticValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }

  if (value === null || value === undefined || `${value}`.trim().length === 0) {
    return "-";
  }

  return String(value);
}

function resolveAbsoluteApiTarget(baseUrl: string | null, apiTarget: string) {
  if (!baseUrl || !apiTarget.startsWith("/")) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}${apiTarget}`;
}
