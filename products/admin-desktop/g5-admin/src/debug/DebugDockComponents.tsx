import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function SummaryChip(props: {
  compact?: boolean;
  icon?: ReactNode;
  label: string;
  tone: "error" | "pending" | "success" | "total";
  value: number | string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-[0.14em]",
        props.compact ? "px-1.5 py-0.5 text-[0.64rem]" : "px-2.5 py-1 text-[0.7rem]",
        props.tone === "pending" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        props.tone === "error" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        props.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        props.tone === "total" &&
          "border-border/70 bg-background text-muted-foreground",
      )}
    >
      {props.compact ? (
        <>
          {props.icon}
          <span className="sr-only">{props.label}</span>
        </>
      ) : (
        <span>{props.label}</span>
      )}
      <span>{props.value}</span>
    </span>
  );
}

export function TraceInfoCard(props: {
  hint?: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.2rem] border border-border/70 bg-background/85 p-4 dark:bg-background/35">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {props.label}
      </p>
      <strong className="mt-2 block break-words text-sm font-semibold text-foreground">
        {props.value}
      </strong>
      {props.hint ? (
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
          {props.hint}
        </p>
      ) : null}
    </article>
  );
}

export function TraceMetaLine(props: { label: string; value: string }) {
  return (
    <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
      <span className="font-semibold text-foreground">{props.label}:</span>{" "}
      {props.value}
    </p>
  );
}
