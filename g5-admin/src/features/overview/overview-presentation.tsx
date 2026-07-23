import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function OverviewMetricCard(props: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-lg border border-border bg-card/98 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {props.label}
          </p>
          <strong className="block break-words text-sm leading-5 text-foreground">
            {props.value}
          </strong>
          {props.hint ? (
            <p className="text-xs leading-4 text-muted-foreground">{props.hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OverviewStatusPanel(props: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={
        props.tone === "error"
          ? "rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-destructive"
          : "rounded-lg border border-dashed border-border bg-background/65 px-4 py-6 text-sm text-muted-foreground"
      }
    >
      {props.message}
    </div>
  );
}

export function DashboardListCard<T>(props: {
  description: string;
  emptyMessage: string;
  items: T[];
  renderMeta: (item: T) => string | null | undefined;
  renderPrimary: (item: T) => string;
  renderSecondary: (item: T) => string | undefined;
  title: string;
}) {
  return (
    <Card className="bg-card/98">
      <CardHeader className="space-y-2 border-b border-border/80">
        <CardTitle className="text-base">{props.title}</CardTitle>
        <CardDescription className="text-sm leading-5 break-words">
          {props.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {props.items.length > 0 ? (
          props.items.map((item, index) => {
            const secondary = props.renderSecondary(item);
            const meta = props.renderMeta(item);

            return (
              <article
                key={`${props.title}-${index}`}
                className="rounded-lg border border-border bg-background/78 p-4"
              >
                <strong className="block break-words text-sm text-foreground">
                  {props.renderPrimary(item)}
                </strong>
                {secondary ? (
                  <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                    {secondary}
                  </p>
                ) : null}
                {meta ? <p className="mt-2 text-xs text-muted-foreground">{meta}</p> : null}
              </article>
            );
          })
        ) : (
          <OverviewStatusPanel message={props.emptyMessage} />
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewDetailRow(props: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/72 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <strong className="mt-1 block break-all text-sm leading-5 text-foreground">
        {props.value}
      </strong>
    </div>
  );
}
