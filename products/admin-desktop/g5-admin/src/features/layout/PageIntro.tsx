import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { useTheme } from "./theme";

type IntroMetric = {
  hint?: string;
  icon?: LucideIcon;
  label: string;
  value: string;
};

export function PageIntro(props: {
  actions?: ReactNode;
  description: string;
  icon?: LucideIcon;
  kicker: string;
  metrics?: IntroMetric[];
  title: string;
  variant?: "compact" | "hero";
}) {
  const { devMode } = useTheme();
  const Icon = props.icon;
  const variant = props.variant ?? "compact";
  const hasAsideContent =
    Boolean(props.actions) || Boolean(props.metrics && props.metrics.length > 0);

  if (variant === "compact") {
    return (
      <section className="rounded-sm border border-border bg-card/96 px-4 py-3.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-fit rounded-sm px-2 py-0.5">
                {props.kicker}
              </Badge>
              {props.metrics?.map((metric) => {
                const MetricIcon = metric.icon;

                return (
                  <Badge
                    key={`${metric.label}-${metric.value}`}
                    variant="outline"
                    title={devMode ? metric.hint : undefined}
                    className="h-auto min-w-0 max-w-full gap-1.5 rounded-sm px-2 py-1 text-[0.67rem] font-medium text-muted-foreground"
                  >
                    {MetricIcon ? <MetricIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                    <span className="truncate">{metric.label}</span>
                    <span className="font-semibold text-foreground">{metric.value}</span>
                  </Badge>
                );
              })}
            </div>

            <div className="flex min-w-0 items-start gap-2.5">
              {Icon ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-primary/15 bg-background text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              ) : null}
              <div className="min-w-0 space-y-1">
                <h1 className="max-w-4xl text-[1.28rem] font-semibold tracking-tight text-foreground md:text-[1.45rem]">
                  {props.title}
                </h1>
                {devMode ? (
                  <p className="max-w-3xl text-[0.82rem] leading-5 break-words text-muted-foreground">
                    {props.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {props.actions ? <div className="min-w-0 xl:max-w-xl xl:pt-0.5">{props.actions}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-sm border border-border bg-card">
      <div className="border-b border-border bg-muted/35 px-5 py-5">
        <div
          className={cn(
            "grid gap-5",
            hasAsideContent
              ? "xl:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]"
              : "",
          )}
        >
          <div className="min-w-0 space-y-3">
            <Badge variant="secondary" className="w-fit rounded-sm px-2 py-0.5">
              {props.kicker}
            </Badge>
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              {Icon ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-primary/15 bg-background text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0 space-y-2">
                <h1 className="max-w-4xl text-[1.8rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2.15rem]">
                  {props.title}
                </h1>
                {devMode ? (
                  <p className="max-w-4xl text-[0.84rem] leading-6 break-words text-muted-foreground md:text-[0.92rem]">
                    {props.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {(props.actions || (props.metrics && props.metrics.length > 0)) ? (
            <div className="min-w-0 space-y-3">
              {props.actions ? <div className="min-w-0">{props.actions}</div> : null}
              {props.metrics && props.metrics.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {props.metrics.map((metric) => {
                    const MetricIcon = metric.icon;

                    return (
                      <article
                        key={`${metric.label}-${metric.value}`}
                        className="min-w-0 rounded-sm border border-border bg-background p-3.5"
                      >
                        <div className="flex items-start gap-3">
                          {MetricIcon ? (
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                              <MetricIcon className="h-4 w-4" />
                            </div>
                          ) : null}
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {metric.label}
                            </p>
                            <strong className="block text-[0.95rem] font-semibold break-words text-foreground">
                              {metric.value}
                            </strong>
                            {devMode && metric.hint ? (
                              <p className="text-[0.8rem] leading-5 break-words text-muted-foreground">
                                {metric.hint}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PageSectionHeading(props: {
  actions?: ReactNode;
  description: string;
  title: string;
}) {
  const { devMode } = useTheme();

  return (
    <div className="flex flex-col gap-3 border-b border-border/80 pb-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="text-[1.2rem] font-semibold tracking-tight text-foreground">
          {props.title}
        </h2>
        {devMode ? (
          <p className="max-w-3xl text-[0.82rem] leading-5 break-words text-muted-foreground">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.actions ? (
        <div className={cn("min-w-0 shrink-0", "md:max-w-xl")}>{props.actions}</div>
      ) : null}
    </div>
  );
}
