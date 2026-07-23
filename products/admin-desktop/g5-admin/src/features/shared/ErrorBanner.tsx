import type { CommandError } from "../../api/client";
import { useTheme } from "../layout/theme";

export function ErrorBanner({ error }: { error: CommandError }) {
  const { devMode } = useTheme();
  const metaItems = [
    ["operation", error.operation],
    ["area", error.area],
    ["command", error.command],
    ["local_target", error.local_target],
    ["api_target", error.target],
    ["status", error.status ? String(error.status) : undefined],
    ["code", error.code],
    ["request_id", error.request_id],
    ["correlation_id", error.correlation_id],
    ["server_request_id", error.server_request_id ?? "-"],
    ["owner", error.owner],
    ["fault_domain", error.fault_domain],
    ["error_category", error.error_category],
    ["retryable", String(error.retryable)],
    ["user_actionable", String(error.user_actionable)],
    ["occurred_at", error.occurred_at],
  ].filter(([, value]) => value !== undefined && value !== null);

  return (
    <section
      className="rounded-sm border border-destructive/30 bg-destructive/5 p-4"
      role="alert"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
            {devMode ? "Error Trace" : "오류 안내"}
          </p>
          <strong className="block break-words text-base text-foreground">
            {error.message}
          </strong>
          {error.guide?.reason ? (
            <p className="break-words text-sm leading-6 text-muted-foreground">
              {error.guide.reason}
            </p>
          ) : null}
          {error.guide?.action ? (
            <p className="break-words text-sm leading-6 text-foreground">
              조치: {error.guide.action}
            </p>
          ) : null}
          {devMode && error.detail ? (
            <p className="break-words text-sm leading-6 text-muted-foreground">
              detail: {error.detail}
            </p>
          ) : null}
        </div>

        {devMode ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:max-w-[34rem]">
            {metaItems.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-sm border border-destructive/15 bg-background/85 px-3 py-2 dark:bg-background/40"
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {devMode && error.debug_summary ? (
        <details className="mt-4 rounded-sm border border-destructive/15 bg-background/75 px-4 py-3 dark:bg-background/35">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            진단 정보
          </summary>
          <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
            {error.debug_summary}
          </p>
        </details>
      ) : null}
    </section>
  );
}
